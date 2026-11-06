'use strict';

/**
 * externalApi.js
 * Storefront client script: Frontend validation, AJAX CRUD (Create, Update, Delete) aur modal controls.
 */

$(document).ready(function () {
    var deleteUrl = '';
    var targetRowId = '';

    // Header Navbar me 'Posts' button ensure karna
    if ($('#nav-posts-link').length === 0) {
        var postsUrl = '/on/demandware.store/Sites-RefArch-Site/default/ExternalApi-Show';
        var postsNavHtml = '<li class="nav-item" role="presentation">' +
            '<a href="' + postsUrl + '" id="nav-posts-link" class="nav-link font-weight-bold text-primary" role="link" tabindex="0">' +
                '<i class="fa fa-newspaper-o mr-1" aria-hidden="true"></i> Posts' +
            '</a></li>';
        var $targetUl = $('.menu-group ul.navbar-nav, nav.navbar ul.navbar-nav').first();
        if ($targetUl.length) {
            $targetUl.append(postsNavHtml);
        }
    }

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

    // Universal Modal Helper (Supports Bootstrap 5 native, Bootstrap 4 jQuery & CSS fallback)
    function showModal(modalSelector) {
        var el = document.querySelector(modalSelector);
        if (!el) return;

        if (window.bootstrap && window.bootstrap.Modal) {
            try {
                var bsModal = window.bootstrap.Modal.getOrCreateInstance(el);
                bsModal.show();
                return;
            } catch (e) {}
        }
        if ($.fn && $.fn.modal) {
            try {
                $(modalSelector).modal('show');
                return;
            } catch (err) {}
        }
        // Direct CSS fallback
        $(modalSelector).addClass('show').css('display', 'block').removeAttr('aria-hidden').attr('aria-modal', 'true');
        if ($('.modal-backdrop').length === 0) {
            $('body').addClass('modal-open').append('<div class="modal-backdrop fade show"></div>');
        }
    }

    function hideModal(modalSelector) {
        var el = document.querySelector(modalSelector);
        if (!el) return;

        if (window.bootstrap && window.bootstrap.Modal) {
            try {
                var bsModal = window.bootstrap.Modal.getInstance(el) || window.bootstrap.Modal.getOrCreateInstance(el);
                if (bsModal) {
                    bsModal.hide();
                    return;
                }
            } catch (e) {}
        }
        if ($.fn && $.fn.modal) {
            try {
                $(modalSelector).modal('hide');
                return;
            } catch (err) {}
        }
        $(modalSelector).removeClass('show').css('display', 'none').attr('aria-hidden', 'true').removeAttr('aria-modal');
        $('body').removeClass('modal-open');
        $('.modal-backdrop').remove();
    }

    // Explicit click handler for opening Create Post Modal
    $(document).on('click', '#btn-open-create-modal, [data-target="#createPostModal"], [data-bs-target="#createPostModal"]', function (e) {
        e.preventDefault();
        $('#createPostModalForm')[0].reset();
        $('#createPostModalForm').find('.is-invalid').removeClass('is-invalid');
        $('#modal-form-alert-container').empty();
        showModal('#createPostModal');
    });

    // Explicit click handler for closing any modal
    $(document).on('click', '[data-dismiss="modal"], [data-bs-dismiss="modal"]', function (e) {
        e.preventDefault();
        var $modal = $(this).closest('.modal');
        if ($modal.length) {
            hideModal('#' + $modal.attr('id'));
        }
    });

    // Close modal when clicking on backdrop
    $(document).on('click', '.modal', function (e) {
        if ($(e.target).hasClass('modal')) {
            hideModal('#' + $(this).attr('id'));
        }
    });

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
        showModal('#deleteConfirmModal');
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
                hideModal('#deleteConfirmModal');

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
                hideModal('#deleteConfirmModal');
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
                                    '<button type="button" class="btn btn-outline-warning btn-edit-post" data-id="' + post.id + '" data-userid="' + post.userId + '" data-title="' + safeTitle + '" data-body="' + $('<div>').text(post.body || '').html() + '" data-url="' + editUrl + '?id=' + post.id + '" title="Edit Post">' + editLabel + '</button>' +
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

    // 5. Create Post Modal Form Submit (Pure AJAX - No Page Reload & Immediately Prepends to Table!)
    $('#createPostModalForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var $userId = $form.find('#modal-userId');
        var $title = $form.find('#modal-title');
        var $body = $form.find('#modal-body');
        var isValid = true;

        $form.find('.is-invalid').removeClass('is-invalid');

        var userIdVal = parseInt($userId.val(), 10);
        if (!$userId.val() || isNaN(userIdVal) || userIdVal <= 0) {
            $userId.addClass('is-invalid');
            isValid = false;
        }

        var titleVal = $.trim($title.val());
        if (!titleVal) {
            $title.addClass('is-invalid');
            isValid = false;
        }

        var bodyVal = $.trim($body.val());
        if (!bodyVal) {
            $body.addClass('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        var $btn = $('#btn-modal-create-post');
        var $spinner = $btn.find('.spinner-border');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');

        var viewUrl = $form.data('view-url') || '';
        var editUrl = $form.data('edit-url') || '';
        var deleteUrl = $form.data('delete-url') || '';
        var viewLabel = $form.data('view-label') || 'View';
        var editLabel = $form.data('edit-label') || 'Edit';
        var deleteLabel = $form.data('delete-label') || 'Delete';

        $.ajax({
            url: $form.attr('action'),
            type: 'POST',
            data: $form.serialize(),
            success: function (res) {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');

                if (res.success || res.data) {
                    var createdPost = res.data || {
                        id: 101,
                        userId: userIdVal,
                        title: titleVal,
                        body: bodyVal
                    };

                    // Form reset aur modal close
                    $form[0].reset();
                    hideModal('#createPostModal');

                    // Naye post ki row banakar table ke TOP par prepend karna (No Page Reload!)
                    var safeTitle = $('<div>').text(createdPost.title || titleVal).html();
                    var safeBody = $('<div>').text(createdPost.body || bodyVal).html();
                    var postId = createdPost.id || 101;
                    var postUserId = createdPost.userId || userIdVal;

                    var newRowHtml = '<tr id="post-row-' + postId + '" class="table-success" style="display:none;">' +
                        '<td class="align-middle font-weight-bold text-dark">' + postId + ' <span class="badge badge-success ml-1">New</span></td>' +
                        '<td class="align-middle"><span class="badge badge-light border text-secondary px-2 py-1">User ID: ' + postUserId + '</span></td>' +
                        '<td class="align-middle font-weight-bold text-dark post-title-cell">' + safeTitle + '</td>' +
                        '<td class="align-middle text-muted post-body-cell">' + safeBody + '</td>' +
                        '<td class="align-middle text-center">' +
                            '<div class="btn-group btn-group-sm" role="group" aria-label="Post Actions">' +
                                '<a href="' + viewUrl + '?id=' + postId + '" class="btn btn-outline-info" title="View Post Details">' + viewLabel + '</a>' +
                                '<button type="button" class="btn btn-outline-warning btn-edit-post" data-id="' + postId + '" data-userid="' + postUserId + '" data-title="' + safeTitle + '" data-body="' + safeBody + '" data-url="' + editUrl + '?id=' + postId + '" title="Edit Post">' + editLabel + '</button>' +
                                '<button type="button" class="btn btn-outline-danger btn-delete-post" data-id="' + postId + '" data-title="' + safeTitle + '" data-url="' + deleteUrl + '?id=' + postId + '" title="Delete Post">' + deleteLabel + '</button>' +
                            '</div>' +
                        '</td>' +
                    '</tr>';

                    var $newRow = $(newRowHtml);
                    $('#posts-table-body').prepend($newRow);
                    $newRow.fadeIn(600);

                    // Success alert show karna
                    showAlert('#api-alert-container', 'Post successfully created! (ID: ' + postId + ') and added to the top of table without page reload.', 'success');

                    // Count update karna
                    var currentCount = $('#posts-table-body tr').length;
                    var countText = $('#posts-count-display').text();
                    if (countText && countText.includes('total')) {
                        $('#posts-count-display').text('Showing ' + currentCount + ' of 100+ total posts');
                    }
                } else if (res.errors) {
                    Object.keys(res.errors).forEach(function (field) {
                        $form.find('#modal-' + field).addClass('is-invalid');
                        $form.find('#modal-' + field + '-error').text(res.errors[field]);
                    });
                } else {
                    showAlert('#modal-form-alert-container', res.error || 'Post create nahi ho saki.', 'danger');
                }
            },
            error: function () {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                showAlert('#modal-form-alert-container', 'Server error: Post create nahi ho saki.', 'danger');
            }
        });
    });

    // 6. Edit Post - Open Edit Modal and pre-fill form
    $(document).on('click', '.btn-edit-post', function (e) {
        e.preventDefault();
        var $btn = $(this);
        var postId = $btn.data('id');
        var userId = $btn.data('userid') || 1;
        var title = $btn.data('title') || '';
        var body = $btn.data('body') || '';
        var updateUrl = $btn.data('url') || '';

        $('#modal-edit-id').val(postId);
        $('#modal-edit-badge').text('ID: ' + postId);
        $('#modal-edit-userId').val(userId);
        $('#modal-edit-title').val(title);
        $('#modal-edit-body').val(body);
        $('#editPostModalForm').attr('action', updateUrl);
        $('#editPostModalForm').find('.is-invalid').removeClass('is-invalid');
        $('#modal-edit-alert-container').empty();

        showModal('#editPostModal');
    });

    // 7. Edit Post Modal Form Submit (Pure AJAX - Updates Row in-place without Page Reload!)
    $('#editPostModalForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var postId = $('#modal-edit-id').val();
        var $userId = $form.find('#modal-edit-userId');
        var $title = $form.find('#modal-edit-title');
        var $body = $form.find('#modal-edit-body');
        var isValid = true;

        $form.find('.is-invalid').removeClass('is-invalid');

        var userIdVal = parseInt($userId.val(), 10);
        if (!$userId.val() || isNaN(userIdVal) || userIdVal <= 0) {
            $userId.addClass('is-invalid');
            isValid = false;
        }

        var titleVal = $.trim($title.val());
        if (!titleVal) {
            $title.addClass('is-invalid');
            isValid = false;
        }

        var bodyVal = $.trim($body.val());
        if (!bodyVal) {
            $body.addClass('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        var $btn = $('#btn-modal-update-post');
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

                if (res.success || res.data) {
                    hideModal('#editPostModal');

                    // Table Row ko directly in-place update karna
                    var $targetRow = $('#post-row-' + postId);
                    if ($targetRow.length) {
                        $targetRow.find('.post-title-cell').text(titleVal);
                        var truncated = bodyVal.length > 80 ? bodyVal.substring(0, 80) + '...' : bodyVal;
                        $targetRow.find('.post-body-cell').text(truncated);
                        $targetRow.find('.badge-light').text('User ID: ' + userIdVal);

                        // Data attributes update karna taake dubara click par updated values khulein
                        var $editBtn = $targetRow.find('.btn-edit-post');
                        $editBtn.data('title', titleVal).data('body', bodyVal).data('userid', userIdVal);
                        var $delBtn = $targetRow.find('.btn-delete-post');
                        $delBtn.data('title', titleVal);

                        // Yellow highlight animation on updated row
                        $targetRow.addClass('table-warning');
                        setTimeout(function () {
                            $targetRow.removeClass('table-warning');
                        }, 1500);
                    }

                    showAlert('#api-alert-container', 'Post ID: ' + postId + ' updated successfully without page reload!', 'success');
                } else if (res.errors) {
                    Object.keys(res.errors).forEach(function (field) {
                        $form.find('#modal-edit-' + field).addClass('is-invalid');
                        $form.find('#modal-edit-' + field + '-error').text(res.errors[field]);
                    });
                } else {
                    showAlert('#modal-edit-alert-container', res.error || 'Post update nahi ho saki.', 'danger');
                }
            },
            error: function () {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                showAlert('#modal-edit-alert-container', 'Server error: Post update nahi ho saki.', 'danger');
            }
        });
    });
});
