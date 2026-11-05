'use strict';

/**
 * ExternalApi.js
 * External REST API (JSONPlaceholder) CRUD & Pagination SFRA Controller.
 * Architectural Flow: Controller -> Helper -> Service -> Helper -> Controller -> View (ISML / JSON)
 */

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var externalApiHelper = require('*/cartridge/scripts/helpers/externalApiHelper');

/**
 * ExternalApi-Show : Main posts listing page render karna (GET)
 */
server.get('Show', function (req, res, next) {
    // Controller -> Helper call karta hai
    var viewData = externalApiHelper.getPosts(req.querystring.page, req.querystring.limit);

    // Controller View (ISML template) ko data handover karta hai
    res.render('externalApi/posts', viewData);
    next();
});

/**
 * ExternalApi-GetPosts : Server pagination navigate karne ke liye route (AJAX JSON ya ISML page)
 */
server.get('GetPosts', function (req, res, next) {
    var viewData = externalApiHelper.getPosts(req.querystring.page, req.querystring.limit);

    if (req.querystring.format === 'json') {
        res.json(viewData);
    } else {
        res.render('externalApi/posts', viewData);
    }
    next();
});

/**
 * ExternalApi-ViewPost : Specific post details dekhna (GET /posts/{id})
 */
server.get('ViewPost', function (req, res, next) {
    var viewData = externalApiHelper.getPostById(req.querystring.id);
    res.render('externalApi/postDetails', viewData);
    next();
});

/**
 * ExternalApi-CreatePost : Nayi post create karne ka form render karna (GET)
 */
server.get('CreatePost', function (req, res, next) {
    res.render('externalApi/createPost', {
        actionUrl: URLUtils.url('ExternalApi-SavePost').toString(),
        post: {},
        errors: {}
    });
    next();
});

/**
 * ExternalApi-SavePost : Nayi post create karna via AJAX (POST /posts)
 */
server.post('SavePost', function (req, res, next) {
    // Controller -> Helper -> Service -> Helper -> Controller
    var responseData = externalApiHelper.createPost(req.form);
    res.json(responseData);
    next();
});

/**
 * ExternalApi-EditPost : Existing post fetch karke pre-populated edit form render karna (GET)
 */
server.get('EditPost', function (req, res, next) {
    var check = externalApiHelper.validatePostId(req.querystring.id);
    if (!check.isValid) {
        res.redirect(URLUtils.url('ExternalApi-Show'));
        next();
        return;
    }

    var result = externalApiHelper.getPostById(check.id);
    res.render('externalApi/editPost', {
        actionUrl: URLUtils.url('ExternalApi-UpdatePost', 'id', check.id).toString(),
        post: result.post,
        error: result.error
    });
    next();
});

/**
 * ExternalApi-UpdatePost : Existing post ko update karna via AJAX (PUT /posts/{id})
 */
server.post('UpdatePost', function (req, res, next) {
    var postId = req.querystring.id || req.form.id;
    // Controller -> Helper -> Service -> Helper -> Controller
    var responseData = externalApiHelper.updatePost(postId, req.form);
    res.json(responseData);
    next();
});

/**
 * ExternalApi-DeletePost : Post delete karna via AJAX (DELETE /posts/{id})
 */
server.post('DeletePost', function (req, res, next) {
    var postId = req.querystring.id || req.form.id;
    // Controller -> Helper -> Service -> Helper -> Controller
    var responseData = externalApiHelper.deletePost(postId);
    res.json(responseData);
    next();
});

module.exports = server.exports();
