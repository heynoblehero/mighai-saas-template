import fs from 'fs';
import path from 'path';
const { withAdminAuth } = require('../../../lib/auth-middleware');

const RESERVED_PAGES_DIR = path.join(process.cwd(), 'data', 'reserved-pages');

function getReservedPage(pageType) {
  try {
    const filePath = path.join(RESERVED_PAGES_DIR, `${pageType}.json`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Error reading reserved page ${pageType}:`, error);
    return null;
  }
}

function getOriginalPagePath(pageType) {
  const pageMapping = {
    'customer-login': '/pages/subscribe/login.js',
    'customer-signup': '/pages/subscribe/signup.js',
    'customer-dashboard': '/pages/dashboard/index.js',
    'customer-profile': '/pages/dashboard/profile.js',
    'customer-billing': '/pages/dashboard/upgrade.js',
    'landing-page': '/pages/index.js',
    'password-reset': null // This doesn't exist yet
  };
  
  return pageMapping[pageType];
}

function generateMockData(pageType) {
  const mockData = {
    'customer-login': {
      user: null,
      redirectUrl: '/dashboard',
      messages: {
        welcome: 'Welcome back to your account',
        error: 'Invalid email or password'
      }
    },
    'customer-signup': {
      step: 'signup',
      user: null,
      messages: {
        welcome: 'Create your account to get started',
        otp_sent: 'Verification code sent to your email'
      }
    },
    'customer-dashboard': {
      user: {
        username: 'john_doe',
        email: 'john@example.com',
        role: 'subscriber',
        plan_name: 'Pro',
        price: 29,
        api_calls_used: 150,
        api_limit: 1000,
        page_views_used: 2500,
        page_view_limit: 10000
      },
      serviceConfig: {
        available: true,
        input_fields: [
          { name: 'query', type: 'text', label: 'Your Query', required: true },
          { name: 'format', type: 'select', label: 'Output Format', options: ['JSON', 'CSV', 'XML'] }
        ]
      },
      tasks: [
        {
          id: 1,
          task_id: 'task_abc123',
          status: 'completed',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          task_id: 'task_def456', 
          status: 'failed',
          error_message: 'Invalid input format',
          created_at: new Date().toISOString()
        }
      ]
    },
    'customer-profile': {
      user: {
        username: 'john_doe',
        email: 'john@example.com',
        role: 'subscriber'
      }
    },
    'customer-billing': {
      currentUser: {
        username: 'john_doe',
        plan_name: 'Starter',
        api_calls_used: 150,
        api_limit: 500,
        page_views_used: 1200,
        page_view_limit: 5000
      },
      plans: [
        {
          id: 1,
          name: 'pro',
          price: 29,
          api_limit: 1000,
          page_view_limit: 10000,
          is_active: true
        },
        {
          id: 2,
          name: 'enterprise',
          price: 99,
          api_limit: 5000,
          page_view_limit: 50000,
          is_active: true
        }
      ]
    },
    'password-reset': {
      step: 'email',
      messages: {
        instruction: 'Enter your email address and we\'ll send you a reset link'
      }
    },
    'landing-page': {
      platform: {
        name: 'Your SaaS Platform',
        tagline: 'Deploy in minutes, scale forever',
        description: 'Universal deployment system for modern applications'
      },
      features: [
        { title: 'One-Click Deploy', description: 'Deploy with a single command' },
        { title: 'Auto SSL', description: 'Automatic SSL certificate generation' },
        { title: 'Multi-OS Support', description: 'Works on Ubuntu, CentOS, Fedora' }
      ],
      deployment: {
        command: 'curl -sSL https://your-domain.com/deploy.sh | bash -s -- --domain=your-domain.com --email=admin@your-domain.com'
      }
    }
  };

  return mockData[pageType] || {};
}

function generateDefaultHTML(pageType, mockData) {
  const baseStyles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
      .btn { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; border: none; cursor: pointer; }
      .btn:hover { background: #2563eb; }
      .card { background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 16px 0; }
      .form-group { margin-bottom: 16px; }
      .form-group label { display: block; margin-bottom: 4px; font-weight: 500; }
      .form-group input, .form-group textarea { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; }
      .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 80px 0; }
      .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; padding: 60px 0; }
      .nav { background: white; padding: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .nav-content { display: flex; justify-content: space-between; align-items: center; }
    </style>
  `;

  const templates = {
    'customer-login': `
      <!DOCTYPE html>
      <html><head><title>Login</title>${baseStyles}</head><body>
        <div class="container" style="max-width: 400px; margin-top: 100px;">
          <div class="card">
            <h2 style="text-align: center; margin-bottom: 24px;">Welcome Back</h2>
            <form>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" value="${mockData.user?.email || ''}" />
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" placeholder="Enter your password" />
              </div>
              <button type="submit" class="btn" style="width: 100%;">Sign In</button>
            </form>
            <p style="text-align: center; margin-top: 16px;">
              Don't have an account? <a href="/subscribe/signup">Sign up</a>
            </p>
          </div>
        </div>
      </body></html>
    `,
    'customer-signup': `
      <!DOCTYPE html>
      <html><head><title>Sign Up</title>${baseStyles}</head><body>
        <div class="container" style="max-width: 400px; margin-top: 80px;">
          <div class="card">
            <h2 style="text-align: center; margin-bottom: 24px;">Create Account</h2>
            <form>
              <div class="form-group">
                <label>Username</label>
                <input type="text" placeholder="Choose a username" />
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" />
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" placeholder="Create a password" />
              </div>
              <div class="form-group">
                <label>Confirm Password</label>
                <input type="password" placeholder="Confirm your password" />
              </div>
              <button type="submit" class="btn" style="width: 100%;">Create Account</button>
            </form>
            <p style="text-align: center; margin-top: 16px;">
              Already have an account? <a href="/subscribe/login">Sign in</a>
            </p>
          </div>
        </div>
      </body></html>
    `,
    'customer-dashboard': `
      <!DOCTYPE html>
      <html><head><title>Dashboard</title>${baseStyles}</head><body>
        <div class="nav">
          <div class="container">
            <div class="nav-content">
              <h3>Dashboard</h3>
              <span>Welcome, ${mockData.user?.username || 'User'}</span>
            </div>
          </div>
        </div>
        <div class="container" style="padding: 40px 20px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 32px;">
            <div class="card" style="text-align: center;">
              <h4>Current Plan</h4>
              <div style="font-size: 24px; font-weight: bold; margin: 8px 0; color: #3b82f6;">${mockData.user?.plan_name || 'Free'}</div>
              <p>$${mockData.user?.price || 0}/month</p>
            </div>
            <div class="card" style="text-align: center;">
              <h4>API Calls</h4>
              <div style="font-size: 24px; font-weight: bold; margin: 8px 0;">${mockData.user?.api_calls_used || 0}/${mockData.user?.api_limit || 100}</div>
              <div style="width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
                <div style="width: ${((mockData.user?.api_calls_used || 0) / (mockData.user?.api_limit || 100)) * 100}%; height: 100%; background: #3b82f6;"></div>
              </div>
            </div>
          </div>
          <div class="card">
            <h3 style="margin-bottom: 16px;">Task Management</h3>
            <div style="overflow-x: auto;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f9fafb;">
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Task ID</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Status</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb;">Created</th>
                  </tr>
                </thead>
                <tbody>
                  ${(mockData.tasks || []).map(task => `
                    <tr>
                      <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${task.task_id}</td>
                      <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">
                        <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; ${task.status === 'completed' ? 'background: #dcfce7; color: #166534;' : task.status === 'failed' ? 'background: #fef2f2; color: #dc2626;' : 'background: #fef3c7; color: #d97706;'}">${task.status}</span>
                      </td>
                      <td style="padding: 12px; border-bottom: 1px solid #f3f4f6;">${new Date(task.created_at).toLocaleDateString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </body></html>
    `,
    'customer-profile': `
      <!DOCTYPE html>
      <html><head><title>Profile</title>${baseStyles}</head><body>
        <div class="nav">
          <div class="container">
            <div class="nav-content">
              <h3>Profile Settings</h3>
              <a href="/dashboard">← Back to Dashboard</a>
            </div>
          </div>
        </div>
        <div class="container" style="max-width: 600px; padding: 40px 20px;">
          <div class="card">
            <h3 style="margin-bottom: 24px;">Account Information</h3>
            <form>
              <div class="form-group">
                <label>Username</label>
                <input type="text" value="${mockData.user?.username || ''}" />
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" value="${mockData.user?.email || ''}" />
              </div>
              <div class="form-group">
                <label>Account Type</label>
                <input type="text" value="${mockData.user?.role || 'subscriber'}" readonly style="background: #f9fafb;" />
              </div>
              <button type="submit" class="btn">Save Changes</button>
            </form>
          </div>
        </div>
      </body></html>
    `,
    'customer-billing': `
      <!DOCTYPE html>
      <html><head><title>Billing & Upgrade</title>${baseStyles}</head><body>
        <div class="nav">
          <div class="container">
            <div class="nav-content">
              <h3>Billing & Upgrade</h3>
              <a href="/dashboard">← Back to Dashboard</a>
            </div>
          </div>
        </div>
        <div class="container" style="padding: 40px 20px;">
          <div class="card">
            <h3>Current Plan</h3>
            <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
              <div>
                <div style="font-size: 18px; font-weight: bold;">${mockData.currentUser?.plan_name || 'Free'} Plan</div>
                <div style="color: #6b7280;">API Usage: ${mockData.currentUser?.api_calls_used || 0}/${mockData.currentUser?.api_limit || 100}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">$${(mockData.plans?.[0]?.price || 0)}</div>
                <div style="color: #6b7280;">/month</div>
              </div>
            </div>
          </div>
          <h3 style="margin: 32px 0 16px;">Available Plans</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
            ${(mockData.plans || []).map(plan => `
              <div class="card" style="text-align: center; ${plan.name === 'pro' ? 'border: 2px solid #3b82f6;' : ''}">
                <h4 style="margin-bottom: 8px; text-transform: capitalize;">${plan.name}</h4>
                <div style="font-size: 32px; font-weight: bold; margin: 16px 0; color: #3b82f6;">$${plan.price}</div>
                <div style="color: #6b7280; margin-bottom: 24px;">/month</div>
                <ul style="text-align: left; margin-bottom: 24px; padding-left: 20px;">
                  <li>${plan.api_limit.toLocaleString()} API calls/month</li>
                  <li>${plan.page_view_limit.toLocaleString()} page views/month</li>
                  <li>Priority support</li>
                </ul>
                <button class="btn" style="width: 100%;">Upgrade to ${plan.name}</button>
              </div>
            `).join('')}
          </div>
        </div>
      </body></html>
    `,
    'landing-page': `
      <!DOCTYPE html>
      <html><head><title>${mockData.platform?.name || 'SaaS Platform'}</title>${baseStyles}</head><body>
        <div class="hero">
          <div class="container">
            <h1 style="font-size: 48px; margin-bottom: 16px;">${mockData.platform?.name || 'Your SaaS Platform'}</h1>
            <p style="font-size: 20px; margin-bottom: 32px; opacity: 0.9;">${mockData.platform?.tagline || 'Deploy in minutes, scale forever'}</p>
            <div style="margin-bottom: 32px;">
              <a href="/admin" class="btn" style="margin: 8px;">Admin Panel</a>
              <a href="/subscribe/signup" class="btn" style="margin: 8px; background: transparent; border: 2px solid white;">Get Started</a>
            </div>
          </div>
        </div>
        <div class="container">
          <div style="text-align: center; padding: 60px 0;">
            <h2 style="margin-bottom: 16px;">Deployment Instructions</h2>
            <p style="margin-bottom: 24px; color: #6b7280;">Deploy your application with a single command</p>
            <div style="background: #1f2937; color: white; padding: 20px; border-radius: 8px; font-family: 'Monaco', monospace; text-align: left; overflow-x: auto; margin: 24px 0;">
              <code>${mockData.deployment?.command || 'curl -sSL https://your-domain.com/deploy.sh | bash -s -- --domain=your-domain.com --email=admin@your-domain.com'}</code>
            </div>
            <button class="btn" onclick="navigator.clipboard.writeText('${mockData.deployment?.command || 'curl -sSL https://your-domain.com/deploy.sh | bash'}')">Copy Command</button>
          </div>
          <div class="features">
            ${(mockData.features || []).map(feature => `
              <div class="card" style="text-align: center;">
                <h3 style="margin-bottom: 12px;">${feature.title}</h3>
                <p style="color: #6b7280;">${feature.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </body></html>
    `,
    'password-reset': `
      <!DOCTYPE html>
      <html><head><title>Reset Password</title>${baseStyles}</head><body>
        <div class="container" style="max-width: 400px; margin-top: 100px;">
          <div class="card">
            <h2 style="text-align: center; margin-bottom: 24px;">Reset Password</h2>
            <p style="text-align: center; margin-bottom: 24px; color: #6b7280;">${mockData.messages?.instruction || 'Enter your email to reset your password'}</p>
            <form>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email address" />
              </div>
              <button type="submit" class="btn" style="width: 100%;">Send Reset Link</button>
            </form>
            <p style="text-align: center; margin-top: 16px;">
              Remember your password? <a href="/subscribe/login">Sign in</a>
            </p>
          </div>
        </div>
      </body></html>
    `
  };

  return templates[pageType] || `
    <!DOCTYPE html>
    <html><head><title>Page Preview</title>${baseStyles}</head><body>
      <div class="container" style="padding: 40px 20px;">
        <div class="card" style="text-align: center;">
          <h2>Page Type: ${pageType}</h2>
          <p>This is a default preview for the ${pageType} page type.</p>
          <p style="color: #6b7280; margin-top: 16px;">Customize this page using the AI page builder to create your unique design.</p>
        </div>
      </div>
    </body></html>
  `;
}

function injectMockData(htmlCode, mockData) {
  // For custom HTML, inject mock data by replacing placeholder patterns
  return htmlCode
    .replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = path.split('.').reduce((obj, key) => obj?.[key], mockData);
      return value !== undefined ? value : match;
    });
}

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageType, mode = 'custom' } = req.query;

  if (!pageType) {
    return res.status(400).json({ error: 'pageType is required' });
  }

  try {
    let htmlContent = '';
    let mockData = generateMockData(pageType);

    if (mode === 'custom') {
      // Get customized version if it exists, otherwise show default
      const reservedPage = getReservedPage(pageType);
      if (reservedPage && reservedPage.html_code) {
        htmlContent = reservedPage.html_code;
      } else {
        // No customization exists, show default template
        htmlContent = generateDefaultHTML(pageType, mockData);
      }
    } else if (mode === 'original') {
      // Show the default template as the "original" version
      htmlContent = generateDefaultHTML(pageType, mockData);
    }

    // Inject mock data for realistic preview
    const finalHtml = injectMockData(htmlContent, mockData);

    // Return HTML for iframe display
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(finalHtml);

  } catch (error) {
    console.error('Preview generation failed:', error);
    res.status(500).json({ error: 'Failed to generate preview: ' + error.message });
  }
}

export default withAdminAuth(handler);