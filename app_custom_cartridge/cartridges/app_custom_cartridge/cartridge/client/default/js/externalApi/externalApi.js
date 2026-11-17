/* global $ */
/* eslint-disable require-jsdoc */

'use strict';

var initialized = false;
var PAGE_SIZE = 10;
var FIELDS = ['id', 'userId', 'title', 'body'];

function init() {
    var $config = $('#posts-config');
    if (initialized || !$config.length) return;
    initialized = true;

    var $table = $('#posts-table-body');
    var $count = $('#post-count');
    var $more = $('#btn-view-more');
    var $postForm = $('#post-form');
    var urls = {};
    var localPosts = {};
    var selectedId;

    ['get', 'view', 'save', 'update', 'delete'].forEach(function (key) {
        urls[key] = $config.data(key + '-url');
    });

    function api(url, method, data) {
        return $.ajax({ url: url, type: method || 'GET', data: data || {}, dataType: 'json' });
    }

    function message(text, type) {
        var $alert = $('<div>').addClass('alert alert-' + type).text(text)
            .appendTo($('#api-alert-container').empty());
        setTimeout(function () {
            $alert.fadeOut(500, function () { $(this).remove(); });
        }, 2500);
    }

    function requestError(xhr, fallback) {
        message((xhr.responseJSON || {}).error || fallback || 'Request failed.', 'danger');
    }

    function responseError(response, fallback) {
        if (!response || (!response.error && response.success !== false)) return false;
        message(response.error || fallback || 'Request failed.', 'danger');
        return true;
    }

    function modal(selector, show) {
        var $modal = $(selector);
        var element = $modal[0];
        if (!element) return;

        if (window.bootstrap && window.bootstrap.Modal) {
            var instance = window.bootstrap.Modal.getOrCreateInstance(element);
            if (show) instance.show(); else instance.hide();
        } else if (typeof $modal.modal === 'function') {
            $modal.modal(show ? 'show' : 'hide');
        } else {
            $modal.toggleClass('show', show).css('display', show ? 'block' : 'none');
            $('.modal-backdrop').remove();
            $('body').toggleClass('modal-open', show);
            if (show) $('<div class="modal-backdrop fade show"></div>').appendTo(document.body);
        }
    }

    function feedback($field) {
        var $feedback = $field.siblings('.invalid-feedback');
        return $feedback.length ? $feedback : $field.closest('.form-group, .mb-3').find('.invalid-feedback');
    }

    function fieldError($field, text) {
        $field.toggleClass('is-invalid', !!text);
        feedback($field).text(text || '').toggleClass('d-block', !!text).toggle(!!text);
    }

    function validate($form) {
        var $userId = $form.find('[name="userId"]');
        var $title = $form.find('[name="title"]');
        var $body = $form.find('[name="body"]');
        var userId = $.trim($userId.val());
        var body = $.trim($body.val());
        var valid = true;

        $form.find('input, textarea').each(function () { fieldError($(this)); });
        if (!/^[1-9]\d*$/.test(userId)) {
            fieldError($userId, userId ? 'User ID must be a valid positive integer.' : 'User ID is required.');
            valid = false;
        }
        if (!$.trim($title.val())) {
            fieldError($title, 'Title is required.');
            valid = false;
        }
        if (!body || body.length < 10 || body.length > 500) {
            var bodyError = 'Description must not exceed 500 characters.';
            if (!body) bodyError = 'Description is required.';
            else if (body.length < 10) bodyError = 'Description must be at least 10 characters.';
            fieldError($body, bodyError);
            valid = false;
        }
        return valid;
    }

    function formPost($form) {
        var post = {};
        FIELDS.forEach(function (key) { post[key] = $form.find('[name="' + key + '"]').val(); });
        return post;
    }

    function rowPost($row) {
        var post = {};
        var $cells = $row.children('td');
        FIELDS.forEach(function (key, index) { post[key] = $cells.eq(index).text().trim(); });
        post.id = $row.data('id') || post.id;
        return post;
    }

    function row(post) {
        var $row = $('<tr>').attr('data-id', post.id);
        var $buttons = $('<div>').addClass('action-btn-group');
        FIELDS.forEach(function (key) { $row.append($('<td>').text(post[key])); });
        [
            ['view', 'info', 'eye'],
            ['edit', 'secondary', 'pencil'],
            ['delete', 'danger', 'trash']
        ].forEach(function (action) {
            var label = action[0].charAt(0).toUpperCase() + action[0].slice(1);
            $('<button>', { type: 'button', title: label, 'aria-label': label })
                .attr('data-id', post.id)
                .addClass('btn btn-sm btn-outline-' + action[1] + ' btn-action js-' + action[0])
                .append($('<i>').addClass('fa fa-' + action[2]).attr('aria-hidden', 'true'))
                .appendTo($buttons);
        });
        return $row.append($('<td>').addClass('actions-cell').append($buttons));
    }

    function findRow(id) {
        return $table.find('tr[data-id="' + id + '"]');
    }

    function render(posts, append) {
        if (!append) $table.empty();
        $.each(posts, function (index, post) { $table.append(row(post)); });
    }

    function update(post) {
        var $row = findRow(post.id);
        FIELDS.forEach(function (key, index) { $row.children('td').eq(index).text(post[key]); });
        $row.addClass('table-info');
        setTimeout(function () { $row.removeClass('table-info'); }, 2500);
        localPosts[post.id] = post;
        modal('#postModal', false);
        message('Post updated successfully.', 'success');
    }

    function changeCount(change) {
        $count.text(Math.max(0, (parseInt($count.text(), 10) || 0) + change));
    }

    function configurePostModal(mode, post) {
        var isView = mode === 'view';
        var isDelete = mode === 'delete';
        var $action = $('#post-modal-action');

        $postForm[0].reset();
        $postForm.find('[name="mode"]').val(mode);
        $postForm.find('input, textarea').each(function () { fieldError($(this)); });
        FIELDS.forEach(function (key) {
            $postForm.find('[name="' + key + '"]').val(post ? post[key] : '');
        });

        $('#post-modal-title').text($postForm.attr('data-' + mode + '-title'));
        $('#post-fields').toggleClass('d-none', isDelete);
        $('#delete-confirmation').toggleClass('d-none', !isDelete);
        $postForm.find('[name="userId"], [name="title"], [name="body"]').prop('readonly', isView);
        $postForm.find('.js-required').toggle(!isView);

        $action.toggle(!isView)
            .toggleClass('btn-primary', !isDelete)
            .toggleClass('btn-danger', isDelete)
            .text(isDelete ? $postForm.attr('data-delete-action') : $postForm.attr('data-' + mode + '-action'));

        modal('#postModal', true);
    }

    function removePost() {
        delete localPosts[selectedId];
        findRow(selectedId).fadeOut(400, function () { $(this).remove(); changeCount(-1); });
        modal('#postModal', false);
        message('Post deleted successfully.', 'success');
    }

    $('.js-create-post').on('click', function (event) {
        event.preventDefault();
        configurePostModal('create');
    });

    $(document)
        .on('click', '.btn-close, [data-dismiss="modal"], [data-bs-dismiss="modal"]', function () {
            modal('#' + $(this).closest('.modal').attr('id'), false);
        })
        .on('input change', '#post-form input, #post-form textarea', function () {
            fieldError($(this));
        });

    $table.on('click', '.js-view, .js-edit, .js-delete', function () {
        var $button = $(this);
        var id = $button.data('id');
        var mode = 'view';
        if ($button.hasClass('js-delete')) mode = 'delete';
        else if ($button.hasClass('js-edit')) mode = 'edit';

        if (mode === 'delete') {
            selectedId = id;
            configurePostModal('delete', { id: id });
            return;
        }

        var done = function (post) {
            configurePostModal(mode, post);
        };

        if (localPosts[id]) done(localPosts[id]);
        else api(urls.view, 'GET', { id: id }).done(function (response) {
            if (responseError(response, 'Unable to retrieve post.')) done(rowPost($button.closest('tr')));
            else done(response);
        }).fail(function () { done(rowPost($button.closest('tr'))); });
    });

    $(document).on('submit.externalApi', '#post-form', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var $form = $(this);
        var mode = $form.find('[name="mode"]').val();
        var $submit = $form.find('[type="submit"]');
        var submitText = $submit.text();
        var post;

        if (mode === 'delete') {
            $submit.prop('disabled', true).text('Deleting...');
            api(urls.delete, 'POST', $form.serialize()).done(function (response) {
                if (!responseError(response, 'Unable to delete post.')) removePost();
            })
                .fail(function (xhr) { requestError(xhr, 'Unable to delete post.'); })
                .always(function () { $submit.prop('disabled', false).text(submitText); });
            return;
        }

        if (!validate($form)) return;
        post = formPost($form);

        $submit.prop('disabled', true).text(mode === 'create' ? 'Saving...' : 'Updating...');
        api(mode === 'create' ? urls.save : urls.update, 'POST', $form.serialize())
            .done(function (response) {
                if (responseError(response, mode === 'create' ? 'Unable to create post.' : 'Unable to update post.')) return;
                post = $.extend({}, post, response || {});
                if (mode === 'edit') {
                    update(post);
                    return;
                }
                post.id = post.id || 101;
                localPosts[post.id] = post;
                $table.prepend(row(post));
                changeCount(1);
                modal('#postModal', false);
                message('Post created successfully.', 'success');
            })
            .fail(function (xhr) { requestError(xhr, mode === 'create' ? 'Unable to create post.' : 'Unable to update post.'); })
            .always(function () { $submit.prop('disabled', false).text(submitText); });
    });

    $('#prev-page, #next-page').on('click', function () {
        var url = $(this).data('url');
        if (!url) return;
        api(url.replace('ExternalApi-Show', 'ExternalApi-GetPosts')).done(function (response) {
            if (responseError(response, 'Unable to retrieve posts.')) return;
            var paging = response.pagination;
            render(response.posts);
            $count.text(paging.totalCount);
            $('#page-info').text('Page ' + paging.page + ' of ' + paging.totalPages);
            $('#prev-page').data('url', paging.previousUrl || '').prop('disabled', !paging.hasPrevious);
            $('#next-page').data('url', paging.nextUrl || '').prop('disabled', !paging.hasNext);
        }).fail(requestError);
    });

    function loadMore(page, persist) {
        var html = $more.html();
        $more.prop('disabled', true).text($more.data('loading-text') || 'Loading...');
        return $.ajax({
            url: urls.get,
            type: 'GET',
            data: { page: page, pageSize: PAGE_SIZE },
            dataType: 'html'
        }).done(function (responseHtml) {
            var $rows = $(responseHtml).filter('tr');
            $table.append($rows);
            var loaded = $table.children('tr').length;
            $('#loaded-count').text(loaded);
            $more.data('next-page', page + 1);
            if (persist && window.history && window.history.replaceState) {
                var currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('page', page);
                currentUrl.searchParams.set('pageSize', PAGE_SIZE);
                window.history.replaceState({}, '', currentUrl.toString());
            }
            if (!$rows.length || loaded >= (parseInt($count.text(), 10) || 0)) {
                $more.hide();
                $('#all-loaded-msg').removeClass('d-none').show();
            }
        }).fail(function (xhr) {
            requestError(xhr, 'Unable to retrieve posts.');
        }).always(function () {
            $more.prop('disabled', false).html(html);
        });
    }

    $more.on('click', function () { loadMore(parseInt($more.data('next-page'), 10) || 2, true); });

    if ($more.length && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting && !$more.prop('disabled') && $more.is(':visible')) $more.trigger('click');
        }, { rootMargin: '0px 0px 200px 0px', threshold: 0.01 }).observe($more[0]);
    }
}

module.exports = init;
