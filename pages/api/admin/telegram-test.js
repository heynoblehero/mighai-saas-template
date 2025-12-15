const { withAdminAuth } = require('../../../lib/auth-middleware');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { botToken, chatId, message } = req.body;

  // Validate required fields
  if (!botToken || !chatId || !message) {
    return res.status(400).json({
      success: false,
      error: 'Bot token, chat ID, and message are required'
    });
  }

  try {
    // Send message via Telegram Bot API
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await telegramResponse.json();

    if (result.ok) {
      res.status(200).json({
        success: true,
        message: 'Test message sent successfully!',
        telegramResponse: result
      });
    } else {
      // Handle specific Telegram API errors
      let errorMessage = 'Failed to send message';
      
      if (result.error_code === 400) {
        if (result.description.includes('chat not found')) {
          errorMessage = 'Chat ID not found. Make sure you have started the bot and the chat ID is correct.';
        } else if (result.description.includes('bot was blocked')) {
          errorMessage = 'Bot was blocked by the user. Please unblock the bot and try again.';
        } else if (result.description.includes('invalid token')) {
          errorMessage = 'Invalid bot token. Please check your bot token.';
        }
      } else if (result.error_code === 401) {
        errorMessage = 'Unauthorized. Please check your bot token.';
      } else if (result.error_code === 403) {
        errorMessage = 'Bot access denied. Make sure the bot is active and has permission to send messages.';
      }

      res.status(400).json({
        success: false,
        error: errorMessage,
        telegramError: result.description
      });
    }

  } catch (error) {
    console.error('Error testing Telegram bot:', error);
    
    let errorMessage = 'Network error occurred while testing bot connection';
    
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network connection failed. Please check your internet connection.';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. Telegram API may be temporarily unavailable.';
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

export default withAdminAuth(handler);