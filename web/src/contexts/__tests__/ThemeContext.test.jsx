import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeContext.jsx';

const STORAGE_KEY = 'pp_theme';

function createWrapper() {
  return function Wrapper({ children }) {
    return <ThemeProvider>{children}</ThemeProvider>;
  };
}

function setupMatchMedia(initialMatch = false) {
  const listeners = new Set();
  const mediaQuery = {
    matches: initialMatch,
    addEventListener: vi.fn((event, handler) => {
      if (event === 'change') {
        listeners.add(handler);
      }
    }),
    removeEventListener: vi.fn((event, handler) => {
      if (event === 'change') {
        listeners.delete(handler);
      }
    }),
    addListener: vi.fn((handler) => {
      listeners.add(handler);
    }),
    removeListener: vi.fn((handler) => {
      listeners.delete(handler);
    }),
    dispatchChange(value) {
      this.matches = value;
      listeners.forEach((handler) => handler({ matches: value }));
    },
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);
  return mediaQuery;
}

describe('ThemeContext', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.theme;
    if (!originalMatchMedia) {
      window.matchMedia = vi.fn();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    document.documentElement.className = '';
    delete document.documentElement.dataset.theme;
    window.matchMedia = originalMatchMedia;
  });

  it('initializes from stored preference and toggles theme', async () => {
    setupMatchMedia(false);
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    const { result } = renderHook(() => useTheme(), { wrapper: createWrapper() });

    expect(result.current.theme).toBe('dark');
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    await waitFor(() => {
      expect(document.documentElement.classList.contains('light')).toBe(true);
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('light');
    });
  });

  it('responds to system preference changes when no stored preference exists', async () => {
    const mediaQuery = setupMatchMedia(false);

    const { result } = renderHook(() => useTheme(), { wrapper: createWrapper() });

    expect(result.current.theme).toBe('light');

    window.localStorage.removeItem(STORAGE_KEY);
    act(() => {
      mediaQuery.dispatchChange(true);
    });
    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
    });

    window.localStorage.removeItem(STORAGE_KEY);
    act(() => {
      mediaQuery.dispatchChange(false);
    });
    await waitFor(() => {
      expect(result.current.theme).toBe('light');
    });
  });

  it('allows manually setting the theme', async () => {
    setupMatchMedia(false);

    const { result } = renderHook(() => useTheme(), { wrapper: createWrapper() });

    act(() => {
      result.current.setTheme('dark');
    });

    await waitFor(() => {
      expect(result.current.theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
    });
  });
});
