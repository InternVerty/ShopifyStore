/* =====================================================================
   Verty : carrousel de la hero d'accueil V3
   Sans dépendance. Gère : défilement auto, progression, pause (survol,
   focus, bouton, préférence « réduire les animations »), clic sur un
   onglet ou un point, swipe mobile, flèches clavier.
   ===================================================================== */
(function () {
  'use strict';

  function initHero(wrap) {
    if (wrap.dataset.vhReady) return;
    wrap.dataset.vhReady = '1';

    var section = wrap.querySelector('.vh');
    var carousel = wrap.querySelector('.vh__carousel');
    var finder = wrap.querySelector('.vh__finder');
    var slides = Array.prototype.slice.call(wrap.querySelectorAll('.vh__slide'));
    var tabs = Array.prototype.slice.call(wrap.querySelectorAll('.vh__tab'));
    var dots = Array.prototype.slice.call(wrap.querySelectorAll('.vh__dot'));
    var pauseBtn = wrap.querySelector('.vh__pause');
    if (!section || slides.length === 0) return;

    var duration = parseInt(wrap.dataset.interval, 10) || 7000;
    var tick = 100;
    var index = 0;
    var elapsed = 0;
    var pausedByUser = false;
    var hover = false;
    var focusInside = false;

    try {
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) pausedByUser = true;
    } catch (e) {}

    function running() {
      return slides.length > 1 && !pausedByUser;
    }

    function paintProgress() {
      var pct = running() ? Math.min(100, (elapsed / duration) * 100) : 100;
      tabs.forEach(function (tab, i) {
        var path = tab.querySelector('.vh__tab-line path');
        if (path) path.style.strokeDashoffset = i === index ? String(Math.round(120 * (1 - pct / 100))) : '120';
      });
      dots.forEach(function (dot, i) {
        var fill = dot.querySelector('.vh__dot-fill');
        if (fill) fill.style.width = i === index ? pct + '%' : '0%';
      });
    }

    function show(i) {
      index = (i + slides.length) % slides.length;
      elapsed = 0;
      slides.forEach(function (s, k) {
        var on = k === index;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-hidden', on ? 'false' : 'true');
        if ('inert' in s) s.inert = !on;
      });
      var active = slides[index];
      section.style.backgroundColor = active.dataset.bg || '';
      section.dataset.tone = active.dataset.tone || 'light';
      tabs.concat(dots).forEach(function (b) {
        b.setAttribute('aria-current', String(Number(b.dataset.index) === index));
      });
      paintProgress();
    }

    function setPaused(p) {
      pausedByUser = p;
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', String(p));
        pauseBtn.setAttribute('aria-label', p ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause);
      }
      elapsed = 0;
      paintProgress();
    }

    tabs.concat(dots).forEach(function (b) {
      b.addEventListener('click', function () { show(Number(b.dataset.index)); });
    });
    if (pauseBtn) pauseBtn.addEventListener('click', function () { setPaused(!pausedByUser); });

    // Pause au survol du carrousel et quand le focus est dans le carrousel ou dans l'encart
    carousel.addEventListener('mouseenter', function () { hover = true; });
    carousel.addEventListener('mouseleave', function () { hover = false; });
    [carousel, finder].forEach(function (el) {
      if (!el) return;
      el.addEventListener('focusin', function () { focusInside = true; });
      el.addEventListener('focusout', function (e) { if (!el.contains(e.relatedTarget)) focusInside = false; });
    });

    // Flèches gauche / droite quand le focus est sur un onglet ou un point
    carousel.addEventListener('keydown', function (e) {
      if (!e.target.closest('.vh__tab, .vh__dot')) return;
      if (e.key === 'ArrowRight') { show(index + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { show(index - 1); e.preventDefault(); }
    });

    // Swipe horizontal (mobile)
    var startX = null, startY = null;
    carousel.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
    }, { passive: true });
    carousel.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
      startX = startY = null;
    }, { passive: true });

    setInterval(function () {
      if (!running() || hover || focusInside || document.hidden) return;
      elapsed += tick;
      if (elapsed >= duration) show(index + 1);
      else paintProgress();
    }, tick);

    if (pauseBtn && slides.length < 2) pauseBtn.hidden = true;
    setPaused(pausedByUser);
    show(0);
  }

  function initAll(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('.vh-wrap'), initHero);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();

  // Éditeur de thème Shopify : réinitialiser quand la section est rechargée
  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
