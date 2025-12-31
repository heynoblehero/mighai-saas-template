import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * API endpoint to forward AI requests with user-provided API keys
 * Adds system prompts and guidelines to ensure compliance with requirements
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    provider,
    userApiKey,
    userPrompt,
    systemPrompt = '',
    layoutAnalysis = null,
    pageType = null,
    conversationHistory = [],
    imageAttachments = [],
    otherAttachments = []
  } = req.body;

  if (!provider || !userApiKey || !userPrompt) {
    return res.status(400).json({
      error: 'Missing required fields: provider, userApiKey, and userPrompt are required'
    });
  }

  try {
    let response;

    // Add system guidelines to ensure compliance with page requirements
    const systemGuidelines = `You are an expert web developer creating pages for a SaaS platform.

${systemPrompt || ''}

IMPORTANT REQUIREMENTS:
1. Generate complete, valid HTML, CSS, and JavaScript
2. Focus on design, styling, and user experience improvements
3. Use modern, responsive design principles
4. Include proper meta tags and SEO elements
5. Ensure accessibility compliance
6. Use semantic HTML elements
7. Generate production-ready code that works independently

${layoutAnalysis ? `DESIGN REFERENCE:\n${layoutAnalysis}\n\nApply this visual style and layout to your implementation.\n\n` : ''}

${pageType ? `PAGE TYPE SPECIFIC REQUIREMENTS:\nFor ${pageType} pages, ensure you maintain all required functionality while focusing on visual improvements.\n\n` : ''}

Now generate a complete, beautiful page based on the user's request.`;

    switch (provider.toLowerCase()) {
      case 'gemini':
      case 'gemini-pro':
        const genAI = new GoogleGenerativeAI(userApiKey);
        const geminiModel = provider === 'gemini-pro' ? 'gemini-1.5-pro' : 'gemini-2.0-flash-exp';
        const gemini = genAI.getGenerativeModel({ model: geminiModel });

        // Prepare content with system guidelines and user prompt
        let geminiContent = [
          { text: systemGuidelines },
          { text: `\n\nUSER REQUEST:\n${userPrompt}` }
        ];

        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            geminiContent.push({
              text: `\n\n${msg.role.toUpperCase()}: ${msg.content}`
            });
          });
        }

        // Add image attachments if available
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            if (attachment.type.startsWith('image/')) {
              // For image attachments, we'd need to handle base64 encoding
              // This is a simplified approach - in a real implementation, you'd need to process the image
            }
          }
        }

        const geminiResult = await gemini.generateContent(geminiContent);
        const geminiResponse = await geminiResult.response;
        const geminiText = geminiResponse.text();

        response = {
          success: true,
          content: geminiText,
          model: geminiModel
        };
        break;

      case 'claude':
      case 'claude-sonnet':
      case 'claude-opus':
      case 'claude-haiku':
        const anthropic = new Anthropic({ apiKey: userApiKey });
        const claudeModel = provider === 'claude-opus' ? 'claude-3-opus-20240229' :
                          provider === 'claude-haiku' ? 'claude-3-haiku-20240307' :
                          provider === 'claude-sonnet' ? 'claude-3-5-sonnet-20240620' :
                          'claude-3-5-sonnet-20240620';

        // Prepare messages with conversation history
        const claudeMessages = [];

        // Add system message
        claudeMessages.push({
          role: 'user',
          content: systemGuidelines
        });

        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            claudeMessages.push({
              role: msg.role,
              content: msg.content
            });
          });
        }

        // Add current user prompt
        claudeMessages.push({
          role: 'user',
          content: userPrompt
        });

        const claudeResponse = await anthropic.messages.create({
          model: claudeModel,
          max_tokens: 8192,
          temperature: 0.7,
          messages: claudeMessages
        });

        const claudeText = claudeResponse.content[0].text;

        response = {
          success: true,
          content: claudeText,
          model: claudeModel,
          usage: {
            input_tokens: claudeResponse.usage?.input_tokens || 0,
            output_tokens: claudeResponse.usage?.output_tokens || 0,
            total_tokens: (claudeResponse.usage?.input_tokens || 0) + (claudeResponse.usage?.output_tokens || 0)
          }
        };
        break;

      case 'openai':
      case 'gpt-4':
      case 'gpt-4o':
      case 'gpt-3.5-turbo':
        const openai = new OpenAI({ apiKey: userApiKey });
        const openaiModel = provider === 'gpt-4o' ? 'gpt-4o' :
                           provider === 'gpt-4' ? 'gpt-4' :
                           provider === 'gpt-3.5-turbo' ? 'gpt-3.5-turbo' :
                           'gpt-4o';

        // Prepare messages with conversation history
        const openaiMessages = [
          { role: 'system', content: systemGuidelines }
        ];

        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            openaiMessages.push({
              role: msg.role,
              content: msg.content
            });
          });
        }

        // Add current user prompt
        openaiMessages.push({
          role: 'user',
          content: userPrompt
        });

        const openaiResponse = await openai.chat.completions.create({
          model: openaiModel,
          messages: openaiMessages,
          max_tokens: 8192,
          temperature: 0.7
        });

        const openaiText = openaiResponse.choices[0].message.content;

        response = {
          success: true,
          content: openaiText,
          model: openaiModel,
          usage: {
            prompt_tokens: openaiResponse.usage?.prompt_tokens || 0,
            completion_tokens: openaiResponse.usage?.completion_tokens || 0,
            total_tokens: openaiResponse.usage?.total_tokens || 0
          }
        };
        break;

      default:
        return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('AI request forwarding failed:', error);

    // Handle specific error types
    if (error.status === 401 || error.message?.includes('invalid_api_key') || error.message?.includes('API_KEY_INVALID')) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key',
        details: 'The provided API key is invalid or expired. Please check your key and try again.',
        needsKeyReconfiguration: true
      });
    }

    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit') || error.message?.includes('OVER_USAGE_LIMIT')) {
      return res.status(429).json({
        success: false,
        error: 'API quota exceeded',
        details: 'Your API key has exceeded its usage quota. Please check your provider\'s billing settings.',
        needsKeyReconfiguration: false
      });
    }

    res.status(500).json({
      success: false,
      error: 'AI request failed',
      details: error.message
    });
  }
}