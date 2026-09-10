import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button, Icon, PageHeader,
  DataTable,
  TextField, SelectField, useToast, SlideOver,
  SectionCard, Chip,
} from "@/shared";
import { AppShell } from "@/shared/components/layout/AppShell";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, resourceApi } from "@/shared/lib/core";
import { buildAppNavigation, buildAppMobileNav } from "@/shared/navigation";
import type { FinanceRequestDeductionRecord } from "@/shared";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";
import { RequestDeductionDetailPanel } from "./RequestDeductionDetailPanel";
import { MediaPickerModal } from "@/shared/components/media/MediaPickerModal";
import { listFileAssets, uploadFileAsset } from "@/pages/files/files-api";
import { SlideOverContent, SlideOverFooter, SlideOverHeader } from "@/shared/components/ui/SlideOver";

type Account = { id: string; name: string; bank_name: string | null };

type FinanceRequestRemittanceRecord = {
  id: string;
  remittance_number: string;
  reference: string | null;
  remitted_at: string | null;
  total_amount: number;
  allocated_amount: number;
  unallocated_amount: number;
  remitted_by: { id: string; name: string } | null;
  created_by: { id: string; name: string } | null;
  payment_voucher: { id: string; voucher_number: string } | null;
  paid_from_account: { id: string; name: string; bank_name: string | null; account_number: string | null } | null;
  evidence_file: { id: string; file_name: string; public_url: string | null } | null;
  evidence_files: Array<{ id: string; file_name: string; public_url: string | null }>;
  notes: string | null;
  deductions: Array<{
    allocation_id: string;
    deduction_id: string;
    request_id: string;
    request_number: string;
    deduction_type_id: string;
    deduction_type_name: string;
    deduction_type_code: string;
    amount: number;
    allocated_amount: number;
    total_allocated_amount: number;
    remaining_amount: number;
    status: "pending" | "partially_remitted" | "remitted";
    payment_voucher: { id: string; voucher_number: string } | null;
  }>;
  created_at: string;
  updated_at: string;
};

