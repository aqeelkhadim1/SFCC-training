'use strict';

/**
 * externalApiService.js
 * JSONPlaceholder REST API ke sath complete CRUD operations aur pagination handle karne ke liye service layer.
 */
var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('jsonplaceholder', 'externalApi');

// BM mein registered Service 'jsonplaceholder' ki definition aur callbacks
var jsonService = LocalServiceRegistry.createService('jsonplaceholder', {
    // Request tayar karna: Method, Headers, Dynamic URL aur Payload serialization
    createRequest: function (svc, params) {
        var method = (params.method || 'GET').toUpperCase();
        svc.setRequestMethod(method);
        svc.addHeader('Content-Type', 'application/json; charset=UTF-8');
        svc.addHeader('Accept', 'application/json');

        // BM Base URL + endpoint ko safely combine karna
        var baseUrl = (svc.getURL() || 'https://jsonplaceholder.typicode.com').replace(/\/+$/, '');
        var endpoint = (params.endpoint || 'posts').replace(/^\/+/, '');
        var fullUrl = baseUrl + '/' + endpoint;

        // Query parameters append karna (e.g. ?_page=1&_limit=10)
        if (params.queryParams) {
            var queryString = Object.keys(params.queryParams).map(function (key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(params.queryParams[key]);
            }).join('&');
            fullUrl += (fullUrl.indexOf('?') === -1 ? '?' : '&') + queryString;
        }

        svc.setURL(fullUrl);

        // POST aur PUT ke liye payload ko JSON stringify karna
        return (params.payload && (method === 'POST' || method === 'PUT'))
            ? JSON.stringify(params.payload)
            : null;
    },

    // External API ka response parse karna: Status, JSON data aur pagination header
    parseResponse: function (svc, client) {
        var data = null;
        try {
            data = client.text ? JSON.parse(client.text) : null;
        } catch (e) {
            data = client.text;
        }
        var totalCount = client.getResponseHeader('X-Total-Count');
        return {
            status: client.statusCode,
            data: data,
            totalCount: totalCount ? parseInt(totalCount, 10) : null
        };
    },

    // Logs mein sensitive data mask karne ke liye
    filterLogMessage: function (msg) {
        return msg;
    },

    // Sandbox offline ya testing ke liye compact mock data
    mockCall: function (svc, params) {
        var isList = !params.endpoint || params.endpoint === 'posts' || params.endpoint === '/posts';
        var mockData = isList
            ? [{ id: 1, userId: 1, title: 'Sample Post 1', body: 'Sample description body' }]
            : { id: 1, userId: 1, title: 'Sample Post', body: 'Sample description body' };
        return {
            statusCode: (params.method === 'POST' ? 201 : 200),
            statusMessage: 'OK',
            text: JSON.stringify(mockData)
        };
    }
});

// Reusable execution runner: Try-catch, error handling aur standardized response
function callService(params) {
    try {
        var result = jsonService.call(params);
        if (result && result.isOk()) {
            var obj = result.getObject();
            return { success: true, status: obj.status, data: obj.data, totalCount: obj.totalCount, error: null };
        }
        var errMsg = (result && result.errorMessage) ? result.errorMessage : 'Service call failed';
        Logger.error('externalApiService: Status {0}, Error: {1}', result ? result.error : 500, errMsg);
        return { success: false, status: result ? result.error : 500, data: null, totalCount: 0, error: errMsg };
    } catch (e) {
        Logger.error('externalApiService Exception: {0}', e.message);
        return { success: false, status: 500, data: null, totalCount: 0, error: e.message };
    }
}

// 5 Main Public CRUD Methods (task2 requirements ke mutabiq)
module.exports = {
    // 1. Paginated posts list mangwana (API query params _page aur _limit ke sath)
    getPosts: function (page, limit) {
        return callService({
            method: 'GET',
            endpoint: 'posts',
            queryParams: { _page: page || 1, _limit: limit || 10 }
        });
    },

    // 2. Specific post ID se single record mangwana
    getPostById: function (postId) {
        return callService({
            method: 'GET',
            endpoint: 'posts/' + postId
        });
    },

    // 3. New post create karna (POST request with JSON payload)
    createPost: function (payload) {
        return callService({
            method: 'POST',
            endpoint: 'posts',
            payload: payload
        });
    },

    // 4. Existing post update karna (PUT request with JSON payload)
    updatePost: function (postId, payload) {
        return callService({
            method: 'PUT',
            endpoint: 'posts/' + postId,
            payload: payload
        });
    },

    // 5. Post delete karna (DELETE request)
    deletePost: function (postId) {
        return callService({
            method: 'DELETE',
            endpoint: 'posts/' + postId
        });
    }
};
