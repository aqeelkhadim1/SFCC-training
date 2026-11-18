'use strict';

function initializeRecentlyViewedCarousel(section) {
    var viewport = section.querySelector('[data-carousel-viewport]');
    var previous = section.querySelector('[data-carousel-prev]');
    var next = section.querySelector('[data-carousel-next]');

    if (!viewport || !previous || !next) {
        return;
    }

    function updateControls() {
        var maxScroll = viewport.scrollWidth - viewport.clientWidth;
        previous.disabled = viewport.scrollLeft <= 1;
        next.disabled = viewport.scrollLeft >= maxScroll - 1;
        previous.hidden = maxScroll <= 1;
        next.hidden = maxScroll <= 1;
    }

    previous.addEventListener('click', function () {
        viewport.scrollBy({ left: -viewport.clientWidth * 0.85, behavior: 'smooth' });
    });

    next.addEventListener('click', function () {
        viewport.scrollBy({ left: viewport.clientWidth * 0.85, behavior: 'smooth' });
    });

    viewport.addEventListener('scroll', updateControls);
    window.addEventListener('resize', updateControls);
    updateControls();
}

document.addEventListener('DOMContentLoaded', function () {
    var carousels = document.querySelectorAll('[data-recently-viewed-carousel]');
    Array.prototype.forEach.call(carousels, initializeRecentlyViewedCarousel);
});
