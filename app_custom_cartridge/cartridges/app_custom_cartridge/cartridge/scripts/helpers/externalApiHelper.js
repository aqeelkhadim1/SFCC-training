/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * External API service invocation, validation, pagination and CRUD mapping.
 * Flow: Controller -> Helper -> Service -> Helper -> Controller -> View/JSON
 */

var Logger = require('dw/system/Logger').getLogger('externalApi', 'helper');
var PagingModel = require('dw/web/PagingModel');
var URLUtils = require('dw/web/URLUtils');
var ArrayList = require('dw/util/ArrayList');
var externalApiService = require('*/cartridge/scripts/services/externalApiService');

var DEFAULT_PAGE_SIZE = 10;
var MAX_PAGE_SIZE = 100;
var MIN_DESCRIPTION_LENGTH = 10;
var MAX_DESCRIPTION_LENGTH = 500;
var ENDPOINTS = { POSTS: 'posts' };
var HTTP_METHODS = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE'
};

/**
 * Executes and normalizes an external service request.
 * @param {Object} config Service configuration
 * @returns {Object} Normalized result
 */
function callService(config) {
    var serviceConfig = config || {};

    try {
        var result = externalApiService.getService().call(serviceConfig);
        if (result && result.ok) {
            return { ok: true, data: result.object };
        }

        Logger.error('API Failure: [{0}] {1} - Status: {2}, Message: {3}',
            serviceConfig.requestType || HTTP_METHODS.GET,
            serviceConfig.requestURL || ENDPOINTS.POSTS,
            result ? result.status : 'UNKNOWN',
            result ? (result.errorMessage || '') : '');

        return {
            ok: false,
            errorMessage: result ? (result.errorMessage || result.status) : 'Service call failed'
        };
    } catch (e) {
        var message = e instanceof Error ? e.message : String(e);
        Logger.error('API Exception: [{0}] {1} - {2}',
            serviceConfig.requestType || HTTP_METHODS.GET,
            serviceConfig.requestURL || ENDPOINTS.POSTS,
            message);
        return { ok: false, errorMessage: message || 'API request failed' };
    }
}

function invalid(message) {
    return { valid: false, message: message, status: 400 };
}

/**
 * @param {*} value Post ID
 * @returns {Object} Validation result
 */
function validatePostId(value) {
    return /^[1-9]\d*$/.test(String(value))
        ? { valid: true, id: Number(value) }
        : invalid('Invalid post ID');
}

/**
 * @param {Object} payload Post form data
 * @returns {Object} Validation result and sanitized payload
 */
function validatePostPayload(payload) {
    if (!payload) return invalid('Post data is required');
    if (!validatePostId(payload.userId).valid) return invalid('Valid User ID is required');

    var title = typeof payload.title === 'string' ? payload.title.trim() : '';
    var body = typeof payload.body === 'string' ? payload.body.trim() : '';

    if (!title) return invalid('Title is required');
    if (!body) return invalid('Description is required');
    if (body.length < MIN_DESCRIPTION_LENGTH || body.length > MAX_DESCRIPTION_LENGTH) {
        return invalid('Description must be between 10 and 500 characters');
    }

    return {
        valid: true,
        payload: { userId: Number(payload.userId), title: title, body: body }
    };
}

function getPagingParams(queryString) {
    var query = queryString || {};
    var pageSize = parseInt(query.pageSize || query.limit || query.sz, 10) || DEFAULT_PAGE_SIZE;
    if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) pageSize = DEFAULT_PAGE_SIZE;

    var page = Math.max(1, parseInt(query.page, 10) || 1);
    if (query.start !== undefined && !query.page) {
        page = Math.floor(Math.max(0, parseInt(query.start, 10) || 0) / pageSize) + 1;
    }
    return { page: page, pageSize: pageSize };
}

function pagingUrl(paging, endpoint, page, pageSize) {
    try {
        paging.setStart((page - 1) * pageSize);
        return paging.appendPaging(URLUtils.url(endpoint)).toString();
    } catch (e) {
        return URLUtils.url(endpoint, 'page', page, 'pageSize', pageSize).toString();
    }
}

/**
 * Creates the current page and frontend pagination metadata.
 * @param {dw.util.Collection|Array} allRecords API records
 * @param {number} page Requested page
 * @param {number} pageSize Records per page
 * @param {string} endpoint Pagination route
 * @returns {Object} Page records and metadata
 */
