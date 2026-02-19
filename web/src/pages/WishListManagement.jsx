import React, { useEffect, useMemo, useState } from "react";
import { Ministry, WishList } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { ClipboardList, Plus, Pencil, Trash2 } from "lucide-react";

const NONE_VALUE = "__all__";

const WISH_TYPES = [
  "Capital Item Over 10K",
  "In-kind Item",
  "Volunteer Needs",
  "Monetary Donation",
  "Professional Services",
];

const WISH_STATUSES = ["Open Request", "In Progress", "Fulfilled"];

const defaultFormState = {
  item_name: "",
  ministry_code: "",
  type: WISH_TYPES[0],
  description: "",
  status: "Open Request",
};

const sortByUpdated = (list = []) =>
  [...list].sort((a, b) => {
    const statusA = a?.status ?? "";
    const statusB = b?.status ?? "";
    if (statusA !== statusB) return statusA.localeCompare(statusB);
    const dateA = a?.updated_at ? new Date(a.updated_at).getTime() : 0;
    const dateB = b?.updated_at ? new Date(b.updated_at).getTime() : 0;
    if (dateA !== dateB) return dateB - dateA;
    return (b?.wishlist_id ?? 0) - (a?.wishlist_id ?? 0);
  });

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

function getItemNamePlaceholder(type) {
  switch (type) {
    case "In-kind Item":
      return "e.g. (non-cash tangible contribution)";
    case "Volunteer Needs":
      return "e.g. (help with general / program activities)";
    case "Monetary Donation":
      return "e.g. (Financial support for the program add details in Description field)";
    case "Professional Services":
      return "e.g. (Donated Time)";
    default:
      return "e.g. Freezer (commercial grade)";
  }
}

