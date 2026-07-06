(function () {
  'use strict';

  var DRAFT_KEY = 'bookclub-draft';

  class BookclubSignup extends HTMLElement {
    connectedCallback() {
      this.step = 0;
      this.submitting = false;

      this.form = this.querySelector('[data-bookclub-form]');
      this.panels = Array.prototype.slice.call(this.querySelectorAll('[data-step-key]'));
      this.stepper = this.querySelector('[data-bookclub-stepper]');
      this.nextBtn = this.querySelector('[data-bookclub-next]');
      this.backBtn = this.querySelector('[data-bookclub-back]');
      this.errorEl = this.querySelector('[data-bookclub-error]');
      this.recapNameEl = this.querySelector('[data-bookclub-recap-name]');
      this.guestBtn = this.querySelector('[data-bookclub-guest]');
      this.loginLink = this.querySelector('[data-bookclub-save-draft]');

      this.buildStepper();
      this.setupChildPicker();
      this.setupThemesLimit();

      this.nextBtn.addEventListener('click', () => this.handleNext());
      this.backBtn.addEventListener('click', () => this.handleBack());

      if (this.guestBtn) {
        this.guestBtn.addEventListener('click', () => {
          this.step += 1;
          this.render();
        });
      }

      if (this.loginLink) {
        this.loginLink.addEventListener('click', () => this.saveDraft());
      }

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

      if (this.restoreDraft()) {
        var accountIdx = this.panels.findIndex((p) => p.dataset.stepKey === 'account');
        // Si l'étape "account" n'existe plus dans le DOM (déjà connecté), l'étape
        // suivante est toujours celle juste après "group" (index 1), quelle qu'elle
        // soit (profile pour la jonction, charter pour la création).
        this.step = accountIdx !== -1 ? accountIdx : 1;
        this.render();
        this.open();
      }
    }

    buildStepper() {
      if (!this.stepper) return;
      this.stepper.innerHTML = '';
      this.panels.forEach((panel, idx) => {
        var stepEl = document.createElement('div');
        stepEl.className = 'bc-modal__step';
        stepEl.setAttribute('data-step-index', idx);
        stepEl.innerHTML =
          '<span class="bc-modal__step-dot">' + (idx + 1) + '</span>' +
          '<span class="bc-modal__step-label">' + panel.dataset.stepLabel + '</span>';
        this.stepper.appendChild(stepEl);
        if (idx < this.panels.length - 1) {
          var line = document.createElement('span');
          line.className = 'bc-modal__step-line';
          this.stepper.appendChild(line);
        }
      });
      this.stepEls = Array.prototype.slice.call(this.stepper.querySelectorAll('[data-step-index]'));
    }

    setupChildPicker() {
      this.childPicker = this.querySelector('[data-bookclub-child-picker]');
      if (!this.childPicker) return;
      this.childManual = this.querySelector('[data-bookclub-child-manual]');

      this.childPicker.querySelectorAll('input[name="existing_child"]').forEach((radio) => {
        radio.addEventListener('change', () => {
          this.childManual.hidden = radio.value !== 'new';
          this.updateNextState();
        });
      });
    }

    setupThemesLimit() {
      var group = this.querySelector('[data-bookclub-themes-group]');
      var hint = this.querySelector('[data-bookclub-themes-hint]');
      if (!group) return;
      var boxes = Array.prototype.slice.call(group.querySelectorAll('input[name="child_themes"]'));
      var max = 5;

      var update = () => {
        var count = boxes.filter((b) => b.checked).length;
        boxes.forEach((b) => { b.disabled = !b.checked && count >= max; });
        if (hint) hint.textContent = count >= max ? 'Maximum atteint (' + max + '/' + max + ')' : '5 choix maximum';
      };

      boxes.forEach((b) => b.addEventListener('change', update));
    }

    saveDraft() {
      var data = {};
      this.form.querySelectorAll('[name]').forEach((el) => {
        if (el.type === 'password') return;
        if (el.type === 'checkbox' || el.type === 'radio') {
          if (el.checked) {
            data[el.name] = data[el.name] || [];
            data[el.name].push(el.value);
          }
        } else {
          data[el.name] = el.value;
        }
      });
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    }

    restoreDraft() {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      sessionStorage.removeItem(DRAFT_KEY);

      var data = JSON.parse(raw);
      Object.keys(data).forEach((name) => {
        var value = data[name];
        var els = this.form.querySelectorAll('[name="' + name + '"]');
        if (!els.length) return;
        if (Array.isArray(value)) {
          els.forEach((el) => { el.checked = value.indexOf(el.value) !== -1; });
        } else {
          els.forEach((el) => { el.value = value; });
        }
      });
      return true;
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
      this.nextBtn.disabled = !this.canProceed();
      var nameField = this.form.querySelector('[name="club_name"]');
      if (this.recapNameEl && nameField && nameField.value) {
        this.recapNameEl.textContent = nameField.value;
      }
    }

    canProceed() {
      var form = this.form;
      var key = this.panels[this.step] && this.panels[this.step].dataset.stepKey;

      if (key === 'group') {
        return !!(
          form.querySelector('[name="club_name"]').value &&
          form.querySelector('[name="organizer"]').value &&
          form.querySelector('[name="email"]').value
        );
      }
      if (key === 'profile') {
        if (this.childPicker) {
          var existingChild = form.querySelector('input[name="existing_child"]:checked');
          if (!existingChild) return false;
          if (existingChild.value !== 'new') return true;
        }
        return !!form.querySelector('[name="child_prenom"]').value;
      }
      if (key === 'charter') {
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
      if (!this.canProceed()) return;

      if (this.step === this.panels.length - 1) {
        this.submit();
        return;
      }

      this.step += 1;
      this.render();
    }

    render() {
      this.panels.forEach((panel, idx) => {
        panel.hidden = idx !== this.step;
      });
      this.stepEls.forEach((stepEl) => {
        var idx = Number(stepEl.getAttribute('data-step-index'));
        stepEl.classList.toggle('is-active', idx === this.step);
        stepEl.classList.toggle('is-done', idx < this.step);
      });

      var currentPanel = this.panels[this.step];
      var isAccountStep = currentPanel && currentPanel.dataset.stepKey === 'account';

      this.backBtn.textContent = this.step === 0 ? 'Annuler' : 'Retour';
      this.nextBtn.hidden = isAccountStep;
      this.nextBtn.textContent = this.submitting ? 'Ajout en cours...' : currentPanel.dataset.nextLabel;
      this.nextBtn.disabled = this.submitting || !this.canProceed();
      if (this.errorEl) this.errorEl.hidden = true;
    }

    submit() {
      this.submitting = true;
      this.render();

      if (this.getAttribute('data-submit-mode') === 'create') {
        this.submitCreate();
      } else {
        this.submitJoin();
      }
    }

    submitCreate() {
      var form = this.form;
      var payload = {
        customer_id: this.getAttribute('data-customer-id') || '',
        customer_mail: this.getAttribute('data-customer-email') || '',
        customer_first_name: this.getAttribute('data-customer-first-name') || '',
        customer_last_name: this.getAttribute('data-customer-last-name') || '',
        club: {
          name: form.querySelector('[name="club_name"]').value,
          organizer: form.querySelector('[name="organizer"]').value,
          email: form.querySelector('[name="email"]').value,
          city: form.querySelector('[name="city"]').value || '',
        },
        action: 'create-bookclub',
      };

      fetch('/apps/verty-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (!res.ok) throw new Error('bookclub-create-failed');
          return res.json();
        })
        .then((data) => {
          var url = (data && data.club_url) || this.getAttribute('data-dashboard-url') || '/pages/bookclub-dashboard';
          window.location.href = url;
        })
        .catch(() => {
          this.submitting = false;
          this.render();
          if (this.errorEl) this.errorEl.hidden = false;
        });
    }

    submitJoin() {
      var handle = this.getAttribute('data-product-handle');

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
          this.notifyJoin();
          window.location.href = '/checkout';
        })
        .catch(() => {
          this.submitting = false;
          this.render();
          if (this.errorEl) this.errorEl.hidden = false;
        });
    }

    notifyJoin() {
      // Meilleur effort : le paiement reste la source de vérité, un échec ici
      // ne doit pas bloquer la redirection vers le checkout.
      var form = this.form;
      fetch('/apps/verty-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_token: this.getAttribute('data-club-token') || '',
          organizer: form.querySelector('[name="organizer"]').value,
          email: form.querySelector('[name="email"]').value,
          child: this.collectChildForSync(),
          action: 'join-bookclub',
        }),
      }).catch(() => {});
    }

    collectChildForSync() {
      var form = this.form;
      var existingChild = this.childPicker && form.querySelector('input[name="existing_child"]:checked');

      if (existingChild && existingChild.value !== 'new') {
        var existingThemes = (existingChild.dataset.themes || '')
          .split(', ')
          .filter((t) => t);
        return {
          prenom: existingChild.dataset.prenom || '',
          naissance: existingChild.dataset.naissance || '',
          genre: existingChild.dataset.genre || '',
          classe: existingChild.dataset.classe || '',
          niveau: existingChild.dataset.niveau || '',
          themes: existingThemes,
          remarque: '',
        };
      }

      var themes = Array.prototype.slice
        .call(form.querySelectorAll('input[name="child_themes"]:checked'))
        .map((el) => el.value);
      var genre = form.querySelector('input[name="child_genre"]:checked');
      var classe = form.querySelector('input[name="child_classe"]:checked');
      var niveau = form.querySelector('input[name="child_niveau"]:checked');

      return {
        prenom: form.querySelector('[name="child_prenom"]').value,
        naissance: form.querySelector('[name="child_naissance"]').value,
        genre: genre ? genre.value : '',
        classe: classe ? classe.value : '',
        niveau: niveau ? niveau.value : '',
        themes: themes,
        remarque: form.querySelector('[name="child_remarque"]').value,
      };
    }

    collectChildData() {
      var form = this.form;
      var existingChild = this.childPicker && form.querySelector('input[name="existing_child"]:checked');

      if (existingChild && existingChild.value !== 'new') {
        return {
          Enfant: existingChild.dataset.prenom || '',
          'Date de naissance': existingChild.dataset.naissance || '',
          Genre: existingChild.dataset.genre || '',
          Classe: existingChild.dataset.classe || '',
          'Niveau de lecture': existingChild.dataset.niveau || '',
          'Themes preferes': existingChild.dataset.themes || '',
          Remarque: '',
          'Profil existant': 'Oui',
        };
      }

      var themes = Array.prototype.slice
        .call(form.querySelectorAll('input[name="child_themes"]:checked'))
        .map((el) => el.value)
        .join(', ');
      var genre = form.querySelector('input[name="child_genre"]:checked');
      var classe = form.querySelector('input[name="child_classe"]:checked');
      var niveau = form.querySelector('input[name="child_niveau"]:checked');

      return {
        Enfant: form.querySelector('[name="child_prenom"]').value,
        'Date de naissance': form.querySelector('[name="child_naissance"]').value,
        Genre: genre ? genre.value : '',
        Classe: classe ? classe.value : '',
        'Niveau de lecture': niveau ? niveau.value : '',
        'Themes preferes': themes,
        Remarque: form.querySelector('[name="child_remarque"]').value,
        'Profil existant': 'Non',
      };
    }

    collectProperties() {
      var form = this.form;
      var base = {
        Club: form.querySelector('[name="club_name"]').value,
        'Club Token': this.getAttribute('data-club-token') || '',
        Organisateur: form.querySelector('[name="organizer"]').value,
        Email: form.querySelector('[name="email"]').value,
        Ville: form.querySelector('[name="city"]').value || '',
        'Charte acceptee': 'Oui',
      };
      return Object.assign(base, this.collectChildData());
    }
  }

  customElements.define('bookclub-signup', BookclubSignup);
})();
