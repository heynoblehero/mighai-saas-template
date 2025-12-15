const emailService = require('../services/emailService');

// Error notification middleware
const notifyAdminOfError = async (error, req, context = 'Unknown') => {
  try {
    await emailService.sendAdminNotification('system_error', {
      errorType: error.name || 'Unknown Error',
      errorMessage: error.message,
      component: context,
      stack: error.stack?.substring(0, 500) // Limit stack trace length
    });
  } catch (notificationError) {
    console.error('Failed to send error notification:', notificationError);
  }
};

// Global error handler for Express
const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', err);
  
  // Send admin notification for server errors
  if (err.status >= 500 || !err.status) {
    notifyAdminOfError(err, req, req.originalUrl || 'API Endpoint');
  }
  
  // Send error response
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async error wrapper for API routes
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // Send admin notification for async errors
    notifyAdminOfError(err, req, req.originalUrl || 'API Route');
    next(err);
  });
};

// Client-side error reporting endpoint
const clientErrorHandler = async (req, res) => {
  try {
    const { error, userAgent, url, userId } = req.body;
    
    await emailService.sendAdminNotification('system_error', {
      errorType: 'Client Error',
      errorMessage: error.message || 'Client-side error occurred',
      component: `Client - ${url}`,
      userAgent: userAgent,
      userId: userId
    });
    
    res.status(200).json({ message: 'Error reported successfully' });
  } catch (err) {
    console.error('Failed to handle client error:', err);
    res.status(500).json({ error: 'Failed to report error' });
  }
};

module.exports = {
  errorHandler,
  asyncHandler,
  notifyAdminOfError,
  clientErrorHandler
};