'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');

var SERVICE_ID = 'jsonplaceholder';

var logger = Logger.getLogger('externalApi', 'service');

/**
 * Creates the external API service.
 */
var jsonPlaceholderService = LocalServiceRegistry.createService(
    SERVICE_ID,
    {
        /**
         * Prepares the HTTP request.
         *
         * @param {Object} svc - Service instance
         * @param {Object} params - Request parameters
         * @returns {string|null} Serialized request body
         */
        createRequest: function (svc, params) {
            var baseUrl = svc.configuration.credential.URL;

            if (!baseUrl) {
                throw new Error('External API base URL is not configured.');
            }

            baseUrl = String(baseUrl).replace(/\/+$/, '');

            var path = params.path || '';

            if (path && path.charAt(0) !== '/') {
                path = '/' + path;
            }

            svc.setURL(baseUrl + path);
            svc.setRequestMethod(params.method || 'GET');

            svc.addHeader('Accept', 'application/json');

            if (params.payload !== null &&
                params.payload !== undefined) {
                svc.addHeader(
                    'Content-Type',
                    'application/json; charset=UTF-8'
                );

                return JSON.stringify(params.payload);
            }

            return null;
        },

        /**
         * Parses the HTTP response.
         *
         * @param {Object} svc - Service instance
         * @param {Object} client - HTTP client
         * @returns {Object} Parsed response
         */
        parseResponse: function (svc, client) {
            var statusCode = client.getStatusCode();
            var responseText = client.getText();
            var parsedData = null;

            if (responseText) {
                try {
                    parsedData = JSON.parse(responseText);
                } catch (e) {
                    logger.error(
                        'External API returned invalid JSON. Status: {0}',
                        statusCode
                    );

                    return {
                        statusCode: statusCode,
                        data: null,
                        totalCount: null,
                        error: 'INVALID_JSON_RESPONSE'
                    };
                }
            }

            var totalCountHeader = client.getResponseHeader(
                'X-Total-Count'
            );

            var totalCount = totalCountHeader
                ? parseInt(totalCountHeader, 10)
                : null;

            if (!isFinite(totalCount) || totalCount < 0) {
                totalCount = null;
            }

            return {
                statusCode: statusCode,
                data: parsedData,
                totalCount: totalCount
            };
        },

        /**
         * Mock response for service testing.
         *
         * @returns {Object} Mock HTTP response
         */
        mockCall: function () {
            return {
                statusCode: 200,
                statusMessage: 'Success (Mock)',
                text: JSON.stringify([
                    {
                        id: 1,
                        userId: 1,
                        title: 'Mock Post',
                        body: 'Mock Body'
                    }
                ])
            };
        },

        /**
         * Prevents request and response details from being
         * written to service logs.
         *
         * @param {string} msg - Log message
         * @returns {string} Filtered message
         */
        filterLogMessage: function (msg) {
            return '[External API request/response details omitted]';
        }
    }
);

/**
 * Executes an external API request.
 *
 * @param {Object} params - Request options
 * @returns {Object} Normalized service result
 */
function callAPI(params) {
    var result;

    try {
        result = jsonPlaceholderService.call(params);
    } catch (e) {
        logger.error(
            'External API service execution failed: {0}',
            e.message
        );

        return {
            ok: false,
            statusCode: 502,
            error: 'SERVICE_UNAVAILABLE'
        };
    }

    if (!result || !result.isOk()) {
        var statusCode = 502;

        if (result) {
            var serviceObject = result.getObject();

            if (serviceObject && serviceObject.statusCode) {
                statusCode = serviceObject.statusCode;
            }

            logger.error(
                'External API call failed. Status: {0}, Error: {1}',
                result.getStatus(),
                result.getErrorMessage()
            );
        }

        return {
            ok: false,
            statusCode: statusCode,
            error: 'EXTERNAL_API_COMMUNICATION_FAILED'
        };
    }

    var response = result.getObject();

    if (!response ||
        typeof response.statusCode !== 'number' ||
        response.statusCode < 200 ||
        response.statusCode >= 300) {
        return {
            ok: false,
            statusCode: response && response.statusCode
                ? response.statusCode
                : 502,
            error: 'EXTERNAL_API_ERROR_STATUS'
        };
    }

    return {
        ok: true,
        statusCode: response.statusCode,
        data: response.data,
        totalCount: response.totalCount
    };
}

/**
 * Retrieves paginated posts.
 *
 * @param {number} page - One-based page number
 * @param {number} limit - Records per page
 * @returns {Object} Service result
 */
function getPosts(page, limit) {
    var queryPath = '/posts?_page=' +
        encodeURIComponent(page) +
        '&_limit=' +
        encodeURIComponent(limit);

    return callAPI({
        path: queryPath,
        method: 'GET'
    });
}

/**
 * Retrieves a single post.
 *
 * @param {number} postId - Post ID
 * @returns {Object} Service result
 */
function getPostById(postId) {
    return callAPI({
        path: '/posts/' + encodeURIComponent(postId),
        method: 'GET'
    });
}

/**
 * Creates a post.
 *
 * @param {Object} payload - Post data
 * @returns {Object} Service result
 */
function createPost(payload) {
    return callAPI({
        path: '/posts',
        method: 'POST',
        payload: payload
    });
}

/**
 * Updates a post.
 *
 * @param {number} postId - Post ID
 * @param {Object} payload - Updated post data
 * @returns {Object} Service result
 */
function updatePost(postId, payload) {
    return callAPI({
        path: '/posts/' + encodeURIComponent(postId),
        method: 'PUT',
        payload: payload
    });
}

/**
 * Deletes a post.
 *
 * @param {number} postId - Post ID
 * @returns {Object} Service result
 */
function deletePost(postId) {
    return callAPI({
        path: '/posts/' + encodeURIComponent(postId),
        method: 'DELETE'
    });
}

module.exports = {
    getPosts: getPosts,
    getPostById: getPostById,
    createPost: createPost,
    updatePost: updatePost,
    deletePost: deletePost
};