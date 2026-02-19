import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext.jsx';

function renderWithAuth({ user = { id: 1, name: 'Test User' }, permissions } = {}) {
  const wrapper = ({ children }) => (
    <AuthProvider user={user} permissions={permissions}>
      {children}
    </AuthProvider>
  );

  return renderHook(() => useAuth(), { wrapper });
}

describe('AuthContext', () => {
  it('normalizes permissions and checks access helpers', () => {
    const { result } = renderWithAuth({
      permissions: [' Manage_Users ', null, 'VIEW_USERS', '', 'manage_users'],
    });

    expect(result.current.user).toEqual({ id: 1, name: 'Test User' });
    expect(result.current.permissions).toEqual(['manage_users', 'view_users', 'manage_users']);

    expect(result.current.hasPermission('MANAGE_USERS')).toBe(true);
    expect(result.current.hasPermission('view_users')).toBe(true);
    expect(result.current.hasPermission('unknown')).toBe(false);

    expect(result.current.hasAnyPermission(['unknown', 'VIEW_USERS'])).toBe(true);
    expect(result.current.hasAnyPermission('manage_users')).toBe(true);
    expect(result.current.hasAnyPermission(['unknown'])).toBe(false);
  });

  it('handles missing permissions safely', () => {
    const { result } = renderWithAuth({ user: null, permissions: undefined });

    expect(result.current.user).toBeNull();
    expect(result.current.permissions).toEqual([]);
    expect(result.current.hasPermission('anything')).toBe(false);
    expect(result.current.hasAnyPermission(['one', 'two'])).toBe(false);
  });

  it('supports checking a single required permission string', () => {
    const { result } = renderWithAuth({ permissions: ['VIEW USERS'] });

    expect(result.current.hasAnyPermission('view users')).toBe(true);
    expect(result.current.hasAnyPermission('manage users')).toBe(false);
  });
});
