// Date utilities that prevent hydration mismatches

export const formatTimeForHydration = (dateString) => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    // Use ISO format to prevent server/client differences
    return date.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS format
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDateForHydration = (dateString) => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    // Use ISO format to prevent server/client differences
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch (error) {
    return 'Invalid date';
  }
};

export const formatDateTimeForHydration = (dateString) => {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    // Use consistent ISO format with readable formatting
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  } catch (error) {
    return 'Invalid date';
  }
};

// Safe client-side only formatting (use with isClient check)
export const formatForClient = (dateString, options = {}) => {
  if (typeof window === 'undefined') return dateString; // Server-side, return raw
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    });
  } catch (error) {
    return 'Invalid date';
  }
};