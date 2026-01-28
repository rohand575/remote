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
  statusText: null,
  statusDot: null,

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
    this.statusText = document.getElementById('status-text');
    this.statusDot = document.querySelector('.status-dot');

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

    // Handle visibility change (reconnect when app comes back to foreground)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.updateStatus(FirebaseClient.getConnectionStatus());
      }
    });
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
      this.roomName.textContent = `Room: ${roomCode.toUpperCase()}`;

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
   * Update connection status display
   * @param {boolean} connected
   */
  updateStatus(connected) {
    if (connected) {
      this.statusText.textContent = 'Connected';
      this.statusDot.classList.add('connected');
      this.statusDot.classList.remove('disconnected');
    } else {
      this.statusText.textContent = 'Reconnecting...';
      this.statusDot.classList.remove('connected');
      this.statusDot.classList.add('disconnected');
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
