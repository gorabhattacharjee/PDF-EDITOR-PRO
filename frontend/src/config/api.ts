/**
 * API Configuration
 * Handles dynamic API endpoint based on environment
 */

// Dynamic API endpoint detection
const getApiBaseUrl = (): string => {
  // In browser environment
  if (typeof window !== 'undefined') {
    // Local development: use localhost:5000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    // Production on Vercel: ALWAYS use Render backend
    // This is hardcoded because environment variables set in Vercel are NOT
    // automatically available at runtime in Next.js without NEXT_PUBLIC_ prefix
    return 'https://pdf-editor-pro.onrender.com';
  }

  // Server-side fallback
  return 'http://localhost:5000';
};

export const API_CONVERT_ENDPOINT = '/api/convert';

/**
 * Get full conversion API URL
 * Uses environment-specific base URL and appends convert endpoint
 */
export const getConvertUrl = (): string => {
  const baseUrl = getApiBaseUrl();
  
  // Always construct full URL with protocol and domain
  // This ensures requests go to the Render backend in production
  return `${baseUrl}${API_CONVERT_ENDPOINT}`;
};
