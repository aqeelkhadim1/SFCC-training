'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');

var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
var pagingHelper = require('*/cartridge/scripts/helpers/externalApiPaging');

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
server.get('Show', function (req, res, next) {
    var params = helper.getPagingParams(req.querystring);

    var result = helper.callApi({
        requestType: 'GET',
        requestURL: 'posts'
    });

    if (!result.ok || !result.data) {
        res.render('externalApi/posts', {
            error: true,
            errorMessage: 'Service error: ' + (result.errorMessage || 'No data returned')
        });
        return next();
    }

    var pagedResult = pagingHelper.createPagingModel(
        result.data || [],
        params.page,
        params.pageSize,
        'ExternalApi-Show'
    );

    res.render('externalApi/posts', {
        posts: pagedResult.records,
        pagination: pagedResult.pagination
    });

    return next();
});

/**
 * Renders dedicated View More (Infinite Feed) page.
 */
server.get('ViewMore', function (req, res, next) {
    var params = helper.getPagingParams(req.querystring);

    var result = helper.callApi({
        requestType: 'GET',
        requestURL: 'posts'
    });

    if (!result.ok || !result.data) {
        res.render('externalApi/viewMorePosts', {
            error: true,
            errorMessage: 'Service error: ' + (result.errorMessage || 'No data returned')
        });
        return next();
    }

    var pagedResult = pagingHelper.createPagingModel(
        result.data || [],
        params.page,
        params.pageSize,
        'ExternalApi-ViewMore'
    );

    res.render('externalApi/viewMorePosts', {
        posts: pagedResult.records,
        pagination: pagedResult.pagination
    });

    return next();
});

/**
 * Returns posts as JSON for AJAX pagination.
 */
server.get('GetPosts', function (req, res, next) {
    var params = helper.getPagingParams(req.querystring);

    var result = helper.callApi({
        requestType: 'GET',
        requestURL: 'posts'
    });

    if (!result.ok || !result.data) {
        res.json({ error: 'Unable to retrieve posts' });
        return next();
    }

    var pagedResult = pagingHelper.createPagingModel(
        result.data,
        params.page,
        params.pageSize,
        'ExternalApi-GetPosts'
    );

    res.json({
        posts: pagedResult.records,
        pagination: pagedResult.pagination
    });

    return next();
});

/**
 * Retrieves single post by ID
 */
server.get('ViewPost', function (req, res, next) {
    var postId = req.querystring.id;

    if (!helper.isValidId(postId)) {
        res.setStatusCode(400);
        res.json({ error: 'Invalid post ID' });
        return next();
    }

    var result = helper.callApi({
        requestType: 'GET',
        requestURL: 'posts/' + postId
    });

    if (!result.ok || !result.data) {
        res.setStatusCode(404);
        res.json({ error: 'Post not found' });
        return next();
    }

    res.json(result.data);
    return next();
});

/**
 * Handles post creation
 */
server.post('SavePost', function (req, res, next) {
    var form = req.form || {};
    var validation = helper.validatePost(form);

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({ error: validation.message });
        return next();
    }

    var payload = {
        userId: parseInt(String(form.userId), 10),
        title: form.title,
        body: form.body
    };

    var result = helper.callApi({
        requestType: 'POST',
        requestURL: 'posts',
        payload: payload
    });

    if (!result.ok) {
        res.setStatusCode(502);
        res.json({ error: 'Unable to create post' });
        return next();
    }

    res.setStatusCode(201);
    res.json(result.data);
    return next();
});

/**
 * Displays edit form (Day 2)
 */
server.get('EditPost', function (req, res, next) {
    var postId = req.querystring.id;

    if (!helper.isValidId(postId)) {
        res.setStatusCode(400);
        res.render('externalApi/error', { message: 'Invalid post ID' });
        return next();
    }

    var result = helper.callApi({
        requestType: 'GET',
        requestURL: 'posts/' + postId
    });

    if (!result.ok || !result.data) {
        res.setStatusCode(404);
        res.render('externalApi/error', { message: 'Post not found' });
        return next();
    }

    res.render('externalApi/editPost', { post: result.data });
    return next();
});


server.post('UpdatePost', function (req, res, next) {
    var form = req.form || {};
    var postId = form.id || req.querystring.id;

    if (!helper.isValidId(postId)) {
        res.setStatusCode(400);
        res.json({ error: 'Invalid post ID' });
        return next();
    }

    var validation = helper.validatePost(form);

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({ error: validation.message });
        return next();
    }

    var payload = {
        userId: parseInt(String(form.userId), 10),
        title: form.title,
        body: form.body
    };

    var result = helper.callApi({
        requestType: 'PUT',
        requestURL: 'posts/' + postId,
        payload: payload
    });

    if (!result.ok) {
        res.setStatusCode(502);
        res.json({ error: 'Unable to update post' });
        return next();
    }
    res.json(result.data);
    return next();
});

/**
 * Handles delete post
 */
server.post('DeletePost', function (req, res, next) {
    var form = req.form || {};
    var postId = form.id || req.querystring.id;

    if (!helper.isValidId(postId)) {
        res.setStatusCode(400);
        res.json({ error: 'Invalid post ID' });
        return next();
    }

    var result = helper.callApi({
        requestType: 'DELETE',
        requestURL: 'posts/' + postId
    });

    if (!result.ok) {
        res.setStatusCode(502);
        res.json({ error: 'Unable to delete post' });
        return next();
    }

    res.json({ success: true });
    return next();
});

module.exports = server.exports();
