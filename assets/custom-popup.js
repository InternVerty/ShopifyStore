/**
 * Custom Popup — custom-popup.js
 *
 * Web component <custom-popup> géré via data-attributes.
 * Prêt pour extension future : champ email → API Brevo.
 */

class CustomPopup extends HTMLElement {
  connectedCallback() {
    // Éléments DOM
    this.overlay  = this.querySelector('.js-popup-overlay');
    this.closeBtn = this.querySelector('.js-popup-close');
    this.modal    = this.querySelector('[role="dialog"]');

    // Config depuis data-attributes (définis dans le Liquid)
    this.trigger     = this.dataset.trigger;
    this.delay       = parseInt(this.dataset.delay, 10) * 1000;
    this.dismissDays = parseInt(this.dataset.dismissDays, 10);
    this.showMobile  = this.dataset.showOnMobile !== 'false';
    this.cookieKey   = `cp-${this.id}`;

    // Ne rien faire si le popup ne doit pas s'afficher
    if (!this.shouldShow()) return;

    // Écouteurs
    this.overlay?.addEventListener('click',  () => this.close());
    this.closeBtn?.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.classList.contains('is-visible')) this.close();
    });

    // Déclencheur
    if (this.trigger === 'delay') {
      setTimeout(() => this.open(), this.delay);
    } else if (this.trigger === 'exit') {
      this.setupExitIntent();
    }
  }

  /* ── Affichage ─────────────────────────────────── */

  open() {
    this.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    this.modal?.focus();
  }

  close() {
    this.classList.remove('is-visible');
    document.body.style.overflow = '';
    // dismissDays = 0 → afficher une seule fois (cookie 10 ans)
    const days = this.dismissDays === 0 ? 3650 : this.dismissDays;
    this.setCookie(this.cookieKey, '1', days);
  }

  /* ── Conditions d'affichage ────────────────────── */

  shouldShow() {
    if (!this.showMobile && window.innerWidth < 768) return false;
    if (this.getCookie(this.cookieKey))              return false;
    return true;
  }

  /* ── Exit intent ───────────────────────────────── */

  setupExitIntent() {
    let triggered = false;
    document.addEventListener('mouseleave', (e) => {
      if (triggered || e.clientY > 0) return;
      triggered = true;
      this.open();
    });
  }

  /* ── Cookies ───────────────────────────────────── */

  getCookie(name) {
    return document.cookie.split('; ').find((r) => r.startsWith(name + '=')) || null;
  }

  setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  /* ── Extension future : soumission email → Brevo ─
   *
   *  Décommentez et adaptez quand vous ajoutez un champ email au popup.
   *
   *  async submitToBrevo(email) {
   *    const response = await fetch('https://api.brevo.com/v3/contacts', {
   *      method: 'POST',
   *      headers: {
   *        'api-key': '<VOTRE_CLE_API_BREVO>',
   *        'Content-Type': 'application/json',
   *      },
   *      body: JSON.stringify({
   *        email,
   *        listIds: [<ID_DE_VOTRE_LISTE>],
   *        updateEnabled: true,
   *      }),
   *    });
   *    return response.ok;
   *  }
   * ─────────────────────────────────────────────── */
}

customElements.define('custom-popup', CustomPopup);
