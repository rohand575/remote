/**
 * Animations Module
 * Handles the "Sent!" animation when user taps an emoji
 */

const Animations = {
  overlay: null,
  emojiEl: null,
  timeout: null,

  init() {
    this.overlay = document.getElementById('sent-overlay');
    this.emojiEl = document.getElementById('sent-emoji');
  },

  /**
   * Shows a satisfying animation when emoji is sent
   * @param {string} emoji - The emoji that was sent
   */
  showSent(emoji) {
    if (!this.overlay || !this.emojiEl) return;

    // Clear any existing animation
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Set the emoji and show overlay
    this.emojiEl.textContent = emoji;
    this.overlay.classList.remove('hidden');

    // Force reflow to restart animation
    this.emojiEl.style.animation = 'none';
    this.emojiEl.offsetHeight; // Trigger reflow
    this.emojiEl.style.animation = '';

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Hide after animation completes
    this.timeout = setTimeout(() => {
      this.overlay.classList.add('hidden');
    }, 600);
  },

  /**
   * Adds pressed effect to a button
   * @param {HTMLElement} button - The button element
   */
  pressButton(button) {
    button.classList.add('pressed');
    setTimeout(() => {
      button.classList.remove('pressed');
    }, 150);
  }
};

// Make available globally
window.Animations = Animations;
