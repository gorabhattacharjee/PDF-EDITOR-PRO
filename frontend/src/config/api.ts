/**
 * API Configuration
 * Handles dynamic API endpoint based on environment
 */

// Dynamic API endpoint detection
const getApiBaseUrl = (): string => {
  // In browser environment
  if (typeof window !== 'undefined') {
    // Try to get Render backend URL from environment (set via Vercel dashboard)
    const renderBackendUrl = (globalThis as any).NEXT_PUBLIC_API_BASE_URL;
    if (renderBackendUrl) {
      return renderBackendUrl;
    }

    // Local development: use localhost:5000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    // Production on Vercel: call Render backend
    // Default to Render backend URL
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
  
  // If base URL includes a protocol and domain, append the endpoint
  if (baseUrl.includes('http://') || baseUrl.includes('https://')) {
    return `${baseUrl}${API_CONVERT_ENDPOINT}`;
  }
  
  // Otherwise use relative path (for same-origin requests)
  return API_CONVERT_ENDPOINT;
};
