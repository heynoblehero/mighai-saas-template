import { getUserConversations, saveConversation } from '../../../../lib/ai-conversation-init.js';
import db from '../../../../lib/database.js';

/**
 * API endpoint for managing conversations collection
 * GET - List all conversations for a user (or all if no user)
 * POST - Create a new conversation
 */
export default async function handler(req, res) {
  const { method } = req;

  console.log(`[Conversations API] ${method} request`);

  try {
    switch (method) {
      case 'GET':
        return await listConversationsHandler(req, res);

      case 'POST':
        return await createConversationHandler(req.body, res);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`[Conversations API] Error in ${method}:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * GET /api/ai/conversations
 * List conversations, optionally filtered by user
 *
 * Query params:
 * - userId: Filter by user ID
 * - limit: Max number of conversations to return (default: 50)
 * - provider: Filter by AI provider (claude, gemini, openai)
 */
async function listConversationsHandler(req, res) {
  const { userId, limit = 50, provider } = req.query;

  try {
    let conversations;

    if (userId) {
      // Get conversations for specific user
      conversations = getUserConversations(parseInt(userId), parseInt(limit));
    } else {
      // Get all conversations (for admin or public access)
      const query = `
        SELECT * FROM ai_conversations
        ${provider ? 'WHERE provider = ?' : ''}
        ORDER BY updated_at DESC
        LIMIT ?
      `;

      const params = provider ? [provider, parseInt(limit)] : [parseInt(limit)];
      conversations = db.prepare(query).all(...params);

      // Parse metadata for each conversation
      conversations.forEach(conv => {
        if (conv.metadata) {
          try {
            conv.metadata = JSON.parse(conv.metadata);
          } catch (e) {
            conv.metadata = {};
          }
        }
      });
    }

    console.log(`[Conversations API] Retrieved ${conversations.length} conversation(s)`);

    return res.status(200).json({
      success: true,
      conversations,
      count: conversations.length
    });
  } catch (error) {
    console.error('[Conversations API] Error listing conversations:', error);
    return res.status(500).json({
      error: 'Failed to list conversations',
      details: error.message
    });
  }
}

/**
 * POST /api/ai/conversations
 * Create a new conversation
 *
 * Body:
 * - conversationId: Unique ID
 * - userId: Optional user ID
 * - title: Conversation title
 * - provider: AI provider (claude, gemini, openai)
 * - metadata: Optional metadata object
 */
async function createConversationHandler(body, res) {
  const { conversationId, userId, title, provider, metadata } = body;

  if (!conversationId) {
    return res.status(400).json({
      error: 'conversationId is required'
    });
  }

  if (!title) {
    return res.status(400).json({
      error: 'title is required'
    });
  }

  if (!provider) {
    return res.status(400).json({
      error: 'provider is required (claude, gemini, or openai)'
    });
  }

  try {
    const result = await saveConversation({
      conversationId,
      userId: userId || null,
      title,
      provider,
      metadata: metadata || {}
    });

    console.log(`[Conversations API] Created conversation ${conversationId}`);

    return res.status(201).json({
      success: true,
      conversationId: result.id,
      message: 'Conversation created successfully'
    });
  } catch (error) {
    console.error('[Conversations API] Error creating conversation:', error);
    return res.status(500).json({
      error: 'Failed to create conversation',
      details: error.message
    });
  }
}
