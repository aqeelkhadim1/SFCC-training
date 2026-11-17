'use strict';

$(function () {
    var app = document.getElementById('external-api-app');
    if (!app) {
        return;
    }

    var $app = $(app);
    var $details = $('#post-detail-panel');
    var $editor = $('#post-editor-panel');
    var $deletePanel = $('#post-delete-panel');
    var $modal = $('#post-modal');
    var $tbody = $('#posts-table-body');
    var currentPage = 1;
    var currentPost = null;
    var pendingDeleteId = null;
    var pageSize = 10;
    var hasNextPage = false;
    var localPosts = {};
    var deletedPosts = {};
    var createdPosts = [];

    function showNotice(message, success) {
        $('#external-api-notice')
            .toggleClass('alert-success', Boolean(success))
            .toggleClass('alert-danger', !success)
            .text(message)
            .removeClass('d-none');
    }

    function hideNotice() {
        $('#external-api-notice').addClass('d-none').text('');
    }

    function showList() {
        $modal.modal('hide');
    }

    $(document).on('click', '#close-post-modal, #close-post-modal-footer, #cancel-post-modal', function (event) {
        event.preventDefault();
        showList();
    });

    function showPanel($panel) {
        $details.addClass('d-none');
        $editor.addClass('d-none');
        $deletePanel.addClass('d-none');
        $panel.removeClass('d-none');
        $modal.modal('show');
    }

    function setLoading(loading) {
        $('#posts-loading').toggleClass('d-none', !loading);
        $('#create-post-button').prop('disabled', loading);
        $('#previous-page').prop('disabled', loading || currentPage <= 1);
        $('#next-page').prop('disabled', loading || !hasNextPage);
        $('#view-more-button').prop('disabled', loading).toggleClass('d-none', !hasNextPage);
    }

    function renderPosts(posts, hasNext, append) {
        hasNextPage = hasNext;
        if (!append) {
            $tbody.empty();
        }
        posts.forEach(function (post) {
            var $row = $('<tr>');
            $('<td>').text(post.id).appendTo($row);
            $('<td>').text(post.userId).appendTo($row);
            $('<td>').text(post.title).appendTo($row);
            $('<td>').text(post.body).appendTo($row);

            var $actions = $('<td>');
            ['View', 'Edit', 'Delete'].forEach(function (label) {
                var action = label.toLowerCase();
                $('<button>', {
                    type: 'button',
                    class: 'btn btn-link p-0 me-2',
                    text: label,
                    'data-action': action,
                    'data-post-id': post.id
                }).appendTo($actions);
            });
            $actions.appendTo($row);
            $tbody.append($row);
        });

        var hasVisiblePosts = $tbody.children().length > 0;
        $('#posts-table-container').toggleClass('d-none', !hasVisiblePosts);
        $('#posts-empty').toggleClass('d-none', hasVisiblePosts);
        $('#current-page').text(append ? 'Pages 1–' + currentPage : 'Page ' + currentPage);
        $('#previous-page').prop('disabled', currentPage <= 1);
        $('#next-page').prop('disabled', !hasNext);
        $('#view-more-button').toggleClass('d-none', !hasNext);
    }

    function loadPosts(page, append) {
        var previousPage = currentPage;
        currentPage = Math.max(1, page);
        hideNotice();
        $('#posts-error').addClass('d-none');
        if (!append) {
            $('#posts-empty').addClass('d-none');
            $('#posts-table-container').addClass('d-none');
        }
        setLoading(true);

        $.ajax({
            url: $app.attr('data-posts-url'),
            type: 'GET',
            dataType: 'json',
            data: { page: currentPage, limit: pageSize }
        }).done(function (response) {
            if (!response.success || !Array.isArray(response.data)) {
                $('#posts-error').text(response.error || 'Unable to load posts.').removeClass('d-none');
                if (append) {
                    currentPage = previousPage;
                } else {
                    hasNextPage = false;
                }
                return;
            }
            var posts = response.data.filter(function (post) {
                return !deletedPosts[String(post.id)];
            }).map(function (post) {
                return localPosts[String(post.id)] || post;
            });
            if (currentPage === 1) {
                posts = createdPosts.filter(function (post) {
                    return !deletedPosts[String(post.id)];
                }).concat(posts).slice(0, pageSize);
            }
            if (!posts.length && currentPage > 1 && !append) {
                loadPosts(currentPage - 1);
                return;
            }
            if (!posts.length && append) {
                currentPage = previousPage;
                renderPosts([], false, true);
                return;
            }
            renderPosts(posts, response.data.length === pageSize, append);
        }).fail(function (xhr) {
            var response = xhr.responseJSON || {};
            $('#posts-error').text(response.error || 'Unable to load posts. Please try again.').removeClass('d-none');
            if (append) {
                currentPage = previousPage;
            } else {
                hasNextPage = false;
            }
            $('#current-page').text('Page ' + currentPage);
            $('#previous-page').prop('disabled', currentPage <= 1);
            $('#next-page').prop('disabled', !hasNextPage);
        }).always(function () {
            setLoading(false);
        });
    }

    function requestPost(postId, routeUrl, editAfterLoad) {
        hideNotice();
        $.ajax({
            url: routeUrl || $app.attr('data-post-url'),
            type: 'GET',
            dataType: 'json',
            data: { postId: postId }
        }).done(function (response) {
            if (!response.success || !response.data) {
                showNotice(response.error || 'Post could not be loaded.', false);
                return;
            }

            currentPost = response.data;
            if (editAfterLoad) {
                fillEditor(currentPost);
                return;
            }
            $('#post-modal-title').text('Post Details');
            $('#detail-id').text(currentPost.id);
            $('#detail-user-id').text(currentPost.userId);
            $('#detail-title').text(currentPost.title);
            $('#detail-body').text(currentPost.body);
            showPanel($details);
        }).fail(function (xhr) {
            var response = xhr.responseJSON || {};
            showNotice(response.error || 'Post could not be loaded. Please try again.', false);
        });
    }

    function fillEditor(post) {
        var form = document.getElementById('post-editor-form');
        form.reset();
        $('#post-editor-error').addClass('d-none').text('');
        $('#editor-post-id').val(post ? post.id : '');
        $('#editor-user-id').val(post ? post.userId : '');
        $('#editor-title').val(post ? post.title : '');
        $('#editor-body').val(post ? post.body : '');
        $('#post-modal-title').text(post ? 'Edit Post' : 'Create Post');
        $('#save-post-button').text(post ? 'Save Changes' : 'Create Post');
        $('#post-editor-form .form-control').removeClass('is-invalid').each(function () {
            this.setCustomValidity('');
        });
        showPanel($editor);
    }

    function displayFieldErrors(errors) {
        var fieldMap = {
            userId: '#editor-user-id',
            title: '#editor-title',
            body: '#editor-body'
        };
        Object.keys(fieldMap).forEach(function (name) {
            var $input = $(fieldMap[name]);
            var message = errors && errors[name];
            $input.toggleClass('is-invalid', Boolean(message));
            $input[0].setCustomValidity(message || '');
            if (message) {
                $input.closest('.mb-3').find('.invalid-feedback').text(message);
            }
        });
    }

    $('#create-post-button').on('click', function () {
        hideNotice();
        fillEditor(null);
    });

    $('#detail-edit-button').on('click', function () {
        if (currentPost) {
            fillEditor(currentPost);
        }
    });

    $('#cancel-delete-post').on('click', showList);

    $('#confirm-delete-post').on('click', function () {
        var postId = pendingDeleteId;
        var payload = { postId: postId };
        var $button = $(this).prop('disabled', true);

        if (!postId) {
            $button.prop('disabled', false);
            return;
        }

        payload[$app.attr('data-csrf-name')] = $app.attr('data-csrf-token');
        $.ajax({
            url: $app.attr('data-delete-url'),
            type: 'POST',
            dataType: 'json',
            data: payload
        }).done(function (response) {
            if (response.success) {
                deletedPosts[String(postId)] = true;
                pendingDeleteId = null;
                showList();
                loadPosts(currentPage);
                showNotice('Post deleted successfully.', true);
            } else {
                showNotice(response.error || 'Unable to delete the post.', false);
            }
        }).fail(function (xhr) {
            var response = xhr.responseJSON || {};
            showNotice(response.error || 'Unable to delete the post. Please try again.', false);
        }).always(function () {
            $button.prop('disabled', false);
        });
    });

    $tbody.on('click', 'button[data-action]', function () {
        var action = this.getAttribute('data-action');
        var postId = this.getAttribute('data-post-id');

        if (action === 'view') {
            requestPost(postId);
        } else if (action === 'edit') {
            requestPost(postId, $app.attr('data-edit-url'), true);
        } else if (action === 'delete') {
            pendingDeleteId = postId;
            $('#post-modal-title').text('Delete Post');
            showPanel($deletePanel);
        }
    });

    $('#post-editor-form').on('submit', function (event) {
        event.preventDefault();
        var form = this;
        var userId = document.getElementById('editor-user-id');
        var title = document.getElementById('editor-title');
        var body = document.getElementById('editor-body');
        var isUpdate = Boolean($('#editor-post-id').val());
        var valid = true;

        [userId, title, body].forEach(function (input) {
            var invalid = !input.value.trim()
                || (input === userId && (!/^\d+$/.test(input.value) || Number(input.value) < 1));
            input.classList.toggle('is-invalid', invalid);
            input.setCustomValidity(invalid ? 'Please enter a valid value.' : '');
            valid = valid && !invalid;
        });

        if (!valid) {
            form.reportValidity();
            return;
        }

        var $button = $('#save-post-button').prop('disabled', true);
        $('#post-editor-error').addClass('d-none').text('');
        $.ajax({
            url: isUpdate ? $app.attr('data-update-url') : $app.attr('data-create-url'),
            type: 'POST',
            dataType: 'json',
            data: $(form).serialize()
        }).done(function (response) {
            if (response.success) {
                if (response.data && response.data.id) {
                    localPosts[String(response.data.id)] = response.data;
                    if (!isUpdate) {
                        createdPosts.unshift(response.data);
                        currentPage = 1;
                    }
                }
                showList();
                loadPosts(currentPage);
                showNotice(isUpdate ? 'Post updated successfully.' : 'Post created successfully.', true);
            } else if (response.errors) {
                displayFieldErrors(response.errors);
                $('#post-editor-error').text('Please correct the highlighted fields.').removeClass('d-none');
            } else {
                $('#post-editor-error').text(response.error || 'Unable to save the post.').removeClass('d-none');
            }
        }).fail(function (xhr) {
            var response = xhr.responseJSON || {};
            if (response.errors) {
                displayFieldErrors(response.errors);
                $('#post-editor-error').text('Please correct the highlighted fields.').removeClass('d-none');
            } else {
                $('#post-editor-error').text(response.error || 'Unable to save the post. Please try again.').removeClass('d-none');
            }
        }).always(function () {
            $button.prop('disabled', false);
        });
    });

    $('#previous-page').on('click', function () {
        if (currentPage > 1) {
            loadPosts(currentPage - 1);
        }
    });

    $('#next-page').on('click', function () {
        if (!this.disabled) {
            loadPosts(currentPage + 1);
        }
    });

    $('#view-more-button').on('click', function () {
        if (!this.disabled && hasNextPage) {
            loadPosts(currentPage + 1, true);
        }
    });

    loadPosts(1);
});
