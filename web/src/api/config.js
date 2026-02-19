// src/config.js
const raw = (import.meta.env?.VITE_API_BASE_URL ?? '').trim();
const isDev = !!import.meta.env?.DEV;
const appBase = ((import.meta.env?.BASE_URL ?? '/') || '/').replace(/\/+$/, '');

// Compute a safe base URL.
// - If VITE_API_BASE_URL is set, use it (no trailing slash).
// - Otherwise: dev => '/api' (Vite proxy), prod => '<origin>/api' (Nginx proxy).
function computeBase(rawVal) {
  if (rawVal) return rawVal.replace(/\/+$/, '');
  if (isDev) return '/api';

  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const basePath = appBase === '' || appBase === '/' ? '/api' : `${appBase}/api`;
    return `${origin}${basePath}`.replace(/\/+$/, '');
  }

  return appBase ? `${appBase}/api` : '/api';
}

export const API_BASE_URL = computeBase(raw);

// Build a fully-qualified API URL while preserving the /api base path.
export function apiUrl(path = '') {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = String(path || '').replace(/^\/+/, '');
  return suffix ? `${base}/${suffix}` : base;
}

// Ensure all fetch calls include credentials so cookies are preserved across requests.
if (typeof window !== 'undefined' && typeof window.fetch === 'function' && !window.__IK_FETCH_PATCHED__) {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const finalInit = { ...init };
    if (!finalInit.credentials) {
      finalInit.credentials = 'include';
    }
    return originalFetch(input, finalInit);
  };
  Object.defineProperty(window, '__IK_FETCH_PATCHED__', {
    value: true,
    writable: false,
    configurable: false,
  });
}