function calculatePagination(allRecords, page, pageSize, endpoint) {
    var records = allRecords instanceof Array ? new ArrayList(allRecords) : allRecords;
    var size = pageSize || DEFAULT_PAGE_SIZE;
    var currentPage = page || 1;
    var targetEndpoint = endpoint || 'ExternalApi-Show';
    var paging = new PagingModel(records.iterator(), records.size());
    var pageRecords = [];
    var totalPages = Math.max(1, Math.ceil(records.size() / size));

    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    paging.setPageSize(size);
    paging.setStart((currentPage - 1) * size);
    var iterator = paging.pageElements;
    while (iterator.hasNext()) pageRecords.push(iterator.next());

    var hasPrevious = paging.currentPage > 0;
    var hasNext = paging.currentPage < paging.maxPage;
    var previousUrl = hasPrevious
        ? pagingUrl(paging, targetEndpoint, currentPage - 1, size)
        : null;
    var nextUrl = hasNext
        ? pagingUrl(paging, targetEndpoint, currentPage + 1, size)
        : null;

    return {
        records: pageRecords,
        pagination: {
            page: currentPage,
            totalPages: paging.pageCount,
            totalCount: paging.count,
            pageSize: paging.pageSize,
            hasPrevious: hasPrevious,
            hasNext: hasNext,
            previousUrl: previousUrl,
            nextUrl: nextUrl
        }
    };
}

function requestPost(method, postId, payload) {
    var config = {
        requestType: method,
        requestURL: ENDPOINTS.POSTS + (postId ? '/' + postId : '')
    };
    if (payload) config.payload = payload;
    return callService(config);
}

function emptyPagination(page) {
    return {
        page: page,
        totalPages: 0,
        totalCount: 0,
        pageSize: DEFAULT_PAGE_SIZE,
        hasPrevious: false,
        hasNext: false,
        previousUrl: null,
        nextUrl: null
    };
}

function firstRecords(records, count) {
    var items = [];
    var limit = Math.min(records.length, count);
    for (var i = 0; i < limit; i++) items.push(records[i]);
    return items;
}

/**
 * Returns frontend-ready listing data for page, AJAX and View More restore.
 */
function getPosts(queryString, endpoint, restoreMode) {
    var params = getPagingParams(queryString);
    var result = requestPost(HTTP_METHODS.GET);
    var paged = result.ok && result.data
        ? calculatePagination(result.data, params.page, params.pageSize, endpoint)
        : { records: [], pagination: emptyPagination(params.page) };
    var response = {
        success: result.ok,
        error: result.ok ? null : 'Unable to retrieve posts',
        errorMessage: result.ok ? null : 'Posts are temporarily unavailable.',
        posts: restoreMode && result.ok
            ? firstRecords(result.data, paged.pagination.page * params.pageSize)
            : paged.records,
        pagination: paged.pagination,
        status: result.ok ? 200 : 502
    };
    return response;
}

function toClientResponse(result, fallbackMessage, successData, errorStatus) {
    if (!result || !result.ok) {
        return { success: false, status: errorStatus || 502, error: fallbackMessage };
    }
    return successData === undefined ? result.data : successData;
}

function getPostById(postId) {
    var validation = validatePostId(postId);
    return validation.valid
        ? toClientResponse(requestPost(HTTP_METHODS.GET, validation.id), 'Post not found', undefined, 404)
        : { success: false, status: validation.status, error: validation.message };
}

function createPost(form) {
    var validation = validatePostPayload(form);
    return validation.valid
        ? toClientResponse(requestPost(HTTP_METHODS.POST, null, validation.payload), 'Unable to create post')
        : { success: false, status: validation.status, error: validation.message };
}

function updatePost(postId, form) {
    var idValidation = validatePostId(postId);
    var formValidation = validatePostPayload(form);
    if (!idValidation.valid) {
        return { success: false, status: idValidation.status, error: idValidation.message };
    }
    if (!formValidation.valid) {
        return { success: false, status: formValidation.status, error: formValidation.message };
    }
    return toClientResponse(
        requestPost(HTTP_METHODS.PUT, idValidation.id, formValidation.payload),
        'Unable to update post'
    );
}

function deletePost(postId) {
    var validation = validatePostId(postId);
    return validation.valid
        ? toClientResponse(requestPost(HTTP_METHODS.DELETE, validation.id), 'Unable to delete post', { success: true })
        : { success: false, status: validation.status, error: validation.message };
}

module.exports = {
    callService: callService,
    validatePostPayload: validatePostPayload,
    validatePostId: validatePostId,
    calculatePagination: calculatePagination,
    getPosts: getPosts,
    getPostById: getPostById,
    createPost: createPost,
    updatePost: updatePost,
    deletePost: deletePost
};
