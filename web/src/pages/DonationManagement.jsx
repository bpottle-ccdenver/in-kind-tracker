import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Donation, Ministry, Organization, Individual } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { HandCoins, Plus, Search, Upload, X } from "lucide-react";
import { useLocation } from "react-router-dom";

const GL_CODES = [
  { code: "7101", label: "7101 Rent/Space" },
  { code: "7301", label: "7301 Client Meals" },
  { code: "7380", label: "7380 Supplies" },
  { code: "7404", label: "7404 Contracted Outside Services" },
  { code: "7601", label: "7601 Food" },
  { code: "7604", label: "7604 Transportation" },
  { code: "7606", label: "7606 Personal Needs" },
  { code: "7607", label: "7607 General" },
];

const NONE_VALUE = "__none__";

function toInputDate(value) {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

const defaultFormState = {
  date_received: toInputDate(new Date()),
  gl_acct: "",
  quantity: "",
  amount: "",
  description: "",
  ministry_code: "",
  organization_code: "",
  individual_id: "",
};

const defaultOrganizationForm = {
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

const defaultIndividualForm = {
  first_name: "",
  last_name: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

const sortDonations = (list = []) =>
  [...list].sort((a, b) => {
    const dateA = a?.date_received || "";
    const dateB = b?.date_received || "";
    if (dateA !== dateB) {
      return dateA < dateB ? 1 : -1;
    }
    return (b?.donation_id ?? 0) - (a?.donation_id ?? 0);
  });

const sortByName = (arr, key = "name") =>
  [...(arr || [])].sort((a, b) => (a?.[key] ?? "").localeCompare(b?.[key] ?? "", undefined, { sensitivity: "base" }));

const defaultDonationFilters = {
  date_start: "",
  date_end: "",
  gl_acct: "",
  quantity: "",
  amount: "",
  total_fair_market_value: "",
  description: "",
  ministry_code: "",
  organization_code: "",
  individual: "",
};

function toComparableDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString().slice(0, 10);
}

function normalizeSearchTerm(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function buildOrganizationSearchText(org) {
  if (!org) return "";
  return [
    org.code,
    org.organization_code,
    org.name,
    org.organization_name,
    org.contact_first_name,
    org.contact_last_name,
    org.contact_email,
    org.address,
    org.city,
    org.state,
    org.zip,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildIndividualSearchText(ind) {
  if (!ind) return "";
  return [
    ind.id,
    ind.individual_id,
    ind.first_name,
    ind.individual_first_name,
    ind.last_name,
    ind.individual_last_name,
    ind.email,
    ind.address,
    ind.city,
    ind.state,
    ind.zip,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function DonationManagement() {
  const [donations, setDonations] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState(null);
  const [formState, setFormState] = useState(defaultFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [organizationPickerOpen, setOrganizationPickerOpen] = useState(false);
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [individualPickerOpen, setIndividualPickerOpen] = useState(false);
  const [individualSearch, setIndividualSearch] = useState("");
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [organizationDialogOpen, setOrganizationDialogOpen] = useState(false);
  const [organizationForm, setOrganizationForm] = useState(defaultOrganizationForm);
  const [organizationFormError, setOrganizationFormError] = useState("");
  const [isOrganizationSubmitting, setIsOrganizationSubmitting] = useState(false);
  const [individualDialogOpen, setIndividualDialogOpen] = useState(false);
  const [individualForm, setIndividualForm] = useState(defaultIndividualForm);
  const [individualFormError, setIndividualFormError] = useState("");
  const [isIndividualSubmitting, setIsIndividualSubmitting] = useState(false);
  const [donationFieldFilters, setDonationFieldFilters] = useState(defaultDonationFilters);
  const [sortConfig, setSortConfig] = useState({ key: "date_received", direction: "desc" });
  const fileInputRef = useRef(null);
  const { canView, canManage } = usePermission("donation");
  const { canManage: canManageOrganization } = usePermission("organization");
  const { canManage: canManageIndividual } = usePermission("individual");
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const filteredIndividualId = useMemo(() => {
    const raw = searchParams.get("individual_id");
    if (!raw) return null;
    const numeric = Number(raw);
    if (!Number.isInteger(numeric) || numeric <= 0) return null;
    return numeric;
  }, [searchParams]);
  const isStandalone = searchParams.get("standalone") === "1";

  const totalFairMarketValue = useMemo(() => {
    const qty = parseFloat(formState.quantity);
    const amt = parseFloat(formState.amount);
    if (Number.isFinite(qty) && Number.isFinite(amt)) {
      return (qty * amt).toFixed(2);
    }
    return "0.00";
  }, [formState.quantity, formState.amount]);

  const selectedOrganizationCode =
    formState.organization_code && formState.organization_code !== NONE_VALUE ? formState.organization_code : null;
  const selectedIndividualId =
    formState.individual_id && formState.individual_id !== NONE_VALUE ? formState.individual_id : null;

  const selectedOrganization = useMemo(() => {
    if (!selectedOrganizationCode) return null;
    return (
      organizations.find((org) => (org?.code ?? org?.organization_code) === selectedOrganizationCode) ?? null
    );
  }, [organizations, selectedOrganizationCode]);

  const selectedIndividual = useMemo(() => {
    if (!selectedIndividualId) return null;
    return individuals.find((ind) => String(ind?.id ?? ind?.individual_id) === String(selectedIndividualId)) ?? null;
  }, [individuals, selectedIndividualId]);

  const filteredOrganizations = useMemo(() => {
    const term = normalizeSearchTerm(organizationSearch);
    if (!term) return organizations;
    return organizations.filter((org) => buildOrganizationSearchText(org).includes(term));
  }, [organizations, organizationSearch]);

  const filteredIndividuals = useMemo(() => {
    const term = normalizeSearchTerm(individualSearch);
    if (!term) return individuals;
    return individuals.filter((ind) => buildIndividualSearchText(ind).includes(term));
  }, [individuals, individualSearch]);

  const individualNameById = useMemo(() => {
    const map = new Map();
    for (const ind of individuals || []) {
      const id = ind?.id ?? ind?.individual_id;
      if (id == null) continue;
      const firstName = ind?.first_name ?? ind?.individual_first_name ?? "";
      const lastName = ind?.last_name ?? ind?.individual_last_name ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim();
      if (name) {
        map.set(String(id), name);
      }
    }
    return map;
  }, [individuals]);

  const selectedOrganizationLabel = (() => {
    if (!selectedOrganizationCode) return "";
    const code = selectedOrganization?.code ?? selectedOrganization?.organization_code ?? selectedOrganizationCode;
    const name = selectedOrganization?.name ?? selectedOrganization?.organization_name ?? code;
    return `${name} (${code})`;
  })();

  const selectedIndividualLabel = (() => {
    if (!selectedIndividualId) return "";
    const id = selectedIndividual?.id ?? selectedIndividual?.individual_id ?? selectedIndividualId;
    const firstName = selectedIndividual?.first_name ?? selectedIndividual?.individual_first_name ?? "";
    const lastName = selectedIndividual?.last_name ?? selectedIndividual?.individual_last_name ?? "";
    const name = [firstName, lastName].filter(Boolean).join(" ").trim() || `ID ${id}`;
    return name;
  })();

  const getIndividualDisplayName = useCallback(
    (individualId) => {
      if (individualId == null || individualId === "") return "-";
      const key = String(individualId);
      return individualNameById.get(key) || `ID ${key}`;
    },
    [individualNameById],
  );

  const getDonationTotalFmv = (donation) => {
    if (donation?.total_fair_market_value != null && Number.isFinite(Number(donation.total_fair_market_value))) {
      return Number(donation.total_fair_market_value);
    }
    return Number(donation?.quantity || 0) * Number(donation?.amount || 0);
  };

  const visibleDonations = useMemo(() => {
    const normalizedFilters = Object.fromEntries(
      Object.entries(donationFieldFilters).map(([key, value]) => [key, String(value ?? "").trim().toLowerCase()]),
    );
    const startDate = toComparableDate(donationFieldFilters.date_start);
    const endDate = toComparableDate(donationFieldFilters.date_end);
    const hasDateRangeFilter = Boolean(startDate || endDate);

    const filtered = donations.filter((donation) => {
      const donationDate = toComparableDate(donation?.date_received);
      const quantity = String(donation?.quantity ?? "");
      const amount = String(donation?.amount ?? "");
      const totalFmv = String(getDonationTotalFmv(donation));
      const individualDisplay = getIndividualDisplayName(donation?.individual_id);
      const inDateRange =
        !hasDateRangeFilter ||
        (Boolean(donationDate) && (!startDate || donationDate >= startDate) && (!endDate || donationDate <= endDate));

      return (
        inDateRange &&
        (!normalizedFilters.gl_acct || String(donation?.gl_acct ?? "").toLowerCase().includes(normalizedFilters.gl_acct)) &&
        (!normalizedFilters.quantity || quantity.toLowerCase().includes(normalizedFilters.quantity)) &&
        (!normalizedFilters.amount || amount.toLowerCase().includes(normalizedFilters.amount)) &&
        (!normalizedFilters.total_fair_market_value || totalFmv.toLowerCase().includes(normalizedFilters.total_fair_market_value)) &&
        (!normalizedFilters.description ||
          String(donation?.description ?? "").toLowerCase().includes(normalizedFilters.description)) &&
        (!normalizedFilters.ministry_code ||
          String(donation?.ministry_code ?? "").toLowerCase().includes(normalizedFilters.ministry_code)) &&
        (!normalizedFilters.organization_code ||
          String(donation?.organization_code ?? "").toLowerCase().includes(normalizedFilters.organization_code)) &&
        (!normalizedFilters.individual || individualDisplay.toLowerCase().includes(normalizedFilters.individual))
      );
    });

    return [...filtered].sort((a, b) => {
      if (!sortConfig?.key) {
        return 0;
      }
      const getSortValue = (donation) => {
        switch (sortConfig.key) {
          case "date_received":
            return donation?.date_received || "";
          case "gl_acct":
            return donation?.gl_acct || "";
          case "quantity":
            return Number(donation?.quantity ?? 0);
          case "amount":
            return Number(donation?.amount ?? 0);
          case "total_fair_market_value":
            return getDonationTotalFmv(donation);
          case "description":
            return donation?.description || "";
          case "ministry_code":
            return donation?.ministry_code || "";
          case "organization_code":
            return donation?.organization_code || "";
          case "individual":
            return getIndividualDisplayName(donation?.individual_id);
          default:
            return donation?.[sortConfig.key] ?? "";
        }
      };

      const valA = getSortValue(a);
      const valB = getSortValue(b);
      let comparison = 0;

      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { sensitivity: "base", numeric: true });
      }

      if (comparison === 0) {
        return (b?.donation_id ?? 0) - (a?.donation_id ?? 0);
      }
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [donationFieldFilters, donations, sortConfig, getIndividualDisplayName]);

  const handleFilterChange = (field, value) => {
    setDonationFieldFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.key === field) {
        return { key: field, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: field, direction: "asc" };
    });
  };

  const sortIndicator = (field) => {
    if (sortConfig.key !== field) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const resetOrganizationForm = () => {
    setOrganizationForm(defaultOrganizationForm);
    setOrganizationFormError("");
    setIsOrganizationSubmitting(false);
  };

  const resetIndividualForm = () => {
    setIndividualForm(defaultIndividualForm);
    setIndividualFormError("");
    setIsIndividualSubmitting(false);
  };

  const handleCreateOrganization = async (event) => {
    event.preventDefault();
    if (!canManageOrganization || isOrganizationSubmitting) return;
    setIsOrganizationSubmitting(true);
    setOrganizationFormError("");

    const trimmedCode = organizationForm.code?.trim().toUpperCase();
    const trimmedName = organizationForm.name?.trim();

    if (!trimmedCode) {
      setOrganizationFormError("Code is required.");
      setIsOrganizationSubmitting(false);
      return;
    }
    if (!/^[A-Z0-9_-]{2,50}$/.test(trimmedCode)) {
      setOrganizationFormError("Code must be 2-50 characters using letters, numbers, hyphens, or underscores.");
      setIsOrganizationSubmitting(false);
      return;
    }

    if (!trimmedName) {
      setOrganizationFormError("Name is required.");
      setIsOrganizationSubmitting(false);
      return;
    }

    if (organizationForm.zip && !/^\d{5}$/.test(organizationForm.zip.trim())) {
      setOrganizationFormError("Zip must be exactly 5 digits.");
      setIsOrganizationSubmitting(false);
      return;
    }

    try {
      const payload = {
        organization_code: trimmedCode,
        organization_name: trimmedName,
        contact_first_name: organizationForm.contact_first_name?.trim() || null,
        contact_last_name: organizationForm.contact_last_name?.trim() || null,
        contact_email: organizationForm.contact_email?.trim() || null,
        address: organizationForm.address?.trim() || null,
        city: organizationForm.city?.trim() || null,
        state: organizationForm.state?.trim() || null,
        zip: organizationForm.zip?.trim() || null,
      };
      const saved = await Organization.create(payload);
      setOrganizations((prev) => sortByName([...prev, saved], "name"));
      setFormState((prev) => ({ ...prev, organization_code: saved.code ?? saved.organization_code ?? "" }));
      setOrganizationDialogOpen(false);
      resetOrganizationForm();
    } catch (error) {
      console.error("Failed to create organization:", error);
      setOrganizationFormError(error.message || "Unable to create organization.");
    } finally {
      setIsOrganizationSubmitting(false);
    }
  };

  const handleCreateIndividual = async (event) => {
    event.preventDefault();
    if (!canManageIndividual || isIndividualSubmitting) return;
    setIsIndividualSubmitting(true);
    setIndividualFormError("");

    const trimmedFirst = individualForm.first_name?.trim();
    const trimmedLast = individualForm.last_name?.trim();

    if (!trimmedFirst) {
      setIndividualFormError("First name is required.");
      setIsIndividualSubmitting(false);
      return;
    }
    if (!trimmedLast) {
      setIndividualFormError("Last name is required.");
      setIsIndividualSubmitting(false);
      return;
    }
    if (individualForm.zip && !/^\d{5}$/.test(individualForm.zip.trim())) {
      setIndividualFormError("Zip must be exactly 5 digits.");
      setIsIndividualSubmitting(false);
      return;
    }

    try {
      const payload = {
        individual_first_name: trimmedFirst,
        individual_last_name: trimmedLast,
        email: individualForm.email?.trim() || null,
        address: individualForm.address?.trim() || null,
        city: individualForm.city?.trim() || null,
        state: individualForm.state?.trim().toUpperCase() || null,
        zip: individualForm.zip?.trim() || null,
      };
      const saved = await Individual.create(payload);
      setIndividuals((prev) =>
        [...prev, saved].sort((a, b) =>
          `${a?.last_name ?? ""} ${a?.first_name ?? ""}`.localeCompare(
            `${b?.last_name ?? ""} ${b?.first_name ?? ""}`,
            undefined,
            { sensitivity: "base" },
          ),
        ),
      );
      setFormState((prev) => ({ ...prev, individual_id: saved.id ?? saved.individual_id ?? "" }));
      setIndividualDialogOpen(false);
      resetIndividualForm();
    } catch (error) {
      console.error("Failed to create individual:", error);
      setIndividualFormError(error.message || "Unable to create individual.");
    } finally {
      setIsIndividualSubmitting(false);
    }
  };

  const donationFilters = useMemo(() => {
    if (!filteredIndividualId) return {};
    return { individual_id: filteredIndividualId };
  }, [filteredIndividualId]);

  useEffect(() => {
    if (!canView) {
      setDonations([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [donationList, ministryList, orgList, indivList] = await Promise.all([
          Donation.list(donationFilters),
          Ministry.list(),
          Organization.list(),
          Individual.list(),
        ]);
        if (!isActive) return;
        setDonations(sortDonations(donationList));
        setMinistries(sortByName(ministryList, "name"));
        setOrganizations(sortByName(orgList, "name"));
        setIndividuals(
          [...(indivList || [])].sort((a, b) =>
            `${a?.last_name ?? ""} ${a?.first_name ?? ""}`.localeCompare(
              `${b?.last_name ?? ""} ${b?.first_name ?? ""}`,
              undefined,
              { sensitivity: "base" },
            ),
          ),
        );
      } catch (error) {
        console.error("Error loading donations:", error);
        if (isActive) {
          setDonations([]);
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
  }, [canView, donationFilters]);

  if (!canView) {
    return <AccessDenied message="You need permission to view donations." />;
  }

  const resetForm = () => {
    setFormState({
      ...defaultFormState,
      date_received: toInputDate(new Date()),
    });
    setEditingDonation(null);
    setFormError("");
    setIsSubmitting(false);
    setOrganizationSearch("");
    setOrganizationPickerOpen(false);
    setIndividualSearch("");
    setIndividualPickerOpen(false);
  };

  const openCreateDialog = () => {
    if (!canManage) return;
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (donation) => {
    if (!canManage) return;
    setEditingDonation(donation);
    setFormState({
      date_received: toInputDate(donation.date_received),
      gl_acct: donation.gl_acct || "",
      quantity: donation.quantity ?? "",
      amount: donation.amount ?? "",
      description: donation.description || "",
      ministry_code: donation.ministry_code || "",
      organization_code: donation.organization_code || "",
      individual_id: donation.individual_id ?? "",
    });
    setFormError("");
    setDialogOpen(true);
  };

  const selectOrganization = (orgCode) => {
    setFormState((prev) => ({ ...prev, organization_code: orgCode || NONE_VALUE }));
    setOrganizationPickerOpen(false);
  };

  const selectIndividual = (indId) => {
    setFormState((prev) => ({ ...prev, individual_id: indId || NONE_VALUE }));
    setIndividualPickerOpen(false);
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

    if (!formState.date_received) {
      setFormError("Date received is required.");
      setIsSubmitting(false);
      return;
    }

    if (!formState.gl_acct || !/^\d{4}$/.test(formState.gl_acct)) {
      setFormError("GL Account is required and must be 4 digits.");
      setIsSubmitting(false);
      return;
    }
    if (!GL_CODES.find((c) => c.code === formState.gl_acct)) {
      setFormError("GL Account must be one of the allowed codes.");
      setIsSubmitting(false);
      return;
    }

    const parsedQty = Number(formState.quantity);
    if (!Number.isFinite(parsedQty)) {
      setFormError("Quantity must be a number.");
      setIsSubmitting(false);
      return;
    }

    const parsedAmount = Number(formState.amount);
    if (!Number.isFinite(parsedAmount)) {
      setFormError("Amount must be a valid currency amount.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        date_received: formState.date_received,
        gl_acct: formState.gl_acct,
        quantity: parsedQty,
        amount: Number(parsedAmount.toFixed(2)),
        description: formState.description?.trim() || null,
        ministry_code: formState.ministry_code === NONE_VALUE ? null : formState.ministry_code || null,
        organization_code: formState.organization_code === NONE_VALUE ? null : formState.organization_code || null,
        individual_id: formState.individual_id === NONE_VALUE ? null : formState.individual_id || null,
      };

      let saved;
      if (editingDonation) {
        saved = await Donation.update(editingDonation.donation_id, payload);
        setDonations((prev) =>
          sortDonations(prev.map((d) => (d.donation_id === editingDonation.donation_id ? saved : d))),
        );
      } else {
        saved = await Donation.create(payload);
        setDonations((prev) => sortDonations([...prev, saved]));
      }

      handleDialogClose(false);
    } catch (error) {
      console.error("Failed to save donation:", error);
      setFormError(error.message || "Unable to save donation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (donation) => {
    if (!canManage) return;
    const confirmed = window.confirm(`Delete donation #${donation.donation_id}? This action cannot be undone.`);
    if (!confirmed) return;
    try {
      await Donation.delete(donation.donation_id);
      setDonations((prev) => prev.filter((d) => d.donation_id !== donation.donation_id));
    } catch (error) {
      console.error("Failed to delete donation:", error);
      alert("Unable to delete donation. Please try again.");
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
      const summary = await Donation.importCsv(file);
      setUploadSummary(summary);
      const donationList = await Donation.list(donationFilters);
      setDonations(sortDonations(donationList));
    } catch (error) {
      console.error("Failed to import donations:", error);
      setUploadError(error.message || "Unable to import donations. Please try again.");
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const formatCurrency = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "$0.00";
    return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
  };

  if (isLoading) {
    return <div className="p-6">Loading donations...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Donation Management</h1>
            <p className="text-slate-600 mt-1">Track donations with GL codes and related records.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isStandalone && (
              <Button type="button" variant="outline" className="gap-2" onClick={() => window.close()}>
                Close
              </Button>
            )}
            {canManage && (
              <>
                <Button onClick={openCreateDialog} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <HandCoins className="w-4 h-4" />
                  Add Donation
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                />
              </>
            )}
          </div>
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
              : `Imported ${uploadSummary?.created ?? 0} donations. Skipped ${
                  uploadSummary?.skipped?.blank ?? 0
                } blank row(s). ${uploadSummary?.errors?.length ?? 0} error(s).`}
          </div>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandCoins className="w-5 h-5 text-emerald-600" />
              Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-700">Filter by field</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDonationFieldFilters(defaultDonationFilters)}>
                  Clear filters
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                <Input
                  type="date"
                  aria-label="Start date"
                  value={donationFieldFilters.date_start}
                  onChange={(e) => handleFilterChange("date_start", e.target.value)}
                />
                <Input
                  type="date"
                  aria-label="End date"
                  value={donationFieldFilters.date_end}
                  onChange={(e) => handleFilterChange("date_end", e.target.value)}
                />
                <Input placeholder="GL Code" value={donationFieldFilters.gl_acct} onChange={(e) => handleFilterChange("gl_acct", e.target.value)} />
                <Input placeholder="Quantity" value={donationFieldFilters.quantity} onChange={(e) => handleFilterChange("quantity", e.target.value)} />
                <Input placeholder="Amount" value={donationFieldFilters.amount} onChange={(e) => handleFilterChange("amount", e.target.value)} />
                <Input placeholder="Total FMV" value={donationFieldFilters.total_fair_market_value} onChange={(e) => handleFilterChange("total_fair_market_value", e.target.value)} />
                <Input placeholder="Description" value={donationFieldFilters.description} onChange={(e) => handleFilterChange("description", e.target.value)} />
                <Input placeholder="Ministry" value={donationFieldFilters.ministry_code} onChange={(e) => handleFilterChange("ministry_code", e.target.value)} />
                <Input placeholder="Organization" value={donationFieldFilters.organization_code} onChange={(e) => handleFilterChange("organization_code", e.target.value)} />
                <Input placeholder="Individual" value={donationFieldFilters.individual} onChange={(e) => handleFilterChange("individual", e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[90px]"><button type="button" onClick={() => toggleSort("date_received")}>Date {sortIndicator("date_received")}</button></TableHead>
                    <TableHead className="w-[110px]"><button type="button" onClick={() => toggleSort("gl_acct")}>GL Code {sortIndicator("gl_acct")}</button></TableHead>
                    <TableHead className="w-[90px]"><button type="button" onClick={() => toggleSort("quantity")}>Qty {sortIndicator("quantity")}</button></TableHead>
                    <TableHead className="w-[110px]"><button type="button" onClick={() => toggleSort("amount")}>Amount {sortIndicator("amount")}</button></TableHead>
                    <TableHead className="w-[140px]"><button type="button" onClick={() => toggleSort("total_fair_market_value")}>Total FMV {sortIndicator("total_fair_market_value")}</button></TableHead>
                    <TableHead><button type="button" onClick={() => toggleSort("description")}>Description {sortIndicator("description")}</button></TableHead>
                    <TableHead><button type="button" onClick={() => toggleSort("ministry_code")}>Ministry {sortIndicator("ministry_code")}</button></TableHead>
                    <TableHead><button type="button" onClick={() => toggleSort("organization_code")}>Organization {sortIndicator("organization_code")}</button></TableHead>
                    <TableHead><button type="button" onClick={() => toggleSort("individual")}>Individual {sortIndicator("individual")}</button></TableHead>
                    {canManage && <TableHead className="w-[160px] text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleDonations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canManage ? 10 : 9} className="text-center py-10 text-slate-500">
                        No donations found for the selected filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {visibleDonations.map((donation) => (
                    <TableRow key={donation.donation_id}>
                      <TableCell className="text-slate-700">{formatDate(donation.date_received)}</TableCell>
                      <TableCell className="font-mono text-sm text-slate-700">{donation.gl_acct}</TableCell>
                      <TableCell className="text-slate-700">{donation.quantity ?? "—"}</TableCell>
                      <TableCell className="text-slate-700">{formatCurrency(donation.amount)}</TableCell>
                      <TableCell className="text-slate-700">
                        {formatCurrency(getDonationTotalFmv(donation))}
                      </TableCell>
                      <TableCell className="text-slate-700">{donation.description || "—"}</TableCell>
                      <TableCell className="text-slate-700">{donation.ministry_code || "—"}</TableCell>
                      <TableCell className="text-slate-700">{donation.organization_code || "—"}</TableCell>
                      <TableCell className="text-slate-700">{getIndividualDisplayName(donation.individual_id)}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditDialog(donation)}
                            >
                              <HandCoins className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(donation)}
                              title="Delete donation"
                            >
                              ✕
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
          <DialogContent className="max-w-4xl bg-white">
            <DialogHeader>
              <DialogTitle>{editingDonation ? "Edit Donation" : "Add Donation"}</DialogTitle>
              <DialogDescription>Set the donation details, then save your changes.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Date Received</label>
                  <Input
                    type="date"
                    value={formState.date_received}
                    onChange={(e) => setFormState((prev) => ({ ...prev, date_received: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">GL Account</label>
                  <Select
                    value={formState.gl_acct}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, gl_acct: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GL Code" />
                    </SelectTrigger>
                    <SelectContent>
                      {GL_CODES.map((gl) => (
                        <SelectItem key={gl.code} value={gl.code}>
                          {gl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Quantity</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={formState.quantity}
                    onChange={(e) => setFormState((prev) => ({ ...prev, quantity: e.target.value }))}
                    placeholder="e.g. 10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Amount</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={formState.amount}
                    onChange={(e) => setFormState((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="e.g. 25.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Total Fair Market Value</label>
                  <Input value={formatCurrency(totalFairMarketValue)} readOnly disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
                  <Input
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Ministry</label>
                  <Select
                    value={formState.ministry_code || NONE_VALUE}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, ministry_code: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ministry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {ministries.map((ministry) => (
                        <SelectItem
                          key={ministry.code ?? ministry.ministry_code}
                          value={String(ministry.code ?? ministry.ministry_code ?? "").trim() || NONE_VALUE}
                        >
                          {ministry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Organization</label>
                  <div className="flex items-center gap-2">
                    <Input value={selectedOrganizationLabel} placeholder="None" readOnly />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setOrganizationSearch("");
                        setOrganizationPickerOpen(true);
                      }}
                      title="Find organization"
                    >
                      <Search className="h-4 w-4" />
                      Find
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        resetOrganizationForm();
                        setOrganizationDialogOpen(true);
                      }}
                      title="Add organization"
                      disabled={!canManageOrganization}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!selectedOrganizationCode}
                      onClick={() => setFormState((prev) => ({ ...prev, organization_code: NONE_VALUE }))}
                      title="Clear organization"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Individual</label>
                  <div className="flex items-center gap-2">
                    <Input value={selectedIndividualLabel} placeholder="None" readOnly />
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setIndividualSearch("");
                        setIndividualPickerOpen(true);
                      }}
                      title="Find individual"
                    >
                      <Search className="h-4 w-4" />
                      Find
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        resetIndividualForm();
                        setIndividualDialogOpen(true);
                      }}
                      title="Add individual"
                      disabled={!canManageIndividual}
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={!selectedIndividualId}
                      onClick={() => setFormState((prev) => ({ ...prev, individual_id: NONE_VALUE }))}
                      title="Clear individual"
                    >
                      <X className="h-4 w-4" />
                    </Button>
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
                  {isSubmitting ? "Saving..." : editingDonation ? "Save Changes" : "Create Donation"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={organizationDialogOpen}
        onOpenChange={(open) => {
          setOrganizationDialogOpen(open);
          if (!open) {
            resetOrganizationForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>Create a new organization record.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateOrganization}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Code</label>
                <Input
                  value={organizationForm.code}
                  onChange={(e) =>
                    setOrganizationForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g. ORG_ABC"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <Input
                  value={organizationForm.name}
                  onChange={(e) => setOrganizationForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Organization name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Contact First Name</label>
                <Input
                  value={organizationForm.contact_first_name}
                  onChange={(e) => setOrganizationForm((prev) => ({ ...prev, contact_first_name: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Contact Last Name</label>
                <Input
                  value={organizationForm.contact_last_name}
                  onChange={(e) => setOrganizationForm((prev) => ({ ...prev, contact_last_name: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Contact Email</label>
                <Input
                  type="email"
                  value={organizationForm.contact_email}
                  onChange={(e) => setOrganizationForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                  placeholder="contact@example.org"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
                <Input
                  value={organizationForm.address}
                  onChange={(e) => setOrganizationForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">City</label>
                <Input
                  value={organizationForm.city}
                  onChange={(e) => setOrganizationForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">State</label>
                <Input
                  value={organizationForm.state}
                  onChange={(e) => setOrganizationForm((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Zip</label>
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  value={organizationForm.zip}
                  onChange={(e) =>
                    setOrganizationForm((prev) => ({
                      ...prev,
                      zip: e.target.value.replace(/\D/g, "").slice(0, 5),
                    }))
                  }
                  placeholder="ZIP code"
                />
              </div>
            </div>

            {organizationFormError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {organizationFormError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setOrganizationDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isOrganizationSubmitting}>
                {isOrganizationSubmitting ? "Saving..." : "Create Organization"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={individualDialogOpen}
        onOpenChange={(open) => {
          setIndividualDialogOpen(open);
          if (!open) {
            resetIndividualForm();
          }
        }}
      >
        <DialogContent className="max-w-3xl bg-white">
          <DialogHeader>
            <DialogTitle>Add Individual</DialogTitle>
            <DialogDescription>Create a new individual record.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateIndividual}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">First Name</label>
                <Input
                  value={individualForm.first_name}
                  onChange={(e) => setIndividualForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  placeholder="First name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Last Name</label>
                <Input
                  value={individualForm.last_name}
                  onChange={(e) => setIndividualForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                <Input
                  type="email"
                  value={individualForm.email}
                  onChange={(e) => setIndividualForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="person@example.org"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
                <Input
                  value={individualForm.address}
                  onChange={(e) => setIndividualForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">City</label>
                <Input
                  value={individualForm.city}
                  onChange={(e) => setIndividualForm((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">State</label>
                <Input
                  value={individualForm.state}
                  onChange={(e) => setIndividualForm((prev) => ({ ...prev, state: e.target.value }))}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Zip</label>
                <Input
                  inputMode="numeric"
                  maxLength={5}
                  value={individualForm.zip}
                  onChange={(e) =>
                    setIndividualForm((prev) => ({
                      ...prev,
                      zip: e.target.value.replace(/\D/g, "").slice(0, 5),
                    }))
                  }
                  placeholder="ZIP code"
                />
              </div>
            </div>

            {individualFormError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {individualFormError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIndividualDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isIndividualSubmitting}>
                {isIndividualSubmitting ? "Saving..." : "Create Individual"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={organizationPickerOpen} onOpenChange={setOrganizationPickerOpen}>
        <DialogContent className="max-w-5xl bg-white">
          <DialogHeader>
            <DialogTitle>Select Organization</DialogTitle>
            <DialogDescription>Search by organization name, email, or any part of the address.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={organizationSearch}
              onChange={(e) => setOrganizationSearch(e.target.value)}
              placeholder="Search by name, email, address, city, state, zip, code..."
              autoFocus
            />
            <Button type="button" variant="outline" onClick={() => selectOrganization(null)}>
              None
            </Button>
          </div>

          <div className="text-sm text-slate-500">{filteredOrganizations.length} result(s)</div>

          <ScrollArea className="h-[60vh] rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow>
                  <TableHead className="w-[140px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[120px] text-right">Select</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrganizations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                      No matching organizations.
                    </TableCell>
                  </TableRow>
                )}
                {filteredOrganizations.map((org) => {
                  const code = org.code ?? org.organization_code ?? "";
                  const name = org.name ?? org.organization_name ?? "";
                  const email = org.contact_email ?? "";
                  const address = [org.address, org.city, org.state, org.zip].filter(Boolean).join(", ");
                  return (
                    <TableRow key={code || name}>
                      <TableCell className="font-mono text-sm text-slate-700">{code || "—"}</TableCell>
                      <TableCell className="text-slate-800">{name || "—"}</TableCell>
                      <TableCell className="text-slate-700">{email || "—"}</TableCell>
                      <TableCell className="text-slate-700">{address || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => selectOrganization(String(code).trim())}
                          disabled={!code}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={individualPickerOpen} onOpenChange={setIndividualPickerOpen}>
        <DialogContent className="max-w-5xl bg-white">
          <DialogHeader>
            <DialogTitle>Select Individual</DialogTitle>
            <DialogDescription>Search by individual name, email, or any part of the address.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={individualSearch}
              onChange={(e) => setIndividualSearch(e.target.value)}
              placeholder="Search by name, email, address, city, state, zip, id..."
              autoFocus
            />
            <Button type="button" variant="outline" onClick={() => selectIndividual(null)}>
              None
            </Button>
          </div>

          <div className="text-sm text-slate-500">{filteredIndividuals.length} result(s)</div>

          <ScrollArea className="h-[60vh] rounded-md border">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow>
                  <TableHead className="w-[140px]">Id</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[120px] text-right">Select</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIndividuals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                      No matching individuals.
                    </TableCell>
                  </TableRow>
                )}
                {filteredIndividuals.map((ind) => {
                  const id = ind.id ?? ind.individual_id ?? "";
                  const firstName = ind.first_name ?? ind.individual_first_name ?? "";
                  const lastName = ind.last_name ?? ind.individual_last_name ?? "";
                  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
                  const email = ind.email ?? "";
                  const address = [ind.address, ind.city, ind.state, ind.zip].filter(Boolean).join(", ");
                  return (
                    <TableRow key={id || name}>
                      <TableCell className="font-mono text-sm text-slate-700">{id || "—"}</TableCell>
                      <TableCell className="text-slate-800">{name || "—"}</TableCell>
                      <TableCell className="text-slate-700">{email || "—"}</TableCell>
                      <TableCell className="text-slate-700">{address || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => selectIndividual(String(id).trim())}
                          disabled={!id}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}


