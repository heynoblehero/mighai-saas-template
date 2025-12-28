import { getConversation, addMessage, deleteConversation, saveConversation } from '../../../../lib/ai-conversation-init.js';

/**
 * API endpoint for managing individual conversations
 * GET - Fetch conversation with all messages
 * PUT - Update conversation (add messages, update metadata)
 * DELETE - Delete conversation and all its messages
 */
export default async function handler(req, res) {
  const { id } = req.query;
  const { method } = req;

  if (!id) {
    return res.status(400).json({ error: 'Conversation ID is required' });
  }

  console.log(`[Conversation API] ${method} request for conversation: ${id}`);

  try {
    switch (method) {
      case 'GET':
        return await getConversationHandler(id, res);

      case 'PUT':
        return await updateConversationHandler(id, req.body, res);

      case 'DELETE':
        return await deleteConversationHandler(id, res);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error(`[Conversation API] Error in ${method}:`, error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

/**
 * GET /api/ai/conversations/[id]
 * Fetch a conversation with all its messages
 */
async function getConversationHandler(conversationId, res) {
  const conversation = getConversation(conversationId);

  if (!conversation) {
    return res.status(404).json({
      error: 'Conversation not found',
      conversationId
    });
  }

  console.log(`[Conversation API] Retrieved conversation ${conversationId} with ${conversation.messages?.length || 0} messages`);

  return res.status(200).json({
    success: true,
    conversation
  });
}

/**
 * PUT /api/ai/conversations/[id]
 * Update conversation - add messages or update metadata
 *
 * Body:
 * - messages: Array of message objects to add
 * - metadata: Object to merge with existing metadata
 * - lastUpdated: ISO timestamp
 */
async function updateConversationHandler(conversationId, body, res) {
  const { messages, metadata, lastUpdated } = body;

  // Check if conversation exists
  const existing = getConversation(conversationId);

  if (!existing && !messages) {
    return res.status(400).json({
      error: 'Conversation does not exist. Provide messages to create it.'
    });
  }

  try {
    // If conversation doesn't exist, create it
    if (!existing) {
      const firstMessage = messages[0];
      await saveConversation({
        conversationId,
        userId: null, // No user context in sync
        title: firstMessage?.content?.substring(0, 100) || 'Untitled',
        provider: metadata?.provider || 'claude',
        metadata: metadata || {}
      });
      console.log(`[Conversation API] Created new conversation ${conversationId}`);
    } else if (metadata) {
      // Update existing conversation metadata
      await saveConversation({
        conversationId,
        userId: existing.user_id,
        title: existing.title,
        provider: existing.provider,
        metadata: {
          ...(existing.metadata || {}),
          ...metadata
        }
      });
      console.log(`[Conversation API] Updated metadata for conversation ${conversationId}`);
    }

    // Add new messages
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        await addMessage({
          conversationId,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {}
        });
      }
      console.log(`[Conversation API] Added ${messages.length} message(s) to conversation ${conversationId}`);
    }

    return res.status(200).json({
      success: true,
      conversationId,
      messagesAdded: messages?.length || 0
    });
  } catch (error) {
    console.error('[Conversation API] Error updating conversation:', error);
    return res.status(500).json({
      error: 'Failed to update conversation',
      details: error.message
    });
  }
}

/**
 * DELETE /api/ai/conversations/[id]
 * Delete a conversation and all its messages (CASCADE)
 */
async function deleteConversationHandler(conversationId, res) {
  const result = deleteConversation(conversationId);

  if (!result.success) {
    return res.status(500).json({
      error: 'Failed to delete conversation',
      details: result.error
    });
  }

  console.log(`[Conversation API] Deleted conversation ${conversationId}`);

  return res.status(200).json({
    success: true,
    conversationId,
    message: 'Conversation deleted successfully'
  });
}
