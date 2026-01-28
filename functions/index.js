/**
 * Firebase Cloud Functions for Live Reactions
 *
 * Handles automatic cleanup of old reactions and pace data
 * while preserving feedback data permanently.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.database();

// Configuration
const RETENTION_DAYS = 3; // Delete reactions older than 3 days
const CLEANUP_BATCH_SIZE = 500; // Process in batches to avoid timeouts

/**
 * Scheduled function to clean up old reactions data
 * Runs daily at 3:00 AM UTC
 *
 * Deletes:
 * - reactions older than RETENTION_DAYS
 * - pace data older than RETENTION_DAYS
 * - empty room entries
 *
 * Preserves:
 * - feedback data (stored separately)
 */
exports.cleanupOldData = functions.pubsub
  .schedule('0 3 * * *') // Every day at 3:00 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('Starting data cleanup...');

    const cutoffTime = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    console.log(`Cutoff timestamp: ${cutoffTime} (${new Date(cutoffTime).toISOString()})`);

    try {
      // Get all rooms
      const roomsSnapshot = await db.ref('rooms').once('value');
      const rooms = roomsSnapshot.val();

      if (!rooms) {
        console.log('No rooms found');
        return null;
      }

      let totalDeleted = 0;
      let roomsCleaned = 0;
      let roomsDeleted = 0;

      for (const roomCode of Object.keys(rooms)) {
        const room = rooms[roomCode];

        // Clean up reactions
        if (room.reactions) {
          for (const reactionId of Object.keys(room.reactions)) {
            const reaction = room.reactions[reactionId];
            if (reaction.timestamp && reaction.timestamp < cutoffTime) {
              await db.ref(`rooms/${roomCode}/reactions/${reactionId}`).remove();
              totalDeleted++;
            }
          }
        }

        // Clean up pace data
        if (room.pace) {
          for (const paceId of Object.keys(room.pace)) {
            const pace = room.pace[paceId];
            if (pace.timestamp && pace.timestamp < cutoffTime) {
              await db.ref(`rooms/${roomCode}/pace/${paceId}`).remove();
              totalDeleted++;
            }
          }
        }

        roomsCleaned++;

        // Check if room is now empty (no active host and no recent data)
        const updatedRoom = await db.ref(`rooms/${roomCode}`).once('value');
        const roomData = updatedRoom.val();

        // Delete empty rooms (no host.active and no reactions/pace)
        if (roomData) {
          const hasActiveHost = roomData.host && roomData.host.active;
          const hasReactions = roomData.reactions && Object.keys(roomData.reactions).length > 0;
          const hasPace = roomData.pace && Object.keys(roomData.pace).length > 0;

          if (!hasActiveHost && !hasReactions && !hasPace) {
            await db.ref(`rooms/${roomCode}`).remove();
            roomsDeleted++;
          }
        }
      }

      console.log(`Cleanup complete: ${totalDeleted} items deleted from ${roomsCleaned} rooms, ${roomsDeleted} empty rooms removed`);
      return { deleted: totalDeleted, roomsCleaned, roomsDeleted };

    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  });

/**
 * HTTP function to manually trigger cleanup (for testing)
 *
 * Call: https://<region>-<project-id>.cloudfunctions.net/manualCleanup
 *
 * Note: This should be protected in production (add authentication)
 */
exports.manualCleanup = functions.https.onRequest(async (req, res) => {
  // Basic security - only allow from admin or local
  // In production, add proper authentication
  const authHeader = req.headers.authorization;

  // For now, we'll allow it but log the request
  console.log('Manual cleanup triggered from:', req.ip);

  const cutoffDays = parseInt(req.query.days) || RETENTION_DAYS;
  const cutoffTime = Date.now() - (cutoffDays * 24 * 60 * 60 * 1000);

  console.log(`Manual cleanup: Deleting data older than ${cutoffDays} days`);

  try {
    const roomsSnapshot = await db.ref('rooms').once('value');
    const rooms = roomsSnapshot.val();

    if (!rooms) {
      res.json({ message: 'No rooms found', deleted: 0 });
      return;
    }

    let totalDeleted = 0;

    for (const roomCode of Object.keys(rooms)) {
      const room = rooms[roomCode];

      // Clean up reactions
      if (room.reactions) {
        for (const reactionId of Object.keys(room.reactions)) {
          const reaction = room.reactions[reactionId];
          if (reaction.timestamp && reaction.timestamp < cutoffTime) {
            await db.ref(`rooms/${roomCode}/reactions/${reactionId}`).remove();
            totalDeleted++;
          }
        }
      }

      // Clean up pace data
      if (room.pace) {
        for (const paceId of Object.keys(room.pace)) {
          const pace = room.pace[paceId];
          if (pace.timestamp && pace.timestamp < cutoffTime) {
            await db.ref(`rooms/${roomCode}/pace/${paceId}`).remove();
            totalDeleted++;
          }
        }
      }

      // Remove empty rooms
      const updatedRoom = await db.ref(`rooms/${roomCode}`).once('value');
      const roomData = updatedRoom.val();

      if (roomData) {
        const hasActiveHost = roomData.host && roomData.host.active;
        const hasReactions = roomData.reactions && Object.keys(roomData.reactions).length > 0;
        const hasPace = roomData.pace && Object.keys(roomData.pace).length > 0;

        if (!hasActiveHost && !hasReactions && !hasPace) {
          await db.ref(`rooms/${roomCode}`).remove();
        }
      }
    }

    res.json({
      message: 'Cleanup complete',
      deleted: totalDeleted,
      cutoffDate: new Date(cutoffTime).toISOString()
    });

  } catch (error) {
    console.error('Error during manual cleanup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Function to get feedback statistics
 *
 * Call: https://<region>-<project-id>.cloudfunctions.net/getFeedbackStats
 */
exports.getFeedbackStats = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const feedbackSnapshot = await db.ref('feedback').once('value');
    const feedback = feedbackSnapshot.val();

    if (!feedback) {
      res.json({
        totalCount: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentFeedback: []
      });
      return;
    }

    const feedbackArray = Object.values(feedback);
    const totalCount = feedbackArray.length;

    // Calculate average rating
    const totalRating = feedbackArray.reduce((sum, f) => sum + f.rating, 0);
    const averageRating = totalCount > 0 ? (totalRating / totalCount).toFixed(2) : 0;

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
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50)
      .map(f => ({
        rating: f.rating,
        text: f.text,
        timestamp: f.timestamp,
        date: new Date(f.timestamp).toISOString()
      }));

    res.json({
      totalCount,
      averageRating: parseFloat(averageRating),
      ratingDistribution,
      recentFeedback
    });

  } catch (error) {
    console.error('Error getting feedback stats:', error);
    res.status(500).json({ error: error.message });
  }
});
