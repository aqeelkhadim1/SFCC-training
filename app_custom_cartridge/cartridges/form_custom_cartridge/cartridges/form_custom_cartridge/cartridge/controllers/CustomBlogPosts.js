/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * @namespace CustomBlogPosts
 * Thin SFRA controller for CustomBlogPost Custom Object CRUD & AJAX PagingModel pagination.
 */

var server = require('server');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var renderTemplateHelper = require('*/cartridge/scripts/renderTemplateHelper');
var customBlogPostHelper = require('*/cartridge/scripts/helpers/customBlogPostHelper');

server.get('Show', csrfProtection.generateToken, function (req, res, next) {
    var data = customBlogPostHelper.getPaginatedPosts(req.querystring.page, customBlogPostHelper.DEFAULT_PAGE_SIZE);
    res.render('customBlogPosts/posts', data);
    return next();
});

server.get('List', function (req, res, next) {
    res.cachePeriod = 0; // eslint-disable-line no-param-reassign
    var data = customBlogPostHelper.getPaginatedPosts(req.querystring.page, customBlogPostHelper.DEFAULT_PAGE_SIZE);
    data.rowsHtml = data.success
        ? renderTemplateHelper.getRenderedHtml({ posts: data.posts }, 'customBlogPosts/components/postRows')
        : '';
    res.json(data);
    return next();
});

server.post(
    'Save',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    csrfProtection.generateToken,
    function (req, res, next) {
        res.json(customBlogPostHelper.savePost(req.form));
        return next();
    }
);

server.post(
    'Delete',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    csrfProtection.generateToken,
    function (req, res, next) {
        res.json(customBlogPostHelper.deletePost(req.form.postId || req.querystring.postId));
        return next();
    }
);

module.exports = server.exports();
