'use strict';

/**
 * giftWrapping.js — Order-level gift wrapping AJAX toggle & totals summary sync.
 */
$(document).ready(function () {
    var isUpdating = false;

    function syncGiftWrapSummary(totals) {
        if (!totals) { return; }
        var wrap = totals.orderGiftWrappingTotal;
        var hasCharge = wrap && wrap.value > 0;
        $('.order-gift-wrapping-row').toggleClass('d-none', !hasCharge);
        $('.order-gift-wrapping-total').text(hasCharge ? wrap.formatted : '-');
        $('#orderGiftWrapping').prop('checked', Boolean(totals.isOrderGiftWrapped));
    }

    function updateCartTotals(basket) {
        var t = basket && basket.totals;
        if (!t) { return; }
        $('.shipping-cost').text(t.totalShippingCost);
        $('.tax-total').text(t.totalTax);
        $('.grand-total').text(t.grandTotal);
        $('.sub-total').text(t.subTotal);
        $('.order-discount').toggleClass('hide-order-discount', t.orderLevelDiscountTotal.value <= 0);
        if (t.orderLevelDiscountTotal.value > 0) {
            $('.order-discount-total').text('- ' + t.orderLevelDiscountTotal.formatted);
        }
        $('.shipping-discount').toggleClass('hide-shipping-discount', t.shippingLevelDiscountTotal.value <= 0);
        if (t.shippingLevelDiscountTotal.value > 0) {
            $('.shipping-discount-total').text('- ' + t.shippingLevelDiscountTotal.formatted);
        }
        syncGiftWrapSummary(t);
    }

    function showCartError(message) {
        $('.cart-error').append(
            $('<div class="alert alert-danger alert-dismissible valid-cart-error fade show" role="alert">')
                .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>')
                .append($('<span>').text(message || ''))
        );
    }

    $('body').on('change', '.js-order-gift-wrap-checkbox', function () {
        var $cb = $(this);
        if (isUpdating) { return; }

        var enabled = $cb.is(':checked');
        var csrfName = $cb.attr('data-csrf-name') || 'csrf_token';
        var csrfToken = $cb.attr('data-csrf-token') || $('input[name="' + csrfName + '"]').val() || '';
        var payload = { enabled: enabled };
        payload[csrfName] = csrfToken;

        isUpdating = true;
        $cb.prop('disabled', true);
        $.spinner().start();

        $.ajax({
            url: $cb.attr('data-action'),
            type: 'POST',
            dataType: 'json',
            data: payload,
            success: function (res) {
                if (res && res.csrf && res.csrf.token) {
                    $cb.attr('data-csrf-token', res.csrf.token);
                    $('input[name="' + (res.csrf.tokenName || csrfName) + '"]').val(res.csrf.token);
                }
                if (res && !res.error && res.basket) {
                    updateCartTotals(res.basket);
                } else {
                    $cb.prop('checked', !enabled);
                    showCartError((res && res.errorMessage) || $cb.attr('data-error-msg'));
                }
            },
            error: function (xhr) {
                var err = xhr && xhr.responseJSON;
                if (err && err.redirectUrl) {
                    window.location.href = err.redirectUrl;
                    return;
                }
                $cb.prop('checked', !enabled);
                showCartError((err && err.errorMessage) || $cb.attr('data-error-msg'));
            },
            complete: function () {
                isUpdating = false;
                $cb.prop('disabled', false);
                $.spinner().stop();
            }
        });
    });

    $('body').on('cart:update', function (e, data) {
        var basket = data && (data.basket || data.cart || data);
        if (basket && basket.totals) { syncGiftWrapSummary(basket.totals); }
    });
});
