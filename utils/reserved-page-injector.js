// Enhanced JavaScript injection for reserved pages
export function injectPageFunctionality(htmlCode, pageType) {
  let enhancedHtml = htmlCode;
  
  // Common utilities that all pages might need
  const commonUtils = `
  <script>
    // Utility functions
    function showError(message, formElement) {
      if (!formElement) {
        console.error('showError: formElement is undefined');
        alert(message); // Fallback to alert
        return;
      }
      let errorEl = formElement.querySelector('.error-message');
      if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        errorEl.style.cssText = 'color: red; margin: 10px 0; padding: 10px; background: rgba(255,0,0,0.1); border-radius: 4px; border: 1px solid rgba(255,0,0,0.3);';
        const submitBtn = formElement.querySelector('button[type="submit"]');
        if (submitBtn) {
          formElement.insertBefore(errorEl, submitBtn);
        } else {
          formElement.appendChild(errorEl);
        }
      }
      errorEl.textContent = message;
      errorEl.scrollIntoView({ behavior: 'smooth' });
    }

    function showSuccess(message, formElement) {
      if (!formElement) {
        console.error('showSuccess: formElement is undefined');
        alert(message); // Fallback to alert
        return;
      }
      let successEl = formElement.querySelector('.success-message');
      if (!successEl) {
        successEl = document.createElement('div');
        successEl.className = 'success-message';
        successEl.style.cssText = 'color: green; margin: 10px 0; padding: 10px; background: rgba(0,255,0,0.1); border-radius: 4px; border: 1px solid rgba(0,255,0,0.3);';
        const submitBtn = formElement.querySelector('button[type="submit"]');
        if (submitBtn) {
          formElement.insertBefore(successEl, submitBtn);
        } else {
          formElement.appendChild(successEl);
        }
      }
      successEl.textContent = message;
      successEl.scrollIntoView({ behavior: 'smooth' });
    }

    function setLoading(button, isLoading) {
      // Comprehensive check to ensure button is a valid DOM element
      if (!button || typeof button !== 'object' || !button.getAttribute) {
        console.warn('setLoading: invalid button element', button);
        return;
      }

      if (isLoading) {
        button.disabled = true;
        // Store original text using setAttribute to avoid dataset issues
        if (!button.hasAttribute('data-original-text')) {
          button.setAttribute('data-original-text', button.textContent);
        }
        button.textContent = 'Loading...';
        button.style.opacity = '0.6';
      } else {
        button.disabled = false;
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
          button.textContent = originalText;
        } else {
          // Fallback to common button texts if original text is lost
          button.textContent = button.textContent.replace('Loading...', 'Submit');
        }
        button.style.opacity = '1';
      }
    }

    function clearMessages(formElement) {
      if (!formElement) return; // Guard against undefined
      const errorEl = formElement.querySelector('.error-message');
      const successEl = formElement.querySelector('.success-message');
      if (errorEl) errorEl.remove();
      if (successEl) successEl.remove();
    }
  </script>`;

  // Page-specific functionality
  const pageScripts = {
    'customer-login': `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Find the login form by ID or by being the first form
        const form = document.getElementById('loginForm') || 
                     document.querySelector('form[action*="login"]') || 
                     document.querySelector('form');
        
        if (!form) {
          console.warn('No login form found on page');
          return;
        }

        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          clearMessages(form);

          const submitButton = form.querySelector('button[type="submit"]') ||
                               form.querySelector('button') ||
                               e.submitter;

          if (submitButton) {
            setLoading(submitButton, true);
          }

          // Get form data
          const formData = new FormData(form);
          const email = formData.get('email') || formData.get('Email') || formData.get('EMAIL');
          const password = formData.get('password') || formData.get('Password') || formData.get('PASSWORD');

          if (!email || !password) {
            showError('Please fill in both email and password', form);
            if (submitButton) setLoading(submitButton, false);
            return;
          }

          try {
            const response = await fetch('/api/subscribe/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
              credentials: 'include'
            });

            const result = await response.json();
            if (response.ok) {
              showSuccess('Login successful! Redirecting...', form);
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            } else {
              showError(result.error || 'Login failed', form);
            }
          } catch (err) {
            showError('Network error. Please try again.', form);
          } finally {
            if (submitButton) setLoading(submitButton, false);
          }
        });
        
        // Handle "Admin Login" links
        const adminLinks = document.querySelectorAll('a[href*="admin"]');
        adminLinks.forEach(link => {
          if (link.href.includes('admin') && !link.href.includes('/admin/login')) {
            link.href = '/admin/login';
          }
        });
      });
    </script>`,

    'customer-signup': `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        let currentStep = 'signup';
        
        const signupForm = document.getElementById('signupForm') || 
                          document.querySelector('form[action*="signup"]') || 
                          document.querySelector('form');
        const otpForm = document.getElementById('otpForm');
        
        if (!signupForm) {
          console.warn('No signup form found on page');
          return;
        }

        signupForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          clearMessages(signupForm);

          const submitButton = signupForm.querySelector('button[type="submit"]') ||
                               signupForm.querySelector('button') ||
                               e.submitter;

          if (submitButton) {
            setLoading(submitButton, true);
          }

          const formData = new FormData(signupForm);
          const username = formData.get('username') || formData.get('Username');
          const email = formData.get('email') || formData.get('Email');
          const password = formData.get('password') || formData.get('Password');
          const confirmPassword = formData.get('confirmPassword') || formData.get('confirm_password');

          if (!username || !email || !password) {
            showError('Please fill in all required fields', signupForm);
            if (submitButton) setLoading(submitButton, false);
            return;
          }

          if (confirmPassword && password !== confirmPassword) {
            showError('Passwords do not match', signupForm);
            if (submitButton) setLoading(submitButton, false);
            return;
          }

          try {
            const response = await fetch('/api/subscribe/send-signup-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username, email, password })
            });

            const result = await response.json();
            if (response.ok) {
              // Check if OTP should be skipped
              if (result.skipOTP) {
                // Email not configured, proceed with direct signup
                showSuccess('Email verification skipped. Creating your account...', signupForm);

                // Create account without OTP
                try {
                  const signupResponse = await fetch('/api/subscribe/verify-signup-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password, skipOTP: true })
                  });

                  const signupResult = await signupResponse.json();
                  if (signupResponse.ok) {
                    showSuccess('Account created successfully! Redirecting to login...', signupForm);
                    setTimeout(() => {
                      window.location.href = '/login?message=Account created successfully! Please sign in.';
                    }, 2000);
                  } else {
                    showError(signupResult.error || 'Signup failed', signupForm);
                  }
                } catch (signupErr) {
                  showError('Network error during signup. Please try again.', signupForm);
                }
              } else {
                // Normal flow - show OTP step
                currentStep = 'verify';
                showOTPStep(email);
              }
            } else {
              showError(result.error || 'Signup failed', signupForm);
            }
          } catch (err) {
            showError('Network error. Please try again.', signupForm);
          } finally {
            if (submitButton) setLoading(submitButton, false);
          }
        });
        
        // Handle OTP form if present
        if (otpForm) {
          otpForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitButton = otpForm.querySelector('button[type="submit"]') ||
                                otpForm.querySelector('button') ||
                                e.submitter;

            if (submitButton) {
              setLoading(submitButton, true);
            }

            const formData = new FormData(otpForm);
            const otp = formData.get('otp') || formData.get('OTP');

            const signupData = new FormData(signupForm);

            try {
              const response = await fetch('/api/subscribe/verify-signup-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  username: signupData.get('username'),
                  email: signupData.get('email'),
                  password: signupData.get('password'),
                  otp: otp
                })
              });

              const result = await response.json();
              if (response.ok) {
                showSuccess('Account created successfully! Redirecting to login...', otpForm);
                setTimeout(() => {
                  window.location.href = '/login?message=Account created successfully! Please sign in.';
                }, 2000);
              } else {
                showError(result.error || 'Invalid verification code', otpForm);
              }
            } catch (err) {
              showError('Network error. Please try again.', otpForm);
            } finally {
              if (submitButton) setLoading(submitButton, false);
            }
          });
        }
        
        function showOTPStep(email) {
          if (otpForm) {
            otpForm.style.display = 'block';
            signupForm.style.display = 'none';
          } else {
            // If no separate OTP form, show message
            showSuccess(\`Verification code sent to \${email}. Check your email and enter the code above.\`, signupForm);
          }
        }
      });
    </script>`,

    'customer-dashboard': `
    <script>
      // Fix navigation function to use correct dashboard routes
      window.navigation = function(page) {
        try {
          // Map page names to correct routes
          const routeMap = {
            'profile': '/dashboard/profile',
            'settings': '/dashboard/profile', // Map settings to profile for now
            'billing': '/dashboard/upgrade',
            'upgrade': '/dashboard/upgrade'
          };
          
          const route = routeMap[page] || \`/dashboard/\${page}\`;
          window.location.href = route;
        } catch (error) {
          console.error('Navigation error:', error);
        }
      };
      
      // Add enhanced dashboard functionality
      document.addEventListener('DOMContentLoaded', async function() {
        try {
          // Fetch user data
          const response = await fetch('/api/subscribe/me');
          if (response.ok) {
            const data = await response.json();
            populateUserData(data.user);
          } else {
            // Redirect to login if not authenticated
            window.location.href = '/login';
          }
        } catch (err) {
          console.error('Failed to load user data:', err);
        }
        
        function populateUserData(user) {
          // Replace placeholder data with real user data
          const usernameElements = document.querySelectorAll('[data-user="username"], .username, .user-name, #userName');
          const emailElements = document.querySelectorAll('[data-user="email"], .email, .user-email, #userEmail');
          const planElements = document.querySelectorAll('[data-user="plan"], .plan-name, #planDetails');
          const apiUsageElements = document.querySelectorAll('[data-user="api-usage"], .api-usage');
          const apiLimitElements = document.querySelectorAll('[data-user="api-limit"], .api-limit');
          
          usernameElements.forEach(el => el.textContent = user.username || 'User');
          emailElements.forEach(el => el.textContent = user.email || '');
          planElements.forEach(el => {
            if (el.id === 'planDetails') {
              el.innerHTML = \`
                <p>Plan: \${user.plan_name || 'Free'}</p>
                <p>Status: \${user.subscription_status || 'Active'}</p>
                <p>API Calls Used: \${user.api_calls_used || '0'}</p>
              \`;
            } else {
              el.textContent = user.plan_name || 'Free';
            }
          });
          apiUsageElements.forEach(el => el.textContent = user.api_calls_used || '0');
          apiLimitElements.forEach(el => el.textContent = user.api_limit || '0');
          
          // Update progress bars
          const progressBars = document.querySelectorAll('.progress-fill, [data-progress]');
          progressBars.forEach(bar => {
            const usage = user.api_calls_used || 0;
            const limit = user.api_limit || 100;
            const percentage = Math.min((usage / limit) * 100, 100);
            
            if (bar.style !== undefined) {
              bar.style.width = percentage + '%';
            }
            bar.setAttribute('data-progress', percentage);
          });
        }
      });
    </script>`,

    'customer-profile': `
    <script>
      document.addEventListener('DOMContentLoaded', async function() {
        const form = document.getElementById('profileForm') || 
                     document.querySelector('form[action*="profile"]') || 
                     document.querySelector('form');
        
        if (!form) {
          console.warn('No profile form found on page');
          return;
        }
        
        // Load current user data
        try {
          const response = await fetch('/api/subscribe/me');
          if (response.ok) {
            const data = await response.json();
            populateForm(data.user);
          }
        } catch (err) {
          console.error('Failed to load user data:', err);
        }
        
        function populateForm(user) {
          const usernameInput = form.querySelector('input[name="username"], input[name="Username"]');
          const emailInput = form.querySelector('input[name="email"], input[name="Email"]');
          
          if (usernameInput) usernameInput.value = user.username || '';
          if (emailInput) emailInput.value = user.email || '';
        }
        
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          clearMessages(form);

          const submitButton = form.querySelector('button[type="submit"]') ||
                               form.querySelector('button') ||
                               e.submitter;

          if (submitButton) {
            setLoading(submitButton, true);
          }

          showError('Profile update functionality will be implemented soon.', form);

          if (submitButton) {
            setLoading(submitButton, false);
          }
        });
      });
    </script>`,

    'customer-billing': `
    <script>
      document.addEventListener('DOMContentLoaded', async function() {
        try {
          // Load user and plans data
          const [userResponse, plansResponse] = await Promise.all([
            fetch('/api/subscribe/me'),
            fetch('/api/plans/public')
          ]);

          if (userResponse.ok && plansResponse.ok) {
            const userData = await userResponse.json();
            const plansData = await plansResponse.json();

            populateUserData(userData.user);
            populatePlans(plansData);
          }
        } catch (err) {
          console.error('Failed to load billing data:', err);
        }

        function populateUserData(user) {
          // Update current plan info
          const currentPlanElements = document.querySelectorAll('[data-user="plan"], .current-plan');
          currentPlanElements.forEach(el => el.textContent = user.plan_name || 'Free');
        }

        function populatePlans(plans) {
          // Handle upgrade buttons
          const upgradeButtons = document.querySelectorAll('[data-plan-id], .upgrade-btn');
          upgradeButtons.forEach(button => {
            button.addEventListener('click', async function(e) {
              e.preventDefault();

              const planId = this.dataset.planId || this.getAttribute('data-plan-id');
              if (!planId) return;

              setLoading(this, true);

              try {
                const response = await fetch('/api/create-checkout-session', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ plan_id: planId }),
                  credentials: 'include'
                });

                const data = await response.json();
                if (response.ok) {
                  window.location.href = data.checkout_url;
                } else {
                  showError(data.error || 'Failed to create checkout session', document.body);
                }
              } catch (err) {
                showError('Network error occurred', document.body);
              } finally {
                setLoading(this, false);
              }
            });
          });
        }
      });
    </script>`

    // Note: landing-page has no required scripts - complete design freedom
  };

  // Add common utilities first
  enhancedHtml += commonUtils;
  
  // Add page-specific functionality
  if (pageScripts[pageType]) {
    enhancedHtml += pageScripts[pageType];
  }
  
  return enhancedHtml;
}