'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var logger = Logger.getLogger('externalApi', 'externalApi');
var SERVICE_ID = 'External API Profile';
var BASE_URL = 'https://jsonplaceholder.typicode.com';

var apiService = LocalServiceRegistry.createService(SERVICE_ID, {
  createRequest: function (service, args) {
    var query = args.query || '';

    service.setRequestMethod(args.method);
    service.addHeader('Accept', 'application/json');
    service.addHeader('Content-Type', 'application/json');
    service.setURL(BASE_URL + args.path + query);

    if (args.payload) {
      return JSON.stringify(args.payload);
    }
    return null;
  },
  parseResponse: function (service, client) {
    var responseBody = client.text;
    var result = { statusCode: client.statusCode, data: null, parseError: false };

    if (responseBody) {
      try {
        result.data = JSON.parse(responseBody);
      } catch (error) {
        result.parseError = true;
      }
    }
    return result;
  },
  filterLogMessage: function (message) {
    return message;
  }
});

function callApi(method, path, query, payload) {
  var result;
  var response;
  var statusCode;
  var success;

  logger.info('Invoking JSONPlaceholder {0} {1}', method, path);
  try {
    result = apiService.call({ method: method, path: path, query: query || '', payload: payload || null });
  } catch (error) {
    logger.error('JSONPlaceholder call threw an exception for {0} {1}: {2}', method, path, error.message);
    return { ok: false, statusCode: 0, data: null, error: 'The external service could not be reached.' };
  }

  response = result && result.object;
  statusCode = response && response.statusCode;
  success = !!(result && result.ok && statusCode >= 200 && statusCode < 300);
  logger.info('JSONPlaceholder response status: {0}', statusCode || 'unavailable');

  if (!success) {
    logger.error('JSONPlaceholder request failed ({0}): {1}', statusCode || 'no status', result && result.errorMessage);
    return {
      ok: false,
      statusCode: statusCode || 0,
      data: response && response.data,
      error: response && response.parseError
        ? 'The external service returned invalid JSON.'
        : 'The external service request failed.'
    };
  }

  if (response.parseError) {
    logger.error('JSONPlaceholder returned invalid JSON for {0} {1}', method, path);
    return { ok: false, statusCode: statusCode, data: null, error: 'The external service returned invalid JSON.' };
  }

  return { ok: true, statusCode: statusCode, data: response.data, error: null };
}

function getPosts(page, limit) {
  return callApi('GET', '/posts', '?_page=' + page + '&_limit=' + limit);
}

function getPostById(postId) {
  return callApi('GET', '/posts/' + postId);
}

function createPost(payload) {
  return callApi('POST', '/posts', '', payload);
}

function updatePost(postId, payload) {
  return callApi('PUT', '/posts/' + postId, '', payload);
}

function deletePost(postId) {
  return callApi('DELETE', '/posts/' + postId);
}

module.exports = {
  getPosts: getPosts,
  getPostById: getPostById,
  createPost: createPost,
  updatePost: updatePost,
  deletePost: deletePost
};
