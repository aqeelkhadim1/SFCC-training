'use strict';

/* global $ */
$(document).ready(function () {
    var carousel = $('#recently-viewed-carousel');
    if (!carousel.length) return;

    var track = carousel.find('.recently-viewed-track');
    var product = track.find('[data-recently-viewed-product]').first();
    var previous = carousel.find('[data-scroll-direction="-1"]');
    var next = carousel.find('[data-scroll-direction="1"]');

    /** Update arrow visibility and disable controls at the track boundaries. */
    function updateControls() {
        var maximum = track[0].scrollWidth - track[0].clientWidth;
        previous.toggleClass('d-none', maximum <= 1);
        next.toggleClass('d-none', maximum <= 1);
        previous.prop('disabled', track.scrollLeft() <= 1);
        next.prop('disabled', track.scrollLeft() >= maximum - 1);
    }

    carousel.find('[data-scroll-direction]').on('click', function () {
        var maximum = track[0].scrollWidth - track[0].clientWidth;
        if (maximum <= 1) return;

        var direction = Number($(this).data('scroll-direction'));
        track[0].scrollBy({ left: direction * product.outerWidth() });
    });
    track.on('scroll', updateControls);
    $(window).on('resize', updateControls);
    updateControls();
});
