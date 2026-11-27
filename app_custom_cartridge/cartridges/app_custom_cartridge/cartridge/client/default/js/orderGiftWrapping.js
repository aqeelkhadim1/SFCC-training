'use strict';

$(function () {
    $('#order-gift-wrapping').on('change', function () {
        var $checkbox = $(this);
        var $wrapping = $checkbox.closest('[data-order-gift-wrapping]');
        var $error = $wrapping.find('.order-gift-wrapping-error');
        var $totals = $wrapping.closest('.totals');
        var data = { selected: this.checked };
        var previousSelection = !this.checked;
        data[$wrapping.attr('data-csrf-name')] = $wrapping.attr('data-csrf-token');

        $error.empty();
        $checkbox.prop('disabled', true);
        $.spinner().start();

        $.ajax({
            url: $wrapping.attr('data-update-url'),
            type: 'POST',
            data: data,
            dataType: 'json'
        }).done(function (response) {
            $checkbox.prop('checked', response.orderGiftWrapping.selected);
            $wrapping.find('.order-gift-wrapping-price').text(response.orderGiftWrapping.price);
            $totals.find('.shipping-cost').text(response.totals.totalShippingCost);
            $totals.find('.tax-total').text(response.totals.totalTax);
            $totals.find('.grand-total').text(response.totals.grandTotal);
            $('body').trigger('cart:update');
        }).fail(function (response) {
            $checkbox.prop('checked', previousSelection);
            var error = response.responseJSON;
            $error.text((error && error.errorMessage) || $wrapping.attr('data-error-message'));
        }).always(function () {
            $.spinner().stop();
            $checkbox.prop('disabled', false);
        });
    });
});
