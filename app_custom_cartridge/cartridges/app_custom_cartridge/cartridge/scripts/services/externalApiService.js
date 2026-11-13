'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger').getLogger('externalApi', 'service');

/**
 * Generic Service configuration for JSONPlaceholder
 */
var service = LocalServiceRegistry.createService('jsonplaceholder', {
    /**
     * Prepares HTTP request for JSONPlaceholder API
     * @param {dw.svc.HTTPService} svc - The HTTP service instance
     * @param {Object} [params] - Dynamic parameters
     * @returns {string|null} Request body payload
     */
    createRequest: function (svc, params) {
        var options = params || {};
        var baseUrl = svc.configuration.credential.URL;
        var requestUrl = baseUrl + '/' + (options.requestURL || 'posts');
        var method = options.requestType || 'GET';

        svc.setURL(requestUrl);
        svc.setRequestMethod(method);
        svc.addHeader('Accept', 'application/json');

        // Log invocation
        Logger.info('Service Invocation: [{0}] {1}', method, requestUrl);

        // Send payload and Content-Type for non-GET requests when payload is provided
        if (method !== 'GET' && options.payload) {
            var payload = JSON.stringify(options.payload);
            svc.addHeader('Content-Type', 'application/json; charset=UTF-8');
            Logger.debug('Request Payload: {0}', payload);
            return payload;
        }

        return null;
    },

    /**
     * Parses HTTP response
     * @param {dw.svc.HTTPService} svc - The HTTP service instance
     * @param {dw.net.HTTPClient} client - The HTTP client instance
     * @returns {Object|null} Parsed JSON or null
     */
    parseResponse: function (svc, client) {
        // Log HTTP status and response body
        Logger.info('HTTP Response Status: {0} {1}', client.statusCode, client.statusMessage);
        Logger.debug('Response Body: {0}', client.text);

        if (client.text) {
            try {
                return JSON.parse(client.text);
            } catch (e) {
                var errorMessage = e instanceof Error
                    ? e.message
                    : String(e);

                Logger.error('Failed to parse JSON response: {0}', errorMessage);
                return null;
            }
        }
        return null;
    }
});

module.exports = {
    getService: function () {
        return service;
    }
};
