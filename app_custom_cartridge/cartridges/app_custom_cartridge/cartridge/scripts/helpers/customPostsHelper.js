
'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');
var Logger = require('dw/system/Logger');
var OBJECT_TYPE = 'CustomPost';
var PAGE_SIZE = 10;

/**
 * Trim a text field.
 * @param {*} value Input value
 * @returns {string} Trimmed text
 */
function trimText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

/**
 * Build an error response understood by the client.
 * @param {string} key Resource key
 * @param {Object} [fieldErrors] Field errors
 * @returns {Object} Error response
 */
function failure(key, fieldErrors) {
    return { success: false, error: Resource.msg(key, 'customPosts', null), fieldErrors: fieldErrors || {} };
}

/**
 * Convert a custom object to post data.
 * @param {dw.object.CustomObject} object Stored object
 * @returns {Object} Post data
 */
function toPost(object) {
    return { id: object.custom.postId, userId: object.custom.userId, title: object.custom.title || '', body: object.custom.body || '' };
}

/**
 * Validate required fields and storage datatypes.
 * @param {Object} form Submitted fields
 * @returns {Object} Values and errors
 */
function validate(form) {
    var values = form || {};
    var userId = trimText(values.userId);
    var number = Number(userId);
    var title = trimText(values.title);
    var body = trimText(values.body);
    var errors = {};
    if (!userId || number !== (number | 0)) { // eslint-disable-line no-bitwise
        errors.userId = Resource.msg('validation.userId', 'customPosts', null);
    }
    if (!title) errors.title = Resource.msg('validation.title', 'customPosts', null);
    if (!body) errors.body = Resource.msg('validation.body', 'customPosts', null);
    return { errors: errors, values: { userId: number, title: title, body: body } };
}

/**
 * Read one page and prepare its navigation.
 * @param {string} requestedPage Requested page
 * @returns {Object} Page records and pagination
 */
function calculatePagination(requestedPage) {
    var PagingModel = require('dw/web/PagingModel');
    var URLUtils = require('dw/web/URLUtils');
    var iterator = CustomObjectMgr.queryCustomObjects(OBJECT_TYPE, '', 'creationDate desc, custom.postId asc');
    try {
        var count = iterator.getCount();
        if (count < 0) throw new Error('CustomPost query count unavailable');
        var paging = new PagingModel(iterator, count);
        paging.setPageSize(PAGE_SIZE);
        var page = Number(requestedPage);
        if (page < 1 || page === Infinity || Math.floor(page) !== page) page = 1;
        paging.setStart(Math.max(0, Math.min(page - 1, paging.maxPage)) * paging.pageSize);
        var records = [];
        var elements = paging.pageElements;
        while (elements.hasNext()) {
            records.push(toPost(elements.next()));
        }

        return {
            records: records,
            pagination: {
                page: paging.currentPage + 1,
                totalCount: paging.count,
                totalPages: paging.pageCount || 1,
                show: paging.pageCount > 1,
                hasPrevious: paging.currentPage > 0,
                hasNext: paging.currentPage < paging.maxPage,
                previousUrl: paging.currentPage > 0
                    ? URLUtils.url('CustomPosts-GetPosts', 'page', paging.currentPage).toString() : '',
                nextUrl: paging.currentPage < paging.maxPage
                    ? URLUtils.url('CustomPosts-GetPosts', 'page', paging.currentPage + 2).toString() : ''
            }
        };
    } finally {
        iterator.close();
    }
}

/**
 * Prepare a page of posts and its navigation.
 * @param {Object} query Request query
 * @returns {Object} Listing view data
 */
function getPosts(query) {
    var params = query || {};
    var result = { success: true, posts: [], pagination: { page: 1, totalCount: 0, totalPages: 1, show: false } };
    try {
        var paged = calculatePagination(params.page);
        result.posts = paged.records;
        result.pagination = paged.pagination;
    } catch (error) {
        Logger.error('Custom posts listing failed: {0}', error.message);
        result.success = false;
        result.error = Resource.msg('error.load', 'customPosts', null);
    }
    return result;
}

/**
 * Retrieve one post.
 * @param {string} id Post key
 * @returns {Object} Post response
 */
function getPostById(id) {
    if (!trimText(id)) return failure('error.id');
    try {
        var object = CustomObjectMgr.getCustomObject(OBJECT_TYPE, id);
        return object ? { success: true, post: toPost(object) } : failure('error.notFound');
    } catch (error) {
        Logger.error('Custom post lookup failed: {0}', error.message);
        return failure('error.load');
    }
}

/**
 * Persist shared create and update fields in a transaction.
 * @param {Object} form Submitted fields
 * @param {string} [id] Existing post key
 * @returns {Object} Save response
 */
function savePost(form, id) {
    if (id !== undefined && !trimText(id)) return failure('error.id');
    var data = validate(form);
    if (Object.keys(data.errors).length) return failure('error.validation', data.errors);
    try {
        var post = Transaction.wrap(function () {
            var object;
            if (id) {
                object = CustomObjectMgr.getCustomObject(OBJECT_TYPE, id);
                if (!object) return null;
            } else {
                var UUIDUtils = require('dw/util/UUIDUtils');
                object = CustomObjectMgr.createCustomObject(OBJECT_TYPE, UUIDUtils.createUUID());
            }
            object.custom.userId = data.values.userId;
            object.custom.title = data.values.title;
            object.custom.body = data.values.body;
            return toPost(object);
        });
        return post ? { success: true, post: post } : failure('error.notFound');
    } catch (error) {
        Logger.error('Custom post save failed: {0}', error.message);
        return failure('error.save');
    }
}

/**
 * Delete an existing post in a transaction.
 * @param {string} id Post key
 * @returns {Object} Delete response
 */
function deletePost(id) {
    if (!trimText(id)) return failure('error.id');
    try {
        var deleted = Transaction.wrap(function () {
            var object = CustomObjectMgr.getCustomObject(OBJECT_TYPE, id);
            if (!object) return false;
            CustomObjectMgr.remove(object);
            return true;
        });
        return deleted ? { success: true } : failure('error.notFound');
    } catch (error) {
        Logger.error('Custom post delete failed: {0}', error.message);
        return failure('error.delete');
    }
}

module.exports = {
    getPosts: getPosts,
    getPostById: getPostById,
    savePost: savePost,
    deletePost: deletePost
};
