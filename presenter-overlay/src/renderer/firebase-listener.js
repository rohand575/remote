/**
 * Firebase Listener
 * Listens for new reactions from Firebase Realtime Database
 */

class FirebaseListener {
  constructor() {
    this.db = null;
    this.roomCode = null;
    this.unsubscribe = null;
    this.paceUnsubscribe = null;
    this.onReaction = null;
    this.onPaceFeedback = null;
    this.onStatusChange = null;
    this.isConnected = false;

    // Firebase SDK modules (loaded dynamically)
    this.firebase = null;
  }

  /**
   * Initialize Firebase
   * @returns {Promise<boolean>}
   */
  async init() {
    try {
      // Dynamic import of Firebase modules
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
      const {
        getDatabase,
        ref,
        query,
        orderByChild,
        startAt,
        onChildAdded,
        off,
        set,
        get,
        remove,
        onDisconnect
      } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');

      this.firebase = { initializeApp, getDatabase, ref, query, orderByChild, startAt, onChildAdded, off, set, get, remove, onDisconnect };

      // Firebase config - same as audience app
      const firebaseConfig = {
        apiKey: "AIzaSyDnNsJ6ko5WrHQYyoym1vs0bERLJA7V1tU",
        authDomain: "live-reactions-3dea2.firebaseapp.com",
        databaseURL: "https://live-reactions-3dea2-default-rtdb.firebaseio.com",
        projectId: "live-reactions-3dea2",
        storageBucket: "live-reactions-3dea2.firebasestorage.app",
        messagingSenderId: "590379663125",
        appId: "1:590379663125:web:12c7c5fbb16f9d77d4331c",
        measurementId: "G-KSVMJN9GHY"
      };

      const app = initializeApp(firebaseConfig);
      this.db = getDatabase(app);
      this.isConnected = true;

      console.log('Firebase initialized successfully');
      return true;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Start listening to a room for reactions
   * @param {string} roomCode - The room code to listen to
   */
  async listenToRoom(roomCode) {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    // Stop any existing listener
    this.stopListening();

    this.roomCode = roomCode.toLowerCase().trim();

    const { ref, query, orderByChild, startAt, onChildAdded, set, onDisconnect } = this.firebase;

    // Create room entry so audience can verify it exists
    const hostRef = ref(this.db, `rooms/${this.roomCode}/host`);
    await set(hostRef, {
      active: true,
      createdAt: Date.now()
    });

    // Automatically remove host entry when presenter disconnects
    onDisconnect(hostRef).remove();

    // Only listen to reactions from now onwards (ignore old ones)
    const startTime = Date.now();
    const reactionsRef = query(
      ref(this.db, `rooms/${this.roomCode}/reactions`),
      orderByChild('timestamp'),
      startAt(startTime)
    );

    console.log(`Listening to room: ${this.roomCode} from timestamp: ${startTime}`);

    // Store the reference for cleanup
    this.unsubscribe = onChildAdded(reactionsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.emoji) {
        console.log('Received reaction:', data.emoji);
        if (this.onReaction) {
          this.onReaction(data.emoji);
        }
      }
    }, (error) => {
      console.error('Firebase listener error:', error);
      this.isConnected = false;
      if (this.onStatusChange) {
        this.onStatusChange(false);
      }
    });

    // Listen for pace feedback
    const paceRef = query(
      ref(this.db, `rooms/${this.roomCode}/pace`),
      orderByChild('timestamp'),
      startAt(startTime)
    );

    this.paceUnsubscribe = onChildAdded(paceRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.pace) {
        console.log('Received pace feedback:', data.pace);
        if (this.onPaceFeedback) {
          this.onPaceFeedback(data.pace);
        }
      }
    }, (error) => {
      console.error('Firebase pace listener error:', error);
    });

    this.isConnected = true;
    if (this.onStatusChange) {
      this.onStatusChange(true);
    }
  }

  /**
   * Stop listening to the current room
   */
  stopListening() {
    if (this.db && this.roomCode) {
      const { ref, off, remove } = this.firebase;
      try {
        off(ref(this.db, `rooms/${this.roomCode}/reactions`));
        off(ref(this.db, `rooms/${this.roomCode}/pace`));
        // Remove host entry when leaving room
        remove(ref(this.db, `rooms/${this.roomCode}/host`));
      } catch (e) {
        console.log('Error unsubscribing:', e);
      }
      this.unsubscribe = null;
      this.paceUnsubscribe = null;
    }
    this.roomCode = null;
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
   * Set callback for connection status changes
   * @param {Function} callback - Called with boolean connected status
   */
  setOnStatusChange(callback) {
    this.onStatusChange = callback;
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
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    const { ref, get } = this.firebase;

    try {
      const feedbackRef = ref(this.db, 'feedback');
      const snapshot = await get(feedbackRef);

      if (!snapshot.exists()) {
        return null;
      }

      const feedback = snapshot.val();
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
