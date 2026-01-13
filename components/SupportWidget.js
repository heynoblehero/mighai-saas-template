import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

export default function SupportWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState(null);
  const [shouldShowWidget, setShouldShowWidget] = useState(false);
  const messagesEndRef = useRef(null);

  // Email collection state
  const [userEmail, setUserEmail] = useState(null);
  const [userType, setUserType] = useState(null); // 'subscriber' or 'guest'
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    // Check if on admin page
    if (router.pathname.startsWith('/admin')) {
      setShouldShowWidget(false);
      return;
    }

    // Fetch settings and check if widget should be shown
    fetchSettings();
  }, [router.pathname]);

  useEffect(() => {
    if (settings && settings.is_enabled) {
      checkVisibility();
    }
  }, [settings]);

  useEffect(() => {
    if (isOpen && settings && settings.is_enabled && (userEmail || userType === 'subscriber')) {
      fetchMessages();
      // Poll for new messages every 10 seconds when open
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, settings, userEmail, userType]);

  useEffect(() => {
    // Poll for unread count every 30 seconds when closed
    if (!isOpen && settings && settings.is_enabled && (userEmail || userType === 'subscriber')) {
      checkUnreadMessages();
      const interval = setInterval(checkUnreadMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen, settings, userEmail, userType]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/support-chat-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // Use default settings if API fails
        setSettings({
          id: 1,
          visibility: 'public',
          primary_color: '#3B82F6',
          secondary_color: '#10B981',
          button_text: 'Support Chat',
          position: 'bottom-right',
          is_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to fetch support chat settings:', error);
      // Use default settings if API fails
      setSettings({
        id: 1,
        visibility: 'public',
        primary_color: '#3B82F6',
        secondary_color: '#10B981',
        button_text: 'Support Chat',
        position: 'bottom-right',
        is_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
  };

  const checkVisibility = async () => {
    if (!settings) return;

    // Check if on admin page
    if (router.pathname.startsWith('/admin')) {
      setShouldShowWidget(false);
      return;
    }

    // Check if widget is enabled
    if (!settings.is_enabled) {
      setShouldShowWidget(false);
      return;
    }

    // Check user status
    try {
      const response = await fetch('/api/chat/me');
      const data = await response.json();

      if (data.user) {
        // User is authenticated (subscriber or guest with email)
        setUserEmail(data.user.email);
        setUserType(data.user.type); // 'subscriber' or 'guest'
        setShowEmailForm(false);

        // For subscribers_only mode, only show if user is a subscriber
        if (settings.visibility === 'subscribers_only' && data.user.type !== 'subscriber') {
          setShouldShowWidget(false);
          return;
        }
      } else {
        // No authenticated user
        if (settings.visibility === 'subscribers_only') {
          setShouldShowWidget(false);
          return;
        }
        // Public mode - show email form
        setUserType(null);
        setShowEmailForm(true);
      }

      setShouldShowWidget(true);
    } catch (error) {
      // If API fails, show widget with email form for public mode
      if (settings.visibility === 'public') {
        setShouldShowWidget(true);
        setShowEmailForm(true);
      } else {
        setShouldShowWidget(false);
      }
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');

    if (!emailInput || !emailInput.trim()) {
      setEmailError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      setEmailError('Please enter a valid email');
      return;
    }

    setRegistering(true);
    try {
      const response = await fetch('/api/chat/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUserEmail(data.user.email);
        setUserType('guest');
        setShowEmailForm(false);
        setEmailInput('');
      } else {
        setEmailError(data.error || 'Failed to register');
      }
    } catch (error) {
      console.error('Error registering email:', error);
      setEmailError('Failed to register. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      let response;

      if (userType === 'subscriber') {
        // Subscribers use the authenticated endpoint
        response = await fetch('/api/support/messages');
      } else if (userEmail) {
        // Guests use the public endpoint with email
        response = await fetch(`/api/support/contact/${encodeURIComponent(userEmail)}`);
      } else {
        return; // No user, can't fetch messages
      }

      if (response.ok) {
        const data = await response.json();
        setMessages(data);

        // Mark admin messages as read (only for subscribers)
        if (userType === 'subscriber') {
          await fetch('/api/support/messages/read', { method: 'PUT' });
        }
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const checkUnreadMessages = async () => {
    try {
      let response;

      if (userType === 'subscriber') {
        response = await fetch('/api/support/messages');
      } else if (userEmail) {
        response = await fetch(`/api/support/contact/${encodeURIComponent(userEmail)}`);
      } else {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const unread = data.filter(msg => msg.sender_type === 'admin' && !msg.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Failed to check unread messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      let response;

      if (userType === 'subscriber') {
        // Subscribers use the authenticated endpoint
        response = await fetch('/api/support/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: newMessage })
        });
      } else if (userEmail) {
        // Guests use the public contact endpoint
        response = await fetch('/api/support/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, message: newMessage })
        });
      } else {
        throw new Error('No user email');
      }

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Calculate position classes based on settings
  const getPositionClasses = () => {
    if (!settings) return 'bottom-6 right-6';

    switch (settings.position) {
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'top-right':
        return 'top-6 right-6';
      case 'top-left':
        return 'top-6 left-6';
      case 'bottom-right':
      default:
        return 'bottom-6 right-6';
    }
  };

  if (!settings || !shouldShowWidget) {
    return null; // Don't render anything if settings aren't loaded or widget shouldn't be shown
  }

  return (
    <>
      {/* Support Widget Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-40 ${
          isOpen ? 'scale-0' : 'scale-100'
        } ${getPositionClasses()}`}
        style={{
          backgroundColor: settings.primary_color,
        }}
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Support Widget Panel */}
      <div
        className={`fixed w-96 h-[600px] bg-white rounded-lg shadow-2xl transition-all duration-300 z-50 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        } flex flex-col ${getPositionClasses()}`}
      >
        {/* Header */}
        <div
          className="text-white p-4 rounded-t-lg flex justify-between items-center"
          style={{ backgroundColor: settings.primary_color }}
        >
          <div>
            <h3 className="font-semibold">Support Chat</h3>
            <p className="text-xs" style={{ color: `${settings.primary_color}80` }}>We typically reply within a few hours</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white"
            style={{ color: `${settings.primary_color}80` }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages or Email Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {showEmailForm && !userEmail ? (
            <div className="flex flex-col items-center justify-center h-full">
              <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">Enter your email to chat</h4>
              <p className="text-sm text-gray-500 mb-4 text-center">We'll use this to send you replies</p>
              <form onSubmit={handleEmailSubmit} className="w-full max-w-xs">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your@email.com"
                  disabled={registering}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 mb-2"
                />
                {emailError && (
                  <p className="text-red-500 text-xs mb-2">{emailError}</p>
                )}
                <button
                  type="submit"
                  disabled={registering}
                  className="w-full px-4 py-2 rounded-md text-white disabled:opacity-50"
                  style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}
                >
                  {registering ? 'Starting...' : 'Start Chat'}
                </button>
              </form>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm">Send us a message!</p>
              <p className="text-xs text-gray-400">We're here to help with any questions.</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => {
                const showDate = index === 0 ||
                  formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="text-center text-xs text-gray-500 my-2">
                        {formatDate(message.created_at)}
                      </div>
                    )}
                    <div className={`flex ${message.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.sender_type === 'customer'
                          ? `text-white rounded-br-none`
                          : `text-gray-800 rounded-bl-none`
                      }`}
                      style={{
                        backgroundColor: message.sender_type === 'customer' ? settings.primary_color : settings.secondary_color
                      }}>
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.sender_type === 'customer' ? 'text-white' : 'text-gray-500'
                        }`}
                        style={{
                          color: message.sender_type === 'customer' ? `${settings.primary_color}80` : 'text-gray-500'
                        }}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input - Only show if user has email */}
        {!showEmailForm && userEmail && (
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || loading}
                className="px-4 py-2 rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: settings.primary_color,
                  color: 'white'
                }}
              >
                {loading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}