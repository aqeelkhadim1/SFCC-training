'use strict';

var externalApiService = require('*/cartridge/scripts/services/externalApiService');
var Logger = require('dw/system/Logger').getLogger('externalApi', 'helper');

var DEFAULT_PAGE_SIZE = 10;
var MAX_PAGE_SIZE = 100;

/**
 * Executes external API call via externalApiService using serviceConfig
 * Flow: Controller -> Helper -> Service
 * @param {Object} serviceConfig - Configuration object { requestType, requestURL, payload }
 * @returns {Object} Normalized result { ok, data, errorMessage }
 */
function callApi(serviceConfig) {
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
 * Validates whether the given value is a positive integer ID
 * @param {*} value - The input value to validate
 * @returns {boolean} True if value is a valid positive integer
 */
function isValidId(value) {
    return /^[1-9]\d*$/.test(String(value));
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

    if (!isValidId(payload.userId)) {
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
    callApi: callApi,
    isValidId: isValidId,
    validatePost: validatePost,
    getPagingParams: getPagingParams
};
