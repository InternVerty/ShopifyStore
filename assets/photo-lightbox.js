if (!customElements.get('photo-lightbox')) {
  class PhotoLightbox extends HTMLElement {
    connectedCallback() {
      this.gallery = this.closest('media-gallery');
      if (!this.gallery) return;

      this.imgEl = this.querySelector('.js-lightbox-img');
      this.counterCurrent = this.querySelector('.js-lightbox-current');
      this.counterTotal = this.querySelector('.js-lightbox-total');
      this.prevBtn = this.querySelector('.js-lightbox-prev');
      this.nextBtn = this.querySelector('.js-lightbox-next');
      this.currentIndex = 0;

      // Collect image items once — re-query on open to handle variant changes
      this._refreshImageItems();

      // Click on image items opens the lightbox
      const viewer = this.gallery.querySelector('.media-viewer');
      if (viewer) {
        viewer.addEventListener('click', (e) => {
          const item = e.target.closest('.media-viewer__item[data-media-type="image"]');
          if (!item) return;
          e.preventDefault();
          this._refreshImageItems();
          const index = this.imageItems.indexOf(item);
          if (index >= 0) this.open(index);
        });
      }

      this.querySelector('.js-close-lightbox')?.addEventListener('click', () => this.close());
      this.querySelector('.js-lightbox-backdrop')?.addEventListener('click', () => this.close());
      this.prevBtn?.addEventListener('click', () => this.prev());
      this.nextBtn?.addEventListener('click', () => this.next());

      this._onKeydown = (e) => {
        if (this.hasAttribute('hidden')) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this.prev();
        if (e.key === 'ArrowRight') this.next();
      };
      document.addEventListener('keydown', this._onKeydown);

      // Touch swipe
      this._touchStartX = null;
      this.addEventListener('touchstart', (e) => {
        this._touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      this.addEventListener('touchend', (e) => {
        if (this._touchStartX === null) return;
        const dx = e.changedTouches[0].screenX - this._touchStartX;
        this._touchStartX = null;
        if (dx > 60) this.prev();
        else if (dx < -60) this.next();
      });
    }

    disconnectedCallback() {
      document.removeEventListener('keydown', this._onKeydown);
    }

    _refreshImageItems() {
      this.imageItems = Array.from(
        this.gallery.querySelectorAll('.media-viewer__item[data-media-type="image"]')
      );
      const total = this.imageItems.length;
      if (this.counterTotal) this.counterTotal.textContent = total;
      const hideNav = total <= 1;
      if (this.prevBtn) this.prevBtn.hidden = hideNav;
      if (this.nextBtn) this.nextBtn.hidden = hideNav;
    }

    open(index) {
      this.currentIndex = index;
      this._updateImage();
      this.removeAttribute('hidden');

      // Match the theme's scroll-lock pattern used in modal.js
      this._scrollY = window.scrollY;
      document.body.classList.add('fixed');
      document.body.style.top = `-${this._scrollY}px`;

      this.querySelector('.js-close-lightbox')?.focus();
    }

    close() {
      this.setAttribute('hidden', '');
      document.body.style.top = '';
      document.body.classList.remove('fixed');
      window.scrollTo(0, this._scrollY || 0);
    }

    prev() {
      this.currentIndex = (this.currentIndex - 1 + this.imageItems.length) % this.imageItems.length;
      this._updateImage();
    }

    next() {
      this.currentIndex = (this.currentIndex + 1) % this.imageItems.length;
      this._updateImage();
    }

    _updateImage() {
      const item = this.imageItems[this.currentIndex];
      if (!item || !this.imgEl) return;

      const src = item.dataset.lightboxSrc || item.querySelector('.product-image')?.src || '';
      const alt = item.dataset.lightboxAlt || '';

      if (this.imgEl.src !== src) {
        this.imgEl.classList.add('is-loading');
        this.imgEl.onload = () => this.imgEl.classList.remove('is-loading');
        this.imgEl.onerror = () => this.imgEl.classList.remove('is-loading');
        this.imgEl.src = src;
      }
      this.imgEl.alt = alt;

      if (this.counterCurrent) this.counterCurrent.textContent = this.currentIndex + 1;
    }
  }

  customElements.define('photo-lightbox', PhotoLightbox);
}
