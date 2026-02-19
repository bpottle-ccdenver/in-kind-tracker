import React, { useEffect, useMemo, useState } from "react";
import { Role, Permission } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

const DEFAULT_ROUTE_FALLBACK_VALUE = "__auto__";

const DEFAULT_ROUTE_OPTIONS = [
  { value: DEFAULT_ROUTE_FALLBACK_VALUE, label: "Use first available page" },
  { value: "UserManagement", label: "Users" },
  { value: "RoleManagement", label: "Roles" },
];

const DEFAULT_ROUTE_LABEL_MAP = new Map(DEFAULT_ROUTE_OPTIONS.map((option) => [option.value, option.label]));

const defaultFormState = {
  role_name: "",
  permissionIds: new Set(),
  default_route: DEFAULT_ROUTE_FALLBACK_VALUE,
};

function normalizePermissionLabel(text = "") {
  if (!text) return "";
  return text
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formState, setFormState] = useState(defaultFormState);
  const [editingRole, setEditingRole] = useState(null);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canManage } = usePermission("users");

  useEffect(() => {
    if (!canManage) {
      setRoles([]);
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [roleData, permissionData] = await Promise.all([
          Role.list(),
          Permission.list(),
        ]);
        setRoles(Array.isArray(roleData) ? roleData : []);
        setPermissions(Array.isArray(permissionData) ? permissionData : []);
      } catch (error) {
        console.error("Failed to load roles or permissions:", error);
        setRoles([]);
        setPermissions([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [canManage]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map();
    permissions.forEach((perm) => {
      const parts = perm.permission.split(' ');
      if (parts.length < 2) {
        const key = perm.permission;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ ...perm, action: perm.permission });
        return;
      }
      const action = parts[0];
      const entity = parts.slice(1).join(' ');
      const key = entity;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ...perm, action });
    });

    return Array.from(groups.entries())
      .map(([entity, perms]) => ({
        entity,
        permissions: perms.sort((a, b) => a.action.localeCompare(b.action)),
      }))
      .sort((a, b) => a.entity.localeCompare(b.entity));
  }, [permissions]);

  const resetForm = () => {
    setFormState({
      role_name: "",
      permissionIds: new Set(),
      default_route: DEFAULT_ROUTE_FALLBACK_VALUE,
    });
    setEditingRole(null);
    setFormError("");
    setIsSubmitting(false);
  };

  const openCreateDialog = () => {
    if (!canManage) return;
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (role) => {
    if (!canManage) return;
    setEditingRole(role);
    setFormState({
      role_name: role.role_name || "",
      permissionIds: new Set(
        Array.isArray(role.permissions)
          ? role.permissions.map((perm) => perm.permission_id || perm.id)
          : [],
      ),
      default_route: role.default_route ?? DEFAULT_ROUTE_FALLBACK_VALUE,
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleDialogClose = (open) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const togglePermission = (permissionId, checked) => {
    setFormState((prev) => {
      const nextSet = new Set(prev.permissionIds);
      if (checked) {
        nextSet.add(permissionId);
      } else {
        nextSet.delete(permissionId);
      }
      return {
        ...prev,
        permissionIds: nextSet,
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const payload = {
        role_name: formState.role_name,
        permission_ids: Array.from(formState.permissionIds),
        default_route:
          formState.default_route === DEFAULT_ROUTE_FALLBACK_VALUE
            ? null
            : formState.default_route,
      };

      let saved;
      if (editingRole) {
        saved = await Role.update(editingRole.id, payload);
        setRoles((prev) =>
          prev
            .map((role) => (role.id === editingRole.id ? saved : role))
            .sort((a, b) => a.role_name.localeCompare(b.role_name)),
        );
      } else {
        saved = await Role.create(payload);
        setRoles((prev) => [...prev, saved].sort((a, b) => a.role_name.localeCompare(b.role_name)));
      }

      handleDialogClose(false);
    } catch (error) {
      console.error("Failed to save role:", error);
      setFormError(error.message || "Unable to save role. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (role) => {
    if (!canManage) return;
    if (!window.confirm(`Delete role "${role.role_name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await Role.delete(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    } catch (error) {
      console.error("Failed to delete role:", error);
      alert("Unable to delete role. Please try again.");
    }
  };

  if (!canManage) {
    return <AccessDenied message="You need permission to manage roles." />;
  }

  if (isLoading) {
    return <div className="p-6">Loading roles…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Role Management</h1>
            <p className="text-slate-600 mt-1">
              Configure roles and assign permissions across the In-Kind Tracker.
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreateDialog} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              Add Role
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Roles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Default Page</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-10 text-center text-slate-500">
                        No roles configured yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{normalizePermissionLabel(role.role_name)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {role.default_route
                          ? DEFAULT_ROUTE_LABEL_MAP.get(role.default_route) || role.default_route
                          : DEFAULT_ROUTE_LABEL_MAP.get(DEFAULT_ROUTE_FALLBACK_VALUE)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {role.permissions.length === 0 && (
                            <span className="text-sm text-slate-500">No permissions</span>
                          )}
                          {role.permissions.map((perm) => (
                            <Badge key={perm.permission_id || perm.id} variant="outline" className="text-slate-600">
                              {perm.permission}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(role)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(role)}
                            disabled={role.role_name === 'admin'}
                            title={role.role_name === 'admin' ? 'The admin role cannot be deleted' : 'Delete role'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {canManage && (
      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Role Name</label>
              <Input
                value={formState.role_name}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    role_name: e.target.value,
                  }))
                }
                placeholder="Role name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Default Page</label>
              <Select
                value={formState.default_route}
                onValueChange={(value) =>
                  setFormState((prev) => ({
                    ...prev,
                    default_route: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a default page" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_ROUTE_OPTIONS.map((option) => (
                    <SelectItem key={option.value || 'fallback'} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
              {groupedPermissions.map((group) => (
                <div key={group.entity}>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    {normalizePermissionLabel(group.entity)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.permissions.map((perm) => {
                      const permissionId = perm.permission_id ?? perm.id;
                      const isChecked = formState.permissionIds.has(permissionId);
                      return (
                        <Label
                          key={permissionId}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 cursor-pointer hover:border-emerald-400 transition-colors"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) =>
                              togglePermission(permissionId, Boolean(checked))
                            }
                          />
                          <span className="capitalize">{perm.permission}</span>
                        </Label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {formError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingRole ? "Save Changes" : "Create Role"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
