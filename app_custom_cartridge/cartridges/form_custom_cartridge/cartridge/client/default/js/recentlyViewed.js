'use strict';

/**
 * recentlyViewed.js
 * PDP AJAX tracking (cached PDP + variant changes) and non-circular Bootstrap Carousel controls.
 */

$(document).ready(function () {
    // 1. PDP View & Variant Tracking
    var $productWrapper = $('.product-detail[data-rv-track-url]');
    if ($productWrapper.length) {
        var trackUrl = $productWrapper.attr('data-rv-track-url');
        var initialPid = $productWrapper.attr('data-pid');

        var sendTrackRequest = function (pid) {
            if (trackUrl && pid) {
                $.ajax({ url: trackUrl, type: 'POST', data: { pid: pid } });
            }
        };

        if (initialPid) {
            sendTrackRequest(initialPid);
        }

        $('body').on('product:afterAttributeSelect', function (e, response) {
            if (response && response.data && response.data.product && response.data.product.id) {
                sendTrackRequest(response.data.product.id);
            }
        });
    }

    // 2. Non-circular Slider Prev/Next Disable Controls
    var $carousel = $('#recentlyViewedCarousel');
    if ($carousel.length) {
        var totalSlides = $carousel.find('.carousel-item').length;
        var updateButtons = function (activeIdx) {
            $carousel.find('.rv-slider-prev').prop('disabled', activeIdx <= 0);
            $carousel.find('.rv-slider-next').prop('disabled', activeIdx >= totalSlides - 1);
        };

        updateButtons(0);
        $carousel.on('slide.bs.carousel', function (e) {
            if (typeof e.to === 'number') {
                updateButtons(e.to);
            }
        });
    }
});
