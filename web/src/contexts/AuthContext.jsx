import React, { createContext, useContext, useMemo } from "react";

const AuthContext = createContext({
  user: null,
  permissions: [],
  permissionSet: new Set(),
  hasPermission: () => false,
  hasAnyPermission: () => false,
});

function normalizePermissions(permissions) {
  if (!Array.isArray(permissions)) {
    return [];
  }
  return permissions
    .filter(Boolean)
    .map((perm) => perm.toString().trim().toLowerCase())
    .filter((perm) => perm.length > 0);
}

export function AuthProvider({ user, permissions, children }) {
  const normalizedPermissions = useMemo(
    () => normalizePermissions(permissions),
    [permissions],
  );

  const permissionSet = useMemo(
    () => new Set(normalizedPermissions),
    [normalizedPermissions],
  );

  const value = useMemo(
    () => ({
      user,
      permissions: normalizedPermissions,
      permissionSet,
      hasPermission: (permission) => {
        if (!permission) return false;
        return permissionSet.has(permission.toString().trim().toLowerCase());
      },
      hasAnyPermission: (required = []) =>
        (Array.isArray(required) ? required : [required]).some((permission) =>
          permissionSet.has(permission.toString().trim().toLowerCase()),
        ),
    }),
    [user, permissionSet],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
