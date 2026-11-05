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

  // Bouton "Je partage" : feuille de partage native sur téléphone/tablette ; sur ordinateur, petit menu
  // (WhatsApp, e-mail, copier le lien). Sans JavaScript, le lien WhatsApp du href reste utilisable.
  function initShare(wrap) {
    var btn = wrap.querySelector('[data-cf-share]');
    var menu = wrap.querySelector('[data-cf-share-menu]');
    var copyBtn = wrap.querySelector('[data-cf-share-copy]');
    if (!btn || !menu) return;
    var url = btn.getAttribute('data-share-url') || window.location.href;
    var copyLabel = copyBtn ? copyBtn.textContent : '';
    var timer = null;

    function isOpen() { return !menu.hidden; }
    function setOpen(open) {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    }

    // Écran tactile + Web Share API : feuille de partage du système.
    function useNativeSheet() {
      return !!navigator.share && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    }

    // Copie synchrone (execCommand) d'abord : fiable dans le geste de clic, même quand
    // l'API Clipboard est refusée (iframe, permissions). API Clipboard en second recours.
    function copyText(text) {
      var ok = false;
      var input = document.createElement('textarea');
      input.value = text;
      input.setAttribute('readonly', '');
      input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
      document.body.appendChild(input);
      input.select();
      input.setSelectionRange(0, text.length);
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      document.body.removeChild(input);
      if (ok) return Promise.resolve();
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
      return Promise.reject(new Error('copy'));
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (useNativeSheet()) {
        navigator.share({
          title: btn.getAttribute('data-share-title') || document.title,
          text: btn.getAttribute('data-share-text') || '',
          url: url
        }).catch(function () { /* fermeture de la feuille : rien à faire */ });
        return;
      }
      setOpen(!isOpen());
      if (isOpen()) {
        var first = menu.querySelector('a, button');
        if (first) first.focus();
      }
    });

    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        copyText(url).then(function () {
          copyBtn.textContent = copyBtn.getAttribute('data-copied-label');
          clearTimeout(timer);
          timer = setTimeout(function () { copyBtn.textContent = copyLabel; setOpen(false); }, 1400);
        }, function () {
          // Copie impossible : on affiche le lien pour qu'il puisse être copié à la main.
          window.prompt('Copiez ce lien :', url);
          setOpen(false);
        });
      });
    }

    menu.addEventListener('click', function (e) {
      // WhatsApp / e-mail : on referme le menu après le clic.
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (isOpen() && !wrap.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
    });
  }

  document.querySelectorAll('[data-cf-slider]').forEach(initSlider);
  document.querySelectorAll('[data-cf-share-wrap]').forEach(initShare);
  document.querySelectorAll('[data-cf-carousel]').forEach(initCarousel);
})();
