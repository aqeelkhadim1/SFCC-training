'use strict';

var Logger = require('dw/system/Logger').getLogger('externalApi', 'helper');
var PagingModel = require('dw/web/PagingModel');
var URLUtils = require('dw/web/URLUtils');
var ArrayList = require('dw/util/ArrayList');

var DEFAULT_PAGE_SIZE = 10;
var MAX_PAGE_SIZE = 100;

/**
 * Executes external API call via externalApiService using serviceConfig
 * Flow: Controller -> Helper -> Service
 * @param {Object} serviceConfig - Configuration object { requestType, requestURL, payload }
 * @returns {Object} Normalized result { ok, data, errorMessage }
 */
function callApi(serviceConfig) {
    // SFCC resolves the cartridge wildcard alias at runtime.
    // @ts-ignore
    var externalApiService = require('*/cartridge/scripts/services/externalApiService');
    var config = serviceConfig || {};

    try {
        var result = externalApiService.getService().call(config);

        if (result && result.ok) {
            return {
                ok: true,
                data: result.object
            };
        }

        // Log API failure
        Logger.error('API Failure: [{0}] {1} - Status: {2}, Message: {3}',
            config.requestType || 'GET',
            config.requestURL || 'posts',
            result ? result.status : 'UNKNOWN',
            result ? (result.errorMessage || '') : ''
        );

        return {
            ok: false,
            errorMessage: result ? (result.errorMessage || result.status) : 'Service call failed'
        };
    } catch (e) {
        var errorMessage = e instanceof Error
            ? e.message
            : String(e);

        Logger.error('API Exception: [{0}] {1} - {2}',
            config.requestType || 'GET',
            config.requestURL || 'posts',
            errorMessage
        );

        return {
            ok: false,
            errorMessage: errorMessage || 'API request failed'
        };
    }
}

/**
 * Validates a post ID and provides a reusable error message.
 * @param {*} value - The post ID to validate
 * @returns {Object} Validation result
 */
function validateId(value) {
    if (!/^[1-9]\d*$/.test(String(value))) {
        return {
            valid: false,
            message: 'Invalid post ID'
        };
    }

    return {
        valid: true,
        id: parseInt(value, 10)
    };
}

/**
 * Creates an SFCC paging model for API records.
 * @param {dw.util.Collection|Array} allRecords - Records to paginate
 * @param {number} page - Current one-based page
 * @param {number} pageSize - Records per page
 * @param {string} endpoint - Pagination URL endpoint
 * @returns {Object} Page records and pagination metadata
 */
function createPagingModel(allRecords, page, pageSize, endpoint) {
    var records = allRecords instanceof Array ? new ArrayList(allRecords) : allRecords;
    var size = pageSize || DEFAULT_PAGE_SIZE;
    var currentPage = page || 1;
    var targetEndpoint = endpoint || 'ExternalApi-Show';
    var paging = new PagingModel(records.iterator(), records.size());

    paging.setPageSize(size);
    paging.setStart((currentPage - 1) * size);

    var iterator = paging.pageElements;
    var pageRecords = [];

    while (iterator.hasNext()) {
        pageRecords.push(iterator.next());
    }

    var hasPrevious = paging.currentPage > 0;
    var hasNext = paging.currentPage < paging.maxPage;
    var baseUrl = URLUtils.url(targetEndpoint);
    var nextUrl = null;
    var previousUrl = null;

    if (hasNext) {
        try {
            paging.setStart(currentPage * size);
            nextUrl = paging.appendPaging(baseUrl).toString();
        } catch (e) {
            nextUrl = URLUtils.url(targetEndpoint, 'page', currentPage + 1, 'pageSize', size).toString();
        }
    }

    if (hasPrevious) {
        try {
            paging.setStart((currentPage - 2) * size);
            previousUrl = paging.appendPaging(baseUrl).toString();
        } catch (e) {
            previousUrl = URLUtils.url(targetEndpoint, 'page', currentPage - 1, 'pageSize', size).toString();
        }
    }

    paging.setStart((currentPage - 1) * size);

    return {
        records: pageRecords,
        pagination: {
            page: currentPage,
            currentPage: currentPage,
            totalPages: paging.pageCount,
            pageCount: paging.pageCount,
            totalRecords: paging.count,
            totalCount: paging.count,
            pageSize: paging.pageSize,
            hasPrevious: hasPrevious,
            hasNext: hasNext,
            previousUrl: previousUrl,
            nextUrl: nextUrl
        }
    };
}

