import React, { useEffect, useState } from "react";
import { Ministry } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Church } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

const defaultFormState = {
  code: "",
  name: "",
  has_scale: false,
};

const sortMinistries = (list = []) =>
  [...list].sort((a, b) =>
    (a?.name ?? "").localeCompare(b?.name ?? "", undefined, { sensitivity: "base" }) ||
    (a?.code ?? "").localeCompare(b?.code ?? "", undefined, { sensitivity: "base" }),
  );

export default function MinistryManagement() {
  const [ministries, setMinistries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { canView, canManage } = usePermission("ministries");

  useEffect(() => {
    if (!canView) {
      setMinistries([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const ministryList = await Ministry.list();
        if (!isActive) return;
        setMinistries(Array.isArray(ministryList) ? sortMinistries(ministryList) : []);
      } catch (error) {
        console.error("Error loading ministries:", error);
        if (isActive) {
          setMinistries([]);
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isActive = false;
    };
  }, [canView]);

  if (!canView) {
    return <AccessDenied message="You need permission to view ministries." />;
  }

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingMinistry(null);
    setFormError("");
    setIsSubmitting(false);
  };

  const openCreateDialog = () => {
    if (!canManage) return;
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (ministry) => {
    if (!canManage) return;
    setEditingMinistry(ministry);
    setFormState({
      code: ministry.code || "",
      name: ministry.name || "",
      has_scale: Boolean(ministry.has_scale),
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
    if (!canManage || isSubmitting) return;
    setIsSubmitting(true);
    setFormError("");

    const trimmedCode = formState.code?.trim().toUpperCase();
    const trimmedName = formState.name?.trim();
    const hasScale = Boolean(formState.has_scale);

    if (!trimmedCode) {
      setFormError("Code is required.");
      setIsSubmitting(false);
      return;
    }
    if (!/^[A-Z0-9_-]{2,50}$/.test(trimmedCode)) {
      setFormError("Code must be 2-50 characters using letters, numbers, hyphens, or underscores.");
      setIsSubmitting(false);
      return;
    }

    if (!trimmedName) {
      setFormError("Name is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ministry_code: trimmedCode,
        ministry_name: trimmedName,
        has_scale: hasScale,
      };

      let saved;
      if (editingMinistry) {
        const updatePayload = { ...payload };
        delete updatePayload.ministry_code; // prevent attempting to change PK
        saved = await Ministry.update(editingMinistry.code, updatePayload);
        setMinistries((prev) =>
          sortMinistries(prev.map((m) => (m.code === editingMinistry.code ? saved : m))),
        );
      } else {
        saved = await Ministry.create(payload);
        setMinistries((prev) => sortMinistries([...prev, saved]));
      }

      handleDialogClose(false);
    } catch (error) {
      console.error("Failed to save ministry:", error);
      setFormError(error.message || "Unable to save ministry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (ministry) => {
    if (!canManage) return;
    const confirmed = window.confirm(
      `Delete ministry "${ministry.name}" (${ministry.code})? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await Ministry.delete(ministry.code);
      setMinistries((prev) => prev.filter((m) => m.code !== ministry.code));
    } catch (error) {
      console.error("Failed to delete ministry:", error);
      alert("Unable to delete ministry. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading ministries...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Ministry Management</h1>
            <p className="text-slate-600 mt-1">Manage ministries in the In-Kind Tracker.</p>
          </div>
          {canManage && (
            <Button onClick={openCreateDialog} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              Add Ministry
            </Button>
          )}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Church className="w-5 h-5 text-emerald-600" />
              Ministries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[140px]">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-[120px]">Has Scale</TableHead>
                    {canManage && <TableHead className="w-[180px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ministries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} className="text-center py-10 text-slate-500">
                        No ministries found. Add your first ministry to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {ministries.map((ministry) => (
                    <TableRow key={ministry.code}>
                      <TableCell className="font-mono text-sm text-slate-700">{ministry.code}</TableCell>
                      <TableCell className="font-medium">{ministry.name}</TableCell>
                      <TableCell className="text-slate-700">{ministry.has_scale ? "Yes" : "No"}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(ministry)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(ministry)}
                              title="Delete ministry"
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
                <DialogTitle>{editingMinistry ? "Edit Ministry" : "Add Ministry"}</DialogTitle>
                <DialogDescription>
                  Set the ministry code, name, and whether the ministry has a scale, then save your changes.
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Code</label>
                  <Input
                    value={formState.code}
                    onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. FOOD_BANK"
                    required
                    disabled={Boolean(editingMinistry)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Unique code used as the identifier (letters, numbers, hyphens, or underscores).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                  <Input
                    value={formState.name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ministry name"
                    required
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">Has Scale</p>
                    <p className="text-xs text-slate-500">Indicates if this ministry uses weight-based tracking.</p>
                  </div>
                  <Switch
                    checked={formState.has_scale}
                    onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, has_scale: checked }))}
                    aria-label="Has scale"
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
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingMinistry ? "Save Changes" : "Create Ministry"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}













