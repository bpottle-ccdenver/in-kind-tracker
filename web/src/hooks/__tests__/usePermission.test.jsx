import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermission } from '../usePermission.js';

const mockHasPermission = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: mockHasPermission,
  }),
}));

describe('usePermission', () => {
  beforeEach(() => {
    mockHasPermission.mockReset();
  });

  it('grants view access when manage permission is present', () => {
    mockHasPermission.mockImplementation((permission) => permission === 'manage users');

    const { result } = renderHook(() => usePermission('users'));

    expect(result.current.canManage).toBe(true);
    expect(result.current.canView).toBe(true);
    expect(result.current.viewPermission).toBe('view users');
    expect(result.current.managePermission).toBe('manage users');
    expect(mockHasPermission).toHaveBeenCalledWith('manage users');
    expect(mockHasPermission).toHaveBeenCalledWith('view users');
  });

  it('falls back to open access when resource is unknown', () => {
    const { result } = renderHook(() => usePermission('nonexistent'));

    expect(result.current.canManage).toBe(false);
    expect(result.current.canView).toBe(true);
    expect(result.current.viewPermission).toBeUndefined();
    expect(result.current.managePermission).toBeUndefined();
    expect(mockHasPermission).not.toHaveBeenCalled();
  });
});
