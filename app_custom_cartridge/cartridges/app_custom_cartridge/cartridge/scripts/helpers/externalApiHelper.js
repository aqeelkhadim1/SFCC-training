'use strict';

var PagingModel = require('dw/web/PagingModel');
var ArrayList = require('dw/util/ArrayList');
var URLUtils = require('dw/web/URLUtils');

var DEFAULT_PAGE_SIZE = 10;
var MAX_PAGE_SIZE = 100;
var TOTAL_RECORDS_FALLBACK = 100;

/**
 * Parses a positive integer.
 *
 * @param {*} value - Input value
 * @param {number|null} fallback - Fallback value
 * @returns {number|null} Parsed integer or fallback
 */
function parsePositiveInteger(value, fallback) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    var str = String(value).trim();

    if (!/^\d+$/.test(str)) {
        return fallback;
    }

    var parsed = parseInt(str, 10);

    if (!isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
}

/**
 * Parses a non-negative integer.
 *
 * @param {*} value - Input value
 * @param {number} fallback - Fallback value
 * @returns {number} Parsed integer or fallback
 */
function parseNonNegativeInteger(value, fallback) {
    if (value === null || value === undefined || value === '') {
        return fallback;
    }

    var str = String(value).trim();

    if (!/^\d+$/.test(str)) {
        return fallback;
    }

    var parsed = parseInt(str, 10);

    if (!isFinite(parsed) || parsed < 0) {
        return fallback;
    }

    return parsed;
}

/**
 * Validates a post ID.
 *
 * @param {*} value - Post ID
 * @returns {Object} Validation result
 */
function validatePostId(value) {
    var postId = parsePositiveInteger(value, null);

    if (!postId) {
        return {
            valid: false,
            message: 'Post ID must be a positive integer.'
        };
    }

    return {
        valid: true,
        value: postId
    };
}

/**
 * Validates create/update post payload.
 *
 * @param {*} userId - User ID
 * @param {*} title - Post title
 * @param {*} body - Post body
 * @returns {Object} Validation result
 */
function validatePostPayload(userId, title, body) {
    var parsedUserId = parsePositiveInteger(userId, null);
    var cleanTitle = title === null || title === undefined
        ? ''
        : String(title).trim();
    var cleanBody = body === null || body === undefined
        ? ''
        : String(body).trim();

    if (!parsedUserId) {
        return {
            valid: false,
            message: 'User ID must be a valid positive integer.'
        };
    }

    if (!cleanTitle || !cleanBody) {
        return {
            valid: false,
            message: 'Title and Description are required.'
        };
    }

    return {
        valid: true,
        payload: {
            userId: parsedUserId,
            title: cleanTitle,
            body: cleanBody
        }
    };
}

/**
 * Extracts and sanitizes pagination parameters.
 *
 * Supports:
 * - start and sz
 * - page and limit
 *
 * @param {Object} queryString - Request query parameters
 * @returns {Object} Pagination parameters
 */
function getPaginationParams(queryString) {
    var query = queryString || {};

    var limit = parsePositiveInteger(query.sz, null);

    if (!limit) {
        limit = parsePositiveInteger(query.limit, DEFAULT_PAGE_SIZE);
    }

    limit = Math.min(limit, MAX_PAGE_SIZE);

    var page = parsePositiveInteger(query.page, null);
    var start = parseNonNegativeInteger(query.start, 0);

    if (page) {
        start = (page - 1) * limit;
    } else {
        page = Math.floor(start / limit) + 1;
    }

    return {
        page: page,
        limit: limit,
        start: start,
        sz: limit
    };
}

/**
 * Creates pagination metadata for storefront and AJAX responses.
 *
 * @param {Array} records - Current page records
 * @param {number} currentPage - One-based page number
 * @param {number} pageSize - Page size
 * @param {number} totalCount - Total record count
 * @param {string} baseUrl - Optional pagination URL
 * @returns {Object} Pagination view model
 */
function createPaginationModel(
    records,
    currentPage,
    pageSize,
    totalCount,
    baseUrl
) {
    var safePage = parsePositiveInteger(currentPage, 1);
    var safePageSize = parsePositiveInteger(pageSize, DEFAULT_PAGE_SIZE);
    var count = parseNonNegativeInteger(totalCount, TOTAL_RECORDS_FALLBACK);

    var pageCount = Math.ceil(count / safePageSize);
    var currentPageIndex = safePage - 1;
    var startOffset = currentPageIndex * safePageSize;

    var list = new ArrayList(records || []);
    var pagingModel = new PagingModel(list.iterator(), count);

    pagingModel.setStart(startOffset);
    pagingModel.setPageSize(safePageSize);

    var endpointUrl = baseUrl || URLUtils.url('ExternalApi-Show');

    var hasPrevious = currentPageIndex > 0;
    var hasNext = currentPageIndex < pageCount - 1;

    var previousUrl = hasPrevious
        ? pagingModel.appendPaging(
            endpointUrl,
            startOffset - safePageSize
        ).toString()
        : null;

    var nextUrl = hasNext
        ? pagingModel.appendPaging(
            endpointUrl,
            startOffset + safePageSize
        ).toString()
        : null;

    return {
        page: safePage,
        pageNumber: currentPageIndex,
        limit: safePageSize,
        pageSize: safePageSize,
        start: startOffset,
        totalCount: count,
        count: count,
        totalPages: pageCount,
        pageCount: pageCount,
        maxPage: pageCount - 1,
        hasPrevious: hasPrevious,
        hasNext: hasNext,
        previousPage: hasPrevious ? safePage - 1 : null,
        nextPage: hasNext ? safePage + 1 : null,
        previousUrl: previousUrl,
        nextUrl: nextUrl
    };
}

/**
 * Creates a native PagingModel for ISML templates.
 *
 * @param {Array} records - Current page records
 * @param {number} currentPage - One-based page number
 * @param {number} pageSize - Page size
 * @param {number} totalCount - Total record count
 * @returns {dw.web.PagingModel} Native PagingModel
 */
function createPagingModel(records, currentPage, pageSize, totalCount) {
    var safePage = parsePositiveInteger(currentPage, 1);
    var safePageSize = parsePositiveInteger(pageSize, DEFAULT_PAGE_SIZE);
    var count = parseNonNegativeInteger(totalCount, TOTAL_RECORDS_FALLBACK);

    var list = new ArrayList(records || []);
    var pagingModel = new PagingModel(list.iterator(), count);

    pagingModel.setStart((safePage - 1) * safePageSize);
    pagingModel.setPageSize(safePageSize);

    return pagingModel;
}

module.exports = {
    validatePostId: validatePostId,
    validatePostPayload: validatePostPayload,
    getPaginationParams: getPaginationParams,
    createPaginationModel: createPaginationModel,
    createPagingModel: createPagingModel
};