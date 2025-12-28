/**
 * Hybrid conversation persistence utility
 * localStorage (fast, immediate) + Database (persistent, cross-device)
 */

const CONVERSATIONS_STORAGE_KEY = 'ai_conversations';
const SYNC_QUEUE_KEY = 'ai_conversation_sync_queue';
const LAST_SYNC_KEY = 'ai_conversation_last_sync';

export const conversationSync = {
  /**
   * Save conversation to localStorage (immediate, client-side only)
   * @param {string} conversationId - Unique conversation ID
   * @param {Array} messages - Array of message objects
   * @param {Object} metadata - Additional conversation metadata
   */
  saveLocal: (conversationId, messages, metadata = {}) => {
    try {
      const conversations = JSON.parse(
        localStorage.getItem(CONVERSATIONS_STORAGE_KEY) || '{}'
      );

      conversations[conversationId] = {
        messages,
        metadata,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'pending' // pending, synced, error
      };

      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));

      // Add to sync queue
      conversationSync.addToSyncQueue(conversationId);

      return true;
    } catch (error) {
      console.error('[Conversation Sync] Error saving to localStorage:', error);
      return false;
    }
  },

  /**
   * Get conversation from localStorage
   * @param {string} conversationId
   * @returns {Object|null} - Conversation object or null
   */
  getLocal: (conversationId) => {
    try {
      const conversations = JSON.parse(
        localStorage.getItem(CONVERSATIONS_STORAGE_KEY) || '{}'
      );
      return conversations[conversationId] || null;
    } catch (error) {
      console.error('[Conversation Sync] Error reading from localStorage:', error);
      return null;
    }
  },

  /**
   * Get all conversations from localStorage
   * @returns {Object} - All conversations
   */
  getAllLocal: () => {
    try {
      return JSON.parse(localStorage.getItem(CONVERSATIONS_STORAGE_KEY) || '{}');
    } catch (error) {
      console.error('[Conversation Sync] Error reading all conversations:', error);
      return {};
    }
  },

  /**
   * Delete conversation from localStorage
   * @param {string} conversationId
   */
  deleteLocal: (conversationId) => {
    try {
      const conversations = JSON.parse(
        localStorage.getItem(CONVERSATIONS_STORAGE_KEY) || '{}'
      );

      delete conversations[conversationId];
      localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));

      return true;
    } catch (error) {
      console.error('[Conversation Sync] Error deleting from localStorage:', error);
      return false;
    }
  },

  /**
   * Add conversation to sync queue
   * @param {string} conversationId
   */
  addToSyncQueue: (conversationId) => {
    try {
      const queue = JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');

      if (!queue.includes(conversationId)) {
        queue.push(conversationId);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('[Conversation Sync] Error adding to sync queue:', error);
    }
  },

  /**
   * Get sync queue
   * @returns {Array} - Array of conversation IDs to sync
   */
  getSyncQueue: () => {
    try {
      return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
    } catch (error) {
      console.error('[Conversation Sync] Error getting sync queue:', error);
      return [];
    }
  },

  /**
   * Clear sync queue
   */
  clearSyncQueue: () => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, '[]');
    } catch (error) {
      console.error('[Conversation Sync] Error clearing sync queue:', error);
    }
  },

  /**
   * Sync conversation to database (background operation)
   * @param {string} conversationId
   * @returns {Promise<boolean>}
   */
  syncToDatabase: async (conversationId) => {
    try {
      const conversation = conversationSync.getLocal(conversationId);
      if (!conversation) {
        console.warn(`[Conversation Sync] Conversation ${conversationId} not found in localStorage`);
        return false;
      }

      // Send to server
      const response = await fetch(`/api/ai/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation.messages,
          metadata: conversation.metadata,
          lastUpdated: conversation.lastUpdated
        })
      });

      if (response.ok) {
        // Update sync status
        const conversations = conversationSync.getAllLocal();
        if (conversations[conversationId]) {
          conversations[conversationId].syncStatus = 'synced';
          localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
        }

        // Remove from sync queue
        const queue = conversationSync.getSyncQueue();
        const newQueue = queue.filter(id => id !== conversationId);
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(newQueue));

        console.log(`[Conversation Sync] Successfully synced ${conversationId} to database`);
        return true;
      } else {
        console.error(`[Conversation Sync] Failed to sync ${conversationId}:`, await response.text());
        return false;
      }
    } catch (error) {
      console.error('[Conversation Sync] Error syncing to database:', error);

      // Mark as error
      const conversations = conversationSync.getAllLocal();
      if (conversations[conversationId]) {
        conversations[conversationId].syncStatus = 'error';
        localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
      }

      return false;
    }
  },

  /**
   * Sync all pending conversations to database
   * @returns {Promise<Object>} - Sync results
   */
  syncAll: async () => {
    const queue = conversationSync.getSyncQueue();
    const results = {
      total: queue.length,
      synced: 0,
      failed: 0
    };

    for (const conversationId of queue) {
      const success = await conversationSync.syncToDatabase(conversationId);
      if (success) {
        results.synced++;
      } else {
        results.failed++;
      }
    }

    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

    console.log('[Conversation Sync] Sync all complete:', results);
    return results;
  },

  /**
   * Load conversation (try localStorage first, fallback to database)
   * @param {string} conversationId
   * @returns {Promise<Object|null>}
   */
  load: async (conversationId) => {
    // Try localStorage first (fast)
    const local = conversationSync.getLocal(conversationId);
    if (local) {
      console.log(`[Conversation Sync] Loaded ${conversationId} from localStorage`);
      return local;
    }

    // Fallback to database
    try {
      const response = await fetch(`/api/ai/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();

        // Cache to localStorage for future access
        conversationSync.saveLocal(conversationId, data.messages, data.metadata);

        console.log(`[Conversation Sync] Loaded ${conversationId} from database and cached`);
        return data;
      } else {
        console.warn(`[Conversation Sync] Conversation ${conversationId} not found in database`);
        return null;
      }
    } catch (error) {
      console.error('[Conversation Sync] Error loading from database:', error);
      return null;
    }
  },

  /**
   * Start background sync (auto-sync every 30 seconds)
   * @returns {number} - Interval ID
   */
  startAutoSync: () => {
    const syncInterval = setInterval(async () => {
      const queue = conversationSync.getSyncQueue();
      if (queue.length > 0) {
        console.log(`[Conversation Sync] Auto-syncing ${queue.length} conversation(s)...`);
        await conversationSync.syncAll();
      }
    }, 30000); // 30 seconds

    console.log('[Conversation Sync] Auto-sync started');
    return syncInterval;
  },

  /**
   * Stop background sync
   * @param {number} intervalId - Interval ID from startAutoSync
   */
  stopAutoSync: (intervalId) => {
    clearInterval(intervalId);
    console.log('[Conversation Sync] Auto-sync stopped');
  },

  /**
   * Get last sync timestamp
   * @returns {string|null} - ISO timestamp or null
   */
  getLastSyncTime: () => {
    return localStorage.getItem(LAST_SYNC_KEY);
  },

  /**
   * Get sync status
   * @returns {Object} - Sync statistics
   */
  getSyncStatus: () => {
    const conversations = conversationSync.getAllLocal();
    const queue = conversationSync.getSyncQueue();

    const stats = {
      total: Object.keys(conversations).length,
      synced: 0,
      pending: 0,
      error: 0,
      lastSync: conversationSync.getLastSyncTime()
    };

    Object.values(conversations).forEach(conv => {
      if (conv.syncStatus === 'synced') stats.synced++;
      else if (conv.syncStatus === 'pending') stats.pending++;
      else if (conv.syncStatus === 'error') stats.error++;
    });

    return stats;
  },

  /**
   * Clear all conversations from localStorage (careful!)
   */
  clearAll: () => {
    try {
      localStorage.removeItem(CONVERSATIONS_STORAGE_KEY);
      localStorage.removeItem(SYNC_QUEUE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      console.log('[Conversation Sync] All conversations cleared from localStorage');
      return true;
    } catch (error) {
      console.error('[Conversation Sync] Error clearing conversations:', error);
      return false;
    }
  }
};

export default conversationSync;
