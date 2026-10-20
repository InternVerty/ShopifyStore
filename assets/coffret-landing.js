(function () {
  'use strict';

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

  document.querySelectorAll('[data-cf-slider]').forEach(initSlider);
})();
