import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { quickValidate, generateValidationReport } from '../../../lib/ai-code-validator.js';
import { saveConversation, addMessage, initializeAIConversationTables } from '../../../lib/ai-conversation-init.js';

// Initialize conversation tables on first load
initializeAIConversationTables();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    userPrompt,
    layoutAnalysis,
    iteration_type = 'new',
    context,
    imagePath,
    // User-provided API key and provider
    userApiKey,
    provider = 'gemini',
    conversationId,
    conversationHistory = []
  } = req.body;

  if (!userPrompt || !userApiKey) {
    return res.status(400).json({ 
      error: 'User prompt and API key are required' 
    });
  }

  try {
    // Add system guidelines to ensure compliance with page requirements
    const systemGuidelines = `You are an expert web developer creating pages for a SaaS platform. 

IMPORTANT REQUIREMENTS:
1. Generate complete, valid HTML, CSS, and JavaScript
2. Focus on design, styling, and user experience improvements
3. Use modern, responsive design principles
4. Include proper meta tags and SEO elements
5. Ensure accessibility compliance
6. Use semantic HTML elements
7. Generate production-ready code that works independently

${layoutAnalysis ? `DESIGN REFERENCE:\n${layoutAnalysis}\n\nApply this visual style and layout to your implementation.\n\n` : ''}

Now generate a complete, beautiful page based on the user's request.`;

    let result;
    let modelUsed = '';
    let usageData = null;

    // Call the appropriate AI provider based on user's key
    switch (provider.toLowerCase()) {
      case 'gemini':
      case 'gemini-pro':
        const genAI = new GoogleGenerativeAI(userApiKey);
        const geminiModel = genAI.getGenerativeModel({ 
          model: provider === 'gemini-pro' ? 'gemini-pro' : 'gemini-2.0-flash-exp' 
        });

        const geminiPrompt = `${systemGuidelines}\n\nUSER REQUEST:\n${userPrompt}`;

        const geminiResult = await geminiModel.generateContent(geminiPrompt);
        const geminiResponse = await geminiResult.response;
        const geminiText = geminiResponse.text();

        // Extract code blocks if present
        const htmlMatch = geminiText.match(/```html\n([\s\S]*?)```/);
        const cssMatch = geminiText.match(/```css\n([\s\S]*?)```/);
        const jsMatch = geminiText.match(/```javascript\n([\s\S]*?)```/);

        result = {
          html_code: htmlMatch ? htmlMatch[1] : '',
          css_code: cssMatch ? cssMatch[1] : '',
          js_code: jsMatch ? jsMatch[1] : '',
          full_content: geminiText
        };
        modelUsed = provider === 'gemini-pro' ? 'gemini-pro' : 'gemini-2.0-flash-exp';
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
        const messages = [];
        
        // Add system message
        messages.push({
          role: 'user',
          content: systemGuidelines
        });
        
        // Add conversation history if available
        if (conversationHistory && conversationHistory.length > 0) {
          conversationHistory.forEach(msg => {
            messages.push({
              role: msg.role,
              content: msg.content
            });
          });
        }
        
        // Add current user prompt
        messages.push({
          role: 'user',
          content: userPrompt
        });

        const claudeResponse = await anthropic.messages.create({
          model: claudeModel,
          max_tokens: 8192,
          temperature: 0.7,
          messages: messages
        });

        const claudeText = claudeResponse.content[0].text;

        // Extract code blocks if present
        const claudeHtmlMatch = claudeText.match(/```html\n([\s\S]*?)```/);
        const claudeCssMatch = claudeText.match(/```css\n([\s\S]*?)```/);
        const claudeJsMatch = claudeText.match(/```javascript\n([\s\S]*?)```/);

        result = {
          html_code: claudeHtmlMatch ? claudeHtmlMatch[1] : '',
          css_code: claudeCssMatch ? claudeCssMatch[1] : '',
          js_code: claudeJsMatch ? claudeJsMatch[1] : '',
          full_content: claudeText
        };
        modelUsed = claudeModel;
        usageData = {
          input_tokens: claudeResponse.usage?.input_tokens || 0,
          output_tokens: claudeResponse.usage?.output_tokens || 0,
          total_tokens: (claudeResponse.usage?.input_tokens || 0) + (claudeResponse.usage?.output_tokens || 0)
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

        // Extract code blocks if present
        const openaiHtmlMatch = openaiText.match(/```html\n([\s\S]*?)```/);
        const openaiCssMatch = openaiText.match(/```css\n([\s\S]*?)```/);
        const openaiJsMatch = openaiText.match(/```javascript\n([\s\S]*?)```/);

        result = {
          html_code: openaiHtmlMatch ? openaiHtmlMatch[1] : '',
          css_code: openaiCssMatch ? openaiCssMatch[1] : '',
          js_code: openaiJsMatch ? openaiJsMatch[1] : '',
          full_content: openaiText
        };
        modelUsed = openaiModel;
        usageData = {
          prompt_tokens: openaiResponse.usage?.prompt_tokens || 0,
          completion_tokens: openaiResponse.usage?.completion_tokens || 0,
          total_tokens: openaiResponse.usage?.total_tokens || 0
        };
        break;

      default:
        return res.status(400).json({ 
          error: `Unsupported provider: ${provider}` 
        });
    }

    // Apply validation to ensure code safety
    let validatedResult = result;
    let validationReport = null;
    
    try {
      const validation = await quickValidate({
        html: result.html_code,
        css: result.css_code,
        js: result.js_code,
        mode: 'permissive'
      });

      validationReport = generateValidationReport(validation);

      if (validation.sanitizedCode) {
        validatedResult = {
          html_code: validation.sanitizedCode.html || result.html_code,
          css_code: validation.sanitizedCode.css || result.css_code,
          js_code: validation.sanitizedCode.js || result.js_code,
          full_content: result.full_content
        };
      }
    } catch (validationError) {
      console.warn('Validation error (non-blocking):', validationError.message);
    }

    // Save conversation if provided
    if (conversationId) {
      await saveConversation({
        conversationId,
        userId: req.session?.user?.id || null,
        title: userPrompt.substring(0, 50) + (userPrompt.length > 50 ? '...' : ''),
        provider,
        metadata: {
          usingUserKey: true,
          model: modelUsed,
          tokens: usageData
        }
      });

      await addMessage(conversationId, {
        role: 'user',
        content: userPrompt,
        timestamp: new Date().toISOString()
      });

      await addMessage(conversationId, {
        role: 'assistant',
        content: validatedResult.html_code,
        timestamp: new Date().toISOString(),
        metadata: {
          code: validatedResult,
          model: modelUsed,
          tokens: usageData
        }
      });
    }

    res.status(200).json({
      success: true,
      conversationId,
      html_code: validatedResult.html_code,
      css_code: validatedResult.css_code,
      js_code: validatedResult.js_code,
      full_content: validatedResult.full_content,
      validation: validationReport,
      provider: provider,
      model: modelUsed,
      usage: usageData,
      usingUserKey: true
    });

  } catch (error) {
    console.error('AI request with user key failed:', error);

    // Handle specific error types
    if (error.status === 401 || error.message?.includes('invalid_api_key') || error.message?.includes('API_KEY_INVALID')) {
      return res.status(401).json({
        error: 'Invalid API key',
        details: 'The provided API key is invalid or expired. Please check your key and try again.',
        needsKeyReconfiguration: true
      });
    }

    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit') || error.message?.includes('OVER_USAGE_LIMIT')) {
      return res.status(429).json({
        error: 'API quota exceeded',
        details: 'Your API key has exceeded its usage quota. Please check your provider\'s billing settings.',
        needsKeyReconfiguration: false
      });
    }

    res.status(500).json({
      error: 'AI request failed',
      details: error.message,
      needsKeyReconfiguration: false
    });
  }
}