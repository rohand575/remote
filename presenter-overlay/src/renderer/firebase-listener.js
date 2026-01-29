/**
 * Firebase Listener
 * Listens for new reactions from Firebase Realtime Database using REST API + SSE
 * This approach works reliably in Electron without needing the Firebase SDK
 */

class FirebaseListener {
  constructor() {
    this.baseUrl = 'https://live-reactions-3dea2-default-rtdb.firebaseio.com';
    this.roomCode = null;
    this.eventSources = [];
    this.onReaction = null;
    this.onPaceFeedback = null;
    this.onQuestion = null;
    this.onStatusChange = null;
    this.isConnected = false;
    this.questions = [];
    this.startTime = null;
  }

  /**
   * Initialize - just mark as ready (no SDK needed)
   * @returns {Promise<boolean>}
   */
  async init() {
    console.log('[Firebase] REST API mode - no SDK initialization needed');
    this.isConnected = true;
    return true;
  }

  /**
   * Start listening to a room for reactions using Server-Sent Events
   * @param {string} roomCode - The room code to listen to
   */
  async listenToRoom(roomCode) {
    // Stop any existing listeners
    this.stopListening();

    this.roomCode = roomCode.toLowerCase().trim();
    this.startTime = Date.now();
    console.log(`[Firebase] Starting connection to room: ${this.roomCode}`);

    // Create host entry via REST API
    console.log('[Firebase] Creating host entry...');
    try {
      const hostResponse = await fetch(`${this.baseUrl}/rooms/${this.roomCode}/host.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: true,
          createdAt: Date.now()
        })
      });

      if (!hostResponse.ok) {
        throw new Error(`HTTP ${hostResponse.status}: ${hostResponse.statusText}`);
      }
      console.log('[Firebase] Host entry created successfully');
    } catch (error) {
      console.error('[Firebase] Failed to create host entry:', error);
      throw new Error('Failed to connect: ' + error.message);
    }

    // Set up SSE listeners for reactions, pace, and questions
    console.log(`[Firebase] startTime set to: ${this.startTime}`);
    console.log(`[Firebase] onReaction callback exists: ${!!this.onReaction}`);

    this.setupSSEListener('reactions', (data, key) => {
      console.log(`[Firebase] Reaction callback triggered:`, data, `key: ${key}`);
      console.log(`[Firebase] Timestamp check: ${data?.timestamp} >= ${this.startTime} = ${data?.timestamp >= this.startTime}`);

      if (data && data.emoji) {
        // Only filter by timestamp for non-initial data (when path is not '/')
        // For new reactions, always process them
        console.log('[Firebase] Processing reaction:', data.emoji);
        if (this.onReaction) {
          this.onReaction(data.emoji);
        } else {
          console.error('[Firebase] onReaction callback is not set!');
        }
      }
    });

    this.setupSSEListener('pace', (data, key) => {
      console.log(`[Firebase] Pace callback triggered:`, data);
      if (data && data.pace) {
        console.log('[Firebase] Processing pace:', data.pace);
        if (this.onPaceFeedback) {
          this.onPaceFeedback(data.pace);
        }
      }
    });

    this.setupSSEListener('questions', (data, key) => {
      console.log(`[Firebase] Question callback triggered:`, data);
      if (data && data.text) {
        console.log('[Firebase] Processing question:', data.text);
        const question = {
          id: key,
          text: data.text,
          timestamp: data.timestamp,
          answered: data.answered || false
        };
        this.questions.unshift(question);
        if (this.questions.length > 50) {
          this.questions.pop();
        }
        if (this.onQuestion) {
          this.onQuestion(question);
        }
      }
    });

    this.isConnected = true;
    console.log('[Firebase] Connection established, all listeners active');
    if (this.onStatusChange) {
      this.onStatusChange(true);
    }
  }

  /**
   * Set up a Server-Sent Events listener for a specific path
   * Firebase SSE uses 'put' and 'patch' events, not standard 'message'
   * @param {string} path - The path to listen to (reactions, pace, questions)
   * @param {Function} callback - Called with (data, key) for each new item
   */
  setupSSEListener(path, callback) {
    const url = `${this.baseUrl}/rooms/${this.roomCode}/${path}.json`;
    console.log(`[Firebase] Setting up SSE listener for ${path}`);

    const eventSource = new EventSource(url);
    let initialLoadComplete = false;

    eventSource.onopen = () => {
      console.log(`[Firebase] SSE connection opened for ${path}`);
    };

    // Firebase sends 'put' events for data changes
    eventSource.addEventListener('put', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[Firebase] SSE put event for ${path}:`, message.path);

        if (message.path === '/') {
          // Initial data load - skip old items, just mark as loaded
          console.log(`[Firebase] Initial data load for ${path} - skipping old items`);
          initialLoadComplete = true;
        } else {
          // Individual item added/updated (path like "/-OkXyz123")
          // Only process if initial load is complete (new items)
          if (initialLoadComplete) {
            const key = message.path.replace(/^\//, '');
            if (message.data) {
              callback(message.data, key);
            }
          }
        }
      } catch (e) {
        console.error(`[Firebase] SSE put parse error for ${path}:`, e);
      }
    });

    // Firebase sends 'patch' events for partial updates
    eventSource.addEventListener('patch', (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log(`[Firebase] SSE patch event for ${path}:`, message.path);

        // Patch events are always for updates, process them
        if (message.data && typeof message.data === 'object') {
          Object.entries(message.data).forEach(([key, value]) => {
            callback(value, key);
          });
        }
      } catch (e) {
        console.error(`[Firebase] SSE patch parse error for ${path}:`, e);
      }
    });

    // Keep-alive events (can be ignored)
    eventSource.addEventListener('keep-alive', () => {
      // Firebase sends these periodically to keep connection alive
    });

    eventSource.onerror = (error) => {
      console.error(`[Firebase] SSE error for ${path}:`, error);
    };

    this.eventSources.push(eventSource);
  }

  /**
   * Stop listening to the current room
   */
  stopListening() {
    // Close all SSE connections
    this.eventSources.forEach(es => {
      try {
        es.close();
      } catch (e) {
        console.log('Error closing EventSource:', e);
      }
    });
    this.eventSources = [];

    // Remove host entry
    if (this.roomCode) {
      fetch(`${this.baseUrl}/rooms/${this.roomCode}/host.json`, {
        method: 'DELETE'
      }).catch(e => console.log('Error removing host:', e));
    }

    this.roomCode = null;
    this.questions = [];
    this.isConnected = false;
  }

  /**
   * Set callback for when a reaction is received
   * @param {Function} callback - Called with emoji string
   */
  setOnReaction(callback) {
    this.onReaction = callback;
  }

  /**
   * Set callback for when pace feedback is received
   * @param {Function} callback - Called with pace string (slow, good, fast)
   */
  setOnPaceFeedback(callback) {
    this.onPaceFeedback = callback;
  }

  /**
   * Set callback for when a question is received
   * @param {Function} callback - Called with question object { id, text, timestamp, answered }
   */
  setOnQuestion(callback) {
    this.onQuestion = callback;
  }

  /**
   * Set callback for connection status changes
   * @param {Function} callback - Called with boolean connected status
   */
  setOnStatusChange(callback) {
    this.onStatusChange = callback;
  }

  /**
   * Get all stored questions
   * @returns {Array}
   */
  getQuestions() {
    return this.questions;
  }

  /**
   * Mark a question as answered
   * @param {string} questionId
   */
  async markQuestionAnswered(questionId) {
    if (!this.roomCode) return;

    try {
      await fetch(`${this.baseUrl}/rooms/${this.roomCode}/questions/${questionId}/answered.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(true)
      });

      // Update local state
      const question = this.questions.find(q => q.id === questionId);
      if (question) {
        question.answered = true;
      }
    } catch (error) {
      console.error('Error marking question as answered:', error);
    }
  }

  /**
   * Get current connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Get current room code
   * @returns {string|null}
   */
  getRoomCode() {
    return this.roomCode;
  }

  /**
   * Get feedback statistics from Firebase
   * @returns {Promise<Object>} Feedback stats object
   */
  async getFeedbackStats() {
    try {
      const response = await fetch(`${this.baseUrl}/feedback.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const feedback = await response.json();
      if (!feedback) {
        return null;
      }

      const feedbackArray = Object.values(feedback);
      const totalCount = feedbackArray.length;

      // Calculate average rating
      const totalRating = feedbackArray.reduce((sum, f) => sum + (f.rating || 0), 0);
      const averageRating = totalCount > 0 ? totalRating / totalCount : 0;

      // Rating distribution
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      feedbackArray.forEach(f => {
        if (f.rating >= 1 && f.rating <= 5) {
          ratingDistribution[f.rating]++;
        }
      });

      // Get recent feedback with text (last 50)
      const recentFeedback = feedbackArray
        .filter(f => f.text && f.text.trim().length > 0)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, 50)
        .map(f => ({
          rating: f.rating,
          text: f.text,
          timestamp: f.timestamp
        }));

      return {
        totalCount,
        averageRating,
        ratingDistribution,
        recentFeedback
      };

    } catch (error) {
      console.error('Error fetching feedback:', error);
      throw error;
    }
  }
}

// Export for use in renderer
window.FirebaseListener = FirebaseListener;
