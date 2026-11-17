'use strict';

/* global $ */
$(document).ready(function () {

    var tracking = $('.recently-viewed').data('recently-viewed-tracking');
    if (!tracking) return;

    var productId = new URLSearchParams(window.location.search).get('pid')
        || $('.product-detail').first().attr('data-pid');
    if (!productId) return;

    function trackView() {
        var token = $('input[name="csrf_token"]').first().val();
        if (!token) return;
        $.ajax({
            url: tracking,
            type: 'POST',
            dataType: 'json',
            data: {
                pid: productId,
                csrf_token: token
            },
            global: false
        });
    }

    trackView();

    window.addEventListener('pageshow', function (event) {
        if (event.persisted) trackView();
    });
});