import { useState, useEffect, useRef } from 'react';
import AdminLayout from '../../components/AdminLayout';

export default function SupportMessages() {
  const [conversations, setConversations] = useState([]);
  const [selectedIdentifier, setSelectedIdentifier] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'subscribers', 'non-subscribers'
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    
    // Poll for new conversations every 30 seconds
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (selectedIdentifier) {
      fetchMessages(selectedIdentifier);
      
      // Poll for new messages every 10 seconds when conversation is selected
      const interval = setInterval(() => fetchMessages(selectedIdentifier), 10000);
      return () => clearInterval(interval);
    }
  }, [selectedIdentifier]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      let endpoint = '/api/admin/support/conversations';
      
      if (activeTab === 'subscribers') {
        endpoint = '/api/admin/support/subscribers';
      } else if (activeTab === 'non-subscribers') {
        endpoint = '/api/admin/support/non-subscribers';
      } else if (activeTab === 'all') {
        endpoint = '/api/admin/support/conversations';
      }

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setConversationsLoading(false);
    }
  };

  const fetchMessages = async (identifier) => {
    try {
      const response = await fetch(`/api/admin/support/messages/${identifier}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        
        // Mark customer messages as read
        await fetch(`/api/admin/support/messages/${identifier}/read`, { method: 'PUT' });
        
        // Update conversations to reflect read status
        setConversations(prev => prev.map(conv => {
          const convId = conv.user_id || conv.customer_email || conv.email;
          return convId === identifier ? { ...conv, unread_count: 0 } : conv;
        }));
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedIdentifier || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/support/messages/${selectedIdentifier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage })
      });

      if (response.ok) {
        const message = await response.json();
        setMessages(prev => [...prev, message]);
        setNewMessage('');
        
        // Update conversation with new message
        setConversations(prev => prev.map(conv => {
          const convId = conv.user_id || conv.customer_email || conv.email;
          return convId === selectedIdentifier 
            ? { ...conv, last_message: newMessage, last_message_time: message.created_at }
            : conv;
        }));
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

  const formatRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTotalUnread = () => {
    return conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Support Messages</h1>
            <p className="text-slate-400 mt-1">Manage customer conversations and support requests</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            {getTotalUnread() > 0 && (
              <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                {getTotalUnread()} unread
              </span>
            )}
            <button
              onClick={fetchConversations}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors inline-flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-200px)] bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
        {/* Conversations List */}
        <div className="w-1/3 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-slate-200">Conversations</h2>
            </div>
            
            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-900/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('subscribers')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'subscribers'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Subscribers
              </button>
              <button
                onClick={() => setActiveTab('non-subscribers')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'non-subscribers'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Non-Subscribers
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {conversationsLoading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                <p className="mt-2 text-slate-400">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-slate-300">No conversations yet</p>
                <p className="text-xs text-slate-500">Support messages will appear here</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const identifier = conv.user_id || conv.customer_email || conv.email;
                const isSubscriber = conv.is_subscriber !== false && conv.user_id;
                
                return (
                  <div
                    key={identifier}
                    onClick={() => setSelectedIdentifier(identifier)}
                    className={`p-4 border-b border-slate-700 cursor-pointer hover:bg-slate-700/50 transition-colors ${
                      selectedIdentifier === identifier ? 'bg-emerald-900/30 border-emerald-600/30' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-sm text-slate-200">
                          {conv.email}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          isSubscriber 
                            ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30' 
                            : 'bg-blue-900/30 text-blue-300 border border-blue-600/30'
                        }`}>
                          {isSubscriber ? 'Sub' : 'Guest'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {conv.unread_count > 0 && (
                          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(conv.last_message_time)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 truncate">
                      {conv.last_message || 'No messages'}
                    </p>
                    {conv.username && (
                      <p className="text-xs text-slate-500 mt-1">
                        {conv.username}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="flex-1 flex flex-col">
          {selectedIdentifier ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {(() => {
                        const conv = conversations.find(c => {
                          const identifier = c.user_id || c.customer_email || c.email;
                          return identifier === selectedIdentifier;
                        });
                        return conv?.email?.[0]?.toUpperCase() || '?';
                      })()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200">
                      {(() => {
                        const conv = conversations.find(c => {
                          const identifier = c.user_id || c.customer_email || c.email;
                          return identifier === selectedIdentifier;
                        });
                        return conv?.email;
                      })()}
                    </h3>
                    <p className="text-sm text-slate-400 flex items-center space-x-2">
                      <span>
                        {(() => {
                          const conv = conversations.find(c => {
                            const identifier = c.user_id || c.customer_email || c.email;
                            return identifier === selectedIdentifier;
                          });
                          return conv?.username || (conv?.is_subscriber === false ? 'Non-subscriber' : 'Subscriber');
                        })()}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        (() => {
                          const conv = conversations.find(c => {
                            const identifier = c.user_id || c.customer_email || c.email;
                            return identifier === selectedIdentifier;
                          });
                          const isSubscriber = conv?.is_subscriber !== false && conv?.user_id;
                          return isSubscriber 
                            ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-600/30' 
                            : 'bg-blue-900/30 text-blue-300 border border-blue-600/30';
                        })()
                      }`}>
                        {(() => {
                          const conv = conversations.find(c => {
                            const identifier = c.user_id || c.customer_email || c.email;
                            return identifier === selectedIdentifier;
                          });
                          const isSubscriber = conv?.is_subscriber !== false && conv?.user_id;
                          return isSubscriber ? 'Subscriber' : 'Guest';
                        })()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => {
                  const showDate = index === 0 || 
                    formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);
                  
                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center text-xs text-slate-500 my-2">
                          {formatDate(message.created_at)}
                        </div>
                      )}
                      <div className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-4 py-2 rounded-lg ${
                          message.sender_type === 'admin'
                            ? 'bg-emerald-600 text-white rounded-br-none'
                            : 'bg-slate-700 text-slate-200 rounded-bl-none'
                        }`}>
                          <p className="text-sm">{message.message}</p>
                          <p className={`text-xs mt-1 ${
                            message.sender_type === 'admin' ? 'text-emerald-100' : 'text-slate-400'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-slate-700 bg-slate-900/50">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your response..."
                    disabled={loading}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-slate-200 placeholder-slate-400 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-800"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || loading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* No Conversation Selected */
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-medium mb-2 text-slate-300">Select a conversation</h3>
                <p className="text-sm">Choose a conversation from the list to view and respond to messages.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-emerald-300 mb-2">
              Support System Features
            </h3>
            <div className="text-emerald-200/80 space-y-2">
              <p>• Real-time conversation updates every 10-30 seconds</p>
              <p>• Separate subscriber and non-subscriber messaging channels</p>
              <p>• Automatic message read status tracking and unread counters</p>
              <p>• Support for both registered users and guest customers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AdminLayout>
  );
}