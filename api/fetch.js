const BASE_URL = 'http://localhost:3001/api'; // Example API base URL

/**
 * A wrapper around the native fetch API.
 * @param {string} endpoint - The API endpoint to call (e.g., '/register').
 * @param {object} options - The options for the fetch call (method, body, etc.).
 * @returns {Promise<any>} - The JSON response from the API.
 */
export default async function apiFetch(endpoint, options = {}) {
  const { body, ...restOptions } = options;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    },
    body: body ? JSON.stringify(body) : null,
  });

  const responseData = await response.json();

  if (!response.ok) {
    // Create an error object that includes the response data
    const error = new Error(responseData.message || 'An error occurred');
    error.response = {
      status: response.status,
      data: responseData,
    };
    throw error;
  }

  return responseData;
}