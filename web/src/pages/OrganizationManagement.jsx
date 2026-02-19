import React, { useEffect, useMemo, useState } from "react";
import { Donation, Organization } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Building2, HandCoins } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

const defaultFormState = {
  code: "",
  name: "",
  contact_first_name: "",
  contact_last_name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  contact_email: "",
};

const sortOrganizations = (list = []) =>
  [...list].sort((a, b) =>
    (a?.name ?? "").localeCompare(b?.name ?? "", undefined, { sensitivity: "base" }) ||
    (a?.code ?? "").localeCompare(b?.code ?? "", undefined, { sensitivity: "base" }),
  );

const defaultFilterState = {
  code: "",
  name: "",
  contact_first_name: "",
  contact_last_name: "",
  contact_email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export default function OrganizationManagement() {
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterState, setFilterState] = useState(defaultFilterState);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedOrganizationCode, setSelectedOrganizationCode] = useState(null);
  const [organizationDonations, setOrganizationDonations] = useState([]);
  const [isDonationLoading, setIsDonationLoading] = useState(false);
  const [donationError, setDonationError] = useState("");
  const { canView, canManage } = usePermission("organization");
  const { canView: canViewDonations } = usePermission("donation");

  useEffect(() => {
    if (!canView) {
      setOrganizations([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const organizationList = await Organization.list();
        if (!isActive) return;
        setOrganizations(Array.isArray(organizationList) ? sortOrganizations(organizationList) : []);
      } catch (error) {
        console.error("Error loading organizations:", error);
        if (isActive) {
          setOrganizations([]);
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
    return <AccessDenied message="You need permission to view organizations." />;
  }

  const openOrganizationDonations = (organization) => {
    const code = organization?.code ?? organization?.organization_code ?? null;
    setSelectedOrganizationCode(code ? String(code) : null);
  };

  useEffect(() => {
    if (!canViewDonations || !selectedOrganizationCode) {
      setOrganizationDonations([]);
      setDonationError("");
      setIsDonationLoading(false);
      return;
    }

    let isActive = true;
    const loadDonations = async () => {
      setIsDonationLoading(true);
      setDonationError("");
      try {
        const list = await Donation.list({ organization_code: selectedOrganizationCode });
        if (!isActive) return;
        setOrganizationDonations(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Failed to load organization donations:", error);
        if (isActive) {
          setDonationError(error.message || "Unable to load donations.");
          setOrganizationDonations([]);
        }
      } finally {
        if (isActive) {
          setIsDonationLoading(false);
        }
      }
    };

    loadDonations();

    return () => {
      isActive = false;
    };
  }, [canViewDonations, selectedOrganizationCode]);

  const filteredOrganizations = useMemo(() => {
    const activeFilters = Object.entries(filterState)
      .map(([key, value]) => [key, value.trim().toLowerCase()])
      .filter(([, value]) => value.length > 0);

    if (activeFilters.length === 0) return organizations;

    return organizations.filter((org) =>
      activeFilters.every(([key, value]) => {
        const fieldValue = String(org?.[key] ?? "").toLowerCase();
        return fieldValue.includes(value);
      }),
    );
  }, [filterState, organizations]);

  const sortedOrganizations = useMemo(() => {
    if (!sortConfig.key) return filteredOrganizations;
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;
    const getValue = (org) => {
      switch (key) {
        case "contact":
          return `${org?.contact_first_name ?? ""} ${org?.contact_last_name ?? ""}`.trim();
        case "location":
          return [org?.city, org?.state].filter(Boolean).join(", ");
        default:
          return org?.[key];
      }
    };

    return [...filteredOrganizations].sort((a, b) => {
      const left = String(getValue(a) ?? "").toLowerCase();
      const right = String(getValue(b) ?? "").toLowerCase();
      return left.localeCompare(right, undefined, { sensitivity: "base" }) * multiplier;
    });
  }, [filteredOrganizations, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: "asc" };
      }
      return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
    });
  };

  const ariaSortFor = (key) => {
    if (sortConfig.key !== key) return "none";
    return sortConfig.direction === "asc" ? "ascending" : "descending";
  };

  const sortLabel = (key) => {
    if (sortConfig.key !== key) return "Sort";
    return sortConfig.direction === "asc" ? "Sort: Asc" : "Sort: Desc";
  };

  const formatCurrency = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "$0.00";
    return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    const dd = String(parsed.getDate()).padStart(2, "0");
    const yyyy = parsed.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingOrganization(null);
    setFormError("");
    setIsSubmitting(false);
  };

  const openCreateDialog = () => {
    if (!canManage) return;
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (organization) => {
    if (!canManage) return;
    setEditingOrganization(organization);
    setFormState({
      code: organization.code || "",
      name: organization.name || "",
      contact_first_name: organization.contact_first_name || "",
      contact_last_name: organization.contact_last_name || "",
      address: organization.address || "",
      city: organization.city || "",
      state: organization.state || "",
      zip: organization.zip || "",
      contact_email: organization.contact_email || "",
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

    if (formState.zip && !/^\d{5}$/.test(formState.zip.trim())) {
      setFormError("Zip must be exactly 5 digits.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        organization_code: trimmedCode,
        organization_name: trimmedName,
        contact_first_name: formState.contact_first_name?.trim() || null,
        contact_last_name: formState.contact_last_name?.trim() || null,
        address: formState.address?.trim() || null,
        city: formState.city?.trim() || null,
        state: formState.state?.trim() || null,
        zip: formState.zip?.trim() || null,
        contact_email: formState.contact_email?.trim() || null,
      };

      let saved;
      if (editingOrganization) {
        const updatePayload = { ...payload };
        delete updatePayload.organization_code;
        saved = await Organization.update(editingOrganization.code, updatePayload);
        setOrganizations((prev) =>
          sortOrganizations(prev.map((org) => (org.code === editingOrganization.code ? saved : org))),
        );
      } else {
        saved = await Organization.create(payload);
        setOrganizations((prev) => sortOrganizations([...prev, saved]));
      }

      handleDialogClose(false);
    } catch (error) {
      console.error("Failed to save organization:", error);
      setFormError(error.message || "Unable to save organization. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (organization) => {
    if (!canManage) return;
    const confirmed = window.confirm(
      `Delete organization "${organization.name}" (${organization.code})? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await Organization.delete(organization.code);
      setOrganizations((prev) => prev.filter((org) => org.code !== organization.code));
    } catch (error) {
      console.error("Failed to delete organization:", error);
      alert("Unable to delete organization. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading organizations...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Organization Management</h1>
            <p className="text-slate-600 mt-1">Manage partner organizations in the In-Kind Tracker.</p>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-700">Organization Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-2">Filter by field</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Input
                    value={filterState.code}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="Code"
                  />
                  <Input
                    value={filterState.name}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Organization Name"
                  />
                  <Input
                    value={filterState.contact_first_name}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, contact_first_name: e.target.value }))}
                    placeholder="Contact first name"
                  />
                  <Input
                    value={filterState.contact_last_name}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, contact_last_name: e.target.value }))}
                    placeholder="Contact last name"
                  />
                  <Input
                    value={filterState.contact_email}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="Contact email"
                  />
                  <Input
                    value={filterState.address}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Address"
                  />
                  <Input
                    value={filterState.city}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                  />
                  <Input
                    value={filterState.state}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                  />
                  <Input
                    value={filterState.zip}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, zip: e.target.value }))}
                    placeholder="Zip"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Showing {filteredOrganizations.length} of {organizations.length} organization(s).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilterState(defaultFilterState)}
                className="whitespace-nowrap"
              >
                Clear filters
              </Button>
              {canManage && (
                <Button onClick={openCreateDialog} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4" />
                  Add Organization
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[140px]" aria-sort={ariaSortFor("code")}>
                      <button
                        type="button"
                        onClick={() => handleSort("code")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Code
                        <span className="text-xs text-slate-500">{sortLabel("code")}</span>
                      </button>
                    </TableHead>
                    <TableHead aria-sort={ariaSortFor("name")}>
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Organization
                        <span className="text-xs text-slate-500">{sortLabel("name")}</span>
                      </button>
                    </TableHead>
                    <TableHead aria-sort={ariaSortFor("contact")}>
                      <button
                        type="button"
                        onClick={() => handleSort("contact")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Contact
                        <span className="text-xs text-slate-500">{sortLabel("contact")}</span>
                      </button>
                    </TableHead>
                    <TableHead aria-sort={ariaSortFor("contact_email")}>
                      <button
                        type="button"
                        onClick={() => handleSort("contact_email")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Email
                        <span className="text-xs text-slate-500">{sortLabel("contact_email")}</span>
                      </button>
                    </TableHead>
                    <TableHead aria-sort={ariaSortFor("location")}>
                      <button
                        type="button"
                        onClick={() => handleSort("location")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Location
                        <span className="text-xs text-slate-500">{sortLabel("location")}</span>
                      </button>
                    </TableHead>
                    {canManage && <TableHead className="w-[180px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganizations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 6 : 5} className="text-center py-10 text-slate-500">
                        {organizations.length === 0
                          ? "No organizations found. Add your first organization to get started."
                          : "No organizations match the current filter."}
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedOrganizations.map((org) => {
                    const organizationCode = org.code ?? org.organization_code;
                    const organizationName = org.name ?? org.organization_name;
                    const isSelected =
                      selectedOrganizationCode && String(selectedOrganizationCode) === String(organizationCode);
                    const contactName =
                      org.contact_first_name || org.contact_last_name
                        ? `${org.contact_first_name || ""} ${org.contact_last_name || ""}`.trim()
                        : "—";

                    return (
                      <React.Fragment key={organizationCode ?? organizationName}>
                        <TableRow
                          onClick={() => openOrganizationDonations(org)}
                          className={`cursor-pointer hover:bg-slate-50 ${isSelected ? "bg-emerald-50" : ""}`}
                        >
                          <TableCell className="font-mono text-sm text-slate-700">{organizationCode}</TableCell>
                          <TableCell className="font-medium">{organizationName}</TableCell>
                          <TableCell className="text-slate-700">{contactName}</TableCell>
                          <TableCell className="text-slate-700">{org.contact_email || "—"}</TableCell>
                          <TableCell className="text-slate-700">
                            {[org.city, org.state].filter(Boolean).join(", ") || "—"}
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEditDialog(org);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDelete(org);
                                  }}
                                  title="Delete organization"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        {isSelected && (
                          <TableRow>
                            <TableCell colSpan={canManage ? 6 : 5} className="bg-slate-50">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                  <HandCoins className="w-4 h-4 text-emerald-600" />
                                  Donations for {organizationName || `Code ${organizationCode}`}
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    {isDonationLoading ? "..." : organizationDonations.length}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedOrganizationCode(null)}
                                >
                                  Close
                                </Button>
                              </div>
                              {!canViewDonations && (
                                <div className="text-sm text-slate-600">
                                  You do not have permission to view donations.
                                </div>
                              )}
                              {canViewDonations && isDonationLoading && (
                                <div className="text-sm text-slate-600">Loading donations...</div>
                              )}
                              {canViewDonations && !isDonationLoading && donationError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                  {donationError}
                                </div>
                              )}
                              {canViewDonations && !isDonationLoading && !donationError && (
                                <div className="rounded-lg border overflow-hidden bg-white">
                                  <Table>
                                    <TableHeader className="bg-slate-100">
                                      <TableRow>
                                        <TableHead className="w-[110px]">Date</TableHead>
                                        <TableHead className="w-[110px]">GL Code</TableHead>
                                        <TableHead className="w-[90px]">Qty</TableHead>
                                        <TableHead className="w-[120px]">Amount</TableHead>
                                        <TableHead className="w-[140px]">Total FMV</TableHead>
                                        <TableHead>Description</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {organizationDonations.length === 0 && (
                                        <TableRow>
                                          <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                                            No donations found for this organization.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      {organizationDonations.map((donation) => (
                                        <TableRow key={donation.donation_id}>
                                          <TableCell className="text-slate-700">
                                            {formatDate(donation.date_received)}
                                          </TableCell>
                                          <TableCell className="font-mono text-sm text-slate-700">
                                            {donation.gl_acct}
                                          </TableCell>
                                          <TableCell className="text-slate-700">
                                            {donation.quantity ?? "—"}
                                          </TableCell>
                                          <TableCell className="text-slate-700">
                                            {formatCurrency(donation.amount)}
                                          </TableCell>
                                          <TableCell className="text-slate-700">
                                            {formatCurrency(
                                              donation.total_fair_market_value != null &&
                                                Number.isFinite(donation.total_fair_market_value)
                                                ? donation.total_fair_market_value
                                                : Number(donation.quantity || 0) * Number(donation.amount || 0),
                                            )}
                                          </TableCell>
                                          <TableCell className="text-slate-700">
                                            {donation.description || "—"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
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
              <DialogTitle>{editingOrganization ? "Edit Organization" : "Add Organization"}</DialogTitle>
              <DialogDescription>
                Set the organization details, then save your changes.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Code</label>
                  <Input
                    value={formState.code}
                    onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. ORG_ABC"
                    required
                    disabled={Boolean(editingOrganization)}
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
                    placeholder="Organization name"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Contact First Name</label>
                  <Input
                    value={formState.contact_first_name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, contact_first_name: e.target.value }))}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Contact Last Name</label>
                  <Input
                    value={formState.contact_last_name}
                    onChange={(e) => setFormState((prev) => ({ ...prev, contact_last_name: e.target.value }))}
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Contact Email</label>
                  <Input
                    type="email"
                    value={formState.contact_email}
                    onChange={(e) => setFormState((prev) => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="contact@example.org"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">City</label>
                    <Input
                      value={formState.city}
                      onChange={(e) => setFormState((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">State</label>
                    <select
                      value={formState.state}
                      onChange={(e) => setFormState((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Select a state</option>
                      <option value="CO">CO</option>
                      {[
                        "AL","AK","AZ","AR","CA","CT","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA",
                        "MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY",
                        "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY"
                      ].map((stateCode) => (
                        <option key={stateCode} value={stateCode}>
                          {stateCode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
                  <Input
                    value={formState.address}
                    onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Zip</label>
                    <Input
                      inputMode="numeric"
                      maxLength={5}
                      value={formState.zip}
                      onChange={(e) =>
                        setFormState((prev) => ({
                          ...prev,
                          zip: e.target.value.replace(/\D/g, "").slice(0, 5),
                        }))
                      }
                      placeholder="ZIP code (5 digits)"
                    />
                  </div>
                </div>
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
                  {isSubmitting ? "Saving..." : editingOrganization ? "Save Changes" : "Create Organization"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
