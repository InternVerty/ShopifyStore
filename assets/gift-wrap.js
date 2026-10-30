/* Paquet cadeau pour toute la commande (voir snippets/gift-wrap.liquid).
   - Case cochée : ajoute le produit "Paquet cadeau" (quantité 1) via /cart/add.js.
   - Case décochée : le retire via /cart/change.js.
   - Si le dernier livre est retiré, le paquet cadeau est retiré aussi. */

if (!customElements.get('gift-wrap')) {
  var GIFT_JSON_HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

  // Rafraîchit le(s) panier(s) affiché(s) : tiroir via le composant <cart-items> du thème,
  // page panier par rechargement (le tiroir et la page ne partagent pas leurs sections).
  var refreshGiftCart = async function (scope) {
    var cartItems = scope && scope.closest('#cart-drawer') ? document.querySelector('#cart-drawer cart-items') : null;
    if (cartItems && typeof cartItems.refresh === 'function') {
      await cartItems.refresh();
      return;
    }
    window.location.reload();
  };

  class GiftWrap extends HTMLElement {
    connectedCallback() {
      this.input = this.querySelector('.gift-wrap__input');
      this.errorEl = this.querySelector('.gift-wrap__error');
      this.variantId = Number(this.dataset.variantId);
      if (this.input) this.input.addEventListener('change', this.onChange.bind(this));
    }

    async onChange() {
      var wanted = this.input.checked;
      this.input.disabled = true;
      this.classList.add('is-loading');
      this.showError('');

      try {
        var response = wanted
          ? await fetch('/cart/add.js', {
            method: 'POST',
            headers: GIFT_JSON_HEADERS,
            body: JSON.stringify({ items: [{ id: this.variantId, quantity: 1 }] })
          })
          : await fetch('/cart/change.js', {
            method: 'POST',
            headers: GIFT_JSON_HEADERS,
            body: JSON.stringify({ id: this.variantId, quantity: 0 })
          });

        if (!response.ok) {
          var data = await response.json().catch(function () { return {}; });
          throw new Error(data.description || data.message || String(response.status));
        }

        await refreshGiftCart(this);
        // En général le rendu de section remplace ce composant ; sinon on rend la main.
        this.input.disabled = false;
        this.classList.remove('is-loading');
      } catch (error) {
        console.error('[gift-wrap]', error); // eslint-disable-line
        this.input.checked = !wanted;
        this.input.disabled = false;
        this.classList.remove('is-loading');
        this.showError("Le paquet cadeau n'a pas pu être mis à jour. Réessayez dans un instant.");
      }
    }

    showError(message) {
      if (!this.errorEl) return;
      this.errorEl.textContent = message;
      this.errorEl.hidden = !message;
    }
  }

  customElements.define('gift-wrap', GiftWrap);

  // Un paquet cadeau sans livre n'a pas de sens : on le retire si c'est la dernière ligne.
  document.addEventListener('on:line-item:change', async function (event) {
    var cart = event.detail && event.detail.cart;
    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) return;

    var giftRow = document.querySelector('.cart-item--gift');
    if (!giftRow) return;
    var giftVariantId = Number(giftRow.dataset.variantId);

    var onlyGift = cart.items.every(function (item) { return item.variant_id === giftVariantId; });
    if (!onlyGift) return;

    try {
      await fetch('/cart/change.js', {
        method: 'POST',
        headers: GIFT_JSON_HEADERS,
        body: JSON.stringify({ id: giftVariantId, quantity: 0 })
      });
      await refreshGiftCart(giftRow);
    } catch (error) {
      console.error('[gift-wrap]', error); // eslint-disable-line
    }
  });
}
