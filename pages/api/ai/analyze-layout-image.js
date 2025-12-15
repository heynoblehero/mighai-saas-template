import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imagePath, userPrompt } = req.body;

  if (!imagePath) {
    return res.status(400).json({ error: 'Image path is required' });
  }

  try {
    // Read AI settings
    const settingsPath = path.join(process.cwd(), 'data', 'ai-settings.json');
    let settings = {};

    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    }

    if (!settings.claude_api_key) {
      return res.status(500).json({
        error: 'Claude API key not configured. Please set it up in AI Settings.'
      });
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: settings.claude_api_key,
    });

    // Read the image file
    const fullImagePath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));

    if (!fs.existsSync(fullImagePath)) {
      return res.status(404).json({ error: 'Image file not found' });
    }

    const imageBuffer = fs.readFileSync(fullImagePath);
    const imageBase64 = imageBuffer.toString('base64');

    // Determine media type
    const ext = path.extname(fullImagePath).toLowerCase();
    const mediaTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const mediaType = mediaTypeMap[ext] || 'image/jpeg';

    // Analyze the image with Claude Vision
    const analysisMessage = await anthropic.messages.create({
      model: settings.claude_model || 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `You are an expert web designer analyzing a layout image. Please provide a comprehensive description of this design/layout image.

${userPrompt ? `User's context: ${userPrompt}\n\n` : ''}

Analyze and describe:
1. **Overall Layout Structure**: Describe the main layout (header, hero, sections, footer, etc.)
2. **Color Scheme**: Primary colors, accents, backgrounds
3. **Typography**: Font styles, sizes, hierarchy
4. **Sections & Components**: List all visible sections (hero, features, pricing, testimonials, etc.)
5. **Design Style**: Modern, minimal, corporate, creative, etc.
6. **Interactive Elements**: Buttons, forms, CTAs, navigation
7. **Spacing & Layout**: Grid system, spacing, alignment
8. **Special Effects**: Animations, gradients, shadows, or unique design elements
9. **Content Structure**: Headings, body text, lists, cards

Provide a detailed description that a developer can use to recreate this exact layout.`
            }
          ],
        },
      ],
    });

    const analysisText = analysisMessage.content[0].text;

    // Update AI usage tracking
    updateAIUsage(settings, analysisMessage.usage);

    res.status(200).json({
      success: true,
      analysis: analysisText,
      usage: analysisMessage.usage
    });

  } catch (error) {
    console.error('Layout analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze layout image',
      details: error.message
    });
  }
}

function updateAIUsage(settings, usage) {
  try {
    const usagePath = path.join(process.cwd(), 'data', 'ai-usage.json');
    let usageData = { month: new Date().toISOString().slice(0, 7), total_tokens: 0, requests: 0 };

    if (fs.existsSync(usagePath)) {
      usageData = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    if (usageData.month !== currentMonth) {
      usageData = { month: currentMonth, total_tokens: 0, requests: 0 };
    }

    usageData.total_tokens += (usage.input_tokens + usage.output_tokens);
    usageData.requests += 1;

    fs.writeFileSync(usagePath, JSON.stringify(usageData, null, 2));
  } catch (error) {
    console.error('Error updating AI usage:', error);
  }
}
