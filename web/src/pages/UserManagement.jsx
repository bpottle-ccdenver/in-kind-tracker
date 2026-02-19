import React, { useState, useEffect, useMemo } from "react";
import { UserAccount, Role } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Shield } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

const defaultFormState = {
  username: "",
  name: "",
  status: "pending",
  profile_image_url: "",
  role_id: "none",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function formatRoleName(name = "") {
  if (!name) return "";
  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimestamp(value) {
  if (!value) return "—";
  try {
    return format(new Date(value), "PP p");
  } catch (err) {
    return value;
  }
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userPermission = usePermission("users");
  const { canView, canManage } = userPermission;

  useEffect(() => {
    if (!canView) {
      setUsers([]);
      setRoles([]);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const rolePromise = canManage ? Role.list() : Promise.resolve([]);

        const [userList, roleList] = await Promise.all([
          UserAccount.list(),
          rolePromise,
        ]);
        setUsers(Array.isArray(userList) ? userList : []);
        setRoles(Array.isArray(roleList) ? roleList : []);
      } catch (error) {
        console.error("Error loading user data:", error);
        setUsers([]);
        setRoles([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [canView, canManage]);

  if (!canView) {
    return <AccessDenied message="You need permission to view users." />;
  }

  const roleOptions = useMemo(() => {
    return roles
      .filter(role => role?.id !== null && role?.id !== undefined && role?.id !== "")
      .map(role => ({
        value: String(role.id),
        label: role.role_name ? formatRoleName(role.role_name) : "Unnamed Role",
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [roles]);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingUser(null);
    setFormError("");
    setIsSubmitting(false);
  };

  const openCreateDialog = () => {
    if (!canManage) return;
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (user) => {
    if (!canManage) return;
    setEditingUser(user);
    setFormState({
      username: user.username ?? "",
      name: user.name ?? "",
      status: user.status ?? "pending",
      profile_image_url: user.profile_image_url ?? "",
      role_id:
        user.role_id !== null &&
        user.role_id !== undefined &&
        user.role_id !== ""
          ? String(user.role_id)
          : "none",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    setIsSubmitting(true);
    setFormError("");

    try {
      const payload = {
        username: formState.username,
        name: formState.name,
        status: formState.status,
        profile_image_url: formState.profile_image_url || null,
        role_id:
          !formState.role_id || formState.role_id === "none"
            ? null
            : Number(formState.role_id),
      };

      let saved;
      if (editingUser) {
        saved = await UserAccount.update(editingUser.id, payload);
        setUsers(prev =>
          prev.map(u => (u.id === editingUser.id ? saved : u))
        );
      } else {
        saved = await UserAccount.create(payload);
        setUsers(prev => [saved, ...prev]);
      }

      handleDialogClose(false);
    } catch (error) {
      console.error("Failed to save user:", error);
      setFormError(error.message || "Unable to save user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (user) => {
    if (!canManage) return;
    if (!window.confirm(`Set ${user.username} to inactive? They will no longer appear as an active user.`)) {
      return;
    }
    try {
      const updated = await UserAccount.update(user.id, { status: "inactive" });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (error) {
      console.error("Failed to deactivate user:", error);
      alert("Unable to deactivate user. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading users…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">User Management</h1>
            <p className="text-slate-600 mt-1">
              Manage application users, assign roles, and control who can access the in-kind tracker.
            </p>
            <p className="text-slate-600 mt-1">Nancy was Here</p>
          </div>
          {canManage && (
            <Button onClick={openCreateDialog} className="gap-2 bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4" />
              Add User
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Created</TableHead>
                    {canManage && <TableHead className="w-[140px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 7 : 6} className="text-center py-10 text-slate-500">
                        No users found. Add your first user to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div>{user.name || "—"}</div>
                        {user.profile_image_url && (
                          <a
                            href={user.profile_image_url}
                            className="text-xs text-blue-600 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Profile Image
                          </a>
                        )}
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.status === "active"
                              ? "border-emerald-500 text-emerald-600"
                              : user.status === "inactive"
                              ? "border-slate-400 text-slate-600"
                              : "border-amber-500 text-amber-600"
                          }
                        >
                          {user.status ?? "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.role_id
                          ? roleOptions.find(option => option.value === String(user.role_id))?.label ||
                            (user.role_name ? formatRoleName(user.role_name) : "Unknown Role")
                          : user.role_name ? formatRoleName(user.role_name) : "—"}
                      </TableCell>
                      <TableCell>{formatTimestamp(user.last_login_at)}</TableCell>
                      <TableCell>{formatTimestamp(user.created_at)}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-500 hover:text-amber-600"
                            onClick={() => handleDeactivate(user)}
                            title="Mark user inactive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          </div>
                        </TableCell>
                      )}
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
        <DialogContent className="max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              Update the user's profile, status, and optional role assignment.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <Input
                  value={formState.name}
                  onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email (Username)</label>
                <Input
                  type="email"
                  required
                  value={formState.username}
                  onChange={(e) => setFormState(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="name@example.com"
                  disabled={Boolean(editingUser)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
              <Select
                value={formState.status}
                onValueChange={(value) => setFormState(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Role (optional)</label>
              <Select
                value={formState.role_id}
                onValueChange={(value) => setFormState(prev => ({ ...prev, role_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Assign role (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role</SelectItem>
                  {roleOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Profile Image URL</label>
              <Input
                value={formState.profile_image_url}
                onChange={(e) => setFormState(prev => ({ ...prev, profile_image_url: e.target.value }))}
                placeholder="https://example.com/photo.jpg"
              />
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
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
