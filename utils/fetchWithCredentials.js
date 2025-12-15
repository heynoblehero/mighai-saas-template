/**
 * Wrapper for fetch that automatically includes credentials
 * This ensures cookies are sent with every request
 */
export async function fetchWithCredentials(url, options = {}) {
  return fetch(url, {
    ...options,
    credentials: 'include', // Always send cookies
    headers: {
      ...options.headers,
    }
  });
}

/**
 * Helper for common fetch patterns
 */
export const api = {
  get: (url, options = {}) => fetchWithCredentials(url, {
    ...options,
    method: 'GET'
  }),

  post: (url, data, options = {}) => fetchWithCredentials(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data)
  }),

  put: (url, data, options = {}) => fetchWithCredentials(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: JSON.stringify(data)
  }),

  delete: (url, options = {}) => fetchWithCredentials(url, {
    ...options,
    method: 'DELETE'
  })
};
