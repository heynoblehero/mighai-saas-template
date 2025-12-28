const db = require('./database');

/**
 * Initialize AI conversation tables for persisting chat history
 * Supports hybrid storage: localStorage (fast) + database (persistent)
 */
function initializeAIConversationTables() {
  try {
    // Create conversations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        provider TEXT NOT NULL, -- 'claude', 'gemini', 'openai'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT, -- JSON: { plan, generatedCode, validation, imageAnalysis }
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user', 'assistant', 'system'
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT, -- JSON: { images, files, code, tokens }
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_user ON ai_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_provider ON ai_conversations(provider);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated ON ai_conversations(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON ai_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON ai_messages(timestamp DESC);
    `);

    console.log('✓ AI conversation tables initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing AI conversation tables:', error);
    return false;
  }
}

/**
 * Save or update a conversation
 */
function saveConversation({ conversationId, userId, title, provider, metadata }) {
  try {
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    // Check if conversation exists
    const existing = db.prepare('SELECT id FROM ai_conversations WHERE id = ?').get(conversationId);

    if (existing) {
      // Update existing conversation
      db.prepare(`
        UPDATE ai_conversations
        SET title = ?, provider = ?, metadata = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, provider, metadataJson, conversationId);
    } else {
      // Insert new conversation
      db.prepare(`
        INSERT INTO ai_conversations (id, user_id, title, provider, metadata)
        VALUES (?, ?, ?, ?, ?)
      `).run(conversationId, userId, title, provider, metadataJson);
    }

    return { success: true, id: conversationId };
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Add a message to a conversation
 */
function addMessage({ conversationId, role, content, metadata }) {
  try {
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const result = db.prepare(`
      INSERT INTO ai_messages (conversation_id, role, content, metadata)
      VALUES (?, ?, ?, ?)
    `).run(conversationId, role, content, metadataJson);

    // Update conversation's updated_at timestamp
    db.prepare(`
      UPDATE ai_conversations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(conversationId);

    return { success: true, id: result.lastInsertRowid };
  } catch (error) {
    console.error('Error adding message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get a conversation with all its messages
 */
function getConversation(conversationId) {
  try {
    const conversation = db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(conversationId);

    if (!conversation) {
      return null;
    }

    const messages = db.prepare(`
      SELECT * FROM ai_messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `).all(conversationId);

    // Parse metadata
    if (conversation.metadata) {
      try {
        conversation.metadata = JSON.parse(conversation.metadata);
      } catch (e) {
        conversation.metadata = {};
      }
    }

    messages.forEach(msg => {
      if (msg.metadata) {
        try {
          msg.metadata = JSON.parse(msg.metadata);
        } catch (e) {
          msg.metadata = {};
        }
      }
    });

    return {
      ...conversation,
      messages
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

/**
 * Get all conversations for a user
 */
function getUserConversations(userId, limit = 50) {
  try {
    const conversations = db.prepare(`
      SELECT * FROM ai_conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(userId, limit);

    // Parse metadata
    conversations.forEach(conv => {
      if (conv.metadata) {
        try {
          conv.metadata = JSON.parse(conv.metadata);
        } catch (e) {
          conv.metadata = {};
        }
      }
    });

    return conversations;
  } catch (error) {
    console.error('Error getting user conversations:', error);
    return [];
  }
}

/**
 * Delete a conversation and all its messages
 */
function deleteConversation(conversationId) {
  try {
    // Messages are deleted automatically due to CASCADE
    db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(conversationId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeAIConversationTables,
  saveConversation,
  addMessage,
  getConversation,
  getUserConversations,
  deleteConversation
};
