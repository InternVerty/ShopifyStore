(function () {
  'use strict';

  // Questions reprises du formulaire Tally "Formulaire Coffret" (tally.so/r/yPBVWd).
  var AGES = ['3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  var OCCASIONS = ['Noël', 'Anniversaire', 'Autre'];
  var PAYS = ['France', 'Etranger'];
  var CLASSES = ['Petite section', 'Moyenne section', 'Grande section', 'CP', 'CE1', 'CE2', 'CM1', 'CM2', '6e', '5e'];
  var NIVEAUX = ['Au-dessus du niveau de sa classe', 'Conforme au niveau de la classe', 'En-dessous du niveau de sa classe'];
  var THEMES = ['Nature', 'Amitié', 'Histoire', 'Contes et légendes', 'Aventures', 'Animaux', 'Fantastique', 'Mystère', 'Science fiction', 'BD', 'Intrigue', 'Humour', 'Famille', 'Classiques', 'Policiers', 'Biographies', 'Voyages', 'Documentaire', 'Arts', 'Mythologie', 'Emotions', 'Spiritualité', 'Sport'];
  var MAX_THEMES = 5;
  var REQUIRED = ['prenomEnfant', 'age', 'occasion', 'pays', 'classe', 'niveau', 'email', 'prenom', 'nom'];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var REQUIRED_MSG = 'Ce champ est requis.';

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

  class CoffretSignup extends HTMLElement {
    connectedCallback() {
      this.webhookUrl = this.getAttribute('data-webhook-url') || '';
      this.redirectUrl = this.getAttribute('data-redirect-url') || '';
      this.privacyUrl = this.getAttribute('data-privacy-url') || '/pages/donnees-personnelles';
      this.state = {
        d: {
          prenomEnfant: '',
          age: '',
          occasion: '',
          occasionAutre: '',
          pays: '',
          classe: '',
          niveau: '',
          genre: '',
          themes: [],
          livres: '',
          email: this.getAttribute('data-customer-email') || '',
          prenom: this.getAttribute('data-customer-first-name') || '',
          nom: this.getAttribute('data-customer-last-name') || '',
          rgpd: false
        },
        touched: false,
        sending: false,
        sent: false,
        failed: false
      };

      this.root = this.querySelector('[data-vs-root]');
      this.render();
    }

    set(key, value) {
      this.state.d = Object.assign({}, this.state.d);
      this.state.d[key] = value;
      this.state.failed = false;
      this.render();
    }

    toggleTheme(theme) {
      var themes = this.state.d.themes;
      if (themes.indexOf(theme) !== -1) {
        this.set('themes', themes.filter((t) => t !== theme));
      } else if (themes.length < MAX_THEMES) {
        this.set('themes', themes.concat([theme]));
      }
    }

    errors() {
      var d = this.state.d;
      var e = {};
      REQUIRED.forEach((k) => { if (!String(d[k] || '').trim()) e[k] = REQUIRED_MSG; });
      if (!e.email && !EMAIL_RE.test(d.email.trim())) e.email = 'Cet email semble incomplet.';
      if (d.occasion === 'Autre' && !d.occasionAutre.trim()) e.occasionAutre = REQUIRED_MSG;
      if (d.pays === 'Etranger') e.pays = 'Le coffret est livré uniquement en France pour le moment.';
      if (!d.themes.length) e.themes = 'Choisissez au moins une thématique.';
      if (!d.rgpd) e.rgpd = 'Merci de cocher cette case pour continuer.';
      return e;
    }

    submit() {
      var e = this.errors();
      if (Object.keys(e).length > 0) {
        this.state.touched = true;
        this.render();
        return;
      }

      var d = this.state.d;
      var payload = {
        formulaire: 'coffret',
        submittedAt: new Date().toISOString(),
        parent: {
          email: d.email.trim(),
          prenom: d.prenom.trim(),
          nom: d.nom.trim(),
          consentement: true
        },
        coffret: {
          occasion: d.occasion === 'Autre' ? d.occasionAutre.trim() : d.occasion,
          paysLivraison: d.pays
        },
        enfant: {
          prenomEnfant: d.prenomEnfant.trim(),
          age: Number(d.age),
          classe: d.classe,
          niveau: d.niveau,
          genre: d.genre,
          themes: d.themes,
          livres: d.livres.split('\n').map((s) => s.trim()).filter(Boolean)
        }
      };

      this.state.sending = true;
      this.state.failed = false;
      this.state.touched = false;
      this.render();

      var request = this.webhookUrl
        ? fetch(this.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then((res) => { if (!res.ok) throw new Error('HTTP ' + res.status); })
        : Promise.reject(new Error('Aucune URL de webhook configurée'));

      request.then(() => {
        if (this.redirectUrl) {
          window.location.href = this.redirectUrl;
          return;
        }
        this.state.sending = false;
        this.state.sent = true;
        this.render();
        this.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }).catch((err) => {
        console.error('[coffret-signup]', err);
        this.state.sending = false;
        this.state.failed = true;
        this.render();
      });
    }

    // Champ libellé + contrôle + message d'erreur, identique au popup Sélection.
    field(labelText, required, control, errorText, hint, isLabel) {
      var wrap = el(isLabel === false ? 'div' : 'label', { class: 'vs-field' + (errorText ? ' is-invalid' : '') });
      var labelRow = el('span', { class: 'vs-field__label' });
      labelRow.appendChild(document.createTextNode(labelText));
      if (required) labelRow.appendChild(el('span', { class: 'vs-field__required', text: ' *' }));
      wrap.appendChild(labelRow);
      if (hint) wrap.appendChild(el('span', { class: 'vs-field__hint', text: hint }));
      wrap.appendChild(control);
      var err = el('span', { class: 'vs-field__error', text: errorText || '' });
      if (!errorText) err.hidden = true;
      wrap.appendChild(err);
      return wrap;
    }

    input(key, type, placeholder) {
      var input = el('input', { type: type, 'data-field': key });
      if (placeholder) input.placeholder = placeholder;
      input.value = this.state.d[key];
      input.addEventListener('input', (ev) => this.set(key, ev.target.value));
      return input;
    }

    select(key, options, placeholder) {
      var select = el('select', { 'data-field': key });
      select.appendChild(el('option', { value: '', text: placeholder }));
      options.forEach((o) => {
        var opt = el('option', { value: o, text: o });
        if (o === this.state.d[key]) opt.selected = true;
        select.appendChild(opt);
      });
      select.addEventListener('change', (ev) => this.set(key, ev.target.value));
      return select;
    }

    pills(key, options, wide) {
      var row = el('div', { class: wide ? 'vs-pill-stack' : 'vs-pill-row' });
      options.forEach((o) => {
        var active = this.state.d[key] === o;
        var btn = el('button', { type: 'button', class: 'vs-pill' + (wide ? ' vs-pill--wide' : '') + (active ? ' is-active' : ''), text: o, 'aria-pressed': String(active) });
        btn.addEventListener('click', () => this.set(key, active && key === 'genre' ? '' : o));
        row.appendChild(btn);
      });
      return row;
    }

    sectionHead(num, title) {
      var head = el('div', { class: 'vs-modal__section-head' });
      head.appendChild(el('span', { class: 'vs-modal__badge', text: String(num) }));
      head.appendChild(el('h2', { class: 'vs-modal__section-title', text: title }));
      head.appendChild(el('span', { class: 'vs-modal__section-rule' }));
      return head;
    }

    renderEnfant(e) {
      var section = el('section', { class: 'vs-modal__section' });
      section.appendChild(this.sectionHead(1, "L'enfant"));

      section.appendChild(this.field("Comment s'appelle votre petit explorateur de livres ?", true, this.input('prenomEnfant', 'text', 'Alexis'), e.prenomEnfant));

      var grid1 = el('div', { class: 'vs-grid' });
      grid1.appendChild(this.field('Quel est son âge ?', true, this.select('age', AGES, 'Choisir'), e.age));
      grid1.appendChild(this.field('En quelle classe est-il ?', true, this.select('classe', CLASSES, 'Choisir'), e.classe));
      section.appendChild(grid1);

      section.appendChild(this.field('Quel est son niveau de lecture', true, this.pills('niveau', NIVEAUX, true), e.niveau, 'Si vous ne savez pas, sélectionnez « Conforme au niveau de la classe ».', false));

      section.appendChild(this.field("Est-ce qu'il / elle est", false, this.pills('genre', ['Une fille', 'Un garçon']), null, null, false));

      return section;
    }

    renderGouts(e) {
      var d = this.state.d;
      var section = el('section', { class: 'vs-modal__section' });
      section.appendChild(this.sectionHead(2, 'Ses goûts'));

      var row = el('div', { class: 'vs-pill-row' });
      var full = d.themes.length >= MAX_THEMES;
      THEMES.forEach((t) => {
        var active = d.themes.indexOf(t) !== -1;
        var btn = el('button', { type: 'button', class: 'vs-pill' + (active ? ' is-active' : ''), text: t, 'aria-pressed': String(active) });
        if (full && !active) btn.disabled = true;
        btn.addEventListener('click', () => this.toggleTheme(t));
        row.appendChild(btn);
      });
      var hint = "Voici l'étape la plus importante : sélectionnez les univers qui le passionnent. N'hésitez pas à choisir avec votre enfant ! Jusqu'à " + MAX_THEMES + ' choix (' + d.themes.length + '/' + MAX_THEMES + ').';
      section.appendChild(this.field('Quelles thématiques l’inspirent ?', true, row, e.themes, hint, false));

      var livres = el('textarea', { rows: '5', placeholder: 'Lucky Luke\nLe Clan des Sept\nTintin', 'data-field': 'livres' });
      livres.value = d.livres;
      livres.addEventListener('input', (ev) => this.set('livres', ev.target.value));
      section.appendChild(this.field('Quels sont ses 5 livres préférés ?', false, livres, null,
        "Un titre par ligne. Vous séchez un peu ? Pas d'inquiétude ! Ses livres préférés nous donnent simplement quelques indices pour viser encore plus juste et éviter les doublons. Vous recevrez notre sélection par email avant l’envoi du coffret et pourrez la valider ou nous demander une nouvelle proposition. Une deuxième sélection est bien sûr incluse."));

      return section;
    }

    renderCoffret(e) {
      var d = this.state.d;
      var section = el('section', { class: 'vs-modal__section' });
      section.appendChild(this.sectionHead(3, 'Le coffret'));

      section.appendChild(this.field('Pour quelle occasion souhaitez-vous lui offrir ce coffret ?', true, this.pills('occasion', OCCASIONS), e.occasion, null, false));
      if (d.occasion === 'Autre') {
        section.appendChild(this.field('Laquelle ?', true, this.input('occasionAutre', 'text', 'Fête, réussite, simple envie…'), e.occasionAutre));
      }

      var paysField = this.field('Dans quel pays souhaitez-vous faire livrer le coffret ?', true, this.pills('pays', PAYS), d.pays === 'Etranger' ? null : e.pays, null, false);
      section.appendChild(paysField);
      if (d.pays === 'Etranger') {
        paysField.appendChild(el('p', { class: 'vs-notice', text: 'Pour le moment, le Coffret Verty est disponible uniquement en livraison en France. Nous espérons pouvoir l’expédier très bientôt au-delà de nos frontières !' }));
      }

      return section;
    }

    renderVous(e) {
      var d = this.state.d;
      var section = el('section', { class: 'vs-modal__section' });
      section.appendChild(this.sectionHead(4, 'Vous'));

      section.appendChild(this.field('Votre email', true, this.input('email', 'email', 'vous@exemple.com'), e.email));

      var grid = el('div', { class: 'vs-grid' });
      grid.appendChild(this.field('Prénom', true, this.input('prenom', 'text'), e.prenom));
      grid.appendChild(this.field('Nom', true, this.input('nom', 'text'), e.nom));
      section.appendChild(grid);

      var rgpdWrap = el('div', { class: 'vs-rgpd' });
      var rgpdRow = el('button', { type: 'button', class: 'vs-rgpd__row' + (d.rgpd ? ' is-checked' : '') + (e.rgpd ? ' is-invalid' : ''), role: 'checkbox', 'aria-checked': String(d.rgpd) });
      rgpdRow.appendChild(el('span', { class: 'vs-rgpd__box', text: '✓' }));
      var rgpdText = el('span', { class: 'vs-rgpd__text' });
      rgpdText.appendChild(document.createTextNode("Je confirme être titulaire de l’autorité parentale ou agir avec son autorisation, et je consens au traitement des données renseignées concernant l’enfant. J'accepte que Verty traite ces données afin de m'adresser, par email, une recommandation personnalisée mensuelle. Je peux me désabonner à tout moment. "));
      var privacyLink = el('a', { href: this.privacyUrl, text: 'Politique de protection des données personnelles', target: '_blank', rel: 'noopener' });
      privacyLink.addEventListener('click', (ev) => ev.stopPropagation());
      rgpdText.appendChild(privacyLink);
      rgpdText.appendChild(document.createTextNode('.'));
      rgpdRow.appendChild(rgpdText);
      rgpdRow.addEventListener('click', () => this.set('rgpd', !d.rgpd));
      rgpdWrap.appendChild(rgpdRow);
      var rgpdErr = el('span', { class: 'vs-field__error', text: e.rgpd || '' });
      if (!e.rgpd) rgpdErr.hidden = true;
      rgpdWrap.appendChild(rgpdErr);
      section.appendChild(rgpdWrap);

      return section;
    }

    render() {
      if (!this.root) return;
      var state = this.state;
      var allErrors = this.errors();
      var remaining = Object.keys(allErrors).length;
      // Les erreurs ne s'affichent qu'après une première tentative d'envoi.
      var e = state.touched ? allErrors : {};

      // Le formulaire est reconstruit à chaque frappe : on mémorise le champ
      // actif pour le refocaliser au même endroit (cf. selection-signup.js).
      var active = document.activeElement;
      var focusField = null, focusStart = null, focusEnd = null;
      if (active && this.root.contains(active) && active.hasAttribute('data-field')) {
        focusField = active.getAttribute('data-field');
        try {
          if (typeof active.selectionStart === 'number') {
            focusStart = active.selectionStart;
            focusEnd = active.selectionEnd;
          }
        } catch (err) { /* selectionStart non supporté pour ce type d'input */ }
      }

      this.root.innerHTML = '';

      var page = el('div', { class: 'vs-modal__page' });
      var col = el('div', { class: 'vs-modal__col' });

      var masthead = el('div', { class: 'vs-modal__masthead' });
      masthead.appendChild(el('span', { class: 'vs-modal__wordmark', text: 'Verty' }));
      masthead.appendChild(el('span', { class: 'vs-modal__kicker', text: 'Coffret Verty' }));
      col.appendChild(masthead);

      var card = el('div', { class: 'vs-modal__card' });
      var band = el('div', { class: 'vs-modal__band' });
      band.appendChild(el('h1', { text: 'Bienvenue dans l’aventure du Coffret Verty !' }));
      band.appendChild(el('p', { text: "Pour préparer une sélection qui ressemble vraiment à l'enfant, nous avons besoin de mieux connaître ses goûts, ses envies et ses habitudes de lecture. Quelques minutes suffisent pour nous aider à choisir les livres qui auront toutes les chances de lui plaire… et de lui donner envie de les dévorer !" }));
      card.appendChild(band);

      var body = el('div', { class: 'vs-modal__body' });

      if (state.sent) {
        var confirm = el('div', { class: 'vs-confirm' });
        confirm.appendChild(el('span', { class: 'vs-confirm__title', text: 'Merci pour votre confiance.' }));
        confirm.appendChild(el('span', { class: 'vs-confirm__text', text: 'La première sélection personnalisée de ' + (state.d.prenomEnfant.trim() || 'votre enfant') + ' vous sera envoyée avant la fin du mois : des livres choisis avec soin pour l’accompagner et nourrir son imaginaire.' }));
        body.appendChild(confirm);
      } else {
        body.appendChild(this.renderEnfant(e));
        body.appendChild(this.renderGouts(e));
        body.appendChild(this.renderCoffret(e));
        body.appendChild(this.renderVous(e));
      }

      card.appendChild(body);
      col.appendChild(card);
      col.appendChild(el('p', { class: 'vs-modal__footnote', text: 'Vos réponses servent uniquement à composer la sélection du coffret de votre enfant.' }));
      page.appendChild(col);

      if (!state.sent) {
        var actionbar = el('div', { class: 'vs-modal__actionbar' });
        var actionRow = el('div', { class: 'vs-modal__actionbar-row' });
        var statusLabel = state.failed
          ? "L'envoi a échoué. Vérifiez votre connexion et réessayez."
          : remaining === 0
            ? 'Tout est complet.'
            : state.touched
              ? remaining + ' champ' + (remaining > 1 ? 's' : '') + ' à compléter'
              : 'Champs marqués * obligatoires';
        actionRow.appendChild(el('span', { class: 'vs-modal__status' + ((state.touched && remaining) || state.failed ? ' is-error' : ''), text: statusLabel, 'aria-live': 'polite' }));

        var cta = el('button', { type: 'button', class: 'vs-modal__cta', text: state.sending ? 'Envoi…' : state.failed ? 'Réessayer' : "Je m'inscris" });
        if (state.sending) cta.disabled = true;
        cta.addEventListener('click', () => this.submit());
        actionRow.appendChild(cta);

        actionbar.appendChild(actionRow);
        page.appendChild(actionbar);
      }

      this.root.appendChild(page);

      if (focusField) {
        var toFocus = this.root.querySelector('[data-field="' + focusField + '"]');
        if (toFocus) {
          toFocus.focus();
          if (focusStart !== null && typeof toFocus.setSelectionRange === 'function') {
            try { toFocus.setSelectionRange(focusStart, focusEnd); } catch (err) { /* non supporté pour ce type d'input */ }
          }
        }
      }
    }
  }

  customElements.define('coffret-signup', CoffretSignup);
})();
