(function () {
  'use strict';

  // Plusieurs sections incluent ce script : on n'initialise qu'une seule fois.
  if (window.__cfLandingLoaded) return;
  window.__cfLandingLoaded = true;

  // Slider "À l'intérieur" : fondu automatique toutes les 4 s, points cliquables.
  function initSlider(root) {
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-cf-slide]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-cf-dot]'));
    if (slides.length < 2) return;
    var current = 0;
    var timer = null;

    function show(i) {
      current = i;
      slides.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === i); });
    }
    function start() {
      stop();
      timer = setInterval(function () { show((current + 1) % slides.length); }, 4000);
    }
    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    dots.forEach(function (d, n) {
      d.addEventListener('click', function () { show(n); start(); });
    });
    start();
    // Sans animation inutile quand l'onglet est en arrière-plan.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
  }

  // Carousel "Exemples" : défilement horizontal avec accroche (scroll-snap), flèches et points.
  function initCarousel(root) {
    var track = root.querySelector('[data-cf-track]');
    var nav = root.querySelector('[data-cf-nav]');
    var prev = root.querySelector('[data-cf-prev]');
    var next = root.querySelector('[data-cf-next]');
    var dotsBox = root.querySelector('[data-cf-dots]');
    if (!track || !nav) return;
    var cards = Array.prototype.slice.call(track.children);
    var pages = 1;
    var perPage = 1;
    var step = 0;

    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      step = cards.length ? cards[0].getBoundingClientRect().width + gap : 0;
      perPage = step ? Math.max(1, Math.floor((track.clientWidth + gap) / step)) : 1;
      pages = Math.max(1, Math.ceil(cards.length / perPage));
    }

    function maxScroll() { return track.scrollWidth - track.clientWidth; }

    function currentPage() {
      if (track.scrollLeft >= maxScroll() - 2) return pages - 1;
      return Math.min(pages - 1, Math.round(track.scrollLeft / (step * perPage)));
    }

    function goTo(page) {
      var left = Math.min(maxScroll(), Math.max(0, page * perPage * step));
      track.scrollTo({ left: left });
    }

    function buildDots() {
      dotsBox.innerHTML = '';
      for (var i = 0; i < pages; i++) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'cf-carousel__dot';
        dot.setAttribute('aria-label', 'Page ' + (i + 1) + ' sur ' + pages);
        dot.addEventListener('click', (function (n) { return function () { goTo(n); }; })(i));
        dotsBox.appendChild(dot);
      }
    }

    function update() {
      var scrollable = maxScroll() > 2;
      nav.hidden = !scrollable;
      if (!scrollable) return;
      var page = currentPage();
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll() - 2;
      Array.prototype.forEach.call(dotsBox.children, function (d, n) {
        d.classList.toggle('is-active', n === page);
      });
    }

    function refresh() { measure(); buildDots(); update(); }

    prev.addEventListener('click', function () { goTo(currentPage() - 1); });
    next.addEventListener('click', function () { goTo(currentPage() + 1); });
    track.addEventListener('scroll', update, { passive: true });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(currentPage() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(currentPage() - 1); }
    });
    window.addEventListener('resize', refresh);
    refresh();
  }

  document.querySelectorAll('[data-cf-slider]').forEach(initSlider);
  document.querySelectorAll('[data-cf-carousel]').forEach(initCarousel);
})();
