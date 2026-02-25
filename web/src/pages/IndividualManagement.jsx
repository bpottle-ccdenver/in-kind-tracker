import React, { useEffect, useMemo, useRef, useState } from "react";
import { Individual, Donation } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Download, HandCoins, Pencil, Plus, Trash2, Upload, User } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

const defaultFormState = {
  first_name: "",
  last_name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  email: "",
};

const defaultFilterState = {
  id: "",
  first_name: "",
  last_name: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

const statesWithCoFirst = [
  "CO",
  "AL","AK","AZ","AR","CA","CT","DE","FL","GA","HI","IA","ID","IL","IN","KS","KY","LA",
  "MA","MD","ME","MI","MN","MO","MS","MT","NC","ND","NE","NH","NJ","NM","NV","NY",
  "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VA","VT","WA","WI","WV","WY",
];

const sortIndividuals = (list = []) =>
  [...list].sort((a, b) =>
    (a?.last_name ?? "").localeCompare(b?.last_name ?? "", undefined, { sensitivity: "base" }) ||
    (a?.first_name ?? "").localeCompare(b?.first_name ?? "", undefined, { sensitivity: "base" }) ||
    Number(a?.id ?? 0) - Number(b?.id ?? 0),
  );

export default function IndividualManagement() {
  const [individuals, setIndividuals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndividual, setEditingIndividual] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [filterState, setFilterState] = useState(defaultFilterState);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const fileInputRef = useRef(null);
  const { canView, canManage } = usePermission("individual");
  const { canView: canViewDonations } = usePermission("donation");
  const [selectedIndividualId, setSelectedIndividualId] = useState(null);
  const [individualDonations, setIndividualDonations] = useState([]);
  const [isDonationLoading, setIsDonationLoading] = useState(false);
  const [donationError, setDonationError] = useState("");

  useEffect(() => {
    if (!canView) {
      setIndividuals([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const individualList = await Individual.list();
        if (!isActive) return;
        setIndividuals(Array.isArray(individualList) ? sortIndividuals(individualList) : []);
      } catch (error) {
        console.error("Error loading individuals:", error);
        if (isActive) {
          setIndividuals([]);
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
    return <AccessDenied message="You need permission to view individuals." />;
  }

  const openIndividualDonations = (individual) => {
    const id = individual?.id ?? individual?.individual_id ?? null;
    setSelectedIndividualId(id ? String(id) : null);
  };

  const selectedIndividual = useMemo(() => {
    if (!selectedIndividualId) return null;
    return individuals.find((ind) => String(ind?.id ?? ind?.individual_id) === selectedIndividualId) ?? null;
  }, [individuals, selectedIndividualId]);

  useEffect(() => {
    const individualId = selectedIndividual?.id ?? selectedIndividual?.individual_id;
    if (!canViewDonations || !individualId) {
      setIndividualDonations([]);
      setDonationError("");
      setIsDonationLoading(false);
      return;
    }

    let isActive = true;
    const loadDonations = async () => {
      setIsDonationLoading(true);
      setDonationError("");
      try {
        const list = await Donation.list({ individual_id: individualId });
        if (!isActive) return;
        setIndividualDonations(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Failed to load individual donations:", error);
        if (isActive) {
          setDonationError(error.message || "Unable to load donations.");
          setIndividualDonations([]);
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
  }, [canViewDonations, selectedIndividual]);

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

  const filteredIndividuals = useMemo(() => {
    const activeFilters = Object.entries(filterState)
      .map(([key, value]) => [key, value.trim().toLowerCase()])
      .filter(([, value]) => value.length > 0);

    if (activeFilters.length === 0) return individuals;

    return individuals.filter((individual) =>
      activeFilters.every(([key, value]) => {
        const fieldValue = String(individual?.[key] ?? "").toLowerCase();
        return fieldValue.includes(value);
      }),
    );
  }, [filterState, individuals]);

  const sortedIndividuals = useMemo(() => {
    if (!sortConfig.key) return filteredIndividuals;
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;
    const getValue = (individual) => {
      switch (key) {
        case "name":
          return [individual?.first_name, individual?.last_name].filter(Boolean).join(" ");
        case "location":
          return [individual?.city, individual?.state].filter(Boolean).join(", ");
        default:
          return individual?.[key];
      }
    };

    return [...filteredIndividuals].sort((a, b) => {
      const left = String(getValue(a) ?? "").toLowerCase();
      const right = String(getValue(b) ?? "").toLowerCase();
      return left.localeCompare(right, undefined, { sensitivity: "base" }) * multiplier;
    });
  }, [filteredIndividuals, sortConfig]);

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

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingIndividual(null);
    setFormError("");
    setIsSubmitting(false);
  };

  const openCreateDialog = () => {
    if (!canManage) return;
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (individual) => {
    if (!canManage) return;
    setEditingIndividual(individual);
    setFormState({
      first_name: individual.first_name || "",
      last_name: individual.last_name || "",
      address: individual.address || "",
      city: individual.city || "",
      state: individual.state || "",
      zip: individual.zip || "",
      email: individual.email || "",
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

    const trimmedFirst = formState.first_name?.trim();
    const trimmedLast = formState.last_name?.trim();

    if (!trimmedFirst) {
      setFormError("First name is required.");
      setIsSubmitting(false);
      return;
    }
    if (!trimmedLast) {
      setFormError("Last name is required.");
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
        individual_first_name: trimmedFirst,
        individual_last_name: trimmedLast,
        address: formState.address?.trim() || null,
        city: formState.city?.trim() || null,
        state: formState.state?.trim().toUpperCase() || null,
        zip: formState.zip?.trim() || null,
        email: formState.email?.trim() || null,
      };

      let saved;
      if (editingIndividual) {
        const updatePayload = { ...payload };
        saved = await Individual.update(editingIndividual.id, updatePayload);
        setIndividuals((prev) =>
          sortIndividuals(prev.map((ind) => (ind.id === editingIndividual.id ? saved : ind))),
        );
      } else {
        saved = await Individual.create(payload);
        setIndividuals((prev) => sortIndividuals([...prev, saved]));
      }

      handleDialogClose(false);
    } catch (error) {
      console.error("Failed to save individual:", error);
      setFormError(error.message || "Unable to save individual. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (individual) => {
    if (!canManage) return;
    const confirmed = window.confirm(
      `Delete individual "${individual.first_name} ${individual.last_name}" (ID ${individual.id})? This action cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await Individual.delete(individual.id);
      setIndividuals((prev) => prev.filter((ind) => ind.id !== individual.id));
    } catch (error) {
      console.error("Failed to delete individual:", error);
      alert("Unable to delete individual. Please try again.");
    }
  };

  const handleCsvUpload = async (event) => {
    if (!canManage || isUploading) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError("");
    setUploadSummary(null);

    try {
      const summary = await Individual.importCsv(file);
      setUploadSummary(summary);
      const individualList = await Individual.list();
      setIndividuals(Array.isArray(individualList) ? sortIndividuals(individualList) : []);
    } catch (error) {
      console.error("Failed to import individuals:", error);
      setUploadError(error.message || "Unable to import individuals. Please try again.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading individuals...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Individual Management</h1>
            <p className="text-slate-600 mt-1">Manage individuals in the In-Kind Tracker.</p>
            <p className="text-slate-600">Yea! Codex works!</p>
          </div>
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={openCreateDialog} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4" />
                Add Individual
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="w-4 h-4" />
                {isUploading ? "Uploading..." : "Upload CSV"}
              </Button>
              <Button type="button" variant="outline" className="gap-2" asChild>
                <a href="/individual-upload-sample.csv" download>
                  <Download className="w-4 h-4" />
                  Sample CSV
                </a>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {canManage && (uploadError || uploadSummary) && (
          <div
            className={`rounded-md border px-3 py-2 text-sm ${
              uploadError
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {uploadError
              ? uploadError
              : `Imported ${uploadSummary?.created ?? 0} individuals. Skipped ${
                  uploadSummary?.skipped?.email ?? 0
                } duplicate email(s), ${uploadSummary?.skipped?.blank ?? 0} blank row(s). ${
                  uploadSummary?.errors?.length ?? 0
                } error(s).`}
          </div>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-700">Individual Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-2">Filter by field</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Input
                    value={filterState.id}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, id: e.target.value }))}
                    placeholder="Id"
                  />
                  <Input
                    value={filterState.first_name}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, first_name: e.target.value }))}
                    placeholder="First Name"
                  />
                  <Input
                    value={filterState.last_name}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Last Name"
                  />
                  <Input
                    value={filterState.email}
                    onChange={(e) => setFilterState((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
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
                  Showing {filteredIndividuals.length} of {individuals.length} individual(s).
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
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Individuals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[120px]" aria-sort={ariaSortFor("id")}>
                      <button
                        type="button"
                        onClick={() => handleSort("id")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Id
                        <span className="text-xs text-slate-500">{sortLabel("id")}</span>
                      </button>
                    </TableHead>
                    <TableHead aria-sort={ariaSortFor("name")}>
                      <button
                        type="button"
                        onClick={() => handleSort("name")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Individual
                        <span className="text-xs text-slate-500">{sortLabel("name")}</span>
                      </button>
                    </TableHead>
                    <TableHead aria-sort={ariaSortFor("email")}>
                      <button
                        type="button"
                        onClick={() => handleSort("email")}
                        className="inline-flex items-center gap-2 text-left font-semibold text-slate-700 hover:text-slate-900"
                      >
                        Email
                        <span className="text-xs text-slate-500">{sortLabel("email")}</span>
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
                  {filteredIndividuals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 5 : 4} className="text-center py-10 text-slate-500">
                        {individuals.length === 0
                          ? "No individuals found. Add your first individual to get started."
                          : "No individuals match the current filter."}
                      </TableCell>
                    </TableRow>
                  )}
                  {sortedIndividuals.map((individual) => {
                    const individualId = individual?.id ?? individual?.individual_id;
                    const isSelected =
                      selectedIndividualId && String(selectedIndividualId) === String(individualId);
                    const fullName = [individual.first_name, individual.last_name].filter(Boolean).join(" ");

                    return (
                      <React.Fragment key={individualId ?? individual.email}>
                        <TableRow
                          onClick={() => openIndividualDonations(individual)}
                          className={`cursor-pointer hover:bg-slate-50 ${isSelected ? "bg-emerald-50" : ""}`}
                        >
                          <TableCell className="font-mono text-sm text-slate-700">{individualId}</TableCell>
                          <TableCell className="font-medium">{fullName}</TableCell>
                          <TableCell className="text-slate-700">{individual.email || "—"}</TableCell>
                          <TableCell className="text-slate-700">
                            {[individual.city, individual.state].filter(Boolean).join(", ") || "—"}
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
                                    openEditDialog(individual);
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
                                    handleDelete(individual);
                                  }}
                                  title="Delete individual"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        {isSelected && (
                          <TableRow>
                            <TableCell colSpan={canManage ? 5 : 4} className="bg-slate-50">
                              <div className="flex items-center justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                                  <HandCoins className="w-4 h-4 text-emerald-600" />
                                  Donations for {fullName || `ID ${individualId}`}
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    {isDonationLoading ? "..." : individualDonations.length}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedIndividualId(null)}
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
                                      {individualDonations.length === 0 && (
                                        <TableRow>
                                          <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                                            No donations found for this individual.
                                          </TableCell>
                                        </TableRow>
                                      )}
                                      {individualDonations.map((donation) => (
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
              <DialogTitle>{editingIndividual ? "Edit Individual" : "Add Individual"}</DialogTitle>
              <DialogDescription>Set the individual details, then save your changes.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">First Name</label>
                    <Input
                      value={formState.first_name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, first_name: e.target.value }))}
                      placeholder="First name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Last Name</label>
                    <Input
                      value={formState.last_name}
                      onChange={(e) => setFormState((prev) => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Last name"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                  <Input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="person@example.org"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
                  <Input
                    value={formState.address}
                    onChange={(e) => setFormState((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Street address"
                  />
                </div>
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
                    {statesWithCoFirst.map((stateCode) => (
                      <option key={stateCode} value={stateCode}>
                        {stateCode}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Zip</label>
                  <Input
                    inputMode="numeric"
                    maxLength={5}
                    value={formState.zip}
                    onChange={(e) => setFormState((prev) => ({ ...prev, zip: e.target.value }))}
                    placeholder="ZIP code (5 digits)"
                  />
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
                  {isSubmitting ? "Saving..." : editingIndividual ? "Save Changes" : "Create Individual"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
