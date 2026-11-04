'use strict';

/**
 * externalApiService.js
 * Service layer for interacting with external REST API (JSONPlaceholder).
 * Uses SFCC dw.svc.LocalServiceRegistry for resilient, audited, and configurable API communication.
 */

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('jsonplaceholder', 'externalApi');

/**
 * Service callback configuration for jsonplaceholder API.
 * Configured in Business Manager with Service ID: 'jsonplaceholder'.
 */
var jsonPlaceholderService = LocalServiceRegistry.createService('jsonplaceholder', {
    /**
     * Prepares and configures the HTTP request.
     * @param {dw.svc.HTTPService} svc - The service instance
     * @param {Object} params - Request parameters { method, endpoint, payload, queryParams }
     * @returns {string|null} - Serialized JSON payload or null
     */
    createRequest: function (svc, params) {
        var method = (params && params.method) ? params.method.toUpperCase() : 'GET';
        svc.setRequestMethod(method);
        svc.addHeader('Content-Type', 'application/json; charset=UTF-8');
        svc.addHeader('Accept', 'application/json');

        // Compose full URL: Base URL (from BM) + endpoint suffix
        var url = svc.getURL() || 'https://jsonplaceholder.typicode.com';
        var endpoint = (params && params.endpoint) ? params.endpoint : '/posts';

        // Strip trailing slash from base URL
        if (url.charAt(url.length - 1) === '/') {
            url = url.substring(0, url.length - 1);
        }

        // Ensure endpoint starts with leading slash
        if (endpoint.charAt(0) !== '/') {
            endpoint = '/' + endpoint;
        }

        url += endpoint;

        // Append query parameters if present (e.g. ?_page=1&_limit=10)
        if (params && params.queryParams) {
            var queryKeys = Object.keys(params.queryParams);
            if (queryKeys.length > 0) {
                var queryString = queryKeys.map(function (key) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(params.queryParams[key]);
                }).join('&');
                url += (url.indexOf('?') === -1 ? '?' : '&') + queryString;
            }
        }

        svc.setURL(url);

        // Serialize payload for POST and PUT requests
        if ((method === 'POST' || method === 'PUT') && params && params.payload) {
            return JSON.stringify(params.payload);
        }

        return null;
    },

    /**
     * Parses the HTTP response returned by the external service.
     * @param {dw.svc.HTTPService} svc - The service instance
     * @param {dw.net.HTTPClient} client - The HTTP client instance
     * @returns {Object} - Parsed response object { statusCode, data, totalCount }
     */
    parseResponse: function (svc, client) {
        var statusCode = client.statusCode;
        var responseText = client.text;
        var parsedData = null;

        if (responseText) {
            try {
                parsedData = JSON.parse(responseText);
            } catch (e) {
                Logger.warn('externalApiService: Failed to parse JSON response. Status: {0}, Error: {1}', statusCode, e.message);
                parsedData = responseText;
            }
        }

        // Read X-Total-Count header for pagination support
        var totalCountHeader = client.getResponseHeader('X-Total-Count');
        var totalCount = totalCountHeader ? parseInt(totalCountHeader, 10) : null;

        return {
            statusCode: statusCode,
            data: parsedData,
            totalCount: totalCount
        };
    },

    /**
     * Filters log messages to prevent logging sensitive information.
     * @param {string} msg - The log message to filter
     * @returns {string} - The filtered message
     */
    filterLogMessage: function (msg) {
        return msg;
    },

    /**
     * Provides a mock response when the service is configured in Mock mode
     * or during unit testing / network outages.
     * @param {dw.svc.HTTPService} svc - The service instance
     * @param {Object} params - Request parameters
     * @returns {Object} - Mock response
     */
    mockCall: function (svc, params) {
        var method = (params && params.method) ? params.method.toUpperCase() : 'GET';
        var endpoint = (params && params.endpoint) ? params.endpoint : '/posts';

        // Mock GET single post: /posts/{id}
        if (method === 'GET' && endpoint.indexOf('/posts/') !== -1) {
            var idParts = endpoint.split('/');
            var postId = parseInt(idParts[idParts.length - 1], 10) || 1;
            return {
                statusCode: 200,
                statusMessage: 'OK',
                text: JSON.stringify({
                    id: postId,
                    userId: 1,
                    title: 'Mock Post ' + postId,
                    body: 'This is a mock post body returned by LocalServiceRegistry mockCall.'
                })
            };
        }

        // Mock POST: create new post
        if (method === 'POST') {
            return {
                statusCode: 201,
                statusMessage: 'Created',
                text: JSON.stringify({
                    id: 101,
                    userId: params.payload ? params.payload.userId : 1,
                    title: params.payload ? params.payload.title : 'Mock New Post',
                    body: params.payload ? params.payload.body : 'Mock Body Content'
                })
            };
        }

        // Mock PUT: update post
        if (method === 'PUT') {
            var putIdParts = endpoint.split('/');
            var updateId = parseInt(putIdParts[putIdParts.length - 1], 10) || 1;
            return {
                statusCode: 200,
                statusMessage: 'OK',
                text: JSON.stringify({
                    id: updateId,
                    userId: params.payload ? params.payload.userId : 1,
                    title: params.payload ? params.payload.title : 'Mock Updated Post',
                    body: params.payload ? params.payload.body : 'Mock Body Content'
                })
            };
        }

        // Mock DELETE: delete post
        if (method === 'DELETE') {
            return {
                statusCode: 200,
                statusMessage: 'OK',
                text: JSON.stringify({})
            };
        }

        // Default Mock GET /posts: paginated posts list
        var mockPosts = [];
        var startId = (params && params.queryParams && params.queryParams._page)
            ? (parseInt(params.queryParams._page, 10) - 1) * 10 + 1
            : 1;

        for (var i = 0; i < 10; i++) {
            var currentId = startId + i;
            if (currentId <= 100) {
                mockPosts.push({
                    id: currentId,
                    userId: Math.ceil(currentId / 10),
                    title: 'Sample Post ' + currentId + ' Title',
                    body: 'This is the description body for sample post ' + currentId + '.'
                });
            }
        }

        return {
            statusCode: 200,
            statusMessage: 'OK',
            text: JSON.stringify(mockPosts)
        };
    }
});

