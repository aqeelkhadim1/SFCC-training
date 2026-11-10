'use strict';

var externalApiService = require('*/cartridge/scripts/services/externalApiService');
var POST_ID_PATTERN = /^[1-9]\d*$/;

function isValidPostId(value) {
  return POST_ID_PATTERN.test(String(value || ''));
}

function invalid(errors) {
  return { ok: false, statusCode: 400, data: null, error: null, errors: errors };
}

function sendResult(res, result) {
  var status = result.statusCode || 502;
  res.setStatusCode(status);
  res.json({
    success: result.ok,
    data: result.data,
    error: result.error || null,
    errors: result.errors || null
  });
}

function getPayload(form) {
  return {
    userId: form.userId,
    title: form.title,
    body: form.body
  };
}

function validatePost(payload) {
  var userId = payload && String(payload.userId || '').trim();
  var title = payload && String(payload.title || '').trim();
  var body = payload && String(payload.body || payload.description || '').trim();
  var errors = {};

  if (!userId || !/^[1-9]\d*$/.test(userId)) {
    errors.userId = 'User ID must be a positive integer.';
  }
  if (!title) {
    errors.title = 'Title is required.';
  }
  if (!body) {
    errors.body = 'Description is required.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors,
    value: { userId: Number(userId), title: title, body: body }
  };
}

/**
 * Retrieves a list of posts from the external API.
 * @param {number|string} page - The page number to retrieve (1-based).
 * @param {number|string} limit - The number of posts per page (max 10).
 * @returns {Object} The result object containing the posts or an error.
 */
function getPosts(page, limit) {
  var parsedPage = parseInt(page, 10);
  var parsedLimit = parseInt(limit, 10);
  var safePage = Math.max(1, parsedPage || 1);
  var safeLimit = Math.min(10, Math.max(1, parsedLimit || 10));
  return externalApiService.getPosts(safePage, safeLimit);
}

function getPostById(postId) {
  var result;
  if (!isValidPostId(postId)) {
    return invalid({ postId: 'A valid positive post ID is required.' });
  }
  result = externalApiService.getPostById(postId);
  if (result.ok && !result.data) {
    result.ok = false;
    result.statusCode = 404;
    result.error = 'Post was not found.';
  }
  return result;
}

function createPost(payload) {
  var validation = validatePost(payload);
  return validation.valid ? externalApiService.createPost(validation.value) : invalid(validation.errors);
}

function updatePost(postId, payload) {
  var validation;
  if (!isValidPostId(postId)) {
    return invalid({ postId: 'A valid positive post ID is required.' });
  }
  validation = validatePost(payload);
  return validation.valid ? externalApiService.updatePost(postId, validation.value) : invalid(validation.errors);
}

function deletePost(postId) {
  if (!isValidPostId(postId)) {
    return invalid({ postId: 'A valid positive post ID is required.' });
  }
  return externalApiService.deletePost(postId);
}

module.exports = {
  sendResult: sendResult,
  getPayload: getPayload,
  isValidPostId: isValidPostId,
  validatePost: validatePost,
  getPosts: getPosts,
  getPostById: getPostById,
  createPost: createPost,
  updatePost: updatePost,
  deletePost: deletePost
};
