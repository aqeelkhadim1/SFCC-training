'use strict';

/**
 * Controller: ExternalApi
 * Handles storefront routes for interacting with external REST API (JSONPlaceholder).
 *
 * Endpoints:
 * - ExternalApi-Show: Renders the posts listing page with posts data.
 * - ExternalApi-GetPosts: JSON endpoint to retrieve all posts.
 * - ExternalApi-GetPost: JSON endpoint to retrieve a single post by ID (validates postId).
 */

var server = require('server');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var externalApiService = require('*/cartridge/scripts/services/externalApiService');

/**
 * ExternalApi-Show : Displays the posts listing page.
 * Retrieves all posts from the service layer and passes them to the ISML template.
 */
server.get('Show', consentTracking.consent, function (req, res, next) {
    var serviceResult = externalApiService.getPosts();

    var templateData = {
        posts: [],
        errorMessage: null
    };

    if (serviceResult.success && Array.isArray(serviceResult.data)) {
        templateData.posts = serviceResult.data;
    } else {
        // User-friendly error message without leaking technical details
        templateData.errorMessage = 'Unable to load posts from external service. Please try again later.';
    }

    res.render('externalApi/posts', templateData);
    next();
});

/**
 * ExternalApi-GetPosts : Returns all posts in JSON format.
 * Useful for AJAX requests or API testing.
 */
server.get('GetPosts', function (req, res, next) {
    var serviceResult = externalApiService.getPosts();

    res.json({
        success: serviceResult.success,
        statusCode: serviceResult.statusCode,
        data: serviceResult.data || [],
        error: serviceResult.success ? null : 'Failed to retrieve posts from external API.'
    });

    next();
});

/**
 * ExternalApi-GetPost : Retrieves an individual post by ID.
 * Validates the ID parameter and returns the post data in JSON format.
 */
server.get('GetPost', function (req, res, next) {
    var postId = req.querystring.id;
    var parsedId = parseInt(postId, 10);

    if (!postId || Number.isNaN(parsedId) || parsedId <= 0) {
        res.setStatusCode(400);
        res.json({
            success: false,
            statusCode: 400,
            error: 'Invalid or missing Post ID.'
        });
        return next();
    }

    var serviceResult = externalApiService.getPostById(postId);

    if (serviceResult.success && serviceResult.data) {
        res.json({
            success: true,
            statusCode: serviceResult.statusCode,
            data: serviceResult.data
        });
    } else {
        res.setStatusCode(serviceResult.statusCode || 404);
        res.json({
            success: false,
            statusCode: serviceResult.statusCode || 404,
            error: 'Post not found or external service unavailable.'
        });
    }

    return next();
});

module.exports = server.exports();