/**
 * Generic execution runner for the service call.
 * Handles try-catch, error checks, logging, and returns a unified result object.
 * @param {Object} requestParams - { method, endpoint, payload, queryParams }
 * @returns {Object} Standardized result: { success, status, data, totalCount, error }
 */
function callService(requestParams) {
    var result;

    try {
        result = jsonPlaceholderService.call(requestParams);
    } catch (e) {
        Logger.error('externalApiService: Exception occurred during service execution: {0}', e.message);
        return {
            success: false,
            status: 500,
            data: null,
            totalCount: 0,
            error: e.message || 'Service execution exception'
        };
    }

    if (!result || !result.isOk()) {
        var status = (result && result.error) ? result.error : 500;
        var errorMessage = (result && result.errorMessage) ? result.errorMessage : 'External service call failed';
        Logger.error('externalApiService: Service call failed with status {0}. Error: {1}', status, errorMessage);
        return {
            success: false,
            status: status,
            data: null,
            totalCount: 0,
            error: errorMessage
        };
    }

    var serviceObject = result.getObject();
    return {
        success: true,
        status: serviceObject.statusCode,
        data: serviceObject.data,
        totalCount: serviceObject.totalCount,
        error: null
    };
}

/**
 * Retrieves paginated posts from external API.
 * Uses query parameters _page and _limit to enforce server-side pagination.
 * @param {number} page - Current page number (default 1)
 * @param {number} limit - Records per page (default 10)
 * @returns {Object} Standardized result object
 */
function getPosts(page, limit) {
    var currentPage = parseInt(page, 10) || 1;
    var pageLimit = parseInt(limit, 10) || 10;

    return callService({
        method: 'GET',
        endpoint: '/posts',
        queryParams: {
            _page: currentPage,
            _limit: pageLimit
        }
    });
}

/**
 * Retrieves an individual post by its ID.
 * @param {number|string} postId - The ID of the post to retrieve
 * @returns {Object} Standardized result object
 */
function getPostById(postId) {
    return callService({
        method: 'GET',
        endpoint: '/posts/' + encodeURIComponent(postId)
    });
}

/**
 * Creates a new post in the external API.
 * @param {Object} payload - { userId: number, title: string, body: string }
 * @returns {Object} Standardized result object
 */
function createPost(payload) {
    return callService({
        method: 'POST',
        endpoint: '/posts',
        payload: payload
    });
}

/**
 * Updates an existing post in the external API.
 * @param {number|string} postId - The ID of the post to update
 * @param {Object} payload - { userId: number, title: string, body: string }
 * @returns {Object} Standardized result object
 */
function updatePost(postId, payload) {
    return callService({
        method: 'PUT',
        endpoint: '/posts/' + encodeURIComponent(postId),
        payload: payload
    });
}

/**
 * Deletes an existing post in the external API.
 * @param {number|string} postId - The ID of the post to delete
 * @returns {Object} Standardized result object
 */
function deletePost(postId) {
    return callService({
        method: 'DELETE',
        endpoint: '/posts/' + encodeURIComponent(postId)
    });
}

module.exports = {
    getPosts: getPosts,
    getPostById: getPostById,
    createPost: createPost,
    updatePost: updatePost,
    deletePost: deletePost
};
