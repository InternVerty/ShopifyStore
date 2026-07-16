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

      this.buildStepper();
      this.setupChildPicker();
      this.setupThemesLimit();

      this.nextBtn.addEventListener('click', () => this.handleNext());
      this.backBtn.addEventListener('click', () => this.handleBack());

      this.querySelectorAll('[data-bookclub-save-draft]').forEach((link) => {
        link.addEventListener('click', () => this.saveDraft());
      });

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

      // Se connecter / créer un compte peut ouvrir un nouvel onglet (comportement
      // du système de comptes clients Shopify, hors de notre contrôle). Si un
      // brouillon est en attente quand cet onglet reprend le focus, on suppose
      // que l'inscription a pu se terminer ailleurs et on recharge pour vérifier.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && sessionStorage.getItem(DRAFT_KEY)) {
          window.location.reload();
        }
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
      this.childManual = this.querySelector('[data-bookclub-child-manual]');
      if (!this.childManual) return;

      // Le formulaire manuel reste limité à un seul nouvel enfant à la fois,
      // mais il est maintenant indépendant des enfants existants cochés
      // (case "Ajouter un autre enfant" au lieu d'une option radio exclusive).
      var addNewToggle = this.querySelector('input[name="add_new_child"]');
      if (this.childPicker && addNewToggle) {
        addNewToggle.addEventListener('change', () => {
          this.childManual.hidden = !addNewToggle.checked;
          this.updateNextState();
        });
      }
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
        return this.getSelectedChildren().length > 0;
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

      var leavingPanel = this.panels[this.step];
      var loggedIn = !!this.getAttribute('data-customer-id');
      if (leavingPanel && leavingPanel.dataset.stepKey === 'profile' && loggedIn) {
        var newChild = this.getSelectedChildren().filter((c) => c.isNew)[0];
        if (newChild) this.addChildToAccount(newChild);
      }

      if (this.step === this.panels.length - 1) {
        this.submit();
        return;
      }

      this.step += 1;
      this.render();
    }

    // Renvoie tous les enfants sélectionnés à l'étape "Profil lecteur" : un
    // par case cochée parmi les profils existants, plus au maximum un
    // nouveau profil (le formulaire manuel reste limité à un seul à la fois).
    getSelectedChildren() {
      var form = this.form;
      var children = [];

      if (this.childPicker) {
        this.childPicker.querySelectorAll('input[name="existing_child_ids"]:checked').forEach((cb) => {
          children.push({
            isNew: false,
            id: cb.dataset.id || '',
            prenom: cb.dataset.prenom || '',
            naissance: cb.dataset.naissance || '',
            genre: cb.dataset.genre || '',
            classe: cb.dataset.classe || '',
            niveau: cb.dataset.niveau || '',
            themes: (cb.dataset.themes || '').split(', ').filter((t) => t),
            remarque: '',
          });
        });
      }

      var addNewToggle = form.querySelector('input[name="add_new_child"]');
      var prenomField = form.querySelector('[name="child_prenom"]');
      var prenom = prenomField ? prenomField.value : '';
      var manualIncluded = !this.childPicker || (addNewToggle && addNewToggle.checked);

      if (manualIncluded && prenom) {
        var themes = Array.prototype.slice
          .call(form.querySelectorAll('input[name="child_themes"]:checked'))
          .map((el) => el.value);
        var genre = form.querySelector('input[name="child_genre"]:checked');
        var classe = form.querySelector('input[name="child_classe"]:checked');
        var niveau = form.querySelector('input[name="child_niveau"]:checked');

        children.push({
          isNew: true,
          id: '',
          prenom: prenom,
          naissance: form.querySelector('[name="child_naissance"]').value,
          genre: genre ? genre.value : '',
          classe: classe ? classe.value : '',
          niveau: niveau ? niveau.value : '',
          themes: themes,
          remarque: form.querySelector('[name="child_remarque"]').value,
        });
      }

      return children;
    }

    childToSyncPayload(child) {
      return {
        id: child.id,
        prenom: child.prenom,
        naissance: child.naissance,
        genre: child.genre,
        classe: child.classe,
        niveau: child.niveau,
        themes: child.themes,
        remarque: child.remarque,
      };
    }

    addChildToAccount(child) {
      // Meilleur effort, comme notifyJoin() : enregistre le nouveau profil sur
      // le compte client (même mécanisme que "Mes enfants"), sans bloquer la
      // suite du parcours d'inscription au club si ça échoue. N'est appelée
      // que si la personne est connectée (voir handleNext) : sans compte,
      // il n'y a pas de fiche client à laquelle attacher ce profil.
      var email = this.getAttribute('data-customer-email') || '';

      fetch('/apps/verty-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: this.getAttribute('data-customer-id') || '',
          customer_mail: email,
          customer_first_name: this.getAttribute('data-customer-first-name') || '',
          customer_last_name: this.getAttribute('data-customer-last-name') || '',
          child: Object.assign({ index: '', email: email }, this.childToSyncPayload(child)),
          action: 'add-child',
        }),
      }).catch(() => {});
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
      var children = this.getSelectedChildren();
      if (!children.length) {
        this.submitting = false;
        this.render();
        if (this.errorEl) this.errorEl.hidden = false;
        return;
      }

      // Un enfant à la fois, dans l'ordre : join-bookclub puis ajout au panier
      // pour chacun, avant de passer au suivant. Ça évite les écritures
      // concurrentes sur le même panier et garde le lien 1 pour 1 entre
      // chaque ligne de commande et le Member ID qui lui correspond.
      var chain = Promise.resolve();
      children.forEach((child) => {
        chain = chain.then(() => this.joinChildAndAddToCart(child));
      });

      chain
        .then(() => {
          window.location.href = '/checkout';
        })
        .catch(() => {
          this.submitting = false;
          this.render();
          if (this.errorEl) this.errorEl.hidden = false;
        });
    }

    joinChildAndAddToCart(child) {
      var handle = this.getAttribute('data-product-handle');
      var memberId = '';

      // notifyJoin() doit se terminer en premier : le membre créé côté n8n a
      // besoin d'exister avant qu'on ajoute cette ligne au panier, pour que
      // son ID parte avec elle (le webhook orders/paid s'en sert ensuite pour
      // savoir exactement quelle entrée bookclub_member confirmer).
      return this.notifyJoin(child)
        .then((id) => {
          memberId = id;
          return fetch('/products/' + handle + '.js');
        })
        .then((res) => {
          if (!res.ok) throw new Error('product-not-found');
          return res.json();
        })
        .then((product) => {
          var variant = product.variants && product.variants[0];
          if (!variant) throw new Error('no-variant');

          var properties = this.collectProperties(child);
          properties['Member ID'] = memberId;

          var payload = {
            id: variant.id,
            quantity: 1,
            properties: properties,
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
        });
    }

    notifyJoin(child) {
      // Meilleur effort : si ça échoue, on laisse quand même la personne
      // continuer jusqu'au paiement (memberId vide, à réconcilier manuellement
      // si besoin), le paiement Shopify reste la source de vérité de la commande.
      var form = this.form;
      return fetch('/apps/verty-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          club_token: this.getAttribute('data-club-token') || '',
          organizer: form.querySelector('[name="organizer"]').value,
          email: form.querySelector('[name="email"]').value,
          child: this.childToSyncPayload(child),
          action: 'join-bookclub',
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => (data && data.member_id) || '')
        .catch(() => '');
    }

    collectChildData(child) {
      return {
        'ID enfant': child.id || '',
        Enfant: child.prenom || '',
        'Date de naissance': child.naissance || '',
        Genre: child.genre || '',
        Classe: child.classe || '',
        'Niveau de lecture': child.niveau || '',
        'Themes preferes': (child.themes || []).join(', '),
        Remarque: child.remarque || '',
        'Profil existant': child.isNew ? 'Non' : 'Oui',
      };
    }

    collectProperties(child) {
      var form = this.form;
      var base = {
        Club: form.querySelector('[name="club_name"]').value,
        'Club Token': this.getAttribute('data-club-token') || '',
        Organisateur: form.querySelector('[name="organizer"]').value,
        Email: form.querySelector('[name="email"]').value,
        Ville: form.querySelector('[name="city"]').value || '',
        'Charte acceptee': 'Oui',
      };
      return Object.assign(base, this.collectChildData(child));
    }
  }

  customElements.define('bookclub-signup', BookclubSignup);
})();
