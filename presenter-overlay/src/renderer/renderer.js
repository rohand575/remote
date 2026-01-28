/**
 * Main Renderer
 * Orchestrates the presenter overlay functionality
 */

const Renderer = {
  // Modules
  animator: null,
  listener: null,

  // DOM Elements
  setupPanel: null,
  roomInput: null,
  startBtn: null,
  statusDot: null,
  statusText: null,
  counterValue: null,
  reactionCounter: null,
  statusOverlay: null,

  // State
  reactionCount: 0,
  isListening: false,
  currentRoomCode: null,

  /**
   * Initialize the renderer
   */
  async init() {
    // Cache DOM elements
    this.setupPanel = document.getElementById('setup-panel');
    this.roomInput = document.getElementById('room-input');
    this.startBtn = document.getElementById('start-btn');
    this.statusDot = document.querySelector('.status-dot');
    this.statusText = document.querySelector('.status-text');
    this.counterValue = document.getElementById('counter-value');
    this.reactionCounter = document.getElementById('reaction-counter');
    this.statusOverlay = document.getElementById('status-overlay');

    // Initialize modules
    this.animator = new EmojiAnimator('#emoji-container');
    this.listener = new FirebaseListener();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize Firebase
    try {
      await this.listener.init();
      this.updateStatus('Ready', false);
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.updateStatus('Firebase error', false, true);
    }

    // Set up reaction callback
    this.listener.setOnReaction((emoji) => {
      this.handleReaction(emoji);
    });

    this.listener.setOnStatusChange((connected) => {
      if (connected) {
        this.updateStatus('Connected', true);
      } else {
        this.updateStatus('Disconnected', false, true);
      }
    });

    console.log('Renderer initialized');
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Start button
    this.startBtn.addEventListener('click', () => this.startListening());

    // Close button - quit the app
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (window.electronAPI && window.electronAPI.closeApp) {
          window.electronAPI.closeApp();
        } else {
          window.close();
        }
      });
    }

    // Test button - simulate reactions
    const testBtn = document.getElementById('test-btn');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testEmojis());
    }

    // Enter key on input
    this.roomInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.startListening();
      }
    });

    // Escape key to show/hide setup panel or close status overlay
    document.addEventListener('keydown', (e) => {
      console.log('Key pressed:', e.key);
      if (e.key === 'Escape') {
        e.preventDefault();
        // If status overlay is open, close it first
        if (!this.statusOverlay.classList.contains('hidden')) {
          this.hideStatusOverlay();
        } else {
          this.toggleSetupPanel();
        }
      }
    });

    // Status overlay buttons
    const leaveRoomBtn = document.getElementById('leave-room-btn');
    if (leaveRoomBtn) {
      leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
    }

    const closeStatusBtn = document.getElementById('close-status-btn');
    if (closeStatusBtn) {
      closeStatusBtn.addEventListener('click', () => this.hideStatusOverlay());
    }

    // Listen for Ctrl+Shift+L from main process
    if (window.electronAPI && window.electronAPI.onToggleStatusOverlay) {
      window.electronAPI.onToggleStatusOverlay(() => {
        if (this.isListening) {
          this.toggleStatusOverlay();
        }
      });
    }

    // Focus input when panel is shown
    this.roomInput.focus();
  },

  /**
   * Test function to simulate a few reactions
   */
  testEmojis() {
    const emojis = ['👏', '🔥', '🤯', '❓', '❤️', '😂'];
    let count = 0;
    const interval = setInterval(() => {
      if (count >= 10) {
        clearInterval(interval);
        return;
      }
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      this.handleReaction(emoji);
      count++;
    }, 300);
  },

  /**
   * Start listening to a room
   */
  async startListening() {
    const roomCode = this.roomInput.value.trim();

    if (!roomCode) {
      this.shakeInput();
      return;
    }

    if (roomCode.length < 2) {
      this.shakeInput();
      return;
    }

    this.startBtn.disabled = true;
    this.startBtn.textContent = 'Connecting...';
    this.updateStatus('Connecting...', false);

    try {
      await this.listener.listenToRoom(roomCode);
      this.isListening = true;
      this.currentRoomCode = roomCode;
      this.updateStatus(`Connected to ${roomCode.toUpperCase()}`, true);

      // Hide setup panel and enable click-through
      this.hideSetupPanel();

      // Reset counter
      this.reactionCount = 0;
      this.updateCounter();

    } catch (error) {
      console.error('Error starting listener:', error);
      this.updateStatus('Connection failed', false, true);
    } finally {
      this.startBtn.disabled = false;
      this.startBtn.textContent = 'Start';
    }
  },

  /**
   * Handle incoming reaction
   * @param {string} emoji
   */
  handleReaction(emoji) {
    // Spawn floating emoji
    this.animator.spawn(emoji);

    // Update counter
    this.reactionCount++;
    this.updateCounter();
  },

  /**
   * Update the reaction counter display
   */
  updateCounter() {
    if (this.counterValue) {
      this.counterValue.textContent = this.reactionCount;
    }
    if (this.reactionCounter && this.reactionCount > 0) {
      this.reactionCounter.classList.remove('hidden');
    }
  },

  /**
   * Update status display
   * @param {string} text
   * @param {boolean} connected
   * @param {boolean} error
   */
  updateStatus(text, connected, error = false) {
    if (this.statusText) {
      this.statusText.textContent = text;
    }
    if (this.statusDot) {
      this.statusDot.classList.remove('connected', 'error');
      if (connected) {
        this.statusDot.classList.add('connected');
      } else if (error) {
        this.statusDot.classList.add('error');
      }
    }
  },

  /**
   * Hide the setup panel and enable click-through
   */
  hideSetupPanel() {
    this.setupPanel.classList.add('hidden');

    // Enable click-through mode
    if (window.electronAPI) {
      window.electronAPI.setClickThrough(true);
    }
  },

  /**
   * Show the setup panel and disable click-through
   */
  showSetupPanel() {
    this.setupPanel.classList.remove('hidden');
    this.roomInput.focus();

    // Disable click-through mode
    if (window.electronAPI) {
      window.electronAPI.setClickThrough(false);
    }
  },

  /**
   * Toggle setup panel visibility
   */
  toggleSetupPanel() {
    if (this.setupPanel.classList.contains('hidden')) {
      this.showSetupPanel();
    } else if (this.isListening) {
      this.hideSetupPanel();
    }
  },

  /**
   * Show the status overlay (Ctrl+Shift+L)
   */
  showStatusOverlay() {
    // Update status overlay content
    const roomCodeEl = document.getElementById('status-room-code');
    const statusDotEl = document.getElementById('status-overlay-dot');
    const statusTextEl = document.getElementById('status-overlay-text');
    const reactionCountEl = document.getElementById('status-reaction-count');

    if (roomCodeEl) {
      roomCodeEl.textContent = this.currentRoomCode ? this.currentRoomCode.toUpperCase() : '---';
    }
    if (statusDotEl) {
      statusDotEl.classList.toggle('connected', this.isListening);
    }
    if (statusTextEl) {
      statusTextEl.textContent = this.isListening ? 'Connected' : 'Disconnected';
    }
    if (reactionCountEl) {
      reactionCountEl.textContent = this.reactionCount;
    }

    this.statusOverlay.classList.remove('hidden');

    // Disable click-through mode
    if (window.electronAPI) {
      window.electronAPI.setClickThrough(false);
    }
  },

  /**
   * Hide the status overlay
   */
  hideStatusOverlay() {
    this.statusOverlay.classList.add('hidden');

    // Re-enable click-through mode if listening
    if (this.isListening && window.electronAPI) {
      window.electronAPI.setClickThrough(true);
    }
  },

  /**
   * Toggle status overlay visibility
   */
  toggleStatusOverlay() {
    if (this.statusOverlay.classList.contains('hidden')) {
      this.showStatusOverlay();
    } else {
      this.hideStatusOverlay();
    }
  },

  /**
   * Leave the current room and go back to setup panel
   */
  leaveRoom() {
    // Stop listening to Firebase
    if (this.listener) {
      this.listener.stopListening();
    }

    // Reset state
    this.isListening = false;
    this.currentRoomCode = null;
    this.reactionCount = 0;

    // Update counter display
    if (this.counterValue) {
      this.counterValue.textContent = '0';
    }
    if (this.reactionCounter) {
      this.reactionCounter.classList.add('hidden');
    }

    // Hide status overlay
    this.statusOverlay.classList.add('hidden');

    // Show setup panel
    this.showSetupPanel();
    this.roomInput.value = '';
    this.updateStatus('Ready', false);
  },

  /**
   * Shake the input to indicate error
   */
  shakeInput() {
    this.roomInput.style.animation = 'none';
    this.roomInput.offsetHeight; // Trigger reflow
    this.roomInput.style.animation = 'shake 0.4s ease';

    // Add shake animation
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
   * Test function to simulate reactions (for development)
   */
  test() {
    const emojis = ['👏', '🔥', '🤯', '❓', '❤️', '😂'];
    setInterval(() => {
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      this.handleReaction(emoji);
    }, 500);
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Renderer.init();

  // Expose for debugging
  window.Renderer = Renderer;
});
