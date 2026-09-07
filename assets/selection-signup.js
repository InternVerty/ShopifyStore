(function () {
  'use strict';

  var THEMES = ['Animaux', 'Histoire', 'Nature', 'Documentaire', 'BD', 'Aventure', 'Fantastique', 'Sciences', 'Sport', 'Amitié', 'Contes', 'Espace'];
  var NIVEAUX = ['Lecteur débutant', 'Conforme au niveau de la classe', 'Un peu en avance', 'Grand lecteur'];
  var PAYS = ['France', 'Belgique', 'Suisse', 'Luxembourg', 'Canada', 'Autre'];
  var CLASSES = ['Maternelle', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e'];
  var CHILD_REQUIRED = ['prenomEnfant', 'naissance', 'classe', 'genre', 'livres'];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function newChild() {
    return { prenomEnfant: '', naissance: '', pays: 'France', classe: 'CE2', genre: '', niveau: '', themes: [], livres: '' };
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  class SelectionSignup extends HTMLElement {
    connectedCallback() {
      this.webhookUrl = this.getAttribute('data-webhook-url') || '';
      this.privacyUrl = this.getAttribute('data-privacy-url') || '/policies/privacy-policy';
      this.state = {
        enfants: [newChild()],
        d: {
          compte: '',
          email: this.getAttribute('data-customer-email') || '',
          prenom: this.getAttribute('data-customer-first-name') || '',
          nom: this.getAttribute('data-customer-last-name') || '',
          rgpd: false
        },
        touched: false,
        sending: false,
        sent: false
      };

      this.root = this.querySelector('[data-vs-root]');
      this.closeButtons = Array.prototype.slice.call(this.querySelectorAll('[data-vs-close]'));
      this.closeButtons.forEach((btn) => btn.addEventListener('click', () => this.close()));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.hidden) this.close();
      });

      // Intercepte tout lien vers l'ancienne page /pages/formulaire-verty
      // (CTA "Je me lance" / "J'abonne un enfant") pour ouvrir ce popup à la
      // place, sans avoir à toucher les sections qui définissent ces boutons.
      document.addEventListener('click', (e) => {
        var link = e.target.closest('a[href]');
        if (!link) return;
        var href = link.getAttribute('href') || '';
        if (href.indexOf('/pages/formulaire-verty') !== -1) {
          e.preventDefault();
          this.open();
        }
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

    setChild(i, key, value) {
      var enfants = this.state.enfants.slice();
      enfants[i] = Object.assign({}, enfants[i], {});
      enfants[i][key] = value;
      this.state.enfants = enfants;
      this.render();
    }

    toggleTheme(i, theme) {
      var child = this.state.enfants[i];
      var themes = child.themes.indexOf(theme) !== -1
        ? child.themes.filter((t) => t !== theme)
        : child.themes.concat([theme]);
      this.setChild(i, 'themes', themes);
    }

    set(key, value) {
      this.state.d = Object.assign({}, this.state.d, {});
      this.state.d[key] = value;
      this.render();
    }

    addChild() {
      this.state.enfants = this.state.enfants.concat([newChild()]);
      this.render();
    }

    removeChild(i) {
      this.state.enfants = this.state.enfants.filter((_, n) => n !== i);
      this.render();
    }

    errors() {
      var d = this.state.d;
      var hasAccount = d.compte === 'Oui';
      var e = {
        children: this.state.enfants.map((c) => {
          var ce = {};
          CHILD_REQUIRED.forEach((k) => { if (!String(c[k] || '').trim()) ce[k] = true; });
          if (!c.niveau) ce.niveau = true;
          return ce;
        })
      };
      if (!d.compte) e.compte = true;
      if (!d.email.trim()) e.email = 'Ce champ est requis.';
      else if (!EMAIL_RE.test(d.email.trim())) e.email = 'Cet email semble incomplet.';
      if (!hasAccount && !d.prenom.trim()) e.prenom = true;
      if (!hasAccount && !d.nom.trim()) e.nom = true;
      if (!d.rgpd) e.rgpd = true;
      return e;
    }

    count(e) {
      var total = e.children.reduce((n, c) => n + Object.keys(c).length, 0);
      total += ['compte', 'email', 'prenom', 'nom', 'rgpd'].filter((k) => e[k]).length;
      return total;
    }

    submit() {
      var e = this.errors();
      if (this.count(e) > 0) {
        this.state.touched = true;
        this.render();
        return;
      }

      var d = this.state.d;
      var payload = {
        submittedAt: new Date().toISOString(),
        parent: {
          email: d.email,
          prenom: d.prenom,
          nom: d.nom,
          compteExistant: d.compte === 'Oui',
          consentement: true
        },
        enfants: this.state.enfants.map((c) => ({
          prenomEnfant: c.prenomEnfant,
          naissance: c.naissance,
          pays: c.pays,
          classe: c.classe,
          genre: c.genre,
          niveau: c.niveau,
          themes: c.themes,
          livres: c.livres.split('\n').map((s) => s.trim()).filter(Boolean)
        }))
      };

      this.state.sending = true;
      this.state.touched = false;
      this.render();

      var finish = () => {
        this.state.sending = false;
        this.state.sent = true;
        this.render();
      };

      if (this.webhookUrl) {
        fetch(this.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(finish).catch(finish);
      } else {
        setTimeout(finish, 500);
      }
    }

    field(labelText, required, input, errorText, hint) {
      var wrap = el('label', { class: 'vs-field' });
      var labelRow = el('span', { class: 'vs-field__label' });
      labelRow.appendChild(document.createTextNode(labelText));
      if (required) labelRow.appendChild(el('span', { class: 'vs-field__required', text: ' *' }));
      wrap.appendChild(labelRow);
      if (hint) wrap.appendChild(el('span', { class: 'vs-field__hint', text: hint }));
      wrap.appendChild(input);
      if (errorText !== null) {
        var err = el('span', { class: 'vs-field__error', text: errorText || 'Ce champ est requis.' });
        if (!errorText) err.hidden = true;
        wrap.appendChild(err);
      }
      return wrap;
    }

    pill(label, active, onClick, wide) {
      var btn = el('button', { type: 'button', class: 'vs-pill' + (wide ? ' vs-pill--wide' : '') + (active ? ' is-active' : ''), text: label });
      btn.addEventListener('click', onClick);
      return btn;
    }

    renderChildSection(child, i, ce, touched, multi) {
      var section = el('section', { class: 'vs-modal__section' });

      var head = el('div', { class: 'vs-modal__section-head' });
      head.appendChild(el('span', { class: 'vs-modal__badge', text: String(i + 1) }));
      var titre = multi ? 'Enfant ' + (i + 1) + (child.prenomEnfant ? ', ' + child.prenomEnfant : '') : "L'enfant";
      head.appendChild(el('h2', { class: 'vs-modal__section-title', text: titre }));
      head.appendChild(el('span', { class: 'vs-modal__section-rule' }));
      if (multi) {
        var removeBtn = el('button', { type: 'button', class: 'vs-modal__remove', text: 'Retirer' });
        removeBtn.addEventListener('click', () => this.removeChild(i));
        head.appendChild(removeBtn);
      }
      section.appendChild(head);

      // Prénom
      var prenomInput = el('input', { type: 'text', placeholder: 'Son prénom' });
      prenomInput.value = child.prenomEnfant;
      prenomInput.addEventListener('input', (ev) => this.setChild(i, 'prenomEnfant', ev.target.value));
      var prenomField = this.field("Comment s'appelle votre petit explorateur de livres ?", true, prenomInput, touched && ce.prenomEnfant ? 'Ce champ est requis.' : '');
      if (touched && ce.prenomEnfant) prenomField.classList.add('is-invalid');
      section.appendChild(prenomField);

      // Naissance / pays
      var grid1 = el('div', { class: 'vs-grid' });
      var naissanceInput = el('input', { type: 'date' });
      naissanceInput.value = child.naissance;
      naissanceInput.addEventListener('input', (ev) => this.setChild(i, 'naissance', ev.target.value));
      var naissanceField = this.field('Quelle est sa date de naissance ?', true, naissanceInput, touched && ce.naissance ? 'Ce champ est requis.' : '');
      if (touched && ce.naissance) naissanceField.classList.add('is-invalid');
      grid1.appendChild(naissanceField);

      var paysSelect = el('select', {});
      PAYS.forEach((p) => {
        var opt = el('option', { value: p, text: p });
        if (p === child.pays) opt.selected = true;
        paysSelect.appendChild(opt);
      });
      paysSelect.addEventListener('change', (ev) => this.setChild(i, 'pays', ev.target.value));
      grid1.appendChild(this.field('Quel est son pays de résidence ?', false, paysSelect, null));
      section.appendChild(grid1);

      // Classe / genre
      var grid2 = el('div', { class: 'vs-grid' });
      var classeSelect = el('select', {});
      CLASSES.forEach((k) => {
        var opt = el('option', { value: k, text: k });
        if (k === child.classe) opt.selected = true;
        classeSelect.appendChild(opt);
      });
      classeSelect.addEventListener('change', (ev) => this.setChild(i, 'classe', ev.target.value));
      var classeField = this.field('En quelle classe est votre enfant ?', true, classeSelect, touched && ce.classe ? 'Ce champ est requis.' : '');
      if (touched && ce.classe) classeField.classList.add('is-invalid');
      grid2.appendChild(classeField);

      var genreWrap = el('div', { class: 'vs-field' });
      var genreLabel = el('span', { class: 'vs-field__label' });
      genreLabel.appendChild(document.createTextNode('Est ce qu\'il /elle est'));
      genreLabel.appendChild(el('span', { class: 'vs-field__required', text: ' *' }));
      genreWrap.appendChild(genreLabel);
      var genreRow = el('div', { class: 'vs-pill-row' });
      ['Un garçon', 'Une fille'].forEach((g) => {
        genreRow.appendChild(this.pill(g, child.genre === g, () => this.setChild(i, 'genre', g)));
      });
      genreWrap.appendChild(genreRow);
      var genreErr = el('span', { class: 'vs-field__error', text: 'Ce champ est requis.' });
      if (!(touched && ce.genre)) genreErr.hidden = true;
      genreWrap.appendChild(genreErr);
      grid2.appendChild(genreWrap);
      section.appendChild(grid2);

      // Niveau
      var niveauWrap = el('div', { class: 'vs-field' });
      var niveauLabel = el('span', { class: 'vs-field__label' });
      niveauLabel.appendChild(document.createTextNode('Quel est son niveau de lecture'));
      niveauLabel.appendChild(el('span', { class: 'vs-field__required', text: ' *' }));
      niveauWrap.appendChild(niveauLabel);
      var niveauStack = el('div', { class: 'vs-pill-stack' });
      NIVEAUX.forEach((n) => {
        niveauStack.appendChild(this.pill(n, child.niveau === n, () => this.setChild(i, 'niveau', n), true));
      });
      niveauWrap.appendChild(niveauStack);
      var niveauErr = el('span', { class: 'vs-field__error', text: 'Ce champ est requis.' });
      if (!(touched && ce.niveau)) niveauErr.hidden = true;
      niveauWrap.appendChild(niveauErr);
      section.appendChild(niveauWrap);

      // Thèmes
      var themesWrap = el('div', { class: 'vs-field' });
      themesWrap.appendChild(el('span', { class: 'vs-field__label', text: 'Quelles thématiques l’inspirent ?' }));
      themesWrap.appendChild(el('span', { class: 'vs-field__hint', text: 'Plusieurs choix possibles.' }));
      var themesRow = el('div', { class: 'vs-pill-row' });
      THEMES.forEach((t) => {
        themesRow.appendChild(this.pill(t, child.themes.indexOf(t) !== -1, () => this.toggleTheme(i, t)));
      });
      themesWrap.appendChild(themesRow);
      section.appendChild(themesWrap);

      // Livres
      var livresArea = el('textarea', { rows: '5', placeholder: 'Lucky Luke\nLe Clan des Sept\nTintin' });
      livresArea.value = child.livres;
      livresArea.addEventListener('input', (ev) => this.setChild(i, 'livres', ev.target.value));
      var livresField = this.field('Quels sont ses 5 livres préférés ?', true, livresArea, touched && ce.livres ? 'Ce champ est requis.' : '', 'Un titre par ligne.');
      if (touched && ce.livres) livresField.classList.add('is-invalid');
      section.appendChild(livresField);

      return section;
    }

    render() {
      if (!this.root) return;
      var state = this.state;
      var e = this.errors();
      var remaining = this.count(e);
      var touched = state.touched;
      var multi = state.enfants.length > 1;
      var hasAccount = state.d.compte === 'Oui';

      this.root.innerHTML = '';

      var overlay = el('div', { class: 'vs-modal__overlay' });
      overlay.addEventListener('click', () => this.close());
      this.root.appendChild(overlay);

      var page = el('div', { class: 'vs-modal__page' });
      var col = el('div', { class: 'vs-modal__col' });

      var masthead = el('div', { class: 'vs-modal__masthead' });
      masthead.appendChild(el('span', { class: 'vs-modal__wordmark', text: 'Verty' }));
      masthead.appendChild(el('span', { class: 'vs-modal__kicker', text: 'Sélection enfant' }));
      var closeBtn = el('button', { type: 'button', class: 'vs-modal__close', 'aria-label': 'Fermer' });
      closeBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      closeBtn.addEventListener('click', () => this.close());
      masthead.appendChild(closeBtn);
      col.appendChild(masthead);

      var card = el('div', { class: 'vs-modal__card' });
      var band = el('div', { class: 'vs-modal__band' });
      band.appendChild(el('h1', { text: 'La Sélection Verty de votre enfant' }));
      band.appendChild(el('p', { text: 'Quelques questions, trois minutes. Nous composons ensuite une sélection de livres pensée pour lui, envoyée par email.' }));
      card.appendChild(band);

      var body = el('div', { class: 'vs-modal__body' });

      state.enfants.forEach((child, i) => {
        body.appendChild(this.renderChildSection(child, i, e.children[i] || {}, touched, multi));
      });

      var addBtn = el('button', { type: 'button', class: 'vs-add-child' });
      addBtn.appendChild(el('span', { text: '+' }));
      addBtn.appendChild(el('span', { text: 'Ajouter un autre enfant' }));
      addBtn.addEventListener('click', () => this.addChild());
      body.appendChild(addBtn);

      // "Vous"
      var vousSection = el('section', { class: 'vs-modal__section' });
      var vousHead = el('div', { class: 'vs-modal__section-head' });
      vousHead.appendChild(el('span', { class: 'vs-modal__badge', text: String(state.enfants.length + 1) }));
      vousHead.appendChild(el('h2', { class: 'vs-modal__section-title', text: 'Vous' }));
      vousHead.appendChild(el('span', { class: 'vs-modal__section-rule' }));
      vousSection.appendChild(vousHead);

      var compteWrap = el('div', { class: 'vs-field' });
      var compteLabel = el('span', { class: 'vs-field__label' });
      compteLabel.appendChild(document.createTextNode('Vous avez déjà un compte ?'));
      compteLabel.appendChild(el('span', { class: 'vs-field__required', text: ' *' }));
      compteWrap.appendChild(compteLabel);
      var compteRow = el('div', { class: 'vs-pill-row' });
      ['Oui', 'Non'].forEach((c) => {
        compteRow.appendChild(this.pill(c, state.d.compte === c, () => this.set('compte', c)));
      });
      compteWrap.appendChild(compteRow);
      var compteErr = el('span', { class: 'vs-field__error', text: 'Ce champ est requis.' });
      if (!(touched && e.compte)) compteErr.hidden = true;
      compteWrap.appendChild(compteErr);
      vousSection.appendChild(compteWrap);

      var emailInput = el('input', { type: 'email', placeholder: 'vous@exemple.com' });
      emailInput.value = state.d.email;
      emailInput.addEventListener('input', (ev) => this.set('email', ev.target.value));
      var emailErrorText = typeof e.email === 'string' ? e.email : 'Ce champ est requis.';
      var emailField = this.field('Votre email', true, emailInput, touched && e.email ? emailErrorText : '', hasAccount ? "Nous retrouvons votre compte avec cet email, rien d'autre à remplir." : null);
      if (touched && e.email) emailField.classList.add('is-invalid');
      vousSection.appendChild(emailField);

      if (!hasAccount) {
        var identityGrid = el('div', { class: 'vs-grid' });
        var prenomInput = el('input', { type: 'text' });
        prenomInput.value = state.d.prenom;
        prenomInput.addEventListener('input', (ev) => this.set('prenom', ev.target.value));
        var prenomField = this.field('Prénom', true, prenomInput, touched && e.prenom ? 'Ce champ est requis.' : '');
        if (touched && e.prenom) prenomField.classList.add('is-invalid');
        identityGrid.appendChild(prenomField);

        var nomInput = el('input', { type: 'text' });
        nomInput.value = state.d.nom;
        nomInput.addEventListener('input', (ev) => this.set('nom', ev.target.value));
        var nomField = this.field('Nom', true, nomInput, touched && e.nom ? 'Ce champ est requis.' : '');
        if (touched && e.nom) nomField.classList.add('is-invalid');
        identityGrid.appendChild(nomField);

        vousSection.appendChild(identityGrid);
      }

      var rgpdWrap = el('div', { class: 'vs-rgpd' });
      var rgpdRow = el('button', { type: 'button', class: 'vs-rgpd__row' + (state.d.rgpd ? ' is-checked' : '') + (touched && e.rgpd ? ' is-invalid' : '') });
      rgpdRow.appendChild(el('span', { class: 'vs-rgpd__box', text: '✓' }));
      var rgpdText = el('span', { class: 'vs-rgpd__text' });
      rgpdText.appendChild(document.createTextNode("J'accepte que Verty utilise ces informations pour composer la sélection de mon enfant et m'envoyer les recommandations par email. "));
      var privacyLink = el('a', { href: this.privacyUrl, text: 'Politique de confidentialité' });
      privacyLink.addEventListener('click', (ev) => ev.stopPropagation());
      rgpdText.appendChild(privacyLink);
      rgpdText.appendChild(document.createTextNode('.'));
      rgpdRow.appendChild(rgpdText);
      rgpdRow.addEventListener('click', () => this.set('rgpd', !state.d.rgpd));
      rgpdWrap.appendChild(rgpdRow);
      var rgpdErr = el('span', { class: 'vs-field__error', text: 'Merci de cocher cette case pour continuer.' });
      if (!(touched && e.rgpd)) rgpdErr.hidden = true;
      rgpdWrap.appendChild(rgpdErr);
      vousSection.appendChild(rgpdWrap);

      body.appendChild(vousSection);

      if (state.sent) {
        var confirm = el('div', { class: 'vs-confirm' });
        confirm.appendChild(el('span', { class: 'vs-confirm__title', text: "Merci, c'est envoyé." }));
        var names = state.enfants.map((c) => c.prenomEnfant || 'votre enfant');
        var merci = (state.enfants.length > 1 ? 'Les sélections de ' + names.join(', ') : 'La sélection de ' + names[0]) + ' arrive par email d\'ici quelques minutes.';
        confirm.appendChild(el('span', { class: 'vs-confirm__text', text: merci }));
        body.appendChild(confirm);
      }

      card.appendChild(body);
      col.appendChild(card);
      col.appendChild(el('p', { class: 'vs-modal__footnote', text: 'Vos réponses servent uniquement à composer la sélection de votre enfant.' }));
      page.appendChild(col);

      var actionbar = el('div', { class: 'vs-modal__actionbar' });
      var actionRow = el('div', { class: 'vs-modal__actionbar-row' });
      var statusLabel = state.sent
        ? 'Réponses envoyées.'
        : remaining === 0
          ? 'Tout est complet.'
          : touched
            ? remaining + ' champ' + (remaining > 1 ? 's' : '') + ' à compléter'
            : 'Champs marqués * obligatoires';
      var status = el('span', { class: 'vs-modal__status' + (touched && remaining ? ' is-error' : ''), text: statusLabel });
      actionRow.appendChild(status);

      var ctaLabel = state.sent ? 'Envoyé ✓' : state.sending ? 'Envoi…' : 'Recevoir la sélection';
      var cta = el('button', { type: 'button', class: 'vs-modal__cta' + (state.sent ? ' is-sent' : ''), text: ctaLabel });
      if (state.sending || state.sent) cta.disabled = true;
      cta.addEventListener('click', () => this.submit());
      actionRow.appendChild(cta);

      actionbar.appendChild(actionRow);
      page.appendChild(actionbar);

      this.root.appendChild(page);
    }
  }

  customElements.define('selection-signup', SelectionSignup);
})();
