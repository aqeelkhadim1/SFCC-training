/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * externalApiHelper.js
 * External REST API ke liye Business Logic, Validation, Native PagingModel aur Service Orchestration.
 * Flow: Controller -> Helper -> Service -> Helper -> Controller -> View
 */

var PagingModel = require('dw/web/PagingModel');
var ArrayList = require('dw/util/ArrayList');
var URLUtils = require('dw/web/URLUtils');
var externalApiService = require('*/cartridge/scripts/services/externalApiService');

/**
 * Form payload ko validate aur sanitize karna (POST & PUT ke liye).
 * @param {Object} payload - { userId, title, body }
 * @returns {Object} { isValid, errors, data }
 */
function validatePostPayload(payload) {
    var p = payload || {};
    var userId = parseInt(p.userId || p.userid, 10);
    var title = p.title ? String(p.title).trim() : '';
    var body = (p.body || p.description) ? String(p.body || p.description).trim() : '';
    var errors = {};

    // 1. User ID check: Positive integer lazmi hai
    if (!userId || userId <= 0) {
        errors.userId = 'Valid positive User ID zaroori hai (e.g. 1, 2, 3).';
    }

    // 2. Title check: Khali na ho aur 200 characters limit
    if (!title) {
        errors.title = 'Post Title zaroori hai.';
    } else if (title.length > 200) {
        errors.title = 'Title 200 characters se zyada nahi ho sakta.';
    }

    // 3. Description/Body check: Khali na ho
    if (!body) {
        errors.body = 'Post Description zaroori hai.';
    }

    var isValid = Object.keys(errors).length === 0;
    return {
        isValid: isValid,
        errors: errors,
        data: isValid ? { userId: userId, title: title, body: body } : null
    };
}

/**
 * Post ID validate karna API calls se pehle (GET, PUT, DELETE).
 * @param {string|number} postId
 * @returns {Object} { isValid, id, error }
 */
function validatePostId(postId) {
    var id = parseInt(postId, 10);
    var isValid = Boolean(id && id > 0);
    return {
        isValid: isValid,
        id: isValid ? id : null,
        error: isValid ? null : 'Invalid Post ID. Sirf positive numbers allow hain.'
    };
}

/**
 * SFCC native dw.web.PagingModel use karke server-side pagination state calculate karna.
 * @param {Array} elements - API se mangwaye gaye posts
 * @param {number|string} page - Current requested page
 * @param {number|string} limit - Per page records
 * @param {number|string} totalRecords - API total records
 * @returns {Object} Pagination metadata with SFCC PagingModel
 */
function calculatePagination(elements, page, limit, totalRecords) {
    var pageSize = parseInt(limit, 10) || 10;
    var total = parseInt(totalRecords, 10) || 100;
    var currentPage = Math.max(1, parseInt(page, 10) || 1);
    var startIndex = (currentPage - 1) * pageSize;

    // SFCC dw.web.PagingModel Java Iterator expect karta hai (Native JS Array nahi)
    var list = new ArrayList();
    if (elements && elements.length) {
        for (var i = 0; i < elements.length; i++) {
            list.add(elements[i]);
        }
    }

    var paging = null;
    try {
        paging = new PagingModel(list.iterator(), total);
        paging.setStart(startIndex);
        paging.setPageSize(pageSize);
    } catch (e) {
        try {
            paging = new PagingModel(list, total);
            paging.setStart(startIndex);
            paging.setPageSize(pageSize);
        } catch (err) {
            // Safe fallback
        }
    }

    var totalPages = parseInt(Math.max(1, Math.ceil(total / pageSize)), 10);
    currentPage = parseInt(Math.min(currentPage, totalPages), 10);

    return {
        pagingModel: paging,
        page: currentPage,
        pageSize: pageSize,
        totalRecords: total,
        totalPages: totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        prevPage: currentPage - 1,
        nextPage: currentPage + 1
    };
}

/**
 * 1. Paginated posts fetch karke PagingModel ke sath response ready karna (GET).
 */
function getPosts(page, limit) {
    var requestedPage = parseInt(page, 10) || 1;
    var requestedLimit = parseInt(limit, 10) || 10;

    // Service call via externalApiService (Req Method 1: GET /posts)
    var result = externalApiService.getPosts(requestedPage, requestedLimit);
    var pagination = calculatePagination(result.data, requestedPage, requestedLimit, result.totalCount);

    return {
        success: result.success,
        posts: result.data || [],
        pagination: pagination,
        error: result.success ? null : (result.error || 'Posts load nahi ho saki.')
    };
}

/**
 * 2. Specific Post ID se post fetch karna (GET).
 */
function getPostById(postId) {
    var check = validatePostId(postId);
    if (!check.isValid) {
        return { success: false, post: null, error: check.error };
    }

    // Service call via externalApiService (Req Method 2: GET /posts/{id})
    var result = externalApiService.getPostById(check.id);
    return {
        success: result.success,
        post: result.data || null,
        error: result.success ? null : (result.error || 'Post available nahi hai.')
    };
}

/**
 * 3. Nayi post validate karke create karna (POST).
 */
function createPost(formData) {
    var validation = validatePostPayload(formData);
    if (!validation.isValid) {
        return { success: false, errors: validation.errors };
    }

    // Service call via externalApiService (Req Method 3: POST /posts)
    var result = externalApiService.createPost(validation.data);
    return {
        success: result.success,
        message: result.success ? 'Post successfully create ho gayi!' : (result.error || 'Post create nahi ho saki.'),
        data: result.data,
        redirectUrl: URLUtils.url('ExternalApi-Show').toString(),
        error: result.success ? null : result.error
    };
}

/**
 * 4. Existing post validate karke update karna (PUT).
 */
function updatePost(postId, formData) {
    var check = validatePostId(postId);
    var validation = validatePostPayload(formData);

    if (!check.isValid || !validation.isValid) {
        var errors = validation.errors || {};
        if (!check.isValid) { errors.id = check.error; }
        return { success: false, errors: errors };
    }

    // Service call via externalApiService (Req Method 4: PUT /posts/{id})
    var result = externalApiService.updatePost(check.id, validation.data);
    return {
        success: result.success,
        message: result.success ? 'Post successfully update ho gayi!' : (result.error || 'Update request fail ho gayi.'),
        data: result.data,
        redirectUrl: URLUtils.url('ExternalApi-Show').toString(),
        error: result.success ? null : result.error
    };
}

/**
 * 5. Post delete karna (DELETE).
 */
function deletePost(postId) {
    var check = validatePostId(postId);
    if (!check.isValid) {
        return { success: false, error: check.error };
    }

    // Service call via externalApiService (Req Method 5: DELETE /posts/{id})
    var result = externalApiService.deletePost(check.id);
    return {
        success: result.success,
        message: result.success ? 'Post successfully delete ho gayi!' : (result.error || 'Delete request fail ho gayi.')
    };
}

module.exports = {
    validatePostPayload: validatePostPayload,
    validatePostId: validatePostId,
    calculatePagination: calculatePagination,
    getPosts: getPosts,
    getPostById: getPostById,
    createPost: createPost,
    updatePost: updatePost,
    deletePost: deletePost
};
