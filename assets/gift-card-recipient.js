if (!customElements.get('gift-card-recipient')) {
  class GiftCardRecipient extends HTMLElement {
    connectedCallback() {
      this.recipientEmail = this.querySelector('[name="properties[Recipient email]"]');
      this.recipientEmailLabel = this.querySelector(`label[for="${this.recipientEmail.id}"]`);

      // When JS is enabled, the recipient email field is required.
      // Input labels are changed to reflect this.
      if (this.recipientEmailLabel && this.recipientEmailLabel.dataset.jsLabel) {
        this.recipientEmailLabel.innerText = this.recipientEmailLabel.dataset.jsLabel;
      }

      this.recipientCheckbox = this.querySelector('.gift-card-recipient__checkbox');
      this.recipientCheckbox.addEventListener('change', () => this.synchronizeProperties());
      this.synchronizeProperties();
    }

    synchronizeProperties() {
      if (this.recipientCheckbox.checked) {
        this.recipientEmail.setAttribute('required', '');
      } else {
        this.recipientEmail.removeAttribute('required');
      }
    }
  }

  customElements.define('gift-card-recipient', GiftCardRecipient);
}
