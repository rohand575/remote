/**
 * Firebase Client Module
 * Handles connection to Firebase and sending reactions
 */

const FirebaseClient = {
  db: null,
  roomCode: null,
  isConnected: false,
  lastSentTime: 0,
  DEBOUNCE_MS: 200, // Minimum time between reactions

  /**
   * Initialize Firebase with config
   */
  async init() {
    // Wait for Firebase modules to load
    if (!window.firebaseModules) {
      throw new Error('Firebase modules not loaded');
    }

    const { initializeApp, getDatabase } = window.firebaseModules;

    // Firebase config - replace with your values from Firebase Console
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

    try {
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
  },

  /**
   * Check if a room exists (host is active)
   * @param {string} code - Room code to check
   * @returns {Promise<boolean>} - True if room exists and host is active
   */
  async checkRoomExists(code) {
    if (!this.db) {
      throw new Error('Firebase not initialized');
    }

    const { ref, get } = window.firebaseModules;
    const roomCode = code.toLowerCase().trim();
    const hostRef = ref(this.db, `rooms/${roomCode}/host`);

    try {
      const snapshot = await get(hostRef);
      if (snapshot.exists()) {
        const hostData = snapshot.val();
        return hostData && hostData.active === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking room:', error);
      return false;
    }
  },

  /**
   * Set the current room code
   * @param {string} code - Room code to join
   */
  setRoom(code) {
    this.roomCode = code.toLowerCase().trim();
  },

  /**
   * Send a reaction to Firebase
   * @param {string} emoji - The emoji to send
   * @returns {Promise<boolean>} - True if sent successfully
   */
  async sendReaction(emoji) {
    if (!this.db || !this.roomCode) {
      console.error('Not connected to a room');
      return false;
    }

    // Debounce rapid taps
    const now = Date.now();
    if (now - this.lastSentTime < this.DEBOUNCE_MS) {
      console.log('Rate limited - too fast');
      return false;
    }
    this.lastSentTime = now;

    // Validate emoji
    const validEmojis = ['👏', '🔥', '🤯', '❓', '❤️', '😂'];
    if (!validEmojis.includes(emoji)) {
      console.error('Invalid emoji:', emoji);
      return false;
    }

    const { ref, push } = window.firebaseModules;

    try {
      const reactionsRef = ref(this.db, `rooms/${this.roomCode}/reactions`);
      await push(reactionsRef, {
        emoji: emoji,
        timestamp: Date.now()
      });
      return true;
    } catch (error) {
      console.error('Error sending reaction:', error);
      return false;
    }
  },

  /**
   * Get connection status
   * @returns {boolean}
   */
  getConnectionStatus() {
    return this.isConnected;
  }
};

// Make available globally
window.FirebaseClient = FirebaseClient;
