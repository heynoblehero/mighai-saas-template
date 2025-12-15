import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userPrompt, layoutAnalysis, iteration_type = 'new', context, imagePath } = req.body;

  if (!userPrompt) {
    return res.status(400).json({ error: 'User prompt is required' });
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
        error: 'Claude API key not configured'
      });
    }

    const anthropic = new Anthropic({
      apiKey: settings.claude_api_key,
    });

    // Prepare image data if provided
    let imageData = null;
    if (imagePath) {
      try {
        const fullImagePath = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));
        if (fs.existsSync(fullImagePath)) {
          const imageBuffer = fs.readFileSync(fullImagePath);
          const imageBase64 = imageBuffer.toString('base64');
          const ext = path.extname(fullImagePath).toLowerCase();
          const mediaTypeMap = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
          };
          imageData = {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaTypeMap[ext] || 'image/jpeg',
              data: imageBase64
            }
          };
        }
      } catch (err) {
        console.error('Error loading image:', err);
      }
    }

    // Step 1: Planning Phase - AI thinks through the page structure
    console.log('🧠 Step 1: Planning page structure...');

    // Build planning message content
    const planningContent = [];
    if (imageData) {
      planningContent.push(imageData);
    }
    planningContent.push({
      type: 'text',
      text: `You are an expert web designer and developer. You need to plan a comprehensive web page.

${imageData ? 'LAYOUT REFERENCE IMAGE: See the attached image for visual reference.\n\n' : ''}${layoutAnalysis ? `LAYOUT ANALYSIS:\n${layoutAnalysis}\n\n` : ''}

USER REQUEST:
${userPrompt}

${iteration_type === 'modify' && context ? `CURRENT PAGE CONTEXT:\nHTML: ${context.html?.substring(0, 500)}...\nCSS: ${context.css?.substring(0, 500)}...\n\n` : ''}

Please think step-by-step and create a comprehensive plan for this page:

1. **Page Purpose & Goal**: What is the main purpose of this page?
2. **Target Audience**: Who is this page for?
3. **Sections Needed**: List all sections that should be included (e.g., Hero, Features, Testimonials, Pricing, CTA, Footer)
4. **Design Style**: What visual style fits best? (Modern, Minimal, Corporate, Creative, etc.)
5. **Color Palette**: Suggest a cohesive color scheme (primary, secondary, accent, backgrounds)
6. **Typography**: Font choices and hierarchy
7. **Key Interactions**: Buttons, forms, animations, hover effects
8. **Layout Structure**: Grid/flexbox approach, spacing system
9. **Special Features**: Any unique elements, animations, or effects

Be thorough and detailed in your plan. This will guide the actual implementation.`
    });

    const planningResponse = await anthropic.messages.create({
      model: settings.claude_model || 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: planningContent
      }],
    });

    const plan = planningResponse.content[0].text;
    console.log('✅ Planning complete');

    // Step 2: Generation Phase - Create the actual code
    console.log('🎨 Step 2: Generating page code...');

    const generationPrompt = `You are an expert frontend developer. Based on the following plan, create a complete, production-ready web page.

PLAN:
${plan}

REQUIREMENTS:
1. Generate complete, semantic HTML
2. Create beautiful, modern CSS with:
   - Responsive design (mobile-first)
   - Smooth animations and transitions
   - Proper spacing and typography
   - Professional color scheme
   - Modern effects (gradients, shadows, hover states)
3. Add interactive JavaScript for:
   - Smooth scrolling
   - Animations on scroll
   - Form validation
   - Interactive elements
4. Make it visually stunning and professional
5. Include ALL sections mentioned in the plan
6. Use best practices (accessibility, SEO, performance)

IMPORTANT OUTPUT FORMAT:
Your response must contain THREE code blocks in this EXACT format:

\`\`\`html
<!-- Complete HTML here -->
\`\`\`

\`\`\`css
/* Complete CSS here */
\`\`\`

\`\`\`javascript
// Complete JavaScript here (if needed)
\`\`\`

Generate a complete, beautiful, modern page now!`;

    const generationResponse = await anthropic.messages.create({
      model: settings.claude_model || 'claude-sonnet-4-5-20250929',
      max_tokens: 8000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: generationPrompt
      }],
    });

    const generatedCode = generationResponse.content[0].text;

    // Parse the generated code blocks
    const htmlMatch = generatedCode.match(/```html\n([\s\S]*?)```/);
    const cssMatch = generatedCode.match(/```css\n([\s\S]*?)```/);
    const jsMatch = generatedCode.match(/```javascript\n([\s\S]*?)```/);

    const html = htmlMatch ? htmlMatch[1].trim() : '';
    const css = cssMatch ? cssMatch[1].trim() : '';
    const js = jsMatch ? jsMatch[1].trim() : '';

    if (!html && !css) {
      throw new Error('Failed to extract code from AI response');
    }

    // Update AI usage
    const totalUsage = {
      input_tokens: planningResponse.usage.input_tokens + generationResponse.usage.input_tokens,
      output_tokens: planningResponse.usage.output_tokens + generationResponse.usage.output_tokens,
    };
    updateAIUsage(settings, totalUsage);

    console.log('✅ Page generation complete');

    res.status(200).json({
      success: true,
      plan: plan,
      html_code: html,
      css_code: css,
      js_code: js,
      usage: totalUsage,
      message: 'Page generated successfully with comprehensive planning'
    });

  } catch (error) {
    console.error('❌ Page generation error:', error);
    res.status(500).json({
      error: 'Failed to generate page',
      details: error.message
    });
  }
}

function updateAIUsage(settings, usage) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const usagePath = path.join(dataDir, 'ai-usage.json');
    let usageData = {
      month: new Date().toISOString().slice(0, 7),
      total_tokens: 0,
      requests: 0
    };

    if (fs.existsSync(usagePath)) {
      try {
        usageData = JSON.parse(fs.readFileSync(usagePath, 'utf8'));
      } catch (e) {
        console.log('Creating new usage data');
      }
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
