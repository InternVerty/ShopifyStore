(function () {
  'use strict';

  var STEP_COUNT = 4;
  var NEXT_LABELS = ['Continuer', 'Continuer', 'Accepter la charte', 'Ajouter au panier'];

  class BookclubSignup extends HTMLElement {
    connectedCallback() {
      this.step = 0;
      this.submitting = false;

      this.form = this.querySelector('[data-bookclub-form]');
      this.panels = Array.prototype.slice.call(this.querySelectorAll('[data-step]'));
      this.stepEls = Array.prototype.slice.call(this.querySelectorAll('[data-step-index]'));
      this.nextBtn = this.querySelector('[data-bookclub-next]');
      this.backBtn = this.querySelector('[data-bookclub-back]');
      this.errorEl = this.querySelector('[data-bookclub-error]');
      this.recapNameEl = this.querySelector('[data-bookclub-recap-name]');

      this.form.addEventListener('submit', (e) => e.preventDefault());
      this.nextBtn.addEventListener('click', () => this.handleNext());
      this.backBtn.addEventListener('click', () => this.handleBack());

      this.querySelectorAll('[data-bookclub-close]').forEach((btn) => {
        btn.addEventListener('click', () => this.close());
      });

      this.form.addEventListener('input', () => this.updateNextState());
      this.form.addEventListener('change', () => this.updateNextState());

      document.addEventListener('click', (e) => {
        var trigger = e.target.closest('[data-bookclub-open]');
        if (trigger) {
          e.preventDefault();
          this.open();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.hidden) this.close();
      });

      this.render();
    }

    open() {
      this.hidden = false;
      document.body.style.overflow = 'hidden';
    }

    close() {
      this.hidden = true;
      document.body.style.overflow = '';
    }

    updateNextState() {
      this.nextBtn.disabled = !this.canProceed(this.step);
      var nameField = this.form.querySelector('[name="club_name"]');
      if (this.recapNameEl && nameField && nameField.value) {
        this.recapNameEl.textContent = nameField.value;
      }
    }

    canProceed(step) {
      var form = this.form;
      if (step === 0) {
        return !!(form.club_name.value && form.organizer.value && form.email.value);
      }
      if (step === 1) {
        var hasLevel = !!form.querySelector('input[name="level"]:checked');
        return !!(form.child_name.value && form.child_age.value && hasLevel);
      }
      if (step === 2) {
        var checked = form.querySelectorAll('input[name="charter"]:checked').length;
        var total = form.querySelectorAll('input[name="charter"]').length;
        return checked === total;
      }
      return true;
    }

    handleBack() {
      if (this.step === 0) {
        this.close();
        return;
      }
      this.step -= 1;
      this.render();
    }

    handleNext() {
      if (!this.canProceed(this.step)) return;

      if (this.step === STEP_COUNT - 1) {
        this.submit();
        return;
      }

      this.step += 1;
      this.render();
    }

    render() {
      this.panels.forEach((panel) => {
        panel.hidden = Number(panel.getAttribute('data-step')) !== this.step;
      });
      this.stepEls.forEach((stepEl) => {
        var idx = Number(stepEl.getAttribute('data-step-index'));
        stepEl.classList.toggle('is-active', idx === this.step);
        stepEl.classList.toggle('is-done', idx < this.step);
      });
      this.backBtn.textContent = this.step === 0 ? 'Annuler' : 'Retour';
      this.nextBtn.textContent = this.submitting ? 'Ajout en cours...' : NEXT_LABELS[this.step];
      this.nextBtn.disabled = this.submitting || !this.canProceed(this.step);
      if (this.errorEl) this.errorEl.hidden = true;
    }

    submit() {
      var handle = this.getAttribute('data-product-handle');
      this.submitting = true;
      this.render();

      fetch('/products/' + handle + '.js')
        .then((res) => {
          if (!res.ok) throw new Error('product-not-found');
          return res.json();
        })
        .then((product) => {
          var variant = product.variants && product.variants[0];
          if (!variant) throw new Error('no-variant');

          var payload = {
            id: variant.id,
            quantity: 1,
            properties: this.collectProperties(),
          };

          var group = product.selling_plan_groups && product.selling_plan_groups[0];
          var plan = group && group.selling_plans && group.selling_plans[0];
          if (plan) payload.selling_plan = plan.id;

          return fetch('/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(payload),
          });
        })
        .then((res) => {
          if (!res.ok) throw new Error('cart-add-failed');
          return res.json();
        })
        .then(() => {
          window.location.href = '/checkout';
        })
        .catch(() => {
          this.submitting = false;
          this.render();
          if (this.errorEl) this.errorEl.hidden = false;
        });
    }

    collectProperties() {
      var form = this.form;
      var interests = Array.prototype.slice
        .call(form.querySelectorAll('input[name="interests"]:checked'))
        .map((el) => el.value)
        .join(', ');
      var level = form.querySelector('input[name="level"]:checked');
      var length = form.querySelector('input[name="length"]:checked');

      return {
        Club: form.club_name.value,
        Organisateur: form.organizer.value,
        Email: form.email.value,
        Ville: form.city.value || '',
        Enfant: form.child_name.value,
        Age: form.child_age.value,
        'Niveau de lecture': level ? level.value : '',
        'Longueur preferee': length ? length.value : '',
        "Centres d'interet": interests,
        'Charte acceptee': 'Oui',
      };
    }
  }

  customElements.define('bookclub-signup', BookclubSignup);
})();
