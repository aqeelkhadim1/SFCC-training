'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');

// SFCC resolves cartridge wildcard aliases at runtime.
// @ts-ignore
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
// @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
var externalApiHelper = require('*/cartridge/scripts/helpers/externalApiHelper');

/**
 * Default redirect routes
 */
server.get('ExternalApi', function (req, res, next) {
    res.redirect(URLUtils.url('ExternalApi-Show'));
    return next();
});

/**
 * Uses SFCC PagingModel to slice 100 posts into 10 records per page.
 * Flow: Controller -> Helper -> Service
 */
server.get('Show', csrfProtection.generateToken, function (req, res, next) {
    res.render('externalApi/posts', externalApiHelper.getPosts(
        req.querystring,
        'ExternalApi-Show',
        false
    ));
    return next();
});

/**
 * Renders dedicated View More (Infinite Feed) page.
 */
server.get('ViewMore', csrfProtection.generateToken, function (req, res, next) {
    res.render('externalApi/viewMorePosts', externalApiHelper.getPosts(
        req.querystring,
        'ExternalApi-ViewMore',
        true
    ));
    return next();
});

/**
 * Returns posts as JSON for AJAX pagination.
 */
server.get('GetPosts', function (req, res, next) {
    var responseData = externalApiHelper.getPosts(req.querystring, 'ExternalApi-GetPosts', false);
    res.json(responseData);
    return next();
});

/**
 * Retrieves single post by ID
 */
server.get('ViewPost', function (req, res, next) {
    var responseData = externalApiHelper.getPostById(req.querystring.id);
    res.json(responseData);
    return next();
});

/**
 * Handles post creation
 */
server.post('SavePost', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var responseData = externalApiHelper.createPost(req.form || {});
    res.json(responseData);
    return next();
});

server.post('UpdatePost', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var form = req.form || {};
    var responseData = externalApiHelper.updatePost(form.id || req.querystring.id, form);
    res.json(responseData);
    return next();
});

/**
 * Handles delete post
 */
server.post('DeletePost', csrfProtection.validateAjaxRequest, function (req, res, next) {
    var postId = (req.form || {}).id || req.querystring.id;
    var responseData = externalApiHelper.deletePost(postId);
    res.json(responseData);
    return next();
});

module.exports = server.exports();
