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
  feedbackOverlay: null,

  // State
  reactionCount: 0,
  paceCount: { slow: 0, good: 0, fast: 0 },
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
    this.feedbackOverlay = document.getElementById('feedback-overlay');

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

    // Set up pace feedback callback
    this.listener.setOnPaceFeedback((pace) => {
      this.handlePaceFeedback(pace);
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

    // Escape key to show/hide setup panel or close overlays
    document.addEventListener('keydown', (e) => {
      console.log('Key pressed:', e.key);
      if (e.key === 'Escape') {
        e.preventDefault();
        // Close feedback overlay first if open
        if (this.feedbackOverlay && !this.feedbackOverlay.classList.contains('hidden')) {
          this.hideFeedbackOverlay();
        } else if (!this.statusOverlay.classList.contains('hidden')) {
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

    // View feedback button
    const viewFeedbackBtn = document.getElementById('view-feedback-btn');
    if (viewFeedbackBtn) {
      viewFeedbackBtn.addEventListener('click', () => this.showFeedbackOverlay());
    }

    // Feedback overlay buttons
    const feedbackBackBtn = document.getElementById('feedback-back-btn');
    if (feedbackBackBtn) {
      feedbackBackBtn.addEventListener('click', () => this.hideFeedbackOverlay());
    }

    const feedbackCloseBtn = document.getElementById('feedback-close-btn');
    if (feedbackCloseBtn) {
      feedbackCloseBtn.addEventListener('click', () => this.closeFeedbackAndStatus());
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
    // Spawn floating emoji on primary display
    this.animator.spawn(emoji);

    // Broadcast to secondary displays
    if (window.electronAPI && window.electronAPI.broadcastEmoji) {
      window.electronAPI.broadcastEmoji(emoji);
    }

    // Update counter
    this.reactionCount++;
    this.updateCounter();
  },

  /**
   * Handle incoming pace feedback
   * @param {string} pace - slow, good, or fast
   */
  handlePaceFeedback(pace) {
    // Map pace to emoji
    const paceEmojis = {
      slow: '🐢',
      good: '👍',
      fast: '🐇'
    };

    const emoji = paceEmojis[pace];
    if (emoji) {
      // Spawn the pace emoji on primary display
      this.animator.spawn(emoji);

      // Broadcast to secondary displays
      if (window.electronAPI && window.electronAPI.broadcastEmoji) {
        window.electronAPI.broadcastEmoji(emoji);
      }
    }

    // Track pace counts
    if (this.paceCount[pace] !== undefined) {
      this.paceCount[pace]++;
    }

    // Update pace display in status overlay if it's visible
    this.updatePaceDisplay();
  },

  /**
   * Update pace display in status overlay
   */
  updatePaceDisplay() {
    const slowEl = document.getElementById('pace-slow-count');
    const goodEl = document.getElementById('pace-good-count');
    const fastEl = document.getElementById('pace-fast-count');

    if (slowEl) slowEl.textContent = this.paceCount.slow;
    if (goodEl) goodEl.textContent = this.paceCount.good;
    if (fastEl) fastEl.textContent = this.paceCount.fast;
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

    // Update pace display
    this.updatePaceDisplay();

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
    this.paceCount = { slow: 0, good: 0, fast: 0 };

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
  },

  /**
   * Show the feedback overlay and load feedback data
   */
  async showFeedbackOverlay() {
    if (!this.feedbackOverlay) return;

    // Hide status overlay
    this.statusOverlay.classList.add('hidden');

    // Show feedback overlay
    this.feedbackOverlay.classList.remove('hidden');

    // Load feedback data
    await this.loadFeedbackData();
  },

  /**
   * Hide the feedback overlay and return to status overlay
   */
  hideFeedbackOverlay() {
    if (!this.feedbackOverlay) return;

    this.feedbackOverlay.classList.add('hidden');
    this.statusOverlay.classList.remove('hidden');
  },

  /**
   * Close both feedback and status overlays
   */
  closeFeedbackAndStatus() {
    if (this.feedbackOverlay) {
      this.feedbackOverlay.classList.add('hidden');
    }
    this.hideStatusOverlay();
  },

  /**
   * Load feedback data from Firebase
   */
  async loadFeedbackData() {
    const commentsContainer = document.getElementById('feedback-comments');
    if (commentsContainer) {
      commentsContainer.innerHTML = '<p class="feedback-loading">Loading feedback...</p>';
    }

    try {
      // Fetch feedback from Firebase
      const feedbackData = await this.listener.getFeedbackStats();

      if (!feedbackData) {
        this.displayNoFeedback();
        return;
      }

      // Update stats display
      this.updateFeedbackStats(feedbackData);

      // Update comments
      this.updateFeedbackComments(feedbackData.recentFeedback || []);

    } catch (error) {
      console.error('Error loading feedback:', error);
      if (commentsContainer) {
        commentsContainer.innerHTML = '<p class="feedback-loading">Error loading feedback</p>';
      }
    }
  },

  /**
   * Display when no feedback is available
   */
  displayNoFeedback() {
    const avgRatingEl = document.getElementById('feedback-avg-rating');
    const totalCountEl = document.getElementById('feedback-total-count');
    const commentsContainer = document.getElementById('feedback-comments');

    if (avgRatingEl) avgRatingEl.textContent = '-';
    if (totalCountEl) totalCountEl.textContent = '0 reviews';
    if (commentsContainer) {
      commentsContainer.innerHTML = '<p class="feedback-empty">No feedback yet</p>';
    }

    // Reset stars
    const stars = document.querySelectorAll('#feedback-stars .star-display');
    stars.forEach(star => star.classList.remove('filled'));

    // Reset distribution bars
    for (let i = 1; i <= 5; i++) {
      const bar = document.getElementById(`rating-bar-${i}`);
      const count = document.getElementById(`rating-count-${i}`);
      if (bar) bar.style.width = '0%';
      if (count) count.textContent = '0';
    }
  },

  /**
   * Update feedback statistics display
   * @param {Object} data - Feedback data
   */
  updateFeedbackStats(data) {
    const avgRatingEl = document.getElementById('feedback-avg-rating');
    const totalCountEl = document.getElementById('feedback-total-count');

    if (avgRatingEl) {
      avgRatingEl.textContent = data.averageRating ? data.averageRating.toFixed(1) : '-';
    }
    if (totalCountEl) {
      totalCountEl.textContent = `${data.totalCount || 0} reviews`;
    }

    // Update star display
    const avgRating = Math.round(data.averageRating || 0);
    const stars = document.querySelectorAll('#feedback-stars .star-display');
    stars.forEach((star, index) => {
      star.textContent = index < avgRating ? '★' : '☆';
      star.classList.toggle('filled', index < avgRating);
    });

    // Update distribution bars
    const distribution = data.ratingDistribution || {};
    const maxCount = Math.max(...Object.values(distribution), 1);

    for (let i = 1; i <= 5; i++) {
      const count = distribution[i] || 0;
      const percentage = (count / maxCount) * 100;
      const bar = document.getElementById(`rating-bar-${i}`);
      const countEl = document.getElementById(`rating-count-${i}`);

      if (bar) bar.style.width = `${percentage}%`;
      if (countEl) countEl.textContent = count;
    }
  },

  /**
   * Update feedback comments display
   * @param {Array} comments - Array of feedback comments
   */
  updateFeedbackComments(comments) {
    const container = document.getElementById('feedback-comments');
    if (!container) return;

    if (!comments || comments.length === 0) {
      container.innerHTML = '<p class="feedback-empty">No written feedback yet</p>';
      return;
    }

    container.innerHTML = comments.map(comment => {
      const stars = '★'.repeat(comment.rating) + '☆'.repeat(5 - comment.rating);
      const date = new Date(comment.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });

      return `
        <div class="feedback-comment">
          <div class="feedback-comment-header">
            <span class="feedback-comment-rating">${stars}</span>
            <span class="feedback-comment-date">${date}</span>
          </div>
          <p class="feedback-comment-text">${this.escapeHtml(comment.text)}</p>
        </div>
      `;
    }).join('');
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Renderer.init();

  // Expose for debugging
  window.Renderer = Renderer;
});