export default function WishListManagement() {
  const { canView, canManage } = usePermission("wish_list");
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [ministries, setMinistries] = useState([]);
  const [selectedMinistry, setSelectedMinistry] = useState(NONE_VALUE);
  const [items, setItems] = useState([]);

  const ministryOptions = useMemo(() => {
    const list = Array.isArray(ministries) ? ministries : [];
    return [...list].sort((a, b) => (a?.name ?? "").localeCompare(b?.name ?? "", undefined, { sensitivity: "base" }));
  }, [ministries]);

  const loadItems = async (ministryCodeValue) => {
    const code = ministryCodeValue && ministryCodeValue !== NONE_VALUE ? ministryCodeValue : null;
    const list = await WishList.list({ ministry_code: code });
    setItems(sortByUpdated(list));
  };

  useEffect(() => {
    if (!canView) {
      setIsLoading(false);
      setItems([]);
      setMinistries([]);
      return;
    }

    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const [ministryList] = await Promise.all([Ministry.list()]);
        if (!isActive) return;
        setMinistries(Array.isArray(ministryList) ? ministryList : []);
        await loadItems(selectedMinistry);
      } catch (error) {
        console.error("Error loading wish list:", error);
        if (isActive) {
          setItems([]);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    loadItems(selectedMinistry).catch((err) => console.error("Failed to load wish list items:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMinistry]);

  if (!canView) {
    return <AccessDenied message="You need permission to view wish list items." />;
  }

  const resetForm = () => {
    setEditingItem(null);
    setFormState({
      ...defaultFormState,
      ministry_code: selectedMinistry !== NONE_VALUE ? selectedMinistry : "",
    });
    setFormError("");
    setIsSubmitting(false);
  };

  const openCreateDialog = () => {
    if (!canManage) return;
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item) => {
    if (!canManage) return;
    setEditingItem(item);
    setFormState({
      item_name: item.item_name || "",
      ministry_code: item.ministry_code || "",
      type: item.type || WISH_TYPES[0],
      description: item.description || "",
      status: item.status || "Open Request",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const handleDialogClose = (open) => {
    setDialogOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage || isSubmitting) return;
    setIsSubmitting(true);
    setFormError("");

    const itemName = formState.item_name?.trim();
    const ministryCode = formState.ministry_code?.trim().toUpperCase();

    if (!itemName) {
      setFormError("Item name is required.");
      setIsSubmitting(false);
      return;
    }
    if (!ministryCode) {
      setFormError("Ministry is required.");
      setIsSubmitting(false);
      return;
    }
    if (!/^[A-Z0-9_-]{2,50}$/.test(ministryCode)) {
      setFormError("Ministry code must be 2-50 characters using letters, numbers, hyphens, or underscores.");
      setIsSubmitting(false);
      return;
    }
    if (!WISH_TYPES.includes(formState.type)) {
      setFormError("Type is required.");
      setIsSubmitting(false);
      return;
    }
    if (!WISH_STATUSES.includes(formState.status)) {
      setFormError("Status is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        item_name: itemName,
        ministry_code: ministryCode,
        type: formState.type,
        description: formState.description?.trim() || null,
        status: formState.status,
      };

      let saved;
      if (editingItem) {
        saved = await WishList.update(editingItem.wishlist_id, payload);
        setItems((prev) => sortByUpdated(prev.map((x) => (x.wishlist_id === saved.wishlist_id ? saved : x))));
      } else {
        saved = await WishList.create(payload);
        setItems((prev) => sortByUpdated([saved, ...prev]));
      }

      handleDialogClose(false);
      if (selectedMinistry !== NONE_VALUE) {
        setSelectedMinistry(ministryCode);
      }
    } catch (error) {
      console.error("Failed to save wish list item:", error);
      setFormError(error.message || "Unable to save wish list item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!canManage) return;
    const confirmed = window.confirm(`Delete wish list item "${item.item_name}"? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await WishList.delete(item.wishlist_id);
      setItems((prev) => prev.filter((x) => x.wishlist_id !== item.wishlist_id));
    } catch (error) {
      console.error("Failed to delete wish list item:", error);
      alert("Unable to delete wish list item. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading wish list...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Wish List</h1>
            <p className="text-slate-600 mt-1">Track requested items, volunteer needs, and donation opportunities.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="min-w-[260px]">
              <Select value={selectedMinistry} onValueChange={setSelectedMinistry}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by ministry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>All ministries</SelectItem>
                  {ministryOptions.map((m) => (
                    <SelectItem key={m.code} value={m.code}>
                      {m.name} ({m.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canManage && (
              <Button onClick={openCreateDialog} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            )}
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Wish List Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[220px]">Ministry</TableHead>
                    <TableHead className="w-[180px]">Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="w-[150px]">Status</TableHead>
                    <TableHead className="w-[180px]">Updated</TableHead>
                    {canManage && <TableHead className="w-[160px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="text-center py-10 text-slate-500">
                        No wish list items found. Add your first request to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((item) => (
                    <TableRow key={item.wishlist_id}>
                      <TableCell className="text-slate-700">
                        <div className="font-medium">{item.ministry_name || item.ministry_code}</div>
                        <div className="text-xs text-slate-500 font-mono">{item.ministry_code}</div>
                      </TableCell>
                      <TableCell className="text-slate-700">{item.type}</TableCell>
                      <TableCell className="text-slate-800">
                        <div className="font-medium">{item.item_name}</div>
                        {item.description ? (
                          <div className="text-xs text-slate-500 line-clamp-2">{item.description}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-slate-700">{item.status}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{formatDateTime(item.updated_at)}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditDialog(item)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(item)}
                              title="Delete item"
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
          <DialogContent className="max-w-3xl bg-white">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Wish List Item" : "Add Wish List Item"}</DialogTitle>
              <DialogDescription>Fill in the wish list details, then save your changes.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Ministry</label>
                  <Select
                    value={formState.ministry_code}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, ministry_code: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ministry" />
                    </SelectTrigger>
                    <SelectContent>
                      {ministryOptions.map((m) => (
                        <SelectItem key={m.code} value={m.code}>
                          {m.name} ({m.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Item Name</label>
                  <Input
                    value={formState.item_name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, item_name: e.target.value }))}
                    placeholder={getItemNamePlaceholder(formState.type)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Type</label>
                  <Select value={formState.type} onValueChange={(value) => setFormState((prev) => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {WISH_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
                  <Select
                    value={formState.status}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {WISH_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                <Textarea
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Details, size, quantity, desired timeframe, etc."
                  rows={4}
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
                  {isSubmitting ? "Saving..." : editingItem ? "Save Changes" : "Create Item"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
