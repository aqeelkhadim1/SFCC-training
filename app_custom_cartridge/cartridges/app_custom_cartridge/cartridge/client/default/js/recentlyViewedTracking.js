'use strict';

/* global $ */
$(document).ready(function () {
    var tracking = $('.recently-viewed').data('recently-viewed-tracking');
    if (!tracking) return;
    var productId = new URLSearchParams(window.location.search).get('pid')
        || $('.product-detail').first().attr('data-pid');
    if (!productId) return;

    /** Track page visits using the fresh token from the uncached consent include. */
    function trackView() {
        var consent = $('.tracking-consent');
        var tokenName = consent.data('tokenname');
        var token = consent.data('token');
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
    // Browser back/forward cache restores do not run DOM-ready again.
    window.addEventListener('pageshow', function (event) {
        if (event.persisted) trackView();
    });
});
