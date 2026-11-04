'use strict';

/**
 * ExternalApi.js
 * External REST API (JSONPlaceholder) CRUD operations aur pagination ke liye SFRA Controller.
 * Create, Update aur Delete pure AJAX ke zariye JSON responses handle karte hain.
 */

var server = require('server');
var URLUtils = require('dw/web/URLUtils');
var externalApiService = require('*/cartridge/scripts/services/externalApiService');
var externalApiHelper = require('*/cartridge/scripts/helpers/externalApiHelper');

/**
 * ExternalApi-Show : Main posts listing page (Page 1) render karna
 */
server.get('Show', function (req, res, next) {
    var page = parseInt(req.querystring.page, 10) || 1;
    var limit = parseInt(req.querystring.limit, 10) || 10;

    var result = externalApiService.getPosts(page, limit);
    var pagination = externalApiHelper.calculatePagination(result.data, page, limit, result.totalCount);

    res.render('externalApi/posts', {
        posts: result.data || [],
        pagination: pagination,
        error: result.success ? null : (result.error || 'Posts load nahi ho saki.')
    });
    next();
});

/**
 * ExternalApi-GetPosts : Server-side pagination navigate karne ke liye route (AJAX JSON ya ISML page)
 */
server.get('GetPosts', function (req, res, next) {
    var page = parseInt(req.querystring.page, 10) || 1;
    var limit = parseInt(req.querystring.limit, 10) || 10;

    var result = externalApiService.getPosts(page, limit);
    var pagination = externalApiHelper.calculatePagination(result.data, page, limit, result.totalCount);

    if (req.querystring.format === 'json') {
        res.json({
            success: result.success,
            posts: result.data || [],
            pagination: pagination,
            error: result.error
        });
    } else {
        res.render('externalApi/posts', {
            posts: result.data || [],
            pagination: pagination,
            error: result.success ? null : (result.error || 'Posts load nahi ho saki.')
        });
    }
    next();
});

/**
 * ExternalApi-ViewPost : Specific post details dekhna (GET /posts/{id})
 */
server.get('ViewPost', function (req, res, next) {
    var check = externalApiHelper.validatePostId(req.querystring.id);
    var result = check.isValid
        ? externalApiService.getPostById(check.id)
        : { success: false, error: check.error };

    res.render('externalApi/postDetails', {
        post: result.data || null,
        error: result.success ? null : (result.error || 'Post available nahi hai.')
    });
    next();
});

/**
 * ExternalApi-CreatePost : Nayi post create karne ka form render karna
 */
server.get('CreatePost', function (req, res, next) {
    res.render('externalApi/createPost', {
        actionUrl: URLUtils.url('ExternalApi-SavePost').toString(),
        post: {}
    });
    next();
});

/**
 * ExternalApi-SavePost : Nayi post create karna via AJAX (POST /posts)
 */
server.post('SavePost', function (req, res, next) {
    var validation = externalApiHelper.validatePostPayload(req.form);

    // Backend validation check
    if (!validation.isValid) {
        res.json({ success: false, errors: validation.errors });
        next();
        return;
    }

    // Mock API call to create post (returns 201 Created)
    var result = externalApiService.createPost(validation.data);
    res.json({
        success: result.success,
        message: result.success ? 'Post successfully create ho gayi!' : (result.error || 'Post create nahi ho saki.'),
        data: result.data,
        redirectUrl: URLUtils.url('ExternalApi-Show').toString()
    });
    next();
});

/**
 * ExternalApi-EditPost : Existing post fetch karke pre-populated edit form render karna
 */
server.get('EditPost', function (req, res, next) {
    var check = externalApiHelper.validatePostId(req.querystring.id);
    if (!check.isValid) {
        res.redirect(URLUtils.url('ExternalApi-Show'));
        next();
        return;
    }

    var result = externalApiService.getPostById(check.id);
    res.render('externalApi/editPost', {
        actionUrl: URLUtils.url('ExternalApi-UpdatePost', 'id', check.id).toString(),
        post: result.data || null,
        error: result.success ? null : result.error
    });
    next();
});

/**
 * ExternalApi-UpdatePost : Existing post ko update karna via AJAX (PUT /posts/{id})
 */
server.post('UpdatePost', function (req, res, next) {
    var postId = req.querystring.id || req.form.id;
    var check = externalApiHelper.validatePostId(postId);
    var validation = externalApiHelper.validatePostPayload(req.form);

    // Validation check for ID and form data
    if (!check.isValid || !validation.isValid) {
        var errors = validation.errors || {};
        if (!check.isValid) { errors.id = check.error; }
        res.json({ success: false, errors: errors });
        next();
        return;
    }

    // Mock API call to update post (returns 200 OK)
    var result = externalApiService.updatePost(check.id, validation.data);
    res.json({
        success: result.success,
        message: result.success ? 'Post successfully update ho gayi!' : (result.error || 'Update request fail ho gayi.'),
        data: result.data,
        redirectUrl: URLUtils.url('ExternalApi-Show').toString()
    });
    next();
});

/**
 * ExternalApi-DeletePost : Post delete karna via AJAX (DELETE /posts/{id})
 */
server.post('DeletePost', function (req, res, next) {
    var check = externalApiHelper.validatePostId(req.querystring.id || req.form.id);
    if (!check.isValid) {
        res.json({ success: false, error: check.error });
        next();
        return;
    }

    // Mock API call to delete post (returns 200 OK)
    var result = externalApiService.deletePost(check.id);
    res.json({
        success: result.success,
        message: result.success ? 'Post successfully delete ho gayi!' : (result.error || 'Delete request fail ho gayi.')
    });
    next();
});

module.exports = server.exports();
