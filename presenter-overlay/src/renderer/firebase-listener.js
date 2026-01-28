/**
 * Firebase Listener
 * Listens for new reactions from Firebase Realtime Database
 */

class FirebaseListener {
  constructor() {
    this.db = null;
    this.roomCode = null;
    this.unsubscribe = null;
    this.onReaction = null;
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
        off
      } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');

      this.firebase = { initializeApp, getDatabase, ref, query, orderByChild, startAt, onChildAdded, off };

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

    const { ref, query, orderByChild, startAt, onChildAdded } = this.firebase;

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

    this.isConnected = true;
    if (this.onStatusChange) {
      this.onStatusChange(true);
    }
  }

  /**
   * Stop listening to the current room
   */
  stopListening() {
    if (this.unsubscribe && this.db && this.roomCode) {
      const { ref, off } = this.firebase;
      try {
        off(ref(this.db, `rooms/${this.roomCode}/reactions`));
      } catch (e) {
        console.log('Error unsubscribing:', e);
      }
      this.unsubscribe = null;
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
}

// Export for use in renderer
window.FirebaseListener = FirebaseListener;
