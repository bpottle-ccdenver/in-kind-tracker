import { useEffect, useMemo, useState } from "react";
import { Donation, Organization, Individual } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AccessDenied from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";
import { Activity, RefreshCcw, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function monthKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function monthLabel(date) {
  return date.toLocaleString(undefined, { month: "short" });
}

function formatCurrency(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function Dial({ label, value, subtitle }) {
  const pct = clamp(Number(value) || 0, 0, 100);
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 120 120" className="h-28 w-28">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(226 232 240)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgb(16 185 129)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-xl font-bold text-slate-800">{Math.round(pct)}%</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        <div className="text-sm text-slate-600">{subtitle}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { canView } = usePermission("donation");
  const [isLoading, setIsLoading] = useState(true);
  const [donations, setDonations] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [individuals, setIndividuals] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!canView) {
      setDonations([]);
      setOrganizations([]);
      setIndividuals([]);
      setIsLoading(false);
      return;
    }

    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      setLoadError("");
      try {
        const [donationList, orgList, indList] = await Promise.all([
          Donation.list(),
          Organization.list(),
          Individual.list(),
        ]);
        if (!isActive) return;
        setDonations(Array.isArray(donationList) ? donationList : []);
        setOrganizations(Array.isArray(orgList) ? orgList : []);
        setIndividuals(Array.isArray(indList) ? indList : []);
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        if (isActive) {
          setLoadError(err?.message || "Failed to load dashboard data.");
          setDonations([]);
          setOrganizations([]);
          setIndividuals([]);
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [canView]);

  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => startOfDay(now), [now]);
  const day30Start = useMemo(() => addDays(today, -30), [today]);
  const day60Start = useMemo(() => addDays(today, -60), [today]);

  const donationFacts = useMemo(() => {
    const totals = {
      allValue: 0,
      allCount: 0,
      last30Value: 0,
      last30Count: 0,
      prev30Value: 0,
      prev30Count: 0,
      orgDonations: 0,
      individualDonations: 0,
      identifiedDonations: 0,
      donors: new Set(),
      topDonors: new Map(),
    };

    for (const d of donations || []) {
      const value =
        d?.total_fair_market_value != null && Number.isFinite(Number(d.total_fair_market_value))
          ? Number(d.total_fair_market_value)
          : Number(d?.quantity || 0) * Number(d?.amount || 0);
      const date = toDate(d?.date_received);
      totals.allCount += 1;
      totals.allValue += Number.isFinite(value) ? value : 0;

      const orgCode = d?.organization_code || "";
      const indId = d?.individual_id || "";
      const hasOrg = Boolean(orgCode);
      const hasInd = Boolean(indId);
      if (hasOrg) totals.orgDonations += 1;
      if (hasInd) totals.individualDonations += 1;
      if (hasOrg || hasInd) totals.identifiedDonations += 1;

      if (hasOrg) totals.donors.add(`org:${orgCode}`);
      if (hasInd) totals.donors.add(`ind:${indId}`);

      const donorKey = hasOrg ? `org:${orgCode}` : hasInd ? `ind:${indId}` : null;
      if (donorKey) {
        totals.topDonors.set(donorKey, (totals.topDonors.get(donorKey) || 0) + (Number.isFinite(value) ? value : 0));
      }

      if (!date) continue;
      if (date >= day30Start && date <= now) {
        totals.last30Count += 1;
        totals.last30Value += Number.isFinite(value) ? value : 0;
      } else if (date >= day60Start && date < day30Start) {
        totals.prev30Count += 1;
        totals.prev30Value += Number.isFinite(value) ? value : 0;
      }
    }

    const donorCount = totals.donors.size;
    const identifiedPct = totals.allCount ? (totals.identifiedDonations / totals.allCount) * 100 : 0;

    const deltaValue = totals.prev30Value === 0 ? null : ((totals.last30Value - totals.prev30Value) / totals.prev30Value) * 100;
    const avgValue = totals.allCount ? totals.allValue / totals.allCount : 0;

    const topDonorList = [...totals.topDonors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, totalValue]) => ({ key, totalValue }));

    return {
      ...totals,
      donorCount,
      identifiedPct,
      deltaValue,
      avgValue,
      topDonorList,
    };
  }, [donations, day30Start, day60Start, now]);

  const monthlySeries = useMemo(() => {
    const buckets = new Map();
    const base = new Date(now.getFullYear(), now.getMonth(), 1);
    const months = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const key = monthKey(d);
      months.push({ key, label: `${monthLabel(d)} ${String(d.getFullYear()).slice(-2)}` });
      buckets.set(key, { month: `${monthLabel(d)} ${String(d.getFullYear()).slice(-2)}`, value: 0, count: 0 });
    }

    for (const d of donations || []) {
      const date = toDate(d?.date_received);
      if (!date) continue;
      const key = monthKey(date);
      if (!buckets.has(key)) continue;
      const row = buckets.get(key);
      const value =
        d?.total_fair_market_value != null && Number.isFinite(Number(d.total_fair_market_value))
          ? Number(d.total_fair_market_value)
          : Number(d?.quantity || 0) * Number(d?.amount || 0);
      row.value += Number.isFinite(value) ? value : 0;
      row.count += 1;
    }

    return months.map((m) => buckets.get(m.key));
  }, [donations, now]);

  const dailySeries = useMemo(() => {
    const buckets = new Map();
    const days = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = addDays(today, -i);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}` });
      buckets.set(key, { day: `${d.getMonth() + 1}/${d.getDate()}`, value: 0, count: 0 });
    }

    for (const donation of donations || []) {
      const date = toDate(donation?.date_received);
      if (!date) continue;
      const dayKey = startOfDay(date).toISOString().slice(0, 10);
      if (!buckets.has(dayKey)) continue;
      const row = buckets.get(dayKey);
      const value =
        donation?.total_fair_market_value != null && Number.isFinite(Number(donation.total_fair_market_value))
          ? Number(donation.total_fair_market_value)
          : Number(donation?.quantity || 0) * Number(donation?.amount || 0);
      row.value += Number.isFinite(value) ? value : 0;
      row.count += 1;
    }

    return days.map((d) => buckets.get(d.key));
  }, [donations, today]);

  const topDonorRows = useMemo(() => {
    const orgByCode = new Map((organizations || []).map((o) => [o?.code ?? o?.organization_code, o]));
    const indByCode = new Map((individuals || []).map((i) => [String(i?.id ?? i?.individual_id), i]));

    return (donationFacts.topDonorList || []).map(({ key, totalValue }) => {
      const [type, code] = String(key).split(":");
      if (type === "org") {
        const org = orgByCode.get(code);
        const name = org?.name ?? org?.organization_name ?? code;
        const email = org?.contact_email ?? "";
        return { type: "Organization", code, name, email, totalValue };
      }
      const ind = indByCode.get(code);
      const firstName = ind?.first_name ?? ind?.individual_first_name ?? "";
      const lastName = ind?.last_name ?? ind?.individual_last_name ?? "";
      const name = [firstName, lastName].filter(Boolean).join(" ").trim() || `ID ${code}`;
      const email = ind?.email ?? "";
      return { type: "Individual", code, name, email, totalValue };
    });
  }, [donationFacts.topDonorList, individuals, organizations]);

  const orgSharePct = donationFacts.identifiedDonations
    ? (donationFacts.orgDonations / donationFacts.identifiedDonations) * 100
    : 0;

  if (!canView) {
    return <AccessDenied message="You need permission to view donations to access the dashboard." />;
  }

  if (isLoading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-slate-600 mt-1">Quick insights across donations and donors.</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => window.location.reload()}
            title="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {loadError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4 text-emerald-600" />
                Total Donation Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(donationFacts.allValue)}</div>
              <div className="text-sm text-slate-500">{formatNumber(donationFacts.allCount)} donations</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                New (Last 30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{formatNumber(donationFacts.last30Count)}</div>
              <div className="text-sm text-slate-500">{formatCurrency(donationFacts.last30Value)} value</div>
              <div className="text-xs text-slate-400 mt-1">
                {donationFacts.deltaValue == null
                  ? "No prior 30-day baseline"
                  : `${donationFacts.deltaValue >= 0 ? "+" : ""}${donationFacts.deltaValue.toFixed(1)}% vs previous 30 days`}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-emerald-600" />
                Total Donors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{formatNumber(donationFacts.donorCount)}</div>
              <div className="text-sm text-slate-500">
                {formatNumber(organizations.length)} orgs, {formatNumber(individuals.length)} individuals
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Average Donation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-800">{formatCurrency(donationFacts.avgValue)}</div>
              <div className="text-sm text-slate-500">all-time average</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle>Donations Over Time (12 months)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-[320px] w-full"
                config={{
                  value: { label: "Total value", color: "hsl(160 84% 39%)" },
                }}
              >
                <LineChart data={monthlySeries} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickMargin={8} />
                  <YAxis tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`} width={56} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <div className="flex w-full justify-between gap-3">
                            <span className="text-muted-foreground">Total value</span>
                            <span className="font-mono font-medium tabular-nums">{formatCurrency(value)}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Dials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Dial
                label="Identified donors"
                value={donationFacts.identifiedPct}
                subtitle={`${formatNumber(donationFacts.identifiedDonations)} of ${formatNumber(donationFacts.allCount)} donations have an org/individual`}
              />
              <Dial
                label="Org share"
                value={orgSharePct}
                subtitle={`Within identified donations: ${formatNumber(donationFacts.orgDonations)} org vs ${formatNumber(
                  donationFacts.individualDonations,
                )} individual`}
              />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Last 30 Days (daily)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="h-[260px] w-full"
                config={{
                  count: { label: "Donations", color: "hsl(221 83% 53%)" },
                }}
              >
                <BarChart data={dailySeries} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickMargin={6} interval={4} />
                  <YAxis allowDecimals={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Top Donors (by value)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[110px]">Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[140px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topDonorRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                          No donor data yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {topDonorRows.map((row) => (
                      <TableRow key={`${row.type}-${row.code}`}>
                        <TableCell className="text-slate-700">{row.type}</TableCell>
                        <TableCell className="text-slate-800">
                          <div className="font-medium">{row.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{row.code}</div>
                        </TableCell>
                        <TableCell className="text-slate-700">{row.email || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-slate-800">{formatCurrency(row.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
