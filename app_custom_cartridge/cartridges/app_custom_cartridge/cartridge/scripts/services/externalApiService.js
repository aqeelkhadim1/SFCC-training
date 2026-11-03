'use strict';

/**
 * Service Layer: externalApiService
 * Communicates with the JSONPlaceholder external REST API using SFCC's LocalServiceRegistry.
 *
 * Configured in Business Manager:
 * - Service ID: http.jsonplaceholder
 * - Profile: jsonPlaceholderProfile
 * - Credential: jsonPlaceholderCredential
 */

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('jsonPlaceholder', 'externalApiService');

/**
 * Creates and initializes the HTTP Service definition via LocalServiceRegistry.
 * Handles request configuration (method, headers, dynamic endpoint, payload)
 * and response parsing (JSON parsing, HTTP status).
 */
var jsonPlaceholderService = LocalServiceRegistry.createService('http.jsonplaceholder', {
    /**
     * Prepares the HTTP request before sending.
     * @param {dw.svc.HTTPService} svc - The service instance provided by SFCC.
     * @param {Object} params - Parameters passed into svc.call(params).
     * @param {string} params.method - HTTP method (GET, POST, PUT, DELETE).
     * @param {string} params.endpoint - Relative URL path (e.g. '/posts' or '/posts/1').
     * @param {Object} [params.payload] - Optional request body object for POST/PUT.
     * @returns {string|null} Serialized JSON body or null for GET/DELETE requests.
     */
    createRequest: function (svc, params) {
        var requestMethod = (params && params.method) ? params.method.toUpperCase() : 'GET';
        svc.setRequestMethod(requestMethod);
        svc.addHeader('Content-Type', 'application/json');
        svc.addHeader('Accept', 'application/json');

        // Dynamically append the endpoint to the credential base URL
        var baseUrl = svc.configuration.credential.URL;
        if (baseUrl.charAt(baseUrl.length - 1) === '/') {
            baseUrl = baseUrl.substring(0, baseUrl.length - 1);
        }

        var endpoint = (params && params.endpoint) ? params.endpoint : '/posts';
        if (endpoint.charAt(0) !== '/') {
            endpoint = '/' + endpoint;
        }

        svc.setURL(baseUrl + endpoint);

        // Serialize payload if present (for Day 2 POST/PUT operations)
        if (params && params.payload) {
            return JSON.stringify(params.payload);
        }

        return null;
    },

    /**
     * Parses the HTTP response returned by the external API.
     * Safely parses JSON and extracts status information.
     * @param {dw.svc.HTTPService} svc - The service instance.
     * @param {dw.net.HTTPClient} httpClient - The client with response text & status.
     * @returns {Object} Structured response object containing status and parsed data.
     */
    parseResponse: function (svc, httpClient) {
        var parsedData = null;
        var rawText = httpClient.text;

        if (rawText) {
            try {
                parsedData = JSON.parse(rawText);
            } catch (e) {
                Logger.warn('Response from {0} could not be parsed as JSON: {1}', svc.getURL(), rawText);
                parsedData = rawText;
            }
        }

        return {
            statusCode: httpClient.statusCode,
            statusMessage: httpClient.statusMessage,
            data: parsedData
        };
    },

    /**
     * Filters sensitive data from logs (if any).
     * @param {string} msg - The log message.
     * @returns {string} Filtered message.
     */
    filterLogMessage: function (msg) {
        return msg;
    }
});

/**
 * Generic internal caller that executes the service call with comprehensive error handling.
 * @param {Object} requestParams - Parameters for createRequest ({ method, endpoint, payload }).
 * @returns {Object} Standardized result object { success: boolean, data?: any, statusCode: number, error?: string }.
 */
function executeServiceCall(requestParams) {
    var result = {
        success: false,
        statusCode: 500,
        data: null,
        error: null
    };

    try {
        var serviceResult = jsonPlaceholderService.call(requestParams);

        if (serviceResult.isOk() && serviceResult.object) {
            result.success = true;
            result.statusCode = serviceResult.object.statusCode;
            result.data = serviceResult.object.data;
        } else {
            // Service call failed, timed out, or returned 4xx/5xx
            result.statusCode = serviceResult.error || 500;
            result.error = serviceResult.errorMessage || 'External service call failed';

            Logger.error('Service call to {0} failed. Status: {1}, ErrorMessage: {2}',
                requestParams.endpoint,
                serviceResult.status,
                serviceResult.errorMessage
            );
        }
    } catch (e) {
        Logger.error('Exception during service call to {0}: {1} (Line: {2})',
            requestParams.endpoint,
            e.message,
            e.lineNumber
        );
        result.error = e.message;
    }

    return result;
}

/**
 * Day 1 Method 1: Retrieve all posts.
 * GET /posts
 * @returns {Object} Service response with array of posts.
 */
function getPosts() {
    return executeServiceCall({
        method: 'GET',
        endpoint: '/posts'
    });
}

/**
 * Day 1 Method 2: Retrieve an individual post by ID.
 * GET /posts/{id}
 * @param {string|number} postId - Numeric ID of the post.
 * @returns {Object} Service response with post object.
 */
function getPostById(postId) {
    var parsedId = parseInt(postId, 10);
    if (!postId || Number.isNaN(parsedId) || parsedId <= 0) {
        return {
            success: false,
            statusCode: 400,
            data: null,
            error: 'Invalid or missing Post ID.'
        };
    }

    return executeServiceCall({
        method: 'GET',
        endpoint: '/posts/' + parsedId
    });
}

module.exports = {
    getPosts: getPosts,
    getPostById: getPostById,
    // Expose generic caller so Day 2 operations (createPost, updatePost, deletePost) can be easily plugged in
    executeServiceCall: executeServiceCall
};