/**
 * Fetches posts and prepares paginated data for a controller response.
 * @param {Object} queryString - Request query parameters
 * @param {string} endpoint - Pagination link endpoint
 * @returns {Object} Paginated posts or a normalized service error
 */
function getPagedPosts(queryString, endpoint) {
    var params = getPagingParams(queryString);
    var result = getPosts();

    if (!result.ok || !result.data) {
        return {
            ok: false,
            errorMessage: result.errorMessage || 'No data returned',
            posts: [],
            pagination: {
                page: params.page,
                totalPages: 0,
                totalCount: 0,
                hasPrevious: false,
                hasNext: false,
                previousUrl: null,
                nextUrl: null
            }
        };
    }

    var pagedResult = createPagingModel(
        result.data,
        params.page,
        params.pageSize,
        endpoint
    );

    return {
        ok: true,
        posts: pagedResult.records,
        pagination: pagedResult.pagination
    };
}

function getPosts() {
    return callApi({
        requestType: 'GET',
        requestURL: 'posts'
    });
}

function getPost(postId) {
    return callApi({
        requestType: 'GET',
        requestURL: 'posts/' + postId
    });
}

function savePost(payload) {
    return callApi({
        requestType: 'POST',
        requestURL: 'posts',
        payload: payload
    });
}

function updatePost(postId, payload) {
    return callApi({
        requestType: 'PUT',
        requestURL: 'posts/' + postId,
        payload: payload
    });
}

function deletePost(postId) {
    return callApi({
        requestType: 'DELETE',
        requestURL: 'posts/' + postId
    });
}

function buildPostPayload(form) {
    return {
        userId: parseInt(String(form.userId), 10),
        title: form.title.trim(),
        body: form.body.trim()
    };
}

/**
 * Validates post payload fields (userId, title, body)
 * @param {Object} payload - Post payload object
 * @returns {Object} Validation status and message
 */
function validatePost(payload) {
    if (!payload) {
        return {
            valid: false,
            message: 'Post data is required'
        };
    }

    if (!validateId(payload.userId).valid) {
        return {
            valid: false,
            message: 'Valid User ID is required'
        };
    }

    if (
        typeof payload.title !== 'string' ||
        !payload.title.trim()
    ) {
        return {
            valid: false,
            message: 'Title is required'
        };
    }

    if (
        typeof payload.body !== 'string' ||
        !payload.body.trim()
    ) {
        return {
            valid: false,
            message: 'Description is required'
        };
    }

    var descriptionLength = payload.body.trim().length;
    if (descriptionLength < 10 || descriptionLength > 500) {
        return {
            valid: false,
            message: 'Description must be between 10 and 500 characters'
        };
    }

    return {
        valid: true
    };
}

/**
 * Extracts and sanitizes pagination parameters from request query
 * Supports SFCC native 'start'/'sz' and REST 'page'/'limit' parameters
 * @param {Object} queryString - req.querystring object
 * @returns {Object} Sanitized pagination parameters { page, pageSize, limit, start }
 */
function getPagingParams(queryString) {
    var query = queryString || {};

    var size = parseInt(query.pageSize || query.limit || query.sz, 10) || DEFAULT_PAGE_SIZE;
    if (size < 1 || size > MAX_PAGE_SIZE) {
        size = DEFAULT_PAGE_SIZE;
    }

    var page = 1;
    if (query.start !== undefined && !query.page) {
        var startOffset = Math.max(0, parseInt(query.start, 10) || 0);
        page = Math.floor(startOffset / size) + 1;
    } else {
        page = Math.max(1, parseInt(query.page, 10) || 1);
    }

    return {
        page: page,
        pageSize: size,
        limit: size,
        start: (page - 1) * size
    };
}

module.exports = {
    getPagedPosts: getPagedPosts,
    getPost: getPost,
    savePost: savePost,
    updatePost: updatePost,
    deletePost: deletePost,
    buildPostPayload: buildPostPayload,
    validateId: validateId,
    validatePost: validatePost
};
