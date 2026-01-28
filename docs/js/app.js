/**
 * Main Application Module
 * Orchestrates the audience app functionality
 */

const App = {
  // DOM Elements
  connectScreen: null,
  reactionsScreen: null,
  roomCodeInput: null,
  joinBtn: null,
  leaveBtn: null,
  roomName: null,
  emojiButtons: null,
  paceButtons: null,
  statusText: null,
  statusDot: null,

  // Feedback elements
  feedbackToggle: null,
  feedbackModal: null,
  feedbackClose: null,
  stars: null,
  feedbackText: null,
  charCount: null,
  submitFeedback: null,
  feedbackStatus: null,
  ratingText: null,
  selectedRating: 0,

  /**
   * Initialize the app
   */
  async init() {
    // Cache DOM elements
    this.connectScreen = document.getElementById('connect-screen');
    this.reactionsScreen = document.getElementById('reactions-screen');
    this.roomCodeInput = document.getElementById('room-code-input');
    this.joinBtn = document.getElementById('join-btn');
    this.leaveBtn = document.getElementById('leave-btn');
    this.roomName = document.getElementById('room-name');
    this.emojiButtons = document.querySelectorAll('.emoji-btn');
    this.paceButtons = document.querySelectorAll('.pace-btn');
    this.statusText = document.getElementById('status-text');
    this.statusDot = document.querySelector('.status-dot');

    // Feedback elements
    this.feedbackToggle = document.getElementById('feedback-toggle');
    this.feedbackModal = document.getElementById('feedback-modal');
    this.feedbackClose = document.getElementById('feedback-close');
    this.stars = document.querySelectorAll('.star');
    this.feedbackText = document.getElementById('feedback-text');
    this.charCount = document.getElementById('char-count');
    this.submitFeedbackBtn = document.getElementById('submit-feedback');
    this.feedbackStatus = document.getElementById('feedback-status');
    this.ratingText = document.getElementById('rating-text');

    // Initialize modules
    Animations.init();

    // Set up event listeners
    this.setupEventListeners();

    // Check for room code in URL hash
    this.checkUrlForRoom();

    // Initialize Firebase
    try {
      await FirebaseClient.init();
      this.updateStatus(true);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.updateStatus(false);
    }
  },

  /**
   * Set up all event listeners
   */
  setupEventListeners() {
    // Join button
    this.joinBtn.addEventListener('click', () => this.joinRoom());

    // Enter key on input
    this.roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.joinRoom();
      }
    });

    // Leave button
    this.leaveBtn.addEventListener('click', () => this.leaveRoom());

    // Emoji buttons
    this.emojiButtons.forEach(btn => {
      btn.addEventListener('click', () => this.handleEmojiTap(btn));

      // Prevent double-tap zoom on mobile
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handleEmojiTap(btn);
      });
    });

    // Pace buttons
    this.paceButtons.forEach(btn => {
      btn.addEventListener('click', () => this.handlePaceTap(btn));

      // Prevent double-tap zoom on mobile
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.handlePaceTap(btn);
      });
    });

    // Handle visibility change (reconnect when app comes back to foreground)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateStatus(FirebaseClient.getConnectionStatus());
      }
    });

    // Feedback modal toggle
    if (this.feedbackToggle) {
      this.feedbackToggle.addEventListener('click', () => this.openFeedbackModal());
    }

    // Feedback close button
    if (this.feedbackClose) {
      this.feedbackClose.addEventListener('click', () => this.closeFeedbackModal());
    }

    // Click outside modal to close
    if (this.feedbackModal) {
      this.feedbackModal.addEventListener('click', (e) => {
        if (e.target === this.feedbackModal) {
          this.closeFeedbackModal();
        }
      });
    }

    // Star rating
    this.stars.forEach(star => {
      star.addEventListener('click', () => this.handleStarClick(star));
      star.addEventListener('mouseenter', () => this.handleStarHover(star));
      star.addEventListener('mouseleave', () => this.handleStarLeave());
    });

    // Feedback text character count
    if (this.feedbackText) {
      this.feedbackText.addEventListener('input', () => {
        const length = this.feedbackText.value.length;
        this.charCount.textContent = `${length}/500`;
      });
    }

    // Submit feedback
    if (this.submitFeedbackBtn) {
      this.submitFeedbackBtn.addEventListener('click', () => this.submitFeedback());
    }
  },

  /**
   * Check URL for room code (e.g., #room/abc123)
   */
  checkUrlForRoom() {
    const hash = window.location.hash;
    if (hash.startsWith('#room/')) {
      const roomCode = hash.slice(6);
      if (roomCode) {
        this.roomCodeInput.value = roomCode;
        // Auto-join after a short delay
        setTimeout(() => this.joinRoom(), 500);
      }
    }
  },

  /**
   * Join a room
   */
  async joinRoom() {
    const roomCode = this.roomCodeInput.value.trim();

    if (!roomCode) {
      this.shakeInput();
      return;
    }

    if (roomCode.length < 2) {
      this.shakeInput();
      return;
    }

    // Disable button during connection
    this.joinBtn.disabled = true;
    this.joinBtn.textContent = 'Checking room...';

    try {
      // Check if room exists (host is active)
      const roomExists = await FirebaseClient.checkRoomExists(roomCode);

      if (!roomExists) {
        this.showError('Room not found. Make sure the presenter has started the session.');
        this.shakeInput();
        return;
      }

      // Set room in Firebase client
      FirebaseClient.setRoom(roomCode);

      // Update URL hash
      window.location.hash = `room/${roomCode}`;

      // Switch to reactions screen
      this.connectScreen.classList.add('hidden');
      this.reactionsScreen.classList.remove('hidden');

      // Update room badge with room code (keep the status part)
      const badgeStatus = document.getElementById('badge-status');
      const badgeSeparator = document.querySelector('.badge-separator');
      this.roomName.innerHTML = `Room: ${roomCode.toUpperCase()} <span class="badge-separator">•</span> <span id="badge-status">${badgeStatus ? badgeStatus.textContent : 'Connected'}</span>`;

      // Update status
      this.updateStatus(true);
    } catch (error) {
      console.error('Error joining room:', error);
      this.showError('Connection error. Please try again.');
      this.updateStatus(false);
    } finally {
      this.joinBtn.disabled = false;
      this.joinBtn.textContent = 'Join Room';
    }
  },

  /**
   * Leave the current room
   */
  leaveRoom() {
    // Clear room code
    FirebaseClient.roomCode = null;
    window.location.hash = '';

    // Switch back to connect screen
    this.reactionsScreen.classList.add('hidden');
    this.connectScreen.classList.remove('hidden');
    this.roomCodeInput.value = '';
  },

  /**
   * Handle emoji button tap
   * @param {HTMLElement} btn - The button that was tapped
   */
  async handleEmojiTap(btn) {
    const emoji = btn.dataset.emoji;
    if (!emoji) return;

    // Show visual feedback immediately (optimistic UI)
    Animations.pressButton(btn);
    Animations.showSent(emoji);

    // Send to Firebase
    const sent = await FirebaseClient.sendReaction(emoji);

    if (!sent) {
      // Could show an error, but we've already shown the animation
      // The debounce might have prevented sending
      console.log('Reaction not sent (rate limited or error)');
    }
  },

  /**
   * Handle pace button tap
   * @param {HTMLElement} btn - The button that was tapped
   */
  async handlePaceTap(btn) {
    const pace = btn.dataset.pace;
    if (!pace) return;

    // Show visual feedback immediately (optimistic UI)
    Animations.pressButton(btn);

    // Get the icon to show in animation
    const icon = btn.querySelector('.pace-icon').textContent;
    Animations.showSent(icon);

    // Send to Firebase
    const sent = await FirebaseClient.sendPaceFeedback(pace);

    if (!sent) {
      console.log('Pace feedback not sent (rate limited or error)');
    }
  },

  /**
   * Update connection status display
   * @param {boolean} connected
   */
  updateStatus(connected) {
    const badgeStatus = document.getElementById('badge-status');

    if (connected) {
      this.statusText.textContent = 'Connected';
      this.statusDot.classList.add('connected');
      this.statusDot.classList.remove('disconnected');
      if (badgeStatus) {
        badgeStatus.textContent = 'Connected';
        badgeStatus.classList.remove('disconnected');
      }
    } else {
      this.statusText.textContent = 'Reconnecting...';
      this.statusDot.classList.remove('connected');
      this.statusDot.classList.add('disconnected');
      if (badgeStatus) {
        badgeStatus.textContent = 'Reconnecting...';
        badgeStatus.classList.add('disconnected');
      }
    }
  },

  /**
   * Shake the input to indicate error
   */
  shakeInput() {
    this.roomCodeInput.style.animation = 'none';
    this.roomCodeInput.offsetHeight; // Trigger reflow
    this.roomCodeInput.style.animation = 'shake 0.4s ease';

    // Add shake animation temporarily
    const style = document.createElement('style');
    style.textContent = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-8px); }
        75% { transform: translateX(8px); }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => style.remove(), 400);
  },

  /**
   * Open the feedback modal
   */
  openFeedbackModal() {
    this.feedbackModal.classList.remove('hidden');
    this.resetFeedbackForm();
  },

  /**
   * Close the feedback modal
   */
  closeFeedbackModal() {
    this.feedbackModal.classList.add('hidden');
  },

  /**
   * Reset the feedback form
   */
  resetFeedbackForm() {
    this.selectedRating = 0;
    this.stars.forEach(star => star.classList.remove('active'));
    this.ratingText.textContent = 'Tap to rate';
    if (this.feedbackText) {
      this.feedbackText.value = '';
      this.charCount.textContent = '0/500';
    }
    this.submitFeedbackBtn.disabled = true;
    this.feedbackStatus.textContent = '';
    this.feedbackStatus.className = 'feedback-status';
  },

  /**
   * Handle star click
   * @param {HTMLElement} star
   */
  handleStarClick(star) {
    const rating = parseInt(star.dataset.rating);
    this.selectedRating = rating;

    // Update star display
    this.stars.forEach(s => {
      const r = parseInt(s.dataset.rating);
      s.classList.toggle('active', r <= rating);
    });

    // Update rating text
    const ratingTexts = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
    this.ratingText.textContent = ratingTexts[rating];

    // Enable submit button
    this.submitFeedbackBtn.disabled = false;
  },

  /**
   * Handle star hover
   * @param {HTMLElement} star
   */
  handleStarHover(star) {
    const rating = parseInt(star.dataset.rating);
    this.stars.forEach(s => {
      const r = parseInt(s.dataset.rating);
      s.classList.toggle('hover', r <= rating);
    });
  },

  /**
   * Handle star mouse leave
   */
  handleStarLeave() {
    this.stars.forEach(s => s.classList.remove('hover'));
  },

  /**
   * Submit feedback
   */
  async submitFeedback() {
    if (this.selectedRating === 0) return;

    this.submitFeedbackBtn.disabled = true;
    this.submitFeedbackBtn.textContent = 'Sending...';

    try {
      const text = this.feedbackText ? this.feedbackText.value : '';
      const success = await FirebaseClient.sendFeedback(this.selectedRating, text);

      if (success) {
        this.feedbackStatus.textContent = 'Thank you for your feedback!';
        this.feedbackStatus.className = 'feedback-status success';

        // Close modal after delay
        setTimeout(() => {
          this.closeFeedbackModal();
        }, 1500);
      } else {
        this.feedbackStatus.textContent = 'Failed to send. Please try again.';
        this.feedbackStatus.className = 'feedback-status error';
        this.submitFeedbackBtn.disabled = false;
      }
    } catch (error) {
      console.error('Feedback error:', error);
      this.feedbackStatus.textContent = 'Failed to send. Please try again.';
      this.feedbackStatus.className = 'feedback-status error';
      this.submitFeedbackBtn.disabled = false;
    }

    this.submitFeedbackBtn.textContent = 'Submit Feedback';
  },

  /**
   * Show an error message to the user
   * @param {string} message - Error message to display
   */
  showError(message) {
    // Remove existing error if any
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      color: #ff6b6b;
      font-size: 14px;
      margin-top: 12px;
      text-align: center;
      animation: fadeIn 0.3s ease;
    `;

    // Insert after the room input container
    const inputContainer = document.querySelector('.room-input-container');
    inputContainer.insertAdjacentElement('afterend', errorDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
      }
    }, 5000);
  }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
