/* eslint-disable */
// @ts-nocheck
'use strict';

/**
 * customBlogPostHelper.js — SFCC CustomBlogPost CRUD, validation, savePost & PagingModel pagination.
 */

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var ArrayList = require('dw/util/ArrayList');
var PagingModel = require('dw/web/PagingModel');
var UUIDUtils = require('dw/util/UUIDUtils');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger').getLogger('customBlogPost', 'customBlogPost');

var CUSTOM_OBJECT_TYPE = 'CustomBlogPost';
var DEFAULT_PAGE_SIZE = 10;
var MAX_TITLE_LENGTH = 200;

function msg(key, arg1, arg2) {
    return arg1 !== undefined
        ? Resource.msgf(key, 'customBlogPosts', null, arg1, arg2)
        : Resource.msg(key, 'customBlogPosts', null);
}

function serializePost(co) {
    return {
        postId: co.custom.postId ? String(co.custom.postId) : '',
        authorId: typeof co.custom.authorId === 'number' ? co.custom.authorId : parseInt(co.custom.authorId, 10) || 0,
        title: co.custom.title ? String(co.custom.title) : '',
        description: co.custom.description ? String(co.custom.description) : '',
        createdAt: co.creationDate ? co.creationDate.getTime() : 0
    };
}

function buildPagination(requestedPage, pageSize, totalRecords) {
    var totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    var currentPage = Math.min(Math.max(1, parseInt(requestedPage, 10) || 1), totalPages);
    return {
        page: currentPage,
        pageSize: pageSize,
        totalRecords: totalRecords,
        totalPages: totalPages,
        hasPrev: currentPage > 1,
        hasNext: currentPage < totalPages,
        prevPage: currentPage - 1,
        nextPage: currentPage + 1
    };
}

function listResponse(success, posts, paging, error) {
    return {
        success: success,
        posts: posts,
        pagination: paging,
        totalBadgeText: msg('badge.total.posts', paging.totalRecords),
        pageInfoText: msg('pagination.showing', paging.page, paging.totalPages),
        error: error || null
    };
}

/** Validates required fields and datatypes for Create & Update payloads. */
function validatePostPayload(formData) {
    var payload = formData || {};
    var rawAuthor = payload.authorId !== undefined ? String(payload.authorId).trim() : '';
    var title = payload.title !== undefined ? String(payload.title).trim() : '';
    var description = payload.description !== undefined ? String(payload.description).trim() : '';
    var errors = {};

    if (!rawAuthor) { errors.authorId = msg('error.authorid.required'); } else if (!/^\d+$/.test(rawAuthor) || parseInt(rawAuthor, 10) <= 0) { errors.authorId = msg('error.authorid.datatype'); }
    if (!title) { errors.title = msg('error.title.required'); } else if (title.length > MAX_TITLE_LENGTH) { errors.title = msg('error.title.maxlength'); }
    if (!description) { errors.description = msg('error.description.required'); }

    var isValid = Object.keys(errors).length === 0;
    return {
        isValid: isValid,
        errors: errors,
        data: isValid ? { authorId: parseInt(rawAuthor, 10), title: title, description: description } : null
    };
}

/** Combined Create & Update helper: updates when postId exists, else creates a new CustomBlogPost. */
function savePost(formData) {
    var validation = validatePostPayload(formData);
    if (!validation.isValid) { return { success: false, errors: validation.errors }; }

    var postId = (formData && formData.postId) ? String(formData.postId).trim() : '';
    var isEdit = Boolean(postId);

    try {
        var existing = isEdit ? CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, postId) : null;
        if (isEdit && !existing) { return { success: false, error: msg('error.post.not.found') }; }

        var savedPost = null;
        Transaction.wrap(function () {
            var target = existing || CustomObjectMgr.createCustomObject(
                CUSTOM_OBJECT_TYPE,
                'POST-' + UUIDUtils.createUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
            );
            target.custom.authorId = validation.data.authorId;
            target.custom.title = validation.data.title;
            target.custom.description = validation.data.description;
            savedPost = serializePost(target);
        });

        return { success: true, isEdit: isEdit, message: msg(isEdit ? 'msg.post.updated' : 'msg.post.created'), post: savedPost };
    } catch (e) {
        Logger.error('savePost failed: {0}', e.message);
        return { success: false, error: msg('error.save.failed') };
    }
}

/** Deletes a CustomBlogPost custom object by its postId key. */
function deletePost(postId) {
    var cleanId = postId ? String(postId).trim() : '';
    if (!cleanId) { return { success: false, error: msg('error.postid.required') }; }

    try {
        var existing = CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, cleanId);
        if (!existing) { return { success: false, error: msg('error.post.not.found') }; }
        Transaction.wrap(function () { CustomObjectMgr.remove(existing); });
        return { success: true, postId: cleanId, message: msg('msg.post.deleted') };
    } catch (e) {
        Logger.error('deletePost failed: {0}', e.message);
        return { success: false, error: msg('error.delete.failed') };
    }
}

/** Queries CustomBlogPost objects newest-first and paginates via SFCC PagingModel (10/page). */
function getPaginatedPosts(requestedPage, requestedSize) {
    var pageSize = Math.max(1, parseInt(requestedSize, 10) || DEFAULT_PAGE_SIZE);
    var allPosts = [];
    var iterator = null;

    try {
        iterator = CustomObjectMgr.getAllCustomObjects(CUSTOM_OBJECT_TYPE);
        while (iterator.hasNext()) { allPosts.push(serializePost(iterator.next())); }
    } catch (e) {
        Logger.error('getPaginatedPosts query failed: {0}', e.message);
        return listResponse(false, [], buildPagination(1, pageSize, 0), msg('error.load.failed'));
    } finally {
        if (iterator && typeof iterator.close === 'function') { iterator.close(); }
    }

    allPosts.sort(function (a, b) { return b.createdAt - a.createdAt; });
    var pagingMeta = buildPagination(requestedPage, pageSize, allPosts.length);
    var pagePosts = [];

    if (allPosts.length > 0) {
        var list = new ArrayList();
        for (var i = 0; i < allPosts.length; i++) { list.add(allPosts[i]); }
        var paging = new PagingModel(list.iterator(), allPosts.length);
        paging.setStart((pagingMeta.page - 1) * pageSize);
        paging.setPageSize(pageSize);

        var pageIter = paging.pageElements;
        while (pageIter !== null && pageIter.hasNext()) { pagePosts.push(pageIter.next()); }
    }

    return listResponse(true, pagePosts, pagingMeta, null);
}

module.exports = {
    CUSTOM_OBJECT_TYPE: CUSTOM_OBJECT_TYPE,
    DEFAULT_PAGE_SIZE: DEFAULT_PAGE_SIZE,
    validatePostPayload: validatePostPayload,
    savePost: savePost,
    deletePost: deletePost,
    getPaginatedPosts: getPaginatedPosts
};
