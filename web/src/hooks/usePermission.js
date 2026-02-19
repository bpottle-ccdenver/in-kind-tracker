import { useAuth } from "@/contexts/AuthContext";
import { RESOURCE_PERMISSIONS } from "@/permissions";

export function usePermission(resourceKey) {
  const { hasPermission } = useAuth();

  const { view, manage } = RESOURCE_PERMISSIONS[resourceKey] || {};

  const canManage = manage ? hasPermission(manage) : false;
  const canView = (() => {
    if (!view && !manage) {
      return true;
    }
    const viewAllowed = view ? hasPermission(view) : false;
    return viewAllowed || canManage;
  })();

  return {
    canView,
    canManage,
    viewPermission: view,
    managePermission: manage,
  };
}
