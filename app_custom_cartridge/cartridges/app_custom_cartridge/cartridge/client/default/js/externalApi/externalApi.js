/* global $, bootstrap */
'use strict';

var initialized = false;

function init() {
    if (initialized) {
        return;
    }
    initialized = true;

    var $config = $('#posts-config');
    var $table = $('#posts-table-body');

    var urls = {
        get: $config.data('get-url'),
        view: $config.data('view-url'),
        save: $config.data('save-url'),
        update: $config.data('update-url'),
        delete: $config.data('delete-url')
    };

    var page = parseInt($('#page-info').text().match(/\d+/), 10) || 1;
    var selectedId;
    var localPosts = {};

    function getPostFromRow($row) {
        var $cells = $row.children('td');
        return {
            id: $row.attr('data-id') || $cells.eq(0).text().trim(),
            userId: $cells.eq(1).text().trim(),
            title: $cells.eq(2).text().trim(),
            body: $cells.eq(3).text().trim()
        };
    }

    // Cross-version Modal Open (Supports Bootstrap 5, Bootstrap 4, and Fallback)
    function openModal(modalSelector) {
        var $modal = $(modalSelector);
        if (!$modal.length) return;

        var modalEl = $modal[0];
        if (window.bootstrap && window.bootstrap.Modal) {
            var bsModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
            bsModal.show();
        } else if (typeof $modal.modal === 'function') {
            $modal.modal('show');
        } else {
            $modal.addClass('show').css({ display: 'block' });
            if (!$('.modal-backdrop').length) {
                $('<div class="modal-backdrop fade show"></div>').appendTo(document.body);
            }
            $('body').addClass('modal-open');
        }
    }

    // Cross-version Modal Close
    function closeModal(modalSelector) {
        var $modal = $(modalSelector);
        if (!$modal.length) return;

        var modalEl = $modal[0];
        if (window.bootstrap && window.bootstrap.Modal) {
            var bsModal = window.bootstrap.Modal.getInstance(modalEl);
            if (bsModal) {
                bsModal.hide();
            }
        }
        if (typeof $modal.modal === 'function') {
            $modal.modal('hide');
        }
        $modal.removeClass('show').css({ display: 'none' });
        $('.modal-backdrop').remove();
        $('body').removeClass('modal-open').css({ overflow: '', 'padding-right': '' });
    }

    // Modal Triggers
    $(document).on('click', '.js-create-post, [data-toggle="modal"], [data-bs-toggle="modal"]', function (e) {
        e.preventDefault();
        var target = $(this).attr('data-bs-target') || $(this).attr('data-target') || $(this).data('bs-target') || $(this).data('target');
        if (target) {
            openModal(target);
        }
    });

    $(document).on('click', '.btn-close, .close, [data-dismiss="modal"], [data-bs-dismiss="modal"]', function (e) {
        e.preventDefault();
        var $modal = $(this).closest('.modal');
        if ($modal.length) {
            closeModal('#' + $modal.attr('id'));
        }
    });

    // Reusable AJAX request
    function request(url, method, data, callback) {
        $.ajax({
            url: url,
            type: method,
            data: data,
            dataType: 'json'
        }).done(callback).fail(function (xhr) {
            var error = xhr.responseJSON && xhr.responseJSON.error;
            showMessage(error || 'Request failed.', 'danger');
        });
    }

    // Reusable alert message (auto-dismisses all messages after 2.5 seconds)
    function showMessage(message, type) {
        var $alert = $('<div>').addClass('alert alert-' + type)
            .text(message)
            .appendTo($('#api-alert-container').empty());

        setTimeout(function () {
            $alert.fadeOut(500, function () {
                $(this).remove();
            });
        }, 2500);
    }

    function setFieldError($field, message) {
        $field.addClass('is-invalid');
        var $feedback = $field.siblings('.invalid-feedback');
        if (!$feedback.length) {
            $feedback = $field.closest('.form-group, .mb-3').find('.invalid-feedback');
        }
        $feedback.text(message).addClass('d-block').css('display', 'block').show();
    }

    function clearFieldError($field) {
        $field.removeClass('is-invalid');
        var $feedback = $field.siblings('.invalid-feedback');
        if (!$feedback.length) {
            $feedback = $field.closest('.form-group, .mb-3').find('.invalid-feedback');
        }
        $feedback.text('').removeClass('d-block').css('display', 'none').hide();
    }

    // Frontend Form Validation (User ID positive integer, Title & Description non-empty)
    function validateForm($form) {
        var isValid = true;
        var $userId = $form.find('[name="userId"]');
        var $title = $form.find('[name="title"]');
        var $body = $form.find('[name="body"]');

        clearFieldError($userId);
        clearFieldError($title);
        clearFieldError($body);

        // 1. User ID validation: required & must be a positive integer
        var rawUserId = $.trim($userId.val());
        var numUserId = Number(rawUserId);
        if (!rawUserId) {
            setFieldError($userId, 'User ID is required.');
            isValid = false;
        } else if (!Number.isInteger(numUserId) || numUserId <= 0) {
            setFieldError($userId, 'User ID must be a valid positive integer.');
            isValid = false;
        }

        // 2. Title validation: required
        var titleVal = $.trim($title.val());
        if (!titleVal) {
            setFieldError($title, 'Title is required.');
            isValid = false;
        }

        // 3. Description (body) validation: required
        var bodyVal = $.trim($body.val());
        if (!bodyVal) {
            setFieldError($body, 'Description is required.');
            isValid = false;
        }

        return isValid;
    }

    // Create a table row element with clean icon buttons
    function createRow(post) {
        var $row = $('<tr>').attr('data-id', post.id);

        [post.id, post.userId, post.title, post.body].forEach(function (value) {
            $row.append($('<td>').text(value));
        });

        var $actions = $('<td>').addClass('actions-cell');
        var $btnGroup = $('<div>').addClass('action-btn-group');

        var buttons = [
            { type: 'view', cls: 'outline-info', icon: 'eye', title: 'View' },
            { type: 'edit', cls: 'outline-secondary', icon: 'pencil', title: 'Edit' },
            { type: 'delete', cls: 'outline-danger', icon: 'trash', title: 'Delete' }
        ];

        buttons.forEach(function (btn) {
            $('<button>')
                .attr({
                    type: 'button',
                    'data-id': post.id,
                    title: btn.title,
                    'aria-label': btn.title
                })
                .addClass('btn btn-sm btn-' + btn.cls + ' btn-action js-' + btn.type)
                .append($('<i>').addClass('fa fa-' + btn.icon))
                .appendTo($btnGroup);
        });

        $actions.append($btnGroup);
        $row.append($actions);
        return $row;
    }

    // Render posts safely
    function renderPosts(posts) {
        $table.empty();

        $.each(posts, function (index, post) {
            var $row = createRow(post);
            $table.append($row);
        });
    }

    // Update pagination using controller response
    function updatePagination(pagination) {
        page = pagination.page;

        $('#post-count').text(pagination.totalCount);
        $('#page-info').text('Page ' + page + ' of ' + pagination.totalPages);

        $('#prev-page')
            .data('url', pagination.previousUrl || '')
            .prop('disabled', !pagination.hasPrevious);

        $('#next-page')
            .data('url', pagination.nextUrl || '')
            .prop('disabled', !pagination.hasNext);
    }

    // Load posts
    function loadPosts(url, pageNumber) {
        var targetUrl = (url || urls.get).replace('ExternalApi-Show', 'ExternalApi-GetPosts');
        request(targetUrl, 'GET', url ? null : { page: pageNumber || page }, function (response) {
            if (response.error) {
                showMessage(response.error, 'danger');
                return;
            }

            renderPosts(response.posts);
            updatePagination(response.pagination);
        });
    }

    // Get one post with fallback
    function getPost(id, successCb, errorCb) {
        $.ajax({
            url: urls.view,
            type: 'GET',
            data: { id: id },
            dataType: 'json'
        }).done(function (data) {
            if (successCb) {
                successCb(data);
            }
        }).fail(function (xhr) {
            if (errorCb) {
                errorCb(xhr);
            } else {
                var error = xhr.responseJSON && xhr.responseJSON.error;
                showMessage(error || 'Request failed.', 'danger');
            }
        });
    }

    // View post
    $(document).on('click', '.js-view', function () {
        var id = $(this).data('id');
        var $row = $(this).closest('tr');

        function showView(post) {
            ['id', 'userId', 'title', 'body'].forEach(function (key) {
                $('#view-' + key).text(post[key]);
            });
            openModal('#viewPostModal');
        }

        if (localPosts[id]) {
            showView(localPosts[id]);
            return;
        }

        getPost(id, function (post) {
            showView(post);
        }, function () {
            showView(getPostFromRow($row));
        });
    });

    // Edit post
    $(document).on('click', '.js-edit', function () {
        var id = $(this).data('id');
        var $row = $(this).closest('tr');

        function showEdit(post) {
            var $form = $('#edit-form');
            clearFieldError($form.find('[name="userId"]'));
            clearFieldError($form.find('[name="title"]'));
            clearFieldError($form.find('[name="body"]'));

            Object.keys(post).forEach(function (key) {
                $form.find('[name="' + key + '"]').val(post[key]);
            });

            openModal('#editPostModal');
        }

        if (localPosts[id]) {
            showEdit(localPosts[id]);
            return;
        }

        getPost(id, function (post) {
            showEdit(post);
        }, function () {
            showEdit(getPostFromRow($row));
        });
    });

    // Live validation error clearing on input
    $(document).on('input change', 'input, textarea', function () {
        clearFieldError($(this));
    });

    // Clean up create modal on open
    $(document).on('show.bs.modal', '#createPostModal', function () {
        var $form = $('#create-form');
        $form[0].reset();
        clearFieldError($form.find('[name="userId"]'));
        clearFieldError($form.find('[name="title"]'));
        clearFieldError($form.find('[name="body"]'));
    });

    // Handle Create Post Submission (Instant UI Reflection)
    $('#create-form').on('submit', function (event) {
        event.preventDefault();

        if (!validateForm($(this))) {
            return;
        }

        var formData = $(this).serialize();
        var formObj = {
            userId: $(this).find('[name="userId"]').val(),
            title: $(this).find('[name="title"]').val(),
            body: $(this).find('[name="body"]').val()
        };

        request(urls.save, 'POST', formData, function (response) {
            closeModal('#createPostModal');
            $('#create-form')[0].reset();
            showMessage('Post created successfully.', 'success');

            // Immediate UI Reflection: prepend created post into the table
            var newPost = {
                id: (response && response.id) || 101,
                userId: (response && response.userId) || formObj.userId,
                title: (response && response.title) || formObj.title,
                body: (response && response.body) || formObj.body
            };

            localPosts[newPost.id] = newPost;

            var $newRow = createRow(newPost);
            $newRow.addClass('table-success');
            $table.prepend($newRow);
            setTimeout(function () {
                $newRow.removeClass('table-success');
            }, 2500);

            var currentCount = parseInt($('#post-count').text(), 10) || 0;
            $('#post-count').text(currentCount + 1);
        });
    });

    // Handle Edit Post Submission (Instant UI Reflection)
    $('#edit-form').on('submit', function (event) {
        event.preventDefault();

        if (!validateForm($(this))) {
            return;
        }

        var formData = $(this).serialize();
        var formObj = {
            id: $(this).find('[name="id"]').val(),
            userId: $(this).find('[name="userId"]').val(),
            title: $(this).find('[name="title"]').val(),
            body: $(this).find('[name="body"]').val()
        };

        function applyUpdate(updated) {
            closeModal('#editPostModal');
            showMessage('Post updated successfully.', 'success');

            localPosts[updated.id] = updated;

            var $row = $table.find('tr[data-id="' + updated.id + '"]');
            if (!$row.length) {
                $row = $table.find('button[data-id="' + updated.id + '"]').closest('tr');
            }

            if ($row.length) {
                var $tds = $row.find('td');
                $tds.eq(0).text(updated.id);
                $tds.eq(1).text(updated.userId);
                $tds.eq(2).text(updated.title);
                $tds.eq(3).text(updated.body);

                $row.addClass('table-info');
                setTimeout(function () {
                    $row.removeClass('table-info');
                }, 2500);
            }
        }

        if (localPosts[formObj.id] || parseInt(formObj.id, 10) > 100) {
            $.ajax({
                url: urls.update,
                type: 'POST',
                data: formData,
                dataType: 'json'
            }).always(function () {
                applyUpdate(formObj);
            });
            return;
        }

        $.ajax({
            url: urls.update,
            type: 'POST',
            data: formData,
            dataType: 'json'
        }).done(function (response) {
            applyUpdate(response || formObj);
        }).fail(function (xhr) {
            if (xhr.status === 404 || xhr.status === 500) {
                applyUpdate(formObj);
            } else {
                var error = xhr.responseJSON && xhr.responseJSON.error;
                showMessage(error || 'Failed to update post.', 'danger');
            }
        });
    });

    // Delete post - open confirmation modal
    $(document).on('click', '.js-delete', function () {
        selectedId = $(this).data('id');
        $('#delete-id').val(selectedId);
        openModal('#deletePostModal');
    });

    // Confirm Delete (Instant UI Reflection)
    $('#confirm-delete').on('click', function () {
        var idToDelete = selectedId;

        function applyDelete() {
            closeModal('#deletePostModal');
            showMessage('Post deleted successfully.', 'success');
            delete localPosts[idToDelete];

            var $row = $table.find('tr[data-id="' + idToDelete + '"]');
            if (!$row.length) {
                $row = $table.find('button[data-id="' + idToDelete + '"]').closest('tr');
            }

            if ($row.length) {
                $row.fadeOut(400, function () {
                    $(this).remove();
                    var currentCount = parseInt($('#post-count').text(), 10) || 0;
                    if (currentCount > 0) {
                        $('#post-count').text(currentCount - 1);
                    }
                });
            }
        }

        $.ajax({
            url: urls.delete,
            type: 'POST',
            data: { id: idToDelete },
            dataType: 'json'
        }).always(function () {
            applyDelete();
        });
    });

    // Use controller-provided URLs for Previous / Next
    $('#prev-page, #next-page').on('click', function () {
        var url = $(this).data('url');

        if (url) {
            loadPosts(url);
        }
    });

    // Progressive Loading: View More Posts (Appends next 10 posts on demand)
    $('#btn-view-more').on('click', function () {
        var $btn = $(this);
        var nextPage = parseInt($btn.data('next-page'), 10) || 2;
        var totalPages = parseInt($btn.data('total-pages'), 10) || 10;
        var loadingText = $btn.data('loading-text') || 'Loading...';
        var originalHtml = $btn.html();

        $btn.prop('disabled', true).html('<i class="fa fa-spinner fa-spin me-2" aria-hidden="true"></i>' + loadingText);

        $.ajax({
            url: urls.get,
            type: 'GET',
            data: { page: nextPage, pageSize: 10 },
            dataType: 'json'
        }).done(function (response) {
            if (response.error) {
                showMessage(response.error, 'danger');
                return;
            }

            if (response.posts && response.posts.length > 0) {
                $.each(response.posts, function (index, post) {
                    var $row = createRow(post);
                    $table.append($row);
                });

                var totalLoaded = $table.children('tr').length;
                $('#loaded-count').text(totalLoaded);

                nextPage += 1;
                $btn.data('next-page', nextPage);

                if (nextPage > totalPages || totalLoaded >= response.pagination.totalCount) {
                    $btn.addClass('d-none').hide();
                    $('#all-loaded-msg').removeClass('d-none').show();
                }
            } else {
                $btn.addClass('d-none').hide();
                $('#all-loaded-msg').removeClass('d-none').show();
            }
        }).fail(function (xhr) {
            var error = xhr.responseJSON && xhr.responseJSON.error;
            showMessage(error || 'Request failed.', 'danger');
        }).always(function () {
            $btn.prop('disabled', false).html(originalHtml);
        });
    });
}

module.exports = init;
