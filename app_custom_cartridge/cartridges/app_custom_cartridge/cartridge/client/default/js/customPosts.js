'use strict';

/* global $ */

$(document).ready(function () {
    var root = $('#custom-posts');
    if (!root.length) return;

    var form = root.find('#custom-post-form');
    var modalElement = root.find('#custom-post-modal');
    var modal = window.bootstrap.Modal.getOrCreateInstance(modalElement[0]);
    var fields = ['userId', 'title', 'body'];
    var inputs = {};
    fields.forEach(function (name) { inputs[name] = form.find('[name="' + name + '"]'); });
    var formMessage = form.find('.js-custom-form-message');
    var formButtons = form.find('button');
    var requestError = root.data('request-error');
    var mode = 'create';
    var saving = false;
    var loading = false;
    var urls = {
        create: root.data('save-url'),
        edit: root.data('update-url'),
        delete: root.data('delete-url')
    };

    /** Apply the same native disabled state used by External API pagination. */
    function updatePagination() {
        var list = root.find('#custom-post-list');
        root.find('#custom-prev-page').prop('disabled', list.attr('data-has-previous') !== 'true');
        root.find('#custom-next-page').prop('disabled', list.attr('data-has-next') !== 'true');
    }

    /** Remove each status two seconds after it is displayed. */
    function clearStatus() {
        root.find('.js-custom-page-message .alert, .js-custom-form-message .alert')
            .each(function () {
                var message = $(this);
                clearTimeout(message.data('dismiss-timer'));
                message.data('dismiss-timer', setTimeout(function () { message.remove(); }, 2000));
            });
    }

    /** @param {Object} container - jQuery message container
     * @param {string} message - Error message */
    function showError(container, message) {
        container.empty().append($('<div class="alert alert-danger">').text(message || requestError));
        clearStatus();
    }

    /** @param {Object} options Request-specific options
     * @param {Object} container Error message container
     * @returns {Object} AJAX request */
    function request(options, container) {
        return $.ajax($.extend({ type: 'GET', dataType: 'json', cache: false, global: false }, options))
            .fail(function () { showError(container, requestError); });
    }

    /** @param {string} url Listing URL
     * @param {Object} data Page parameters
     * @param {string} [message] Success message after refreshing
     * @returns {Object} AJAX request */
    function loadPosts(url, data, message) {
        loading = true;
        return request({ url: url, data: data, dataType: 'html' }, root.find('.js-custom-page-message'))
            .done(function (html) {
                var list = $($.parseHTML(html)).filter('#custom-post-list');
                if (!list.length || list.attr('data-success') !== 'true') {
                    showError(root.find('.js-custom-page-message'), requestError);
                    return;
                }
                root.find('#custom-post-list').replaceWith(list);
                updatePagination();
                if (message) {
                    list.find('.js-custom-page-message')
                        .append($('<div class="alert alert-success" role="status">').text(message));
                }
                clearStatus();
            }).always(function () { loading = false; });
    }

    /** @param {string} name - Field name
     * @param {string} message - Validation error or empty string */
    function fieldError(name, message) {
        var field = inputs[name];
        field.toggleClass('is-invalid', !!message).attr('aria-invalid', !!message);
        field.siblings('.invalid-feedback').text(message || '');
    }

    /** @param {string} action - Modal mode
     * @param {Object} [post] - Existing record */
    function openModal(action, post) {
        mode = action;
        form[0].reset();
        formMessage.empty();
        fields.forEach(function (name) {
            fieldError(name, '');
            inputs[name].val(post ? post[name] : '')
                .prop('readonly', action === 'view');
        });
        form.find('[name="id"]').val(post ? post.id : '');
        form.find('.js-custom-post-key').toggleClass('d-none', !post)
            .find('span').text(post ? post.id : '');
        form.find('.js-custom-fields').toggleClass('d-none', action === 'delete');
        form.find('.js-custom-delete-confirm').toggleClass('d-none', action !== 'delete');
        form.find('.js-custom-submit').toggleClass('d-none', action === 'view')
            .toggleClass('btn-danger', action === 'delete')
            .toggleClass('btn-primary', action !== 'delete')
            .text(form.attr('data-' + action + '-action') || '');
        root.find('#custom-post-modal-title').text(form.attr('data-' + action + '-title'));
        modal.show();
    }

    /** @returns {boolean} Whether the submitted fields are valid */
    function validateForm() {
        var valid = true;
        fields.forEach(function (name) {
            var value = String(inputs[name].val()).trim();
            var number = Number(value);
            var fieldValid = value.length > 0;
            if (name === 'userId') {
                fieldValid = fieldValid && number === (number | 0); // eslint-disable-line no-bitwise
            }
            fieldError(name, fieldValid ? '' : inputs[name].data('error'));
            valid = valid && fieldValid;
        });
        return valid;
    }

    root.on('click', '.js-custom-create', function () {
        if (!saving && !loading) openModal('create');
    });

    root.on('click', '.js-custom-page', function (event) {
        event.preventDefault();
        var url = $(this).attr('data-url');
        if (!this.disabled && url && !saving && !loading) loadPosts(url);
    });

    root.on('click', '.js-custom-action', function () {
        if (saving || loading) return;
        var button = $(this);
        var action = button.data('mode');
        loading = true;
        root.find('.js-custom-page-message').empty();
        button.prop('disabled', true);

        request({
            url: root.data('view-url'),
            data: { id: button.attr('data-id') }
        }, root.find('.js-custom-page-message')).done(function (response) {
            if (response.success && response.post) {
                openModal(action, response.post);
            } else {
                showError(root.find('.js-custom-page-message'), response.error);
            }
        }).always(function () {
            loading = false;
            button.prop('disabled', false);
        });
    });

    form.on('input change', '[name="userId"], [name="title"], [name="body"]', function () {
        fieldError(this.name, '');
    });

    modalElement.on('hide.bs.modal', function (event) {
        if (saving) event.preventDefault();
    });

    form.on('submit', function (event) {
        event.preventDefault();
        if (saving || loading || !urls[mode] || (mode !== 'delete' && !validateForm())) return;
        saving = true;
        form.attr('aria-busy', 'true');
        formButtons.prop('disabled', true);
        formMessage.empty();

        request({
            url: urls[mode],
            type: 'POST',
            data: form.serialize()
        }, formMessage).done(function (response) {
            if (!response.success) {
                fields.forEach(function (name) {
                    fieldError(name, (response.fieldErrors || {})[name] || '');
                });
                showError(formMessage, response.error);
                return;
            }
            saving = false;
            modal.hide();
            loadPosts(root.data('list-url'), {
                page: mode === 'create' ? 1 : root.find('#custom-post-list').attr('data-page')
            }, root.data(mode + '-success'));
        }).always(function () {
            saving = false;
            form.attr('aria-busy', 'false');
            formButtons.prop('disabled', false);
        });
    });
    updatePagination();
    clearStatus();
});
