import telegramNotifier from './telegram.js';

class ErrorHandler {
  static async notifyError(error, context = {}) {
    try {
      await telegramNotifier.sendNotification('systemError', {
        error: error.message || error.toString(),
        path: context.path || 'Unknown',
        timestamp: Date.now(),
        stack: error.stack?.substring(0, 500) // Limit stack trace length
      });
    } catch (notificationError) {
      console.error('Failed to send error notification:', notificationError);
    }
  }

  static async notifyPerformanceAlert(type, data) {
    try {
      await telegramNotifier.sendNotification(type, data);
    } catch (notificationError) {
      console.error('Failed to send performance notification:', notificationError);
    }
  }
}

// Set up global error handlers for uncaught errors
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    ErrorHandler.notifyError(error, { path: 'Global/UncaughtException' });
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    ErrorHandler.notifyError(new Error(reason), { path: 'Global/UnhandledRejection' });
  });
}

export default ErrorHandler;