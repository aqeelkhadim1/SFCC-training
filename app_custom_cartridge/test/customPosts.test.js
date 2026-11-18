'use strict';

// Run with Node; SFCC persistence is mocked, not connected to the sandbox.
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var cartridge = path.join(__dirname, '../cartridges/app_custom_cartridge/cartridge');
var database;
var sequence = 0;
var reads;
var closes;
var transactions;
var failQuery;
var failRead;
var failCommit;
var tests = 0;

function PagingModel(iterator, count) {
    this.count = count;
    this.start = 0;
    this.pageSize = 10;
    this.setPageSize = function (size) { this.pageSize = size; };
    this.setStart = function (start) { this.start = start; };
    Object.defineProperties(this, {
        pageCount: { get: function () { return Math.ceil(this.count / this.pageSize); } },
        currentPage: { get: function () { return Math.floor(this.start / this.pageSize); } },
        maxPage: { get: function () { return this.pageCount - 1; } },
        pageElements: { get: function () {
            iterator.forward(this.start, this.pageSize);
            return iterator;
        } }
    });
}

var dependencies = {
    'dw/web/PagingModel': PagingModel,
    'dw/object/CustomObjectMgr': {
        queryCustomObjects: function (type, query, sort) {
            assert.strictEqual(type, 'CustomPost');
            assert.strictEqual(query, '');
            assert.strictEqual(sort, 'creationDate desc, custom.postId asc');
            if (failQuery) throw new Error('Database unavailable');
            var records = Object.keys(database).map(function (key) { return database[key]; })
                .sort(function (a, b) { return b.creationDate - a.creationDate; });
            var index = 0;
            var end = records.length;
            return {
                getCount: function () { return records.length; },
                forward: function (start, size) { index = start; end = Math.min(records.length, start + size); },
                hasNext: function () { return index < end; },
                next: function () {
                    if (failRead === true || (typeof failRead === 'number' && reads >= failRead)) throw new Error('Iterator failed');
                    reads++;
                    return records[index++];
                },
                close: function () { closes++; }
            };
        },
        getCustomObject: function (type, id) {
            assert.strictEqual(type, 'CustomPost');
            return database[id] || null;
        },
        createCustomObject: function (type, id) {
            assert.strictEqual(type, 'CustomPost');
            assert.ok(!database[id]);
            var object = { custom: { postId: id }, creationDate: ++sequence };
            database[id] = object;
            return object;
        },
        remove: function (object) { delete database[object.custom.postId]; }
    },
    'dw/system/Transaction': {
        wrap: function (callback) {
            transactions++;
            var before = JSON.parse(JSON.stringify(database));
            try {
                var result = callback();
                if (failCommit) throw new Error('Commit failed');
                return result;
            } catch (error) {
                database = before;
                throw error;
            }
        }
    },
    'dw/web/Resource': { msg: function (key) { return key; } },
    'dw/system/Logger': { error: function () {} },
    'dw/util/UUIDUtils': { createUUID: function () { return 'generated-' + (++sequence); } },
    'dw/web/URLUtils': { url: function (route, key, value) { return '/' + route + '?' + key + '=' + value; } }
};
var context = { module: { exports: {} }, require: function (id) {
    assert.ok(dependencies[id], id);
    return dependencies[id];
} };
vm.runInNewContext(fs.readFileSync(path.join(cartridge, 'scripts/helpers/customPostsHelper.js'), 'utf8'), context);
var helper = context.module.exports;

function payload() {
    return { userId: '1', title: ' Test post ', body: ' This is a valid post description. ' };
}
function seed(count) {
    for (var i = 1; i <= count; i++) {
        database['POST-' + i] = { custom: { postId: 'POST-' + i, userId: 1, title: 'Post ' + i, body: 'Description for post ' + i }, creationDate: i };
    }
}
function test(name, callback) {
    database = Object.create(null);
    reads = 0;
    closes = 0;
    transactions = 0;
    failQuery = false;
    failRead = false;
    failCommit = false;
    callback();
    tests++;
    console.log('PASS ' + name);
}

test('Empty listing has no pagination and closes its iterator', function () {
    var result = helper.getPosts({});
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.posts.length, 0);
    assert.strictEqual(result.pagination.show, false);
    assert.strictEqual(closes, 1);
});
test('Ten records fit on one page without pagination', function () {
    seed(10);
    var result = helper.getPosts({});
    assert.strictEqual(result.posts.length, 10);
    assert.strictEqual(result.pagination.show, false);
    assert.strictEqual(reads, 10);
});
test('Eleven records show pagination; the first page reads only ten', function () {
    seed(11);
    var result = helper.getPosts({ page: '1' });
    assert.strictEqual(result.posts.length, 10);
    assert.strictEqual(result.posts[0].id, 'POST-11');
    assert.strictEqual(result.pagination.show, true);
    assert.strictEqual(result.pagination.totalPages, 2);
    assert.strictEqual(result.pagination.previousUrl, '');
    assert.ok(result.pagination.nextUrl);
    assert.strictEqual(reads, 10);
});
test('Last page has the remaining record and no Next link', function () {
    seed(11);
    var result = helper.getPosts({ page: '2' });
    assert.strictEqual(result.posts.length, 1);
    assert.strictEqual(result.posts[0].id, 'POST-1');
    assert.strictEqual(result.pagination.nextUrl, '');
    assert.ok(result.pagination.previousUrl);
    assert.strictEqual(reads, 1);
});
test('Invalid page input defaults safely and excessive pages clamp', function () {
    seed(21);
    ['-1', '0', 'abc', '1.5', 'Infinity', '', undefined].forEach(function (page) {
        assert.strictEqual(helper.getPosts({ page: page }).pagination.page, 1);
    });
    assert.strictEqual(helper.getPosts({ page: '999' }).pagination.page, 3);
    assert.strictEqual(helper.getPosts({ page: '999999999999999999' }).pagination.page, 3);
});
test('View retrieves existing BM-created keys and handles missing/invalid keys', function () {
    seed(1);
    assert.strictEqual(helper.getPostById('POST-1').post.id, 'POST-1');
    assert.strictEqual(helper.getPostById('missing').success, false);
    assert.strictEqual(helper.getPostById(null).error, 'error.id');
});
test('Create trims fields, generates a key and persists inside a transaction', function () {
    var data = payload();
    data.id = 'client-supplied-key';
    var result = helper.savePost(data);
    assert.strictEqual(result.success, true);
    assert.ok(/^generated-/.test(result.post.id));
    assert.strictEqual(result.post.title, 'Test post');
    assert.strictEqual(result.post.userId, 1);
    assert.ok(database[result.post.id]);
    assert.strictEqual(transactions, 1);
});
test('Only required fields and datatypes are validated; extra text limits are absent', function () {
    ['abc', '1.5', 'NaN', 'Infinity', '2147483648', '-2147483649', ''].forEach(function (userId) {
        var data = payload(); data.userId = userId;
        assert.ok(helper.savePost(data).fieldErrors.userId);
    });
    var data = payload(); data.title = ' ';
    assert.ok(helper.savePost(data).fieldErrors.title);
    data = payload(); data.title = [];
    assert.ok(helper.savePost(data).fieldErrors.title);
    data = payload(); data.body = ' ';
    assert.ok(helper.savePost(data).fieldErrors.body);
    data.body = {};
    assert.ok(helper.savePost(data).fieldErrors.body);
    assert.strictEqual(transactions, 0);
    data = payload(); data.body = 'OK'; data.title = 'x'.repeat(257);
    assert.strictEqual(helper.savePost(data).success, true);
    data.body = 'x'.repeat(501);
    assert.strictEqual(helper.savePost(data).success, true);
    ['0', '-1', '1e2'].forEach(function (userId) {
        data = payload(); data.userId = userId;
        assert.strictEqual(helper.savePost(data).success, true);
    });
});
test('Update preserves the key and writes new values', function () {
    seed(1);
    var data = payload(); data.id = 'another-id'; data.userId = '2';
    var result = helper.savePost(data, 'POST-1');
    assert.strictEqual(result.post.id, 'POST-1');
    assert.strictEqual(database['POST-1'].custom.userId, 2);
    assert.strictEqual(helper.savePost(payload(), 'missing').error, 'error.notFound');
    var transactionCount = transactions;
    assert.strictEqual(helper.savePost(payload(), '').error, 'error.id');
    var invalidForm = payload(); invalidForm.body = '';
    assert.ok(helper.savePost(invalidForm, 'POST-1').fieldErrors.body);
    assert.strictEqual(transactions, transactionCount);
});
test('Delete persists; deleting a missing post returns a useful error', function () {
    seed(1);
    assert.strictEqual(helper.deletePost('POST-1').success, true);
    assert.strictEqual(Object.keys(database).length, 0);
    assert.strictEqual(helper.deletePost('POST-1').error, 'error.notFound');
});
test('Deleting the last item of page two clamps to page one and hides pagination', function () {
    seed(11);
    helper.deletePost('POST-1');
    var result = helper.getPosts({ page: '2' });
    assert.strictEqual(result.pagination.page, 1);
    assert.strictEqual(result.pagination.show, false);
    assert.strictEqual(result.posts.length, 10);
});
test('Transaction failures return errors and roll back create/update/delete', function () {
    seed(1);
    failCommit = true;
    assert.strictEqual(helper.savePost(payload()).success, false);
    assert.strictEqual(Object.keys(database).length, 1);
    assert.strictEqual(helper.savePost(payload(), 'POST-1').success, false);
    assert.strictEqual(database['POST-1'].custom.title, 'Post 1');
    assert.strictEqual(helper.deletePost('POST-1').success, false);
    assert.ok(database['POST-1']);
});
test('Query failures are handled and interrupted iterators are closed', function () {
    failQuery = true;
    assert.strictEqual(helper.getPosts({}).success, false);
    failQuery = false;
    seed(2);
    failRead = 1;
    var result = helper.getPosts({});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.posts.length, 0);
    assert.strictEqual(closes, 1);
});

// Verify controller integration uses real SFRA CSRF middleware and stops on failure.
var validToken = true;
var csrfContext = { module: { exports: {} }, require: function (id) {
    if (id === 'dw/web/CSRFProtection') return {
        validateRequest: function () { return validToken; },
        getTokenName: function () { return 'csrf_token'; },
        generateToken: function () { return 'fresh-token'; }
    };
    if (id === 'dw/customer/CustomerMgr') return { logoutCustomer: function () {} };
    return { url: function (route) { return '/' + route; } };
} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname,
    '../../storefront-reference-architecture-master/cartridges/app_storefront_base/cartridge/scripts/middleware/csrf.js'), 'utf8'), csrfContext);
var csrf = csrfContext.module.exports;
var routes = {};
var calls = 0;
var server = {
    middleware: { https: function (req, res, next) { next(); } },
    get: function (name) { routes[name] = Array.prototype.slice.call(arguments, 1); },
    post: function (name) { routes[name] = Array.prototype.slice.call(arguments, 1); },
    exports: function () { return {}; }
};
vm.runInNewContext(fs.readFileSync(path.join(cartridge, 'controllers/CustomPosts.js'), 'utf8'), {
    module: { exports: {} },
    require: function (id) {
        if (id === 'server') return server;
        if (id === '*/cartridge/scripts/middleware/csrf') return csrf;
        assert.strictEqual(id, '*/cartridge/scripts/helpers/customPostsHelper');
        return {
            getPosts: function (query) { return { page: query.page }; },
            savePost: function () { calls++; return { success: true }; }
        };
    }
});
test('Show renders the full page and GetPosts renders only the AJAX fragment', function () {
    ['Show', 'GetPosts'].forEach(function (name) {
        assert.strictEqual(routes[name][0], server.middleware.https);
        routes[name][1]({ querystring: { page: '2' } }, {
            render: function (template, data) {
                assert.strictEqual(template, name === 'Show' ? 'customPosts/posts' : 'customPosts/components/postList');
                assert.strictEqual(data.page, '2');
            }
        }, function () {});
    });
});

test('All mutations are HTTPS/CSRF-protected; invalid tokens cannot reach CRUD', function () {
    ['SavePost', 'UpdatePost', 'DeletePost'].forEach(function (name) {
        assert.strictEqual(routes[name][0], server.middleware.https);
        assert.strictEqual(routes[name][1], csrf.validateAjaxRequest);
    });
    assert.strictEqual(typeof routes.Show[1], 'function');
    var modal = fs.readFileSync(path.join(cartridge, 'templates/default/customPosts/modal/postModal.isml'), 'utf8');
    assert.ok(modal.includes("require('dw/web/CSRFProtection').getTokenName()"));
    assert.ok(modal.includes("require('dw/web/CSRFProtection').generateToken()"));
    var execute = function (valid) {
        validToken = valid;
        var response = { redirect: function (url) { this.redirectUrl = url; }, json: function () {} };
        var index = 0;
        var next = function () {
            if (!response.redirectUrl && index < routes.SavePost.length) routes.SavePost[index++]({ form: payload() }, response, next);
        };
        next();
    };
    execute(false); assert.strictEqual(calls, 0);
    execute(true); assert.strictEqual(calls, 1);
});
console.log(tests + ' tests passed (mocked SFCC persistence; real CSRF middleware).');
