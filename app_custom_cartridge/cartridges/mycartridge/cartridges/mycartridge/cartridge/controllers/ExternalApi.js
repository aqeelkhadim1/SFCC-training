'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var externalApiHelper = require('*/cartridge/scripts/helpers/externalApiHelper');

server.get('Show', csrfProtection.generateToken, function (req, res, next) {
  res.render('externalApi/posts', {
    postsUrl: URLUtils.url('ExternalApi-GetPosts').toString(),
    postUrl: URLUtils.url('ExternalApi-ViewPost').toString(),
    editUrl: URLUtils.url('ExternalApi-EditPost').toString(),
    createUrl: URLUtils.url('ExternalApi-SavePost').toString(),
    updateUrl: URLUtils.url('ExternalApi-UpdatePost').toString(),
    deleteUrl: URLUtils.url('ExternalApi-DeletePost').toString(),
    csrf: res.getViewData().csrf
  });
  return next();
});

server.get('GetPosts', function (req, res, next) {
  externalApiHelper.sendResult(res, externalApiHelper.getPosts(req.querystring.page, req.querystring.limit));
  return next();
});

server.get('ViewPost', function (req, res, next) {
  var postId = req.querystring.postId;
  externalApiHelper.sendResult(res, externalApiHelper.getPostById(postId));
  return next();
});

server.get('CreatePost', csrfProtection.generateToken, function (req, res, next) {
  res.render('externalApi/createPost', {
    actionUrl: URLUtils.url('ExternalApi-SavePost').toString(),
    backUrl: URLUtils.url('ExternalApi-Show').toString(),
    values: { userId: '', title: '', body: '' },
    errors: {}
  });
  return next();
});

server.post('SavePost', server.middleware.https, csrfProtection.validateRequest, function (req, res, next) {
  var payload = externalApiHelper.getPayload(req.form);
  externalApiHelper.sendResult(res, externalApiHelper.createPost(payload));
  return next();
});

server.get('EditPost', function (req, res, next) {
  var postId = req.querystring.postId;
  externalApiHelper.sendResult(res, externalApiHelper.getPostById(postId));
  return next();
});

server.post('UpdatePost', server.middleware.https, csrfProtection.validateRequest, function (req, res, next) {
  var postId = req.form.postId;
  var values = externalApiHelper.getPayload(req.form);
  externalApiHelper.sendResult(res, externalApiHelper.updatePost(postId, values));
  return next();
});

server.post('DeletePost', server.middleware.https, csrfProtection.validateRequest, function (req, res, next) {
  var postId = req.form.postId;
  externalApiHelper.sendResult(res, externalApiHelper.deletePost(postId));
  return next();
});

module.exports = server.exports();
