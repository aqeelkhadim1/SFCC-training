/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * ExternalApi.js
 * External REST API (JSONPlaceholder) CRUD & Pagination SFRA Controller.
 * Architectural Flow: Controller -> Helper -> Service -> Helper -> Controller -> View (ISML / JSON)
 */

var server = require('server');
var externalApiHelper = require('*/cartridge/scripts/helpers/externalApiHelper');

/**
 * ExternalApi-Show : Main posts listing page render karna (GET)
 */
server.get('Show', function (req, res, next) {
    var viewData = externalApiHelper.getPosts(req.querystring.page, req.querystring.limit);
    res.render('externalApi/posts', viewData);
    next();
});

/**
 * ExternalApi-GetPosts : Server pagination aur AJAX Load More ke liye route (AJAX JSON ya ISML page)
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
 * ExternalApi-ViewMore : Dedicated Load More / Infinite Append page render karna (GET)
 */
server.get('ViewMore', function (req, res, next) {
    var viewData = externalApiHelper.getPosts(1, 10);
    res.render('externalApi/viewMore', viewData);
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
 * ExternalApi-SavePost : Nayi post create karna via Unified Modal AJAX (POST /posts)
 */
server.post('SavePost', function (req, res, next) {
    var responseData = externalApiHelper.createPost(req.form);
    res.json(responseData);
    next();
});

/**
 * ExternalApi-UpdatePost : Existing post ko update karna via Unified Modal AJAX (PUT /posts/{id})
 */
server.post('UpdatePost', function (req, res, next) {
    var postId = req.querystring.id || req.form.id;
    var responseData = externalApiHelper.updatePost(postId, req.form);
    res.json(responseData);
    next();
});

/**
 * ExternalApi-DeletePost : Post delete karna via Unified Modal AJAX (DELETE /posts/{id})
 */
server.post('DeletePost', function (req, res, next) {
    var postId = req.querystring.id || req.form.id;
    var responseData = externalApiHelper.deletePost(postId);
    res.json(responseData);
    next();
});

module.exports = server.exports();
