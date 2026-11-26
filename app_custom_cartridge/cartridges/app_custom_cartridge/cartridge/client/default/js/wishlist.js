'use strict';

var processInclude = require('base/util');
var product = require('base/product/base');
var wishlist = require('wishlist/wishlist/wishlist');

function toggleWishlistItemStatus() {
    $('body').on('change', '.wishlist-hide input[data-item-visibility-url]', function () {
        var $checkbox = $(this);
        var previousChecked = !this.checked;
        $checkbox.prop('disabled', true);

        function showStatus(result) {
            var success = result && result.success;
            if (!success) {
                $checkbox.prop('checked', previousChecked);
            }
            var message = (result && result.msg) || $checkbox.data('visibility-error');
            var $container = $('<div>', { class: 'add-to-wishlist-messages' }).appendTo('body');
            $('<div>', {
                class: 'add-to-wishlist-alert alert text-center ' + (success ? 'alert-success' : 'alert-danger'),
                role: 'alert',
                text: message
            }).appendTo($container);
            setTimeout(function () { $container.remove(); }, 3000);
        }

        $.ajax({
            url: $checkbox.data('item-visibility-url'),
            type: 'POST',
            dataType: 'json',
            data: { itemID: $checkbox.data('id'), listID: $checkbox.data('list-id') }
        }).done(showStatus).fail(function (response) {
            showStatus(response.responseJSON);
        }).always(function () {
            $checkbox.prop('disabled', false);
        });
    });
}

$(document).ready(function () {
    var $listControls = $('.wishlist-nonempty-control');
    var $wishlist = $('.wishlistItemCards').first();
    if ($listControls.length && $wishlist.length) {
        var updateListControls = function () {
            $listControls.toggleClass('d-none', $wishlist.find('.wishlist-product-card').length === 0);
        };
        updateListControls();
        new MutationObserver(updateListControls).observe($wishlist[0], { childList: true, subtree: true });
    }

    var editor = null;

    // Adapt the plugin's Bootstrap 4 markup to the storefront's Bootstrap 5.
    $('body').on('show.bs.modal', '#editWishlistProductModal', function () {
        var element = this;
        var dialog = $(element);
        var modal = window.bootstrap.Modal.getInstance(element);
        var background = [];
        var trigger = document.activeElement;

        dialog.find('[data-dismiss="modal"]').attr('data-bs-dismiss', 'modal');
        dialog.find('.sr-only').addClass('visually-hidden');
        dialog.find('.close').addClass('btn-close ms-auto').find('[aria-hidden="true"]').addClass('d-none');
        dialog.siblings().each(function () {
            background.push({ element: this, ariaHidden: this.getAttribute('aria-hidden') });
        });

        var restorePage = function () {
            background.forEach(function (item) {
                if (item.ariaHidden === null) {
                    item.element.removeAttribute('aria-hidden');
                } else {
                    item.element.setAttribute('aria-hidden', item.ariaHidden);
                }
            });
            modal.dispose();
            editor = null;
            if (trigger && document.body.contains(trigger)) {
                trigger.focus();
            }
        };

        dialog.one('hidden.bs.modal', restorePage);
        editor = { element: element, modal: modal, restorePage: restorePage };
    });

    // The plugin removes the editor after an update; finish Bootstrap cleanup.
    $(document).ajaxComplete(function () {
        if (editor && !document.body.contains(editor.element)) {
            var removedEditor = editor;
            editor = null;
            $(removedEditor.element).one('hidden.bs.modal', removedEditor.restorePage);
            removedEditor.modal.hide();
        }
    });

    processInclude(Object.assign({}, wishlist, { toggleWishlistItemStatus: toggleWishlistItemStatus }));
    product.selectAttribute();
    product.colorAttribute();
    product.availability();
});
