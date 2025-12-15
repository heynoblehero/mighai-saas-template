import fs from 'fs';
import path from 'path';

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

function injectInteractivity(htmlCode, pageType) {
  // Inject necessary JavaScript for form functionality
  const interactivityScripts = {
    'customer-login': `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        const form = document.getElementById('loginForm') || document.querySelector('form');
        if (form) {
          form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const data = {
              email: formData.get('email'),
              password: formData.get('password')
            };
            
            try {
              const response = await fetch('/api/subscribe/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
              });
              
              const result = await response.json();
              if (response.ok) {
                window.location.href = '/dashboard';
              } else {
                const errorEl = document.querySelector('.error-message') || document.createElement('div');
                errorEl.className = 'error-message';
                errorEl.textContent = result.error || 'Login failed';
                form.appendChild(errorEl);
              }
            } catch (err) {
              const errorEl = document.querySelector('.error-message') || document.createElement('div');
              errorEl.className = 'error-message';
              errorEl.textContent = 'Network error. Please try again.';
              form.appendChild(errorEl);
            }
          });
        }
      });
    </script>`,
    
    'customer-signup': `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        let step = 'signup';
        const signupForm = document.getElementById('signupForm') || document.querySelector('form');
        const otpForm = document.getElementById('otpForm');
        
        if (signupForm) {
          signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(signupForm);
            const data = {
              username: formData.get('username'),
              email: formData.get('email'),
              password: formData.get('password')
            };
            
            if (data.password !== formData.get('confirmPassword')) {
              showError('Passwords do not match');
              return;
            }
            
            try {
              const response = await fetch('/api/subscribe/send-signup-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              
              const result = await response.json();
              if (response.ok) {
                step = 'verify';
                showOTPForm(data.email);
              } else {
                showError(result.error || 'Signup failed');
              }
            } catch (err) {
              showError('Network error. Please try again.');
            }
          });
        }
        
        function showError(message) {
          const errorEl = document.querySelector('.error-message') || document.createElement('div');
          errorEl.className = 'error-message';
          errorEl.textContent = message;
          if (!document.querySelector('.error-message')) {
            signupForm.appendChild(errorEl);
          }
        }
        
        function showOTPForm(email) {
          if (otpForm) {
            otpForm.style.display = 'block';
            signupForm.style.display = 'none';
          }
        }
      });
    </script>`
  };

  // Inject the appropriate script for this page type
  if (interactivityScripts[pageType]) {
    // Insert script before closing body tag, or at the end if no body tag
    if (htmlCode.includes('</body>')) {
      htmlCode = htmlCode.replace('</body>', interactivityScripts[pageType] + '</body>');
    } else {
      htmlCode += interactivityScripts[pageType];
    }
  }

  return htmlCode;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageType } = req.query;

  if (!pageType) {
    return res.status(400).json({ error: 'pageType is required' });
  }

  try {
    // Get the customized page
    const reservedPage = getReservedPage(pageType);
    
    if (!reservedPage || (!reservedPage.html_code && !reservedPage.content)) {
      return res.status(404).json({ error: 'No customized version found' });
    }

    // Get HTML content (support both html_code and content properties)
    const htmlContent = reservedPage.html_code || reservedPage.content;
    
    // Inject necessary JavaScript for functionality
    let finalHtml = injectInteractivity(htmlContent, pageType);

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    // Send the customized HTML
    res.status(200).send(finalHtml);

  } catch (error) {
    console.error('Error serving reserved page:', error);
    res.status(500).json({ error: 'Failed to serve customized page' });
  }
}