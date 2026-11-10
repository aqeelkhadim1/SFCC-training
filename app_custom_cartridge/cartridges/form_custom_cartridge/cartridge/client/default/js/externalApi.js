'use strict';

/**
 * externalApi.js
 * Storefront client script: Single Unified Bootstrap Modal (Varying Modal Content via show.bs.modal + event.relatedTarget),
 * AJAX CRUD (Create, Edit, Delete) without page reload, aur Load More vertical pagination.
 */

$(document).ready(function () {
    // 1. Header Navbar mein 'Posts' tab ensure karna (Page Cache fallback)
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

    // Modal UI Configuration Map (Varying Modal Content pattern per mode)
    var MODAL_MODES = {
        create: {
            headerClass: 'bg-primary text-white',
            btnClass: 'btn-primary',
            iconClass: 'fa-plus-circle',
            closeWhite: true,
            showBadge: false,
            isDelete: false
        },
        edit: {
            headerClass: 'bg-warning text-dark',
            btnClass: 'btn-warning',
            iconClass: 'fa-pencil-square-o',
            closeWhite: false,
            showBadge: true,
            isDelete: false
        },
        delete: {
            headerClass: 'bg-danger text-white',
            btnClass: 'btn-danger',
            iconClass: 'fa-exclamation-triangle',
            closeWhite: true,
            showBadge: false,
            isDelete: true
        }
    };

    function escapeHtml(text) {
        return $('<div>').text(text == null ? '' : String(text)).html();
    }

    function escapeAttr(text) {
        return escapeHtml(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function truncateText(text, maxLen) {
        var str = text == null ? '' : String(text);
        return str.length > maxLen ? str.substring(0, maxLen) + '...' : str;
    }

    function showAlert(containerId, message, type) {
        var alertHtml = '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">' +
            '<strong>' + (type === 'success' ? 'Success: ' : 'Error: ') + '</strong>' + escapeHtml(message) +
            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>';
        $(containerId).html(alertHtml);
    }

    function closeActionModal() {
        var modalEl = document.getElementById('postActionModal');
        if (window.bootstrap && window.bootstrap.Modal && modalEl) {
            window.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        } else if ($.fn && $.fn.modal) {
            $('#postActionModal').modal('hide');
        }
    }

    function updateDisplayedCount(totalOverride) {
        var $countDisplay = $('#posts-count-display');
        if (!$countDisplay.length) {
            return;
        }
        var currentCount = $('#posts-table-body tr').length;
        var total = totalOverride || $countDisplay.data('total') || 100;
        $countDisplay.data('total', total);
        $countDisplay.text('Showing ' + currentCount + ' of ' + total + ' total posts');
    }

    // Reusable Table Row Builder (Create Prepend & AJAX Load More dono ke liye single source of truth)
    function buildPostRowHtml(post, isNew) {
        var $table = $('#posts-table');
        var viewUrl = $table.attr('data-view-url') || '';
        var updateUrl = $table.attr('data-update-url') || '';
        var deleteUrl = $table.attr('data-delete-url') || '';
        var viewLabel = $table.attr('data-view-label') || 'View';
        var editLabel = $table.attr('data-edit-label') || 'Edit';
        var deleteLabel = $table.attr('data-delete-label') || 'Delete';
        var editModalHeading = $table.attr('data-edit-modal-heading') || 'Edit Post Details';
        var editSubmitLabel = $table.attr('data-edit-submit-label') || 'Save Changes';
        var deleteModalHeading = $table.attr('data-delete-modal-heading') || 'Confirm Delete Post';
        var deleteSubmitLabel = $table.attr('data-delete-submit-label') || 'Delete Permanently';

        var postId = post.id || 101;
        var postUserId = post.userId || 1;
        var rawTitle = post.title || '';
        var rawBody = post.body || '';
        var safeTitle = escapeHtml(rawTitle);
        var safeBodyDisplay = escapeHtml(isNew ? rawBody : truncateText(rawBody, 80));
        var attrTitle = escapeAttr(rawTitle);
        var attrBody = escapeAttr(rawBody);
        var rowClass = isNew ? ' class="table-success"' : '';
        var idCell = isNew
            ? '<td class="align-middle font-weight-bold text-dark">' + postId + ' <span class="badge bg-success text-white ml-1">New</span></td>'
            : '<td class="align-middle font-weight-bold text-muted">' + postId + '</td>';

        return '<tr id="post-row-' + postId + '"' + rowClass + ' style="display:none;">' +
            idCell +
            '<td class="align-middle">' +
                '<span class="badge badge-light border text-secondary px-2 py-1">User ID: ' + postUserId + '</span>' +
            '</td>' +
            '<td class="align-middle font-weight-bold text-dark post-title-cell">' + safeTitle + '</td>' +
            '<td class="align-middle text-muted post-body-cell">' + safeBodyDisplay + '</td>' +
            '<td class="align-middle text-center">' +
                '<div class="btn-group btn-group-sm" role="group" aria-label="Post Actions">' +
                    '<a href="' + viewUrl + '?id=' + postId + '" class="btn btn-outline-info" title="View Post Details">' + escapeHtml(viewLabel) + '</a>' +
                    '<button type="button" class="btn btn-outline-warning btn-edit-post"' +
                        ' data-bs-toggle="modal" data-bs-target="#postActionModal"' +
                        ' data-mode="edit"' +
                        ' data-id="' + postId + '"' +
                        ' data-userid="' + postUserId + '"' +
                        ' data-title="' + attrTitle + '"' +
                        ' data-body="' + attrBody + '"' +
                        ' data-url="' + updateUrl + '?id=' + postId + '"' +
                        ' data-modal-title="' + escapeAttr(editModalHeading) + '"' +
                        ' data-submit-label="' + escapeAttr(editSubmitLabel) + '"' +
                        ' title="' + escapeAttr(editLabel) + '">' + escapeHtml(editLabel) + '</button>' +
                    '<button type="button" class="btn btn-outline-danger btn-delete-post"' +
                        ' data-bs-toggle="modal" data-bs-target="#postActionModal"' +
                        ' data-mode="delete"' +
                        ' data-id="' + postId + '"' +
                        ' data-title="' + attrTitle + '"' +
                        ' data-url="' + deleteUrl + '?id=' + postId + '"' +
                        ' data-modal-title="' + escapeAttr(deleteModalHeading) + '"' +
                        ' data-submit-label="' + escapeAttr(deleteSubmitLabel) + '"' +
                        ' title="Delete Post">' + escapeHtml(deleteLabel) + '</button>' +
                '</div>' +
            '</td>' +
        '</tr>';
    }

    // Typing start karne par inline validation error clear karna
    $('#postActionModalForm').on('input', 'input, textarea', function () {
        $(this).removeClass('is-invalid');
    });

    // 2. SINGLE Bootstrap Modal Handler ('show.bs.modal' + event.relatedTarget + data-* attributes)
    $('#postActionModal').on('show.bs.modal', function (event) {
        var $button = $(event.relatedTarget);
        if (!$button || !$button.length) {
            return;
        }

        var $modal = $(this);
        var $form = $('#postActionModalForm');
        var mode = $button.attr('data-mode') || 'create';
        var config = MODAL_MODES[mode] || MODAL_MODES.create;

        var actionUrl = $button.attr('data-url') || '';
        var postId = $button.attr('data-id') || '';
        var userId = $button.attr('data-userid') || '';
        var title = $button.attr('data-title') || '';
        var body = $button.attr('data-body') || '';
        var modalTitle = $button.attr('data-modal-title') || '';
        var submitLabel = $button.attr('data-submit-label') || 'Submit';

        // Step A: Form aur validation reset (pehle reset, phir values set)
        $form[0].reset();
        $form.find('.is-invalid').removeClass('is-invalid');
        $('#modal-form-alert-container').empty();

        // Step B: Modal Header, Dialog Size, Icon, Badge & Submit Button configure karna
        $('#post-modal-header')
            .removeClass('bg-primary bg-warning bg-danger text-white text-dark')
            .addClass(config.headerClass);

        $('#post-modal-close-btn').toggleClass('btn-close-white', config.closeWhite);
        $('#post-modal-icon').attr('class', 'fa mr-2 ' + config.iconClass);
        $('#post-modal-title-text').text(modalTitle);

        var $badge = $('#post-modal-badge');
        if (config.showBadge && postId) {
            $badge.text('ID: ' + postId).removeClass('d-none');
        } else {
            $badge.addClass('d-none').text('');
        }

        $modal.find('.modal-dialog').toggleClass('modal-lg', !config.isDelete);

        $('#btn-modal-submit')
            .removeClass('btn-primary btn-warning btn-danger')
            .addClass(config.btnClass);
        $('#btn-modal-submit-text').text(submitLabel);

        // Step C: Form metadata & body sections mode ke mutabiq populate karna
        $form.attr('action', actionUrl);
        $('#modal-action-mode').val(mode);
        $('#modal-post-id').val(postId);

        $('#modal-form-fields').toggleClass('d-none', config.isDelete);
        $('#modal-delete-preview').toggleClass('d-none', !config.isDelete);

        if (config.isDelete) {
            $('#delete-preview-id').text(postId);
            $('#delete-preview-title').text(title);
        } else if (mode === 'edit') {
            $('#modal-userId').val(userId);
            $('#modal-title').val(title);
            $('#modal-body').val(body);
        }
    });

    function validateModalForm($form) {
        var isValid = true;
        var $userId = $form.find('#modal-userId');
        var $title = $form.find('#modal-title');
        var $body = $form.find('#modal-body');

        $form.find('.is-invalid').removeClass('is-invalid');

        var userIdVal = parseInt($userId.val(), 10);
        if (!$userId.val() || isNaN(userIdVal) || userIdVal <= 0) {
            $userId.addClass('is-invalid');
            isValid = false;
        }

        var titleVal = $.trim($title.val());
        if (!titleVal || titleVal.length > 200) {
            $title.addClass('is-invalid');
            isValid = false;
        }

        if (!$.trim($body.val())) {
            $body.addClass('is-invalid');
            isValid = false;
        }

        return isValid;
    }

    // Mode-specific DOM updates after AJAX success (No page reload)
    var MODE_SUCCESS_HANDLERS = {
        create: function (res, ctx) {
            var createdPost = res.data || {
                id: 101,
                userId: ctx.userIdVal,
                title: ctx.titleVal,
                body: ctx.bodyVal
            };
            var newRowId = createdPost.id || 101;
            var $newRow = $(buildPostRowHtml(createdPost, true));
            $('#posts-table-body').prepend($newRow);
            $newRow.fadeIn(600);
            updateDisplayedCount('100+');
            showAlert('#api-alert-container', 'Post successfully created! (ID: ' + newRowId + ') and added to the top of table without page reload.', 'success');
        },

        edit: function (res, ctx) {
            var $targetRow = $('#post-row-' + ctx.postId);
            if ($targetRow.length) {
                $targetRow.find('.post-title-cell').text(ctx.titleVal);
                $targetRow.find('.post-body-cell').text(truncateText(ctx.bodyVal, 80));
                $targetRow.find('.badge-light').text('User ID: ' + ctx.userIdVal);

                // DOM attributes update karna taake next modal open par fresh data mile
                $targetRow.find('.btn-edit-post')
                    .attr('data-userid', ctx.userIdVal)
                    .attr('data-title', ctx.titleVal)
                    .attr('data-body', ctx.bodyVal);
                $targetRow.find('.btn-delete-post')
                    .attr('data-title', ctx.titleVal);

                $targetRow.addClass('table-warning');
                setTimeout(function () {
                    $targetRow.removeClass('table-warning');
                }, 1500);
            }

            // Agar View Post Details page par Edit kiya gaya ho toh wahan bhi in-place update karna
            if ($('#post-details-card').length) {
                $('#post-details-title').text(ctx.titleVal);
                $('#post-details-body').text(ctx.bodyVal);
                $('#post-details-author').text('Author: User ID: ' + ctx.userIdVal);
                $('#post-details-card .btn-edit-post')
                    .attr('data-userid', ctx.userIdVal)
                    .attr('data-title', ctx.titleVal)
                    .attr('data-body', ctx.bodyVal);
            }

            showAlert('#api-alert-container', 'Post ID: ' + ctx.postId + ' updated successfully without page reload!', 'success');
        },

        delete: function (res, ctx) {
            $('#post-row-' + ctx.postId).fadeOut(400, function () {
                $(this).remove();
                updateDisplayedCount();
            });
            showAlert('#api-alert-container', res.message || 'Post delete ho gayi!', 'success');
        }
    };

    // 3. SINGLE Unified Submit Handler (Create, Edit & Delete via AJAX)
    $('#postActionModalForm').on('submit', function (e) {
        e.preventDefault();
        var $form = $(this);
        var mode = $('#modal-action-mode').val() || 'create';
        var postId = $('#modal-post-id').val();
        var isDelete = (mode === 'delete');

        if (!isDelete && !validateModalForm($form)) {
            return;
        }

        var userIdVal = parseInt($('#modal-userId').val(), 10);
        var titleVal = $.trim($('#modal-title').val());
        var bodyVal = $.trim($('#modal-body').val());

        var $btn = $('#btn-modal-submit');
        var $spinner = $btn.find('.spinner-border');
        $btn.prop('disabled', true);
        $spinner.removeClass('d-none');

        $.ajax({
            url: $form.attr('action'),
            type: 'POST',
            data: isDelete ? { id: postId } : $form.serialize(),
            success: function (res) {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');

                if (res.success || (!isDelete && res.data)) {
                    closeActionModal();
                    var handler = MODE_SUCCESS_HANDLERS[mode];
                    if (handler) {
                        handler(res, {
                            postId: postId,
                            userIdVal: userIdVal,
                            titleVal: titleVal,
                            bodyVal: bodyVal
                        });
                    }
                } else if (res.errors) {
                    Object.keys(res.errors).forEach(function (field) {
                        $form.find('#modal-' + field).addClass('is-invalid');
                        $form.find('#modal-' + field + '-error').text(res.errors[field]);
                    });
                } else {
                    showAlert('#modal-form-alert-container', res.error || 'Request fail ho gayi.', 'danger');
                }
            },
            error: function () {
                $btn.prop('disabled', false);
                $spinner.addClass('d-none');
                showAlert('#modal-form-alert-container', 'Server error: Request complete nahi ho saki.', 'danger');
            }
        });
    });

    // 4. Load More Posts (Vertically extends the table via AJAX)
    $('#btn-load-more').on('click', function () {
        var $btn = $(this);
        var nextPage = parseInt($btn.data('next-page'), 10) || 2;
        var totalPages = parseInt($btn.data('total-pages'), 10) || 10;
        var baseUrl = $btn.data('url');
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
                        rowsHtml += buildPostRowHtml(post, false);
                    });

                    var $newElements = $(rowsHtml);
                    $('#posts-table-body').append($newElements);
                    $newElements.fadeIn(400);

                    var total = (res.pagination && res.pagination.totalRecords) || 100;
                    updateDisplayedCount(total);

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
