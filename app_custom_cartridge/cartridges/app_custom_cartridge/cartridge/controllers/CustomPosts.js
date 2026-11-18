'use strict';

var server = require('server');
// SFCC resolves cartridge wildcard aliases at runtime.
// @ts-ignore
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');

server.get('Show', server.middleware.https, function (req, res, next) {
    // @ts-ignore
    var customPostsHelper = require('*/cartridge/scripts/helpers/customPostsHelper');
    res.render('customPosts/posts', customPostsHelper.getPosts(req.querystring));
    return next();
});

server.get('GetPosts', server.middleware.https, function (req, res, next) {
    // @ts-ignore
    var customPostsHelper = require('*/cartridge/scripts/helpers/customPostsHelper');
    res.render('customPosts/components/postList', customPostsHelper.getPosts(req.querystring));
    return next();
});

server.get('ViewPost', server.middleware.https, function (req, res, next) {
    // @ts-ignore
    var customPostsHelper = require('*/cartridge/scripts/helpers/customPostsHelper');
    res.json(customPostsHelper.getPostById(req.querystring.id));
    return next();
});

server.post('SavePost', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    // @ts-ignore
    var customPostsHelper = require('*/cartridge/scripts/helpers/customPostsHelper');
    res.json(customPostsHelper.savePost(req.form));
    return next();
});

server.post('UpdatePost', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    // @ts-ignore
    var customPostsHelper = require('*/cartridge/scripts/helpers/customPostsHelper');
    res.json(customPostsHelper.savePost(req.form, req.form.id || ''));
    return next();
});

server.post('DeletePost', server.middleware.https, csrfProtection.validateAjaxRequest, function (req, res, next) {
    // @ts-ignore
    var customPostsHelper = require('*/cartridge/scripts/helpers/customPostsHelper');
    res.json(customPostsHelper.deletePost(req.form.id));
    return next();
});

module.exports = server.exports();