export default function StatutoryDeductionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Finance";

  const [deductions, setDeductions] = useState<FinanceRequestDeductionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [remitOpen, setRemitOpen] = useState(false);
  const [remitRef, setRemitRef] = useState("");
  const [remitDate, setRemitDate] = useState("");
  const [remitAccountId, setRemitAccountId] = useState("");
  const [remitTotalAmount, setRemitTotalAmount] = useState(0);
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, number>>({});
  const [remitEvidenceFiles, setRemitEvidenceFiles] = useState<Array<{ id: string; file_name: string }>>([]);
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [remitting, setRemitting] = useState(false);
  const [pagination, setPagination] = useState<{ page: number; total: number; total_pages: number } | null>(null);
  const [page, setPage] = useState(1);
  const [selectedDeduction, setSelectedDeduction] = useState<FinanceRequestDeductionRecord | null>(null);

  const [editDeduction, setEditDeduction] = useState<FinanceRequestDeductionRecord | null>(null);
  const [editForm, setEditForm] = useState({ deduction_type_id: "", gross_amount: 0, amount: 0, rate: 0, notes: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [editRemittance, setEditRemittance] = useState<FinanceRequestRemittanceRecord | null>(null);
  const [editRemitForm, setEditRemitForm] = useState({ remittance_ref: "", remitted_at: "", paid_from_account_id: "", notes: "", remittance_total_amount: 0 });
  const [editRemitAllocations, setEditRemitAllocations] = useState<Record<string, number>>({});
  const [editRemitSaving, setEditRemitSaving] = useState(false);
  const [deductionTypes, setDeductionTypes] = useState<any[]>([]);
  const [remittanceSearch, setRemittanceSearch] = useState("");

  const fetchDeductions = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p, per_page: 50 };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await financeApi.listRequestDeductions(params);
      setDeductions(res.items);
      setPagination(res.pagination);
      setPage(p);
    } catch {
      showToast({ tone: "danger", title: "Load failed", message: "Failed to load deductions." });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search, showToast]);

  useEffect(() => { void fetchDeductions(1); }, [fetchDeductions]);

  useEffect(() => {
    const deductionId = searchParams.get("deduction_id");
    if (!deductionId) return;
    financeApi
      .listRequestDeductions({ id: deductionId })
      .then((res) => {
        if (res.items[0]) setSelectedDeduction(res.items[0]);
      })
      .catch(() => {})
      .finally(() => {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("deduction_id");
          return next;
        }, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    financeApi.listAccounts().then((res: any) => {
      setAccounts((Array.isArray(res) ? res : []) as Account[]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!remitOpen) return;
    const selected = deductions.filter((d) => selectedIds.has(d.id));
    const nextAllocations = Object.fromEntries(
      selected.map((d) => [d.id, allocationAmounts[d.id] ?? Number(d.remaining_amount ?? d.amount ?? 0)]),
    );
    setAllocationAmounts(nextAllocations);
    const total = Object.values(nextAllocations).reduce((sum, value) => sum + Number(value || 0), 0);
    setRemitTotalAmount(total);
  }, [remitOpen, deductions, selectedIds]);

  useEffect(() => {
    financeApi.listDeductionTypes({ page: 1, per_page: 200 }).then((res: any) => {
      setDeductionTypes(Array.isArray(res?.result) ? res.result : Array.isArray(res) ? res : []);
    }).catch(() => {});
  }, []);

  const [requestRemittances, setRequestRemittances] = useState<FinanceRequestRemittanceRecord[]>([]);

  const fetchRequestRemittances = useCallback(async () => {
    try {
      const res = await financeApi.listRequestRemittances({ per_page: 100 });
      setRequestRemittances(res.items ?? []);
    } catch {
      setRequestRemittances([]);
    }
  }, []);

  useEffect(() => {
    void fetchRequestRemittances();
  }, [fetchRequestRemittances]);

  const handleRemit = async () => {
    if (!remitRef.trim()) return;
    const selectedRows = deductions.filter((d) => selectedIds.has(d.id));
    const allocations = selectedRows.map((d) => ({
      deduction_id: d.id,
      allocated_amount: Number(allocationAmounts[d.id] ?? d.remaining_amount ?? d.amount ?? 0),
    }));
    if (allocations.some((entry) => entry.allocated_amount <= 0)) {
      showToast({ tone: "warning", title: "Invalid allocation", message: "Every selected deduction needs a positive allocated amount." });
      return;
    }
    const allocatedTotal = allocations.reduce((sum, entry) => sum + entry.allocated_amount, 0);
    if (remitTotalAmount > 0 && allocatedTotal - remitTotalAmount > 0.0001) {
      showToast({ tone: "warning", title: "Remittance too small", message: "Allocated deductions exceed the remittance total amount." });
      return;
    }

    setRemitting(true);
    try {
      const body: Record<string, unknown> = {
        deduction_ids: Array.from(selectedIds),
        reference: remitRef.trim(),
        remittance_total_amount: remitTotalAmount || allocatedTotal,
        allocations,
      };
      if (remitDate) body.remitted_at = new Date(remitDate).toISOString();
      if (remitAccountId) body.paid_from_account_id = remitAccountId;
      if (remitEvidenceFiles.length > 0) body.evidence_file_ids = remitEvidenceFiles.map((file) => file.id);

      const result = await financeApi.batchRemitDeductions(body);
      showToast({ tone: "success", title: "Remitted", message: `${(result as any).updated} deduction(s) marked as remitted.` });
      setSelectedIds(new Set());
      setRemitRef("");
      setRemitDate("");
      setRemitAccountId("");
      setRemitTotalAmount(0);
      setAllocationAmounts({});
      setRemitEvidenceFiles([]);
      setRemitOpen(false);
      void fetchRequestRemittances();
      void fetchDeductions(page);
    } catch {
      showToast({ tone: "danger", title: "Remit failed", message: "Failed to remit deductions." });
    } finally {
      setRemitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const setAllocationAmount = (id: string, value: number) => {
    setAllocationAmounts((prev) => ({ ...prev, [id]: Number.isFinite(value) ? value : 0 }));
  };

  const toggleAll = () => {
    const pending = deductions.filter((d) => d.status === "pending");
    if (selectedIds.size === pending.length && pending.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map((d) => d.id)));
    }
  };

  const openEditDeduction = (d: FinanceRequestDeductionRecord) => {
    setEditDeduction(d);
    setEditForm({
      deduction_type_id: d.deduction_type_id,
      gross_amount: d.gross_amount,
      amount: d.amount,
      rate: d.rate,
      notes: d.notes || "",
    });
  };

  const handleUpdateDeduction = async () => {
    if (!editDeduction) return;
    try {
      setEditSaving(true);
      await financeApi.updatePendingDeduction(editDeduction.id, editForm);
      showToast({ tone: "success", title: "Updated", message: "Deduction updated." });
      setEditDeduction(null);
      void fetchDeductions(page);
    } catch (err) {
      showToast({ tone: "danger", title: "Update failed", message: err instanceof Error ? err.message : "Unable to update." });
    } finally {
      setEditSaving(false);
    }
  };

  const openEditRemittance = async (d: FinanceRequestDeductionRecord) => {
    if (!d.remittance_id) {
      showToast({ tone: "warning", title: "Missing remittance", message: "This deduction is not linked to a remittance record." });
      return;
    }
    try {
      const res = await financeApi.listRequestRemittances({ id: d.remittance_id, per_page: 1 });
      const remittance = res.items?.[0] ?? null;
      if (!remittance) {
        showToast({ tone: "danger", title: "Load failed", message: "Could not load remittance details." });
        return;
      }
      setEditRemittance(remittance);
      setEditRemitForm({
        remittance_ref: remittance.reference || "",
        remitted_at: remittance.remitted_at ? remittance.remitted_at.slice(0, 10) : "",
        paid_from_account_id: remittance.paid_from_account?.id || "",
        notes: remittance.notes || "",
        remittance_total_amount: remittance.total_amount,
      });
      setEditRemitAllocations(
        Object.fromEntries(remittance.deductions.map((item: FinanceRequestRemittanceRecord["deductions"][number]) => [item.allocation_id, Number(item.allocated_amount || 0)])),
      );
    } catch (err) {
      showToast({ tone: "danger", title: "Load failed", message: err instanceof Error ? err.message : "Unable to load remittance." });
    }
  };

  const openRemittanceRecord = (remittance: FinanceRequestRemittanceRecord) => {
    setEditRemittance(remittance);
    setEditRemitForm({
      remittance_ref: remittance.reference || "",
      remitted_at: remittance.remitted_at ? remittance.remitted_at.slice(0, 10) : "",
      paid_from_account_id: remittance.paid_from_account?.id || "",
      notes: remittance.notes || "",
      remittance_total_amount: remittance.total_amount,
    });
    setEditRemitAllocations(
      Object.fromEntries(remittance.deductions.map((item: FinanceRequestRemittanceRecord["deductions"][number]) => [item.allocation_id, Number(item.allocated_amount || 0)])),
    );
  };

  const handleUpdateRemittance = async () => {
    if (!editRemittance) return;
    try {
      setEditRemitSaving(true);
      await financeApi.updateRemittanceRecord(editRemittance.id, {
        ...editRemitForm,
        allocations: editRemittance.deductions.map((item) => ({
          id: item.allocation_id,
          allocated_amount: Number(editRemitAllocations[item.allocation_id] ?? item.allocated_amount),
        })),
      });
      showToast({ tone: "success", title: "Updated", message: "Remittance record updated." });
      setEditRemittance(null);
      setEditRemitAllocations({});
      void fetchRequestRemittances();
      void fetchDeductions(page);
    } catch (err) {
      showToast({ tone: "danger", title: "Update failed", message: err instanceof Error ? err.message : "Unable to update." });
    } finally {
      setEditRemitSaving(false);
    }
  };

  const pendingRows = deductions.filter((d) => d.status !== "remitted" && Number(d.remaining_amount ?? d.amount ?? 0) > 0);
  const filteredRemittances = useMemo(() => {
    const q = remittanceSearch.trim().toLowerCase();
    if (!q) return requestRemittances;
    return requestRemittances.filter((item) =>
      [item.remittance_number, item.reference, item.payment_voucher?.voucher_number, item.paid_from_account?.name]
        .some((value) => String(value || "").toLowerCase().includes(q)),
    );
  }, [requestRemittances, remittanceSearch]);
  const selectedPendingRows = useMemo(
    () => deductions.filter((d) => selectedIds.has(d.id) && d.status !== "remitted" && Number(d.remaining_amount ?? d.amount ?? 0) > 0),
    [deductions, selectedIds],
  );
  const selectedAllocationRows = useMemo(
    () => deductions.filter((d) => selectedIds.has(d.id) && d.status !== "remitted" && Number(d.remaining_amount ?? d.amount ?? 0) > 0),
    [deductions, selectedIds],
  );
  const selectedAllocationTotal = selectedPendingRows.reduce(
    (sum, d) => sum + Number(allocationAmounts[d.id] ?? d.remaining_amount ?? d.amount ?? 0),
    0,
  );
  const editAllocationTotal = editRemittance
    ? editRemittance.deductions.reduce(
        (sum: number, item: FinanceRequestRemittanceRecord["deductions"][number]) => sum + Number(editRemitAllocations[item.allocation_id] ?? item.allocated_amount ?? 0),
        0,
      )
    : 0;

  const downloadBase64Pdf = (res: { file_name: string; content_base64: string }) => {
    const bytes = Uint8Array.from(atob(res.content_base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = res.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTrm = async (id: string) => {
    try {
      const res = await financeApi.downloadTrmSlip(id);
      downloadBase64Pdf(res as any);
    } catch {
      showToast({ tone: "danger", title: "Download failed", message: "Could not generate TRM slip." });
    }
  };

  const openNewRemittanceWorkspace = () => {
    setSelectedIds(new Set());
    setAllocationAmounts({});
    setRemitRef("");
    setRemitDate("");
    setRemitAccountId("");
    setRemitTotalAmount(0);
    setRemitEvidenceFiles([]);
    setRemitOpen(true);
  };

  return (
    <AppShell
      navigation={buildAppNavigation()}
      activeLabel="finance-statutory-deductions"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Statutory Deductions" }]}
        title="Statutory Deductions"
        description="Track and remit withheld statutory amounts across all requests."
      />

      <div className="space-y-6">
        <SectionCard
          title="Deductions Register"
          action={
            <Button
              variant="primary"
              disabled={selectedIds.size === 0}
              onClick={() => setRemitOpen(true)}
            >
              <Icon name="CheckSquare" className="w-4 h-4 mr-1" />
              Remit ({selectedIds.size})
            </Button>
          }
        >
          <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <TextField
              label="Search request"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") void fetchDeductions(1); }}
            />
          </div>
          <div className="w-40">
            <SelectField
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="remitted">Remitted</option>
            </SelectField>
          </div>
          <Button onClick={() => void fetchDeductions(1)} disabled={loading}>
            {loading ? "Loading..." : "Search"}
          </Button>
        </div>

          <div className="rounded-[22px] border border-slate-200 bg-white overflow-x-auto">
            <DataTable
              columns={[
                {
                  header: (
                    <input
                      type="checkbox"
                      checked={pendingRows.length > 0 && selectedIds.size === pendingRows.length}
                      onChange={toggleAll}
                      aria-label="Select all pending"
                    />
                  ),
                  cell: (d) => (
                    <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                        disabled={d.status === "remitted"}
                        aria-label={`Select ${d.id}`}
                      />
                    </div>
                  )
                },
                {
                  header: "Request", cell: (d) => (
                    <button
                      className="text-brand-700 underline text-sm font-medium"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        navigate(`/requests/${d.request_id}`);
                      }}
                    >
                      {d.request_number || d.request_id}
                    </button>
                  )
                },
                {
                  header: "Deduction Type", cell: (d) => (
                    <>
                      <p className="text-sm">{d.deduction_type_name}</p>
                      <p className="text-xs text-slate-400">{d.deduction_type_code}</p>
                    </>
                  )
                },
                { header: "Gross", cell: (d) => <span className="text-sm">{formatCurrency(d.gross_amount, "NGN")}</span> },
                { header: "Withheld", cell: (d) => <span className="text-sm font-medium">{formatCurrency(d.amount, "NGN")}</span> },
                {
                  header: "Status", cell: (d) => (
                    <Chip variant={d.status === "remitted" ? "success" : "warning"}>
                      {d.status === "remitted" ? "Remitted" : "Pending"}
                    </Chip>
                  )
                },
                {
                  header: "TRM Ref", cell: (d) => (
                    <>
                      {d.remittance_number ? (
                        <p className="text-sm font-mono font-semibold text-slate-800">{d.remittance_number}</p>
                      ) : "—"}
                      {d.remittance_ref && (
                        <p className="text-xs text-slate-400 mt-0.5">{d.remittance_ref}</p>
                      )}
                    </>
                  )
                },
                { header: "Remitted", cell: (d) => <span className="text-sm">{d.remitted_at ? formatDisplayDate(d.remitted_at) : "—"}</span> },
                { header: "Account", cell: (d) => <span className="text-sm text-slate-600">{d.paid_from_account?.name ?? "—"}</span> },
                {
                  header: " ", cell: (d) => (
                    <div className="flex gap-2 items-center" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      {d.status === "pending" && (
                        <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => openEditDeduction(d)}>Edit</button>
                      )}
                      {d.status === "remitted" && d.remittance_number && (
                        <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => openEditRemittance(d)}>Edit Remit</button>
                      )}
                      {d.status === "remitted" && d.remittance_number && (
                        <button
                          type="button"
                          onClick={() => void handleDownloadTrm(d.id)}
                          className="text-xs font-semibold text-brand-700 hover:underline whitespace-nowrap"
                        >
                          TRM Slip
                        </button>
                      )}
                    </div>
                  )
                }
              ]}
              data={deductions}
              loading={loading}
              onRowClick={(d) => setSelectedDeduction(d)}
            />
          </div>

          {pagination && pagination.total_pages > 1 && (
            <div className="mt-3 flex gap-2 items-center">
              <Button variant="secondary" disabled={page <= 1} onClick={() => void fetchDeductions(page - 1)}>Prev</Button>
              <span className="text-sm text-slate-600">Page {page} of {pagination.total_pages} ({pagination.total} total)</span>
              <Button variant="secondary" disabled={page >= pagination.total_pages} onClick={() => void fetchDeductions(page + 1)}>Next</Button>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Remittance List"
          description="Open an existing remittance or start a new remittance workspace independently of the deductions grid."
          action={<Button variant="secondary" onClick={openNewRemittanceWorkspace}>New Remittance</Button>}
        >
          <div className="mb-4">
            <TextField
              label="Search remittance"
              value={remittanceSearch}
              onChange={(e) => setRemittanceSearch(e.target.value)}
              placeholder="TRM number, reference, voucher, or account"
            />
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-white overflow-x-auto">
            <DataTable
              columns={[
                {
                  header: "TRM", cell: (item: FinanceRequestRemittanceRecord) => (
                    <>
                      <div className="text-sm font-mono font-semibold text-slate-800">{item.remittance_number}</div>
                      <div className="text-xs text-slate-400">{item.reference || "—"}</div>
                    </>
                  )
                },
                { header: "Total", cell: (item: FinanceRequestRemittanceRecord) => <span className="text-sm">{formatCurrency(item.total_amount, "NGN")}</span> },
                { header: "Allocated", cell: (item: FinanceRequestRemittanceRecord) => <span className="text-sm">{formatCurrency(item.allocated_amount, "NGN")}</span> },
                { header: "Unallocated", cell: (item: FinanceRequestRemittanceRecord) => <span className="text-sm">{formatCurrency(item.unallocated_amount, "NGN")}</span> },
                { header: "Deductions", cell: (item: FinanceRequestRemittanceRecord) => <span className="text-sm">{item.deductions.length}</span> },
                {
                  header: " ", cell: (item: FinanceRequestRemittanceRecord) => (
                    <div className="flex gap-2 items-center">
                      <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => openRemittanceRecord(item)}>Open</button>
                      <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => void handleDownloadTrm(item.id)}>TRM Slip</button>
                    </div>
                  )
                }
              ]}
              data={filteredRemittances}
            />
          </div>
        </SectionCard>
      </div>

      <SlideOver open={remitOpen} onClose={() => setRemitOpen(false)} size="md">
        <SlideOverHeader title="Remit Deductions" subtitle={`${selectedIds.size} deduction(s) selected`} onClose={() => setRemitOpen(false)} />
        <SlideOverContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Split the remittance across multiple deductions by setting the allocated amount for each one.
            </p>

          <TextField
            label="Remittance Reference *"
            value={remitRef}
            onChange={(e) => setRemitRef(e.target.value)}
            placeholder="e.g. FIRS/WHT/2026/Q1"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Remittance Total Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={remitTotalAmount}
              onChange={(e) => setRemitTotalAmount(Number(e.target.value) || 0)}
            />
            <p className="mt-1 text-xs text-slate-500">Allocated total: {formatCurrency(selectedAllocationTotal, "NGN")}</p>
          </div>

          <div className="rounded-xl border border-slate-200">
            <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Allocation Split</div>
            <div className="max-h-72 overflow-auto divide-y divide-slate-100">
              {selectedAllocationRows.map((d) => (
                <div key={d.id} className="grid gap-3 px-3 py-3 md:grid-cols-[1.6fr,0.8fr,0.9fr] items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{d.deduction_type_name}</p>
                    <p className="text-xs text-slate-500">{d.request_number}</p>
                  </div>
                  <div className="text-xs text-slate-500">
                    Remaining: <span className="font-semibold text-slate-700">{formatCurrency(Number(d.remaining_amount ?? d.amount ?? 0), "NGN")}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={String(allocationAmounts[d.id] ?? d.remaining_amount ?? d.amount ?? 0)}
                    onChange={(e) => setAllocationAmount(d.id, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={remitDate}
              onChange={(e) => setRemitDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Paid From Account</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={remitAccountId}
              onChange={(e) => setRemitAccountId(e.target.value)}
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}{a.bank_name ? ` — ${a.bank_name}` : ""}
                </option>
              ))}
            </select>
          </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Evidence Files</label>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setShowEvidencePicker(true)}>Select Evidence Files</Button>
              </div>
              {remitEvidenceFiles.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {remitEvidenceFiles.map((file) => (
                    <span key={file.id} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      {file.file_name}
                      <button type="button" onClick={() => setRemitEvidenceFiles((prev) => prev.filter((item) => item.id !== file.id))}>×</button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <div className="flex gap-2 justify-end w-full">
            <Button variant="secondary" onClick={() => setRemitOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => void handleRemit()}
              disabled={!remitRef.trim() || remitting || selectedAllocationRows.length === 0}
            >
              {remitting ? "Remitting..." : "Confirm Remit"}
            </Button>
          </div>
        </SlideOverFooter>
      </SlideOver>

      <MediaPickerModal
        open={showEvidencePicker}
        onClose={() => setShowEvidencePicker(false)}
        title="Select Remittance Evidence"
        multiple
        selectedIds={remitEvidenceFiles.map((file) => file.id)}
        loadFiles={async (searchValue) => listFileAssets({ include_usage: true, per_page: 200, search: searchValue })}
        uploadFiles={async (files, onProgress) => {
          const total = files.length;
          let uploaded = 0;
          for (const file of Array.from(files)) {
            onProgress?.({ uploaded, total, current_file_name: file.name });
            const asset = await uploadFileAsset(file, { metadata: { source: "request_remittance_evidence" } });
            uploaded += 1;
            onProgress?.({ uploaded, total, current_file_name: file.name });
            setRemitEvidenceFiles((prev) => prev.some((item) => item.id === asset.id) ? prev : [...prev, { id: asset.id, file_name: asset.file_name }]);
          }
        }}
        onSelect={(files) => setRemitEvidenceFiles(files.map((file) => ({ id: file.id, file_name: file.file_name })))}
      />

      {selectedDeduction && (
        <RequestDeductionDetailPanel
          deduction={selectedDeduction}
          onClose={() => setSelectedDeduction(null)}
          onRemit={() => {
            setSelectedIds(new Set([selectedDeduction.id]));
            setSelectedDeduction(null);
            setRemitOpen(true);
          }}
          onEdit={(d) => { setSelectedDeduction(null); openEditDeduction(d); }}
          onEditRemit={(d) => { setSelectedDeduction(null); openEditRemittance(d); }}
        />
      )}

      {editDeduction && (
        <SlideOver open onClose={() => setEditDeduction(null)} size="sm">
          <div className="space-y-4 p-4">
            <h3 className="font-semibold text-slate-800">Edit Pending Deduction</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deduction Type</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editForm.deduction_type_id} onChange={(e) => setEditForm((p) => ({ ...p, deduction_type_id: e.target.value }))}>
                <option value="">Select type</option>
                {deductionTypes.map((dt: any) => <option key={dt.id} value={dt.id}>{dt.name}{dt.code ? ` (${dt.code})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Gross Amount</label>
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editForm.gross_amount} onChange={(e) => setEditForm((p) => ({ ...p, gross_amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Withheld Amount</label>
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editForm.amount} onChange={(e) => setEditForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rate</label>
              <input type="number" step="0.0001" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editForm.rate} onChange={(e) => setEditForm((p) => ({ ...p, rate: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="secondary" onClick={() => setEditDeduction(null)}>Cancel</Button>
              <Button onClick={() => void handleUpdateDeduction()} disabled={editSaving}>{editSaving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </SlideOver>
      )}

      {editRemittance && (
        <SlideOver open onClose={() => setEditRemittance(null)} size="sm">
          <div className="space-y-4 p-4">
            <h3 className="font-semibold text-slate-800">Edit Remittance Record</h3>
            <p className="text-sm text-slate-500">TRM: {editRemittance.remittance_number}</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remittance Reference</label>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editRemitForm.remittance_ref} onChange={(e) => setEditRemitForm((p) => ({ ...p, remittance_ref: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Remittance Total Amount</label>
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editRemitForm.remittance_total_amount} onChange={(e) => setEditRemitForm((p) => ({ ...p, remittance_total_amount: Number(e.target.value) || 0 }))} />
              <p className="mt-1 text-xs text-slate-500">Allocated total: {formatCurrency(editAllocationTotal, "NGN")}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
              <input type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editRemitForm.remitted_at} onChange={(e) => setEditRemitForm((p) => ({ ...p, remitted_at: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paid From Account</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={editRemitForm.paid_from_account_id} onChange={(e) => setEditRemitForm((p) => ({ ...p, paid_from_account_id: e.target.value }))}>
                <option value="">Select account…</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.bank_name ? ` — ${a.bank_name}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" rows={3} value={editRemitForm.notes} onChange={(e) => setEditRemitForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">Allocation Split</div>
              <div className="max-h-72 overflow-auto divide-y divide-slate-100">
                {editRemittance.deductions.map((item: FinanceRequestRemittanceRecord["deductions"][number]) => (
                  <div key={item.allocation_id} className="grid gap-3 px-3 py-3 md:grid-cols-[1.6fr,0.8fr,0.9fr] items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{item.deduction_type_name}</p>
                      <p className="text-xs text-slate-500">{item.request_number}</p>
                    </div>
                    <div className="text-xs text-slate-500">
                      Withheld: <span className="font-semibold text-slate-700">{formatCurrency(Number(item.amount || 0), "NGN")}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      value={String(editRemitAllocations[item.allocation_id] ?? item.allocated_amount ?? 0)}
                      onChange={(e) => setEditRemitAllocations((prev) => ({ ...prev, [item.allocation_id]: Number(e.target.value) || 0 }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="secondary" onClick={() => setEditRemittance(null)}>Cancel</Button>
              <Button onClick={() => void handleUpdateRemittance()} disabled={editRemitSaving}>{editRemitSaving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </SlideOver>
      )}
    </AppShell>
  );
}
