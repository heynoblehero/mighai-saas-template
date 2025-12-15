import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CustomerLayout({ children, title = 'Dashboard' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarHtml, setSidebarHtml] = useState('');
  const [chatHtml, setChatHtml] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    loadLayoutComponents();
    loadPreviousMessages();
    setupGlobalFunctions();
  }, []);

  const setupGlobalFunctions = () => {
    // Make chat functions globally available
    window.toggleChat = () => {
      const chatWindow = document.getElementById('chatWindow');
      const chatToggle = document.getElementById('chatToggle');
      
      if (chatWindow) {
        const isOpen = chatWindow.classList.contains('open');
        if (isOpen) {
          chatWindow.classList.remove('open');
          if (chatToggle) chatToggle.classList.remove('open');
        } else {
          chatWindow.classList.add('open');
          if (chatToggle) chatToggle.classList.add('open');
        }
      }
    };

    window.sendMessage = (event) => {
      if (event) event.preventDefault();
      const input = document.getElementById('messageInput');
      const sendBtn = document.getElementById('chatSendBtn');
      
      if (input) {
        const message = input.value.trim();
        if (message) {
          // Disable input while sending
          if (sendBtn) sendBtn.disabled = true;
          input.disabled = true;
          
          // Add user message to UI immediately
          addMessageToChat({
            id: Date.now(),
            message: message,
            sender_type: 'customer',
            created_at: new Date().toISOString()
          });
          
          // Clear input
          input.value = '';
          
          // Send to server
          fetch('/api/support/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message: message })
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            console.log('API Response:', data);
            console.log('Has success property:', 'success' in data);
            console.log('Success value:', data.success);
            
            if (data.success === true) {
              console.log('Message sent successfully:', data);
              // Simulate support response after delay
              setTimeout(() => {
                simulateSupportResponse(message);
              }, 1500);
            } else if (data.id && data.message) {
              // Handle case where API returns the message object directly
              console.log('Message sent (direct response):', data);
              setTimeout(() => {
                simulateSupportResponse(message);
              }, 1500);
            } else {
              console.error('API returned unexpected format:', data);
              showChatError('Failed to send message: ' + (data.error || 'Unknown error'));
            }
          })
          .catch(error => {
            console.error('Failed to send message - Full error:', error);
            console.error('Error stack:', error.stack);
            showChatError('Failed to send message. Please try again.');
          })
          .finally(() => {
            if (sendBtn) sendBtn.disabled = false;
            input.disabled = false;
            input.focus();
          });
        }
      }
    };

    window.addMessageToChat = (message) => {
      const messagesContainer = document.getElementById('chatMessages');
      if (!messagesContainer) return;
      
      // Hide welcome message if this is the first real message
      const welcomeMsg = messagesContainer.querySelector('.chat-welcome');
      if (welcomeMsg && message.sender_type === 'customer') {
        welcomeMsg.style.display = 'none';
      }
      
      const messageEl = document.createElement('div');
      messageEl.className = `chat-message ${message.sender_type === 'customer' ? 'user' : 'admin'}`;
      messageEl.innerHTML = `
        <div class="message-text">${window.sanitizeInput(message.message)}</div>
        <div class="message-time">${formatTime(message.created_at)}</div>
      `;
      
      messagesContainer.appendChild(messageEl);
      scrollChatToBottom();
    };

    window.simulateSupportResponse = (userMessage) => {
      const responses = {
        'billing': 'I can help you with billing questions. What specific billing issue are you experiencing?',
        'technical': 'I\'m here to help with technical issues. Can you describe what problem you\'re encountering?',
        'support': 'Our support team is ready to assist you. How can we help today?',
        'help': 'I\'m happy to help! What do you need assistance with?',
        'default': 'Thank you for your message. A support representative will respond shortly. Is there anything specific I can help you with right now?'
      };
      
      let response = responses.default;
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('billing') || lowerMessage.includes('payment') || lowerMessage.includes('subscription')) {
        response = responses.billing;
      } else if (lowerMessage.includes('technical') || lowerMessage.includes('bug') || lowerMessage.includes('error')) {
        response = responses.technical;
      } else if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
        response = responses.help;
      }
      
      addMessageToChat({
        id: Date.now() + 1,
        message: response,
        sender_type: 'admin',
        created_at: new Date().toISOString()
      });
    };

    window.scrollChatToBottom = () => {
      const messagesContainer = document.getElementById('chatMessages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    };

    window.showChatError = (message) => {
      const messagesContainer = document.getElementById('chatMessages');
      if (!messagesContainer) return;
      
      const errorEl = document.createElement('div');
      errorEl.style.cssText = `
        color: #ef4444; 
        text-align: center; 
        padding: 12px; 
        font-size: 14px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        margin: 8px 0;
      `;
      errorEl.textContent = message;
      messagesContainer.appendChild(errorEl);
      
      setTimeout(() => {
        if (errorEl.parentNode) {
          errorEl.parentNode.removeChild(errorEl);
        }
      }, 5000);
      scrollChatToBottom();
    };

    window.formatTime = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Make sidebar functions globally available
    window.handleSidebarLogout = () => {
      if (confirm('Are you sure you want to logout?')) {
        fetch('/api/auth/logout', { method: 'POST' })
          .then(() => {
            window.location.href = '/subscribe/login';
          })
          .catch(() => {
            window.location.href = '/subscribe/login';
          });
      }
    };

    window.updateActiveNav = () => {
      const currentPath = window.location.pathname;
      const navLinks = document.querySelectorAll('.nav-link');
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
          link.classList.add('active');
        }
      });
    };

    // Utility functions for sidebar
    window.setLoading = (elementId, isLoading) => {
      const element = document.getElementById(elementId);
      if (element) {
        if (isLoading) {
          element.disabled = true;
          element.style.opacity = '0.7';
          element.style.cursor = 'not-allowed';
        } else {
          element.disabled = false;
          element.style.opacity = '1';
          element.style.cursor = 'pointer';
        }
      }
    };

    window.showError = (message) => {
      // Create error notification
      const errorDiv = document.createElement('div');
      errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fee2e2;
        border: 1px solid #fecaca;
        color: #991b1b;
        padding: 12px 16px;
        border-radius: 8px;
        z-index: 9999;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      `;
      errorDiv.textContent = message;
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 5000);
    };

    window.sanitizeInput = (input) => {
      if (!input) return '';
      const div = document.createElement('div');
      div.textContent = input;
      return div.innerHTML;
    };
  };

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/subscribe/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        router.push('/subscribe/login');
      }
    } catch (error) {
      router.push('/subscribe/login');
    } finally {
      setLoading(false);
    }
  };

  const loadLayoutComponents = async () => {
    try {
      // Load customized sidebar
      const sidebarResponse = await fetch('/api/reserved-page-render?pageType=customer-layout-sidebar');
      if (sidebarResponse.ok) {
        const sidebarData = await sidebarResponse.text();
        setSidebarHtml(sidebarData);
      } else {
        loadDefaultSidebar();
      }
      
      // Load customized chat
      const chatResponse = await fetch('/api/reserved-page-render?pageType=customer-layout-chat');
      if (chatResponse.ok) {
        const chatData = await chatResponse.text();
        setChatHtml(chatData);
      } else {
        loadDefaultChat();
      }
    } catch (error) {
      console.error('Failed to load layout components:', error);
      // Fall back to default layout components
      loadDefaultSidebar();
      loadDefaultChat();
    }
  };

  const loadPreviousMessages = async () => {
    try {
      const response = await fetch('/api/support/messages', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const messages = await response.json();
        console.log('Previous messages loaded:', messages);
        
        // Wait for chat to be rendered, then load messages
        setTimeout(() => {
          const messagesContainer = document.getElementById('chatMessages');
          if (messagesContainer && messages.length > 0) {
            // Hide welcome message if there are previous messages
            const welcomeMsg = messagesContainer.querySelector('.chat-welcome');
            if (welcomeMsg) {
              welcomeMsg.style.display = 'none';
            }
            
            // Add each message to chat
            messages.forEach(message => {
              addMessageToChat(message);
            });
          }
        }, 500);
      }
    } catch (error) {
      console.error('Failed to load previous messages:', error);
    }
  };

  const loadDefaultSidebar = () => {
    setSidebarHtml(`
      <div class="customer-layout-sidebar">
        <div class="sidebar-content">
          <div class="sidebar-header">
            <h2>Customer Portal</h2>
            <p>Welcome, <span id="username">User</span></p>
          </div>
          
          <nav class="sidebar-nav">
            <ul>
              <li><a href="/dashboard" class="nav-link active">🏠 Dashboard</a></li>
              <li><a href="/dashboard/profile" class="nav-link">👤 Profile</a></li>
              <li><a href="/dashboard/upgrade" class="nav-link">💳 Billing</a></li>
              <li><a href="/" class="nav-link">🌐 Home</a></li>
            </ul>
          </nav>
          
          <div class="sidebar-footer">
            <button onclick="handleSidebarLogout()" class="logout-btn">🚪 Logout</button>
          </div>
        </div>
      </div>
      
      <style>
      .customer-layout-sidebar {
        width: 280px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        position: fixed;
        height: 100vh;
        left: 0;
        top: 0;
        z-index: 1000;
        overflow-y: auto;
      }
      .sidebar-content {
        padding: 20px;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .sidebar-header {
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 1px solid rgba(255,255,255,0.2);
      }
      .sidebar-header h2 {
        font-size: 24px;
        margin-bottom: 10px;
        font-weight: 600;
      }
      .sidebar-nav {
        flex: 1;
      }
      .sidebar-nav ul {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .sidebar-nav li {
        margin-bottom: 8px;
      }
      .nav-link {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        color: rgba(255,255,255,0.8);
        text-decoration: none;
        border-radius: 8px;
        transition: all 0.3s ease;
        font-size: 16px;
      }
      .nav-link:hover {
        background: rgba(255,255,255,0.1);
        color: white;
        transform: translateX(4px);
      }
      .nav-link.active {
        background: rgba(255,255,255,0.2);
        color: white;
        border-right: 3px solid white;
      }
      .logout-btn {
        width: 100%;
        padding: 12px 16px;
        background: transparent;
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 16px;
      }
      .logout-btn:hover {
        background: rgba(255,255,255,0.1);
      }
      </style>
      
      <script>
      function handleSidebarLogout() {
        if (confirm('Are you sure you want to logout?')) {
          fetch('/api/auth/logout', { method: 'POST' })
            .then(() => {
              window.location.href = '/subscribe/login';
            })
            .catch(() => {
              window.location.href = '/subscribe/login';
            });
        }
      }
      
      function updateActiveNav() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
          }
        });
      }
      
      document.addEventListener('DOMContentLoaded', () => {
        updateActiveNav();
        
        fetch('/api/subscribe/me')
          .then(response => response.json())
          .then(data => {
            const usernameEl = document.getElementById('username');
            if (usernameEl && data.user) {
              usernameEl.textContent = data.user.username || 'User';
            }
          })
          .catch(err => console.error('Failed to load user info:', err));
      });
      </script>
    `);
  };

  const loadDefaultChat = () => {
    setChatHtml(`
      <div class="customer-layout-chat">
        <div class="chat-widget">
          <button class="chat-toggle" onclick="toggleChat()" id="chatToggle">
            <span class="chat-icon">💬</span>
            <span class="chat-badge" id="chatBadge" style="display: none;">0</span>
          </button>
          
          <div class="chat-window" id="chatWindow">
            <div class="chat-header">
              <div class="chat-title">
                <h4>Support Chat</h4>
                <p class="chat-status">We're online!</p>
              </div>
              <button onclick="toggleChat()" class="chat-close">
                <span>✕</span>
              </button>
            </div>
            
            <div class="chat-messages" id="chatMessages">
              <div class="chat-welcome">
                <div class="welcome-avatar">👋</div>
                <div class="welcome-text">
                  <h5>Hello! How can we help you today?</h5>
                  <p>We typically respond within a few minutes.</p>
                </div>
              </div>
            </div>
            
            <div class="chat-input-container">
              <form class="chat-form" onsubmit="sendMessage(event)" id="chatForm">
                <div class="chat-input-wrapper">
                  <input type="text" id="messageInput" placeholder="Type your message..." class="chat-input" maxlength="500">
                  <button type="submit" class="send-btn" id="chatSendBtn">
                    <span class="send-icon">➤</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      
      <style>
      .customer-layout-chat {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .chat-toggle {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
        position: relative;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .chat-toggle:hover {
        transform: scale(1.1);
      }
      .chat-icon {
        font-size: 24px;
      }
      .chat-window {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 350px;
        height: 400px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        display: none;
        flex-direction: column;
        overflow: hidden;
      }
      .chat-window.open {
        display: flex;
      }
      .chat-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
      }
      .chat-messages {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
      }
      .chat-welcome {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: #f7fafc;
        border-radius: 12px;
        color: #374151;
      }
      .welcome-text h5 {
        color: #1f2937;
        margin: 0 0 4px 0;
        font-weight: 600;
      }
      .welcome-text p {
        color: #6b7280;
        margin: 0;
        font-size: 14px;
      }
      .welcome-avatar {
        font-size: 32px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: white;
        border-radius: 50%;
      }
      .chat-input-container {
        padding: 15px;
        border-top: 1px solid #eee;
      }
      .chat-input-wrapper {
        display: flex;
        gap: 10px;
      }
      .chat-input {
        flex: 1;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 20px;
        outline: none;
      }
      .send-btn {
        padding: 10px 15px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .send-btn:hover {
        background: #5a67d8;
        transform: scale(1.05);
      }
      .send-btn:disabled {
        background: #cbd5e0;
        cursor: not-allowed;
        transform: none;
      }
      .chat-message {
        max-width: 85%;
        padding: 12px 16px;
        border-radius: 18px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
        margin-bottom: 12px;
        position: relative;
      }
      .chat-message.user {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        align-self: flex-end;
        margin-left: auto;
        border-bottom-right-radius: 6px;
      }
      .chat-message.admin {
        background: #f1f3f4;
        color: #333;
        align-self: flex-start;
        border-bottom-left-radius: 6px;
      }
      .message-time {
        font-size: 11px;
        opacity: 0.7;
        margin-top: 6px;
        text-align: right;
      }
      .admin .message-time {
        text-align: left;
      }
      </style>
      
      <script>
      let chatOpen = false;
      
      function toggleChat() {
        chatOpen = !chatOpen;
        const chatWindow = document.getElementById('chatWindow');
        if (chatOpen) {
          chatWindow.classList.add('open');
        } else {
          chatWindow.classList.remove('open');
        }
      }
      
      function sendMessage(event) {
        event.preventDefault();
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        if (message) {
          console.log('Sending message:', message);
          input.value = '';
        }
      }
      </script>
    `);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="customer-layout">
      {/* Render customizable sidebar */}
      <div 
        className="layout-sidebar"
        dangerouslySetInnerHTML={{ __html: sidebarHtml }}
      />
      
      {/* Main content area */}
      <div className="layout-content">
        <div className="content-wrapper">
          <header className="content-header">
            <h1 className="page-title">{title}</h1>
          </header>
          <main className="content-main">
            {children}
          </main>
        </div>
      </div>
      
      {/* Render customizable chat */}
      <div 
        className="layout-chat"
        dangerouslySetInnerHTML={{ __html: chatHtml }}
      />
      
      <style jsx>{`
        .customer-layout {
          display: flex;
          min-height: 100vh;
          background: #f8fafc;
        }
        
        .layout-content {
          flex: 1;
          margin-left: 280px;
          min-height: 100vh;
          position: relative;
        }
        
        .content-wrapper {
          padding: 30px;
        }
        
        .content-header {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .page-title {
          font-size: 32px;
          font-weight: 700;
          color: #1a202c;
          margin: 0;
        }
        
        .content-main {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        @media (max-width: 768px) {
          .layout-content {
            margin-left: 0;
          }
          
          .content-wrapper {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}