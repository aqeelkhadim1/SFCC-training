'use strict';

/** customBlogPosts.js — AJAX CRUD, PagingModel pagination, validation, CSRF refresh & 2s alerts. */
$(document).ready(function () {
    var $app = $('#custom-blog-posts-app');
    if (!$app.length) { return; }

    var $form = $('#customBlogPostModalForm');
    var $modal = $('#customBlogPostModal');
    var $submitBtn = $('#cbp-submit-btn');
    var alertTimer = null;

    var MODAL_MODES = {
        create: { header: 'bg-primary text-white', btn: 'btn-primary', icon: 'fa-plus-circle', white: true, del: false },
        edit: { header: 'bg-warning text-dark', btn: 'btn-warning', icon: 'fa-pencil-square-o', white: false, del: false },
        delete: { header: 'bg-danger text-white', btn: 'btn-danger', icon: 'fa-exclamation-triangle', white: true, del: true }
    };

    var RULES = [
        { sel: '#cbp-title', err: '#cbp-title-error', fn: function (v) { return v.length <= 200 ? '' : 'data-maxlength-msg'; } },
        { sel: '#cbp-description', err: '#cbp-description-error', fn: function () { return ''; } }
    ];

    function showAlert(target, message, type) {
        var $alert = $('<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">')
            .append($('<span>').text(message || ''))
            .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
        $(target).html($alert);
        if (type === 'success') {
            clearTimeout(alertTimer);
            alertTimer = setTimeout(function () { $alert.fadeOut(300, function () { $(this).remove(); }); }, 2000);
        }
    }

    function hideModal() {
        if (window.bootstrap && window.bootstrap.Modal) {
            window.bootstrap.Modal.getOrCreateInstance($modal[0]).hide();
        } else if ($.fn && $.fn.modal) {
            $modal.modal('hide');
        }
    }

    function setInvalid($input, $err, msg) {
        $input.addClass('is-invalid');
        if (msg) { $err.text(msg); }
    }

    function validateForm() {
        $form.find('.is-invalid').removeClass('is-invalid');
        var valid = true;
        RULES.forEach(function (r) {
            var $el = $(r.sel);
            var $err = $(r.err);
            var val = $.trim($el.val());
            var attr = !val ? 'data-required-msg' : r.fn(val);
            if (attr) {
                setInvalid($el, $err, $err.attr(attr));
                valid = false;
            }
        });
        return valid;
    }

    function sendRequest(opts) {
        if (opts.$btn) { opts.$btn.prop('disabled', true).find('.spinner-border').removeClass('d-none'); }
        $.ajax({
            url: opts.url,
            type: opts.type || 'GET',
            data: opts.data,
            success: function (res) {
                if (res && res.csrf && res.csrf.token) {
                    $app.attr('data-csrf-token', res.csrf.token);
                    $('#cbp-csrf-token').val(res.csrf.token);
                }
                opts.onSuccess(res);
            },
            error: function (xhr) {
                var msg = (xhr.status === 403 || (xhr.responseJSON && xhr.responseJSON.csrfError))
                    ? 'Security token expired. Please reload the page.'
                    : 'Server error: Request could not be completed.';
                showAlert(opts.alertTarget || '#cbp-alert-container', msg, 'danger');
            },
            complete: function () {
                if (opts.$btn) { opts.$btn.prop('disabled', false).find('.spinner-border').addClass('d-none'); }
            }
        });
    }

    function loadPage(pageNum) {
        sendRequest({
            url: $app.attr('data-list-url'),
            data: { page: pageNum },
            onSuccess: function (res) {
                if (!res || !res.success) {
                    showAlert('#cbp-alert-container', (res && res.error) || 'Failed to load posts.', 'danger');
                    return;
                }
                var paging = res.pagination || { page: 1, totalRecords: 0, hasPrev: false, hasNext: false, prevPage: 1, nextPage: 1 };
                var hasRows = res.posts && res.posts.length > 0;
                $app.attr('data-current-page', paging.page);
                $('#cbp-total-badge').text(res.totalBadgeText);
                $('#cbp-table-body').html(hasRows ? res.rowsHtml : '');
                $('#cbp-table-wrap, #cbp-pagination-footer').toggleClass('d-none', !hasRows);
                $('#cbp-empty-state').toggleClass('d-none', hasRows);
                $('#cbp-page-info').text(res.pageInfoText);
                $('#cbp-current-page-btn').text(paging.page);
                $('#cbp-prev-btn').attr('data-page', paging.prevPage).prop('disabled', !paging.hasPrev);
                $('#cbp-next-btn').attr('data-page', paging.nextPage).prop('disabled', !paging.hasNext);
            }
        });
    }

    $form.on('input', 'input, textarea', function () { $(this).removeClass('is-invalid'); });

    $modal.on('show.bs.modal', function (event) {
        var $btn = $(event.relatedTarget);
        if (!$btn.length) { return; }
        var mode = $btn.attr('data-mode') || 'create';
        var cfg = MODAL_MODES[mode] || MODAL_MODES.create;
        var postId = $btn.attr('data-id') || '';
        var authorId = $btn.attr('data-authorid') || '';

        $form[0].reset();
        $form.attr('action', $btn.attr('data-url') || '').find('.is-invalid').removeClass('is-invalid');
        $('#cbp-modal-alert').empty();
        $('#cbp-csrf-token').val($app.attr('data-csrf-token'));
        $('#cbp-action-mode').val(mode);
        $('#cbp-post-id').val(postId);
        $('#cbp-modal-header').removeClass('bg-primary bg-warning bg-danger text-white text-dark').addClass(cfg.header);
        $('#cbp-modal-close-btn').toggleClass('btn-close-white', cfg.white);
        $('#cbp-modal-icon').attr('class', 'fa mr-2 ' + cfg.icon);
        $('#cbp-modal-title-text').text($btn.attr('data-modal-title') || $app.attr('data-delete-modal-title') || '');
        $('#cbp-modal-badge').toggleClass('d-none', mode !== 'edit' || !authorId).text(authorId ? '#' + authorId : '');
        $modal.find('.modal-dialog').toggleClass('modal-lg', !cfg.del);
        $submitBtn.removeClass('btn-primary btn-warning btn-danger').addClass(cfg.btn);
        $('#cbp-submit-text').text($btn.attr('data-submit-label') || $app.attr('data-delete-submit-label') || 'Submit');
        $('#cbp-form-fields').toggleClass('d-none', cfg.del).find('input, textarea').prop('disabled', cfg.del);
        $('#cbp-delete-preview').toggleClass('d-none', !cfg.del);

        if (cfg.del) {
            $('#cbp-delete-id').text(authorId || postId);
            $('#cbp-delete-title').text($btn.attr('data-title') || '');
        } else if (mode === 'edit') {
            $('#cbp-title').val($btn.attr('data-title') || '');
            $('#cbp-description').val($btn.attr('data-description') || '');
        }
    });

    $form.on('submit', function (e) {
        e.preventDefault();
        var mode = $('#cbp-action-mode').val() || 'create';
        var isDelete = mode === 'delete';
        if (!isDelete && !validateForm()) { return; }

        var payload = isDelete ? { postId: $('#cbp-post-id').val() } : $form.serialize();
        if (isDelete) { payload[$app.attr('data-csrf-name')] = $app.attr('data-csrf-token'); }

        sendRequest({
            url: $form.attr('action'),
            type: 'POST',
            data: payload,
            $btn: $submitBtn,
            alertTarget: '#cbp-modal-alert',
            onSuccess: function (res) {
                if (res && res.success) {
                    hideModal();
                    showAlert('#cbp-alert-container', res.message, 'success');
                    loadPage(mode === 'create' ? 1 : (parseInt($app.attr('data-current-page'), 10) || 1));
                } else if (res && res.errors) {
                    Object.keys(res.errors).forEach(function (f) {
                        setInvalid($form.find('[name="' + f + '"]'), $('#cbp-' + f + '-error'), res.errors[f]);
                    });
                } else {
                    showAlert('#cbp-modal-alert', (res && res.error) || 'Request failed.', 'danger');
                }
            }
        });
    });

    $app.on('click', '.cbp-page-btn', function () {
        if (!$(this).prop('disabled')) { loadPage(parseInt($(this).attr('data-page'), 10) || 1); }
    });
});
