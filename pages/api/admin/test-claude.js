const { withAdminAuth } = require('../../../lib/auth-middleware');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { api_key, model } = req.body;

  if (!api_key) {
    return res.status(400).json({ success: false, error: 'API key is required' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': api_key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Respond with "API connection successful" if you can see this message.'
          }
        ]
      })
    });

    const data = await response.json();

    if (response.ok) {
      res.status(200).json({ 
        success: true, 
        message: 'Claude API connection successful',
        model: model,
        response: data.content?.[0]?.text || 'Connection verified'
      });
    } else {
      res.status(200).json({ 
        success: false, 
        error: data.error?.message || 'API connection failed',
        details: data
      });
    }
  } catch (error) {
    console.error('Claude API test failed:', error);
    res.status(200).json({ 
      success: false, 
      error: 'Failed to connect to Claude API: ' + error.message
    });
  }
}

export default withAdminAuth(handler);