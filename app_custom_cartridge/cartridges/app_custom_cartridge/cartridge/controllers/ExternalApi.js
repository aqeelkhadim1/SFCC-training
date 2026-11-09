'use strict';

var server = require('server');
var URLUtils = require('dw/web/URLUtils');

// SFCC resolves cartridge wildcard aliases at runtime.
// @ts-ignore
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

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
    // @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
    var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
    var result = helper.getPagedPosts(req.querystring, 'ExternalApi-Show');

    if (!result.ok) {
        res.render('externalApi/posts', {
            error: true,
            errorMessage: 'Service error: ' + result.errorMessage,
            posts: result.posts,
            pagination: result.pagination
        });
        return next();
    }

    res.render('externalApi/posts', {
        posts: result.posts,
        pagination: result.pagination
    });

    return next();
});

/**
 * Renders dedicated View More (Infinite Feed) page.
 */
server.get('ViewMore', csrfProtection.generateToken, function (req, res, next) {
    // @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
    var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
    var requestedPage = Math.max(1, Math.floor(Number(req.querystring.page) || 1));
    var pageSize = Math.floor(Number(req.querystring.pageSize) || 10);

    // Always render the first batch. The client restores batches 2..requestedPage
    // so a refreshed View More page remains cumulative instead of showing only
    // the final requested batch.
    var result = helper.getPagedPosts({ page: 1, pageSize: pageSize }, 'ExternalApi-ViewMore');

    if (!result.ok) {
        res.render('externalApi/viewMorePosts', {
            error: true,
            errorMessage: 'Service error: ' + result.errorMessage,
            posts: result.posts,
            pagination: result.pagination,
            restorePage: requestedPage
        });
        return next();
    }

    res.render('externalApi/viewMorePosts', {
        posts: result.posts,
        pagination: result.pagination,
        restorePage: Math.min(requestedPage, result.pagination.totalPages)
    });

    return next();
});

/**
 * Returns posts as JSON for AJAX pagination.
 */
server.get('GetPosts', function (req, res, next) {
    // @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
    var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
    var result = helper.getPagedPosts(req.querystring, 'ExternalApi-GetPosts');

    if (!result.ok) {
        res.setStatusCode(502);
        res.json({ error: 'Unable to retrieve posts' });
        return next();
    }

    res.json({
        posts: result.posts,
        pagination: result.pagination
    });

    return next();
});

/**
 * Retrieves single post by ID
 */
server.get('ViewPost', function (req, res, next) {
    // @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
    var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
    var validation = helper.validateId(req.querystring.id);

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({ error: validation.message });
        return next();
    }

    var result = helper.getPost(validation.id);

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
server.post('SavePost', csrfProtection.validateAjaxRequest, function (req, res, next) {
    // @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
    var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
    var form = req.form || {};
    var validation = helper.validatePost(form);

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({ error: validation.message });
        return next();
    }

    var result = helper.savePost(helper.buildPostPayload(form));

    if (!result.ok) {
        res.setStatusCode(502);
        res.json({ error: 'Unable to create post' });
        return next();
    }

    res.setStatusCode(201);
    res.json(result.data);
    return next();
});

server.post('UpdatePost', csrfProtection.validateAjaxRequest, function (req, res, next) {
    // @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
    var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
    var form = req.form || {};
    var idValidation = helper.validateId(form.id || req.querystring.id);

    if (!idValidation.valid) {
        res.setStatusCode(400);
        res.json({ error: idValidation.message });
        return next();
    }

    var validation = helper.validatePost(form);

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({ error: validation.message });
        return next();
    }

    var result = helper.updatePost(idValidation.id, helper.buildPostPayload(form));

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
server.post('DeletePost', csrfProtection.validateAjaxRequest, function (req, res, next) {
    // @ts-ignore - SFCC resolves the cartridge wildcard alias at runtime.
    var helper = require('*/cartridge/scripts/helpers/externalApiHelper');
    var validation = helper.validateId((req.form || {}).id || req.querystring.id);

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({ error: validation.message });
        return next();
    }

    var result = helper.deletePost(validation.id);

    if (!result.ok) {
        res.setStatusCode(502);
        res.json({ error: 'Unable to delete post' });
        return next();
    }

    res.json({ success: true });
    return next();
});

module.exports = server.exports();
