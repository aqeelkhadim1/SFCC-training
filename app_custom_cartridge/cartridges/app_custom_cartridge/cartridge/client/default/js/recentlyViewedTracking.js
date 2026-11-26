'use strict';

/* global $ */
$(document).ready(function () {

    var tracking = $('.recently-viewed').data('recently-viewed-tracking');
    if (!tracking) return;

    var productId = new URLSearchParams(window.location.search).get('pid')
        || $('.product-detail').first().attr('data-pid');
    if (!productId) return;

    function trackView() {
        var $consent = $('.tracking-consent').first();
        var tokenName = $consent.attr('data-tokenname');
        var token = $consent.attr('data-token');
        if (!tokenName || !token) return;
        var data = { pid: productId };
        data[tokenName] = token;
        $.ajax({
            url: tracking,
            type: 'POST',
            dataType: 'json',
            data: data,
            global: false
        });
    }

    trackView();

    window.addEventListener('pageshow', function (event) {
        if (event.persisted) trackView();
    });
});
