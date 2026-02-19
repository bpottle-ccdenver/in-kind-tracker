import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useIsMobile } from '../use-mobile.jsx';

function setupMatchMedia(initialMatches = false) {
  const listeners = new Set();
  const mediaQuery = {
    matches: initialMatches,
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
    dispatchChange(value) {
      this.matches = value;
      listeners.forEach((handler) => handler({ matches: value }));
    },
  };
  vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery);
  return mediaQuery;
}

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when viewport is below the mobile breakpoint', async () => {
    window.innerWidth = 500;
    setupMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('updates when viewport crosses the breakpoint', async () => {
    window.innerWidth = 900;
    const mediaQuery = setupMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    act(() => {
      window.innerWidth = 600;
      mediaQuery.dispatchChange(true);
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
