'use strict';

/**
 * externalApiHelper.js
 * External REST API ke liye validation aur SFCC dw.web.PagingModel pagination helper.
 */

var PagingModel = require('dw/web/PagingModel');

/**
 * Post ke form payload ko sanitize aur validate karta hai (POST & PUT).
 * @param {Object} payload - { userId, title, body }
 * @returns {Object} { isValid, errors, data }
 */
function validatePostPayload(payload) {
    var p = payload || {};
    var userId = parseInt(p.userId || p.userid, 10);
    var title = p.title ? String(p.title).trim() : '';
    var body = (p.body || p.description) ? String(p.body || p.description).trim() : '';
    var errors = {};

    // User ID: Positive integer check
    if (!userId || userId <= 0) {
        errors.userId = 'Valid positive User ID zaroori hai (e.g. 1, 2, 3).';
    }

    // Title: Non-empty aur 200 chars limit
    if (!title) {
        errors.title = 'Post Title zaroori hai.';
    } else if (title.length > 200) {
        errors.title = 'Title 200 characters se zyada nahi ho sakta.';
    }

    // Description/Body: Non-empty check
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

    // SFCC native PagingModel instance initialize karna
    var paging = new PagingModel(elements || [], total);
    paging.setStart(startIndex);
    paging.setPageSize(pageSize);

    var totalPages = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.min(currentPage, totalPages);

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

module.exports = {
    validatePostPayload: validatePostPayload,
    validatePostId: validatePostId,
    calculatePagination: calculatePagination
};
