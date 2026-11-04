'use strict';

var server = require('server');
var Logger = require('dw/system/Logger');
var URLUtils = require('dw/web/URLUtils');

var externalApiService = require('*/cartridge/scripts/services/externalApiService');
var externalApiHelper = require('*/cartridge/scripts/helpers/externalApiHelper');

var logger = Logger.getLogger('externalApi', 'controller');

/**
 * Redirects to the posts listing.
 */
function redirectToShow(req, res, next) {
    res.redirect(URLUtils.url('ExternalApi-Show'));
    return next();
}

/**
 * Handles failed service responses.
 *
 * @param {Object} res - Response object
 * @param {Object} serviceResult - Service result
 * @param {string} message - Public error message
 * @param {boolean} renderPage - Whether to render an error page
 * @returns {boolean} Always false
 */
function handleServiceError(res, serviceResult, message, renderPage) {
    var statusCode = serviceResult && serviceResult.statusCode
        ? serviceResult.statusCode
        : 502;

    logger.error(
        'External API request failed. Status: {0}, Error: {1}',
        statusCode,
        serviceResult && serviceResult.error
            ? serviceResult.error
            : 'UNKNOWN_ERROR'
    );

    res.setStatusCode(statusCode >= 400 ? statusCode : 502);

    if (renderPage) {
        res.render('externalApi/error', {
            message: message
        });
    } else {
        res.json({
            success: false,
            message: message
        });
    }

    return false;
}

/**
 * Fetches posts and creates pagination data.
 *
 * @param {Object} queryString - Request query parameters
 * @returns {Object} Posts, pagination, and success status
 */
function getPostsData(queryString) {
    var params = externalApiHelper.getPaginationParams(queryString);

    var serviceResult = externalApiService.getPosts(
        params.page,
        params.limit
    );

    if (!serviceResult.ok) {
        return {
            ok: false,
            serviceResult: serviceResult
        };
    }

    var pagination = externalApiHelper.createPaginationModel(
        serviceResult.data,
        params.page,
        params.limit,
        serviceResult.totalCount
    );

    return {
        ok: true,
        posts: serviceResult.data,
        pagination: pagination
    };
}

/**
 * Default endpoint.
 */
server.get('Start', redirectToShow);
server.get('ExternalApi', redirectToShow);

/**
 * Renders the posts listing page.
 */
server.get('Show', function (req, res, next) {
    var result = getPostsData(req.querystring);

    if (!result.ok) {
        handleServiceError(
            res,
            result.serviceResult,
            'Unable to retrieve posts from external service.',
            true
        );

        return next();
    }

    res.render('externalApi/posts', {
        posts: result.posts,
        pagination: result.pagination
    });

    return next();
});

/**
 * Returns posts as JSON for AJAX pagination.
 */
server.get('GetPosts', function (req, res, next) {
    var result = getPostsData(req.querystring);

    if (!result.ok) {
        handleServiceError(
            res,
            result.serviceResult,
            'Unable to retrieve posts at this time.',
            false
        );

        return next();
    }

    res.json({
        success: true,
        posts: result.posts,
        pagination: result.pagination
    });

    return next();
});

/**
 * Displays a single post as JSON.
 */
server.get('ViewPost', function (req, res, next) {
    var validation = externalApiHelper.validatePostId(
        req.querystring.id
    );

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({
            success: false,
            message: validation.message
        });

        return next();
    }

    var serviceResult = externalApiService.getPostById(
        validation.value
    );

    if (!serviceResult.ok || !serviceResult.data) {
        handleServiceError(
            res,
            serviceResult,
            'Record unavailable or failed to load.',
            false
        );

        return next();
    }

    res.json({
        success: true,
        post: serviceResult.data
    });

    return next();
});

/**
 * Displays the create form.
 */
server.get('CreatePost', function (req, res, next) {
    res.render('externalApi/createPost');
    return next();
});

/**
 * Creates a post.
 */
server.post('SavePost', function (req, res, next) {
    var validation = externalApiHelper.validatePostPayload(
        req.form.userId,
        req.form.title,
        req.form.body
    );

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({
            success: false,
            message: validation.message
        });

        return next();
    }

    var serviceResult = externalApiService.createPost(
        validation.payload
    );

    if (!serviceResult.ok) {
        handleServiceError(
            res,
            serviceResult,
            'Unable to save post to external service.',
            false
        );

        return next();
    }

    res.setStatusCode(201);
    res.json({
        success: true,
        message: 'Post created successfully.',
        post: serviceResult.data
    });

    return next();
});

/**
 * Displays the edit form.
 */
server.get('EditPost', function (req, res, next) {
    var validation = externalApiHelper.validatePostId(
        req.querystring.id
    );

    if (!validation.valid) {
        res.setStatusCode(400);
        res.render('externalApi/error', {
            message: validation.message
        });

        return next();
    }

    var serviceResult = externalApiService.getPostById(
        validation.value
    );

    if (!serviceResult.ok || !serviceResult.data) {
        handleServiceError(
            res,
            serviceResult,
            'Post not found.',
            true
        );

        return next();
    }

    res.render('externalApi/editPost', {
        post: serviceResult.data
    });

    return next();
});

/**
 * Updates a post.
 * Browser form submits POST; service sends PUT to the external API.
 */
server.post('UpdatePost', function (req, res, next) {
    var idValidation = externalApiHelper.validatePostId(
        req.form.id
    );

    var payloadValidation = externalApiHelper.validatePostPayload(
        req.form.userId,
        req.form.title,
        req.form.body
    );

    if (!idValidation.valid || !payloadValidation.valid) {
        res.setStatusCode(400);
        res.json({
            success: false,
            message: !idValidation.valid
                ? idValidation.message
                : payloadValidation.message
        });

        return next();
    }

    var serviceResult = externalApiService.updatePost(
        idValidation.value,
        payloadValidation.payload
    );

    if (!serviceResult.ok) {
        handleServiceError(
            res,
            serviceResult,
            'Unable to update post.',
            false
        );

        return next();
    }

    res.json({
        success: true,
        message: 'Post updated successfully.',
        post: serviceResult.data
    });

    return next();
});

/**
 * Deletes a post.
 * Browser form submits POST; service sends DELETE to the external API.
 */
server.post('DeletePost', function (req, res, next) {
    var validation = externalApiHelper.validatePostId(
        req.form.id
    );

    if (!validation.valid) {
        res.setStatusCode(400);
        res.json({
            success: false,
            message: validation.message
        });

        return next();
    }

    var serviceResult = externalApiService.deletePost(
        validation.value
    );

    if (!serviceResult.ok) {
        handleServiceError(
            res,
            serviceResult,
            'Unable to delete post.',
            false
        );

        return next();
    }

    res.json({
        success: true,
        message: 'Post deleted successfully.'
    });

    return next();
});

module.exports = server.exports();