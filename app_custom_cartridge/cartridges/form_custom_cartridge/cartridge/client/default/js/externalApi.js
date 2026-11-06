'use strict';

/**
 * externalApi.js
 * Storefront client script: Frontend validation, AJAX CRUD (Create, Update, Delete) aur modal controls.
 */

$(document).ready(function () {
    var deleteUrl = '';
    var targetRowId = '';

    // Frontend form validation (User ID, Title, Body check karna)
    function validateForm($form) {
        var isValid = true;
        var $userId = $form.find('#userId');
        var $title = $form.find('#title');
        var $body = $form.find('#body');

        // Sabhi purane invalid flags remove karna
        $form.find('.is-invalid').removeClass('is-invalid');

        // User ID check: Positive integer lazmi hai
        var userIdVal = parseInt($userId.val(), 10);
        if (!$userId.val() || isNaN(userIdVal) || userIdVal <= 0) {
            $userId.addClass('is-invalid');
            $form.find('#userId-error').text('Valid positive User ID zaroori hai.');
            isValid = false;
        }

        // Title check: Required aur max 200 characters limit
        var titleVal = $.trim($title.val());
        if (!titleVal) {
            $title.addClass('is-invalid');
            $form.find('#title-error').text('Post Title zaroori hai.');
            isValid = false;
        } else if (titleVal.length > 200) {
            $title.addClass('is-invalid');
            $form.find('#title-error').text('Title 200 characters se zyada nahi ho sakta.');
            isValid = false;
        }

        // Description / Body check: Empty na ho
        if (!$.trim($body.val())) {
            $body.addClass('is-invalid');
            $form.find('#body-error').text('Post Description content zaroori hai.');
            isValid = false;
        }

        return isValid;
    }

    // User jab typing start kare toh error highlight khatam karna
    $('input, textarea').on('input', function () {
        $(this).removeClass('is-invalid');
    });

    // Alert message container me alert render karne ka common helper
    function showAlert(containerId, message, type) {
        var alertHtml = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
            '<strong>' + (type === 'success' ? 'Success: ' : 'Error: ') + '</strong>' + message +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close">' +
            '<span aria-hidden="true">&times;</span></button></div>';
        $(containerId).html(alertHtml);
    }

    // Reusable AJAX form submission handler (Create aur Edit dono forms ke liye)
    function handleFormSubmit($form, defaultSuccessMsg) {
        if (!validateForm($form)) {
            return;
        }

        var $btn = $form.find('button[type="submit"]');
        var $spinner = $btn.find('.spinner-border');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');

        $.ajax({
            url: $form.attr('action'),
            type: 'POST',
            data: $form.serialize(),
            success: function (res) {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');

                if (res.success) {
                    showAlert('#form-alert-container', res.message || defaultSuccessMsg, 'success');
                    setTimeout(function () {
                        window.location.href = res.redirectUrl || window.location.href;
                    }, 1200);
                } else if (res.errors) {
                    // Backend validation errors ko fields ke sath map karna
                    Object.keys(res.errors).forEach(function (field) {
                        $form.find('#' + field).addClass('is-invalid');
                        $form.find('#' + field + '-error').text(res.errors[field]);
                    });
                } else {
                    showAlert('#form-alert-container', res.error || 'Request fail ho gayi.', 'danger');
                }
            },
            error: function () {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                showAlert('#form-alert-container', 'Server se rabta nahi ho saka.', 'danger');
            }
        });
    }

    // 1. Create Post Form Submit (Pure AJAX)
    $('#createPostForm').on('submit', function (e) {
        e.preventDefault();
        handleFormSubmit($(this), 'Post create ho gayi!');
    });

    // 2. Edit Post Form Submit (Pure AJAX)
    $('#editPostForm').on('submit', function (e) {
        e.preventDefault();
        handleFormSubmit($(this), 'Post update ho gayi!');
    });

    // 3. Delete Post - Confirmation Modal show karna
    $(document).on('click', '.btn-delete-post', function () {
        deleteUrl = $(this).data('url');
        targetRowId = '#post-row-' + $(this).data('id');
        $('#modal-post-id').text($(this).data('id'));
        $('#modal-post-title').text($(this).data('title'));
        $('#deleteConfirmModal').modal('show');
    });

    // Delete Modal Confirm Button Click (Pure AJAX)
    $('#btn-confirm-delete').on('click', function () {
        var $btn = $(this);
        var $spinner = $btn.find('.spinner-border');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');

        $.ajax({
            url: deleteUrl,
            type: 'POST',
            success: function (res) {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                $('#deleteConfirmModal').modal('hide');

                if (res.success) {
                    // Row ko animate karke table se remove karna
                    $(targetRowId).fadeOut(400, function () { $(this).remove(); });
                    showAlert('#api-alert-container', res.message || 'Post delete ho gayi!', 'success');
                } else {
                    showAlert('#api-alert-container', res.error || 'Delete fail ho gayi.', 'danger');
                }
            },
            error: function () {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                $('#deleteConfirmModal').modal('hide');
                showAlert('#api-alert-container', 'Server error: Post delete nahi ho saki.', 'danger');
            }
        });
    });

    // 4. Load More Posts (Vertically extends the table via AJAX)
    $('#btn-load-more').on('click', function () {
        var $btn = $(this);
        var nextPage = parseInt($btn.data('next-page'), 10) || 2;
        var totalPages = parseInt($btn.data('total-pages'), 10) || 10;
        var baseUrl = $btn.data('url');
        var viewUrl = $btn.data('view-url');
        var editUrl = $btn.data('edit-url');
        var deleteUrl = $btn.data('delete-url');
        var viewLabel = $btn.data('view-label') || 'View';
        var editLabel = $btn.data('edit-label') || 'Edit';
        var deleteLabel = $btn.data('delete-label') || 'Delete';

        var $spinner = $btn.find('.spinner-border');
        var $icon = $btn.find('.fa');

        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');
        $icon.addClass('d-none');

        $.ajax({
            url: baseUrl,
            type: 'GET',
            data: {
                page: nextPage,
                limit: 10,
                format: 'json'
            },
            success: function (res) {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                $icon.removeClass('d-none');

                if (res.posts && res.posts.length > 0) {
                    var rowsHtml = '';
                    res.posts.forEach(function (post) {
                        var safeTitle = $('<div>').text(post.title).html();
                        var bodyText = post.body || '';
                        var truncatedBody = bodyText.length > 80 ? bodyText.substring(0, 80) + '...' : bodyText;
                        var safeBody = $('<div>').text(truncatedBody).html();

                        rowsHtml += '<tr id="post-row-' + post.id + '" style="display:none;">' +
                            '<td class="align-middle font-weight-bold text-muted">' + post.id + '</td>' +
                            '<td class="align-middle">' +
                                '<span class="badge badge-light border text-secondary px-2 py-1">User ID: ' + post.userId + '</span>' +
                            '</td>' +
                            '<td class="align-middle font-weight-bold text-dark post-title-cell">' + safeTitle + '</td>' +
                            '<td class="align-middle text-muted post-body-cell">' + safeBody + '</td>' +
                            '<td class="align-middle text-center">' +
                                '<div class="btn-group btn-group-sm" role="group" aria-label="Post Actions">' +
                                    '<a href="' + viewUrl + '?id=' + post.id + '" class="btn btn-outline-info" title="View Post Details">' + viewLabel + '</a>' +
                                    '<a href="' + editUrl + '?id=' + post.id + '" class="btn btn-outline-warning" title="Edit Post">' + editLabel + '</a>' +
                                    '<button type="button" class="btn btn-outline-danger btn-delete-post" data-id="' + post.id + '" data-title="' + safeTitle + '" data-url="' + deleteUrl + '?id=' + post.id + '" title="Delete Post">' + deleteLabel + '</button>' +
                                '</div>' +
                            '</td>' +
                        '</tr>';
                    });

                    var $newElements = $(rowsHtml);
                    $('#posts-table-body').append($newElements);
                    $newElements.fadeIn(400);

                    // Update loaded count indicator
                    var currentCount = $('#posts-table-body tr').length;
                    var total = (res.pagination && res.pagination.totalRecords) || 100;
                    $('#posts-count-display').text('Showing ' + currentCount + ' of ' + total + ' total posts');

                    // Update next page tracker
                    var updatedNextPage = (res.pagination && res.pagination.nextPage) ? res.pagination.nextPage : (nextPage + 1);
                    $btn.data('next-page', updatedNextPage);

                    if (!res.pagination || !res.pagination.hasNext || updatedNextPage > totalPages) {
                        $btn.fadeOut(300, function () {
                            $('#no-more-posts').removeClass('d-none');
                        });
                    }
                } else {
                    $btn.fadeOut(300, function () {
                        $('#no-more-posts').removeClass('d-none');
                    });
                }
            },
            error: function () {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                $icon.removeClass('d-none');
                showAlert('#api-alert-container', 'Server error: Load more request failed.', 'danger');
            }
        });
    });
});
