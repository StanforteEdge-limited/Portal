import { useMemo, useState } from "react";
import {
  AppShell,
  Button,
  EmptyState,
  Icon,
  PageHeader,
  SectionCard,
  SlideOver,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
  useToast,
} from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import { adminUsersApi, financeApi, resourceApi, useCachedQuery } from "@/shared/lib/core";
import { formatCurrency, formatDate } from "@stanforte/shared";
import { MediaPickerModal } from "@/shared/components/media/MediaPickerModal";
import { listFileAssets, uploadFileAsset } from "@/pages/files/files-api";

type EntryLine = {
  chart_account_id: string;
  description: string;
  debit: number;
  credit: number;
};

type RemittanceRecord = {
  id: string;
  remittance_id?: string | null;
  remittance_number?: string | null;
  remitted_by?: { id: string; name: string } | null;
  payment_voucher?: { id: string; voucher_number: string } | null;
  request_id?: string;
  request_number?: string;
  deduction_type_name?: string;
  amount: number;
  allocated_amount?: number;
  remaining_amount?: number;
  status: string;
  remittance_ref?: string | null;
  remitted_at?: string | null;
  paid_from_account?: { id: string; name: string } | null;
  evidence_files?: Array<{ id: string; file_name?: string }>;
  notes?: string | null;
  remittance_allocations?: Array<{ id: string; allocated_amount: number; remittance_number: string; remittance_ref?: string | null }>;
};

type RequestRemittanceRecord = {
  id: string;
  remittance_number: string;
  reference: string | null;
  remitted_at: string | null;
  total_amount: number;
  allocated_amount: number;
  unallocated_amount: number;
  remitted_by: { id: string; name: string } | null;
  payment_voucher: { id: string; voucher_number: string } | null;
  paid_from_account: { id: string; name: string } | null;
  evidence_files: Array<{ id: string; file_name: string }>;
  notes: string | null;
  deductions: Array<{
    allocation_id: string;
    deduction_id: string;
    request_id: string;
    request_number: string;
    deduction_type_name: string;
    amount: number;
    allocated_amount: number;
    remaining_amount: number;
    status: string;
    payment_voucher: { id: string; voucher_number: string } | null;
  }>;
};

export default function StatutoryDeductionManualEntryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);

  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [deductionTypeId, setDeductionTypeId] = useState("");
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [withheldAmount, setWithheldAmount] = useState<number>(0);
  const [lines, setLines] = useState<EntryLine[]>([
    { chart_account_id: "", description: "", debit: 0, credit: 0 },
    { chart_account_id: "", description: "", debit: 0, credit: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editEntryDate, setEditEntryDate] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editCurrency, setEditCurrency] = useState("NGN");
  const [editLines, setEditLines] = useState<EntryLine[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [lookupRemittance, setLookupRemittance] = useState("");
  const [remitNumber, setRemitNumber] = useState("");
  const [remitRef, setRemitRef] = useState("");
  const [remitDate, setRemitDate] = useState(new Date().toISOString().slice(0, 10));
  const [remitAccountId, setRemitAccountId] = useState("");
  const [remitTotalAmount, setRemitTotalAmount] = useState<number>(0);
  const [remitPaymentVoucherId, setRemitPaymentVoucherId] = useState("");
  const [remittedByUserId, setRemittedByUserId] = useState(user?.id ? String(user.id) : "");
  const [remitNotes, setRemitNotes] = useState("");
  const [remitEvidenceFiles, setRemitEvidenceFiles] = useState<Array<{ id: string; file_name: string }>>([]);
  const [showEvidencePicker, setShowEvidencePicker] = useState(false);
  const [selectedDeductionIds, setSelectedDeductionIds] = useState<string[]>([]);
  const [allocationAmounts, setAllocationAmounts] = useState<Record<string, number>>({});
  const [deductionLookup, setDeductionLookup] = useState("");
  const [activeRemittance, setActiveRemittance] = useState<RequestRemittanceRecord | null>(null);
  const [loadingRemittance, setLoadingRemittance] = useState(false);
  const [savingRemittance, setSavingRemittance] = useState(false);
  const [remittanceSearch, setRemittanceSearch] = useState("");

  const { data: chartAccountsData } = useCachedQuery(
    "finance:statutory-deduction-manual-entry:chart-accounts",
    () => financeApi.listChartAccounts({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const chartAccounts = Array.isArray((chartAccountsData as any)?.result)
    ? (chartAccountsData as any).result
    : [];

  const { data: financeAccountsData } = useCachedQuery(
    "finance:statutory-deduction-manual-entry:accounts",
    () => financeApi.listAccounts(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const financeAccounts = Array.isArray((financeAccountsData as any)?.result)
    ? (financeAccountsData as any).result
    : Array.isArray(financeAccountsData)
      ? financeAccountsData
      : [];

  const { data: deductionTypesData } = useCachedQuery(
    "finance:statutory-deduction-manual-entry:deduction-types",
    () => financeApi.listDeductionTypes({ page: 1, per_page: 200 }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const deductionTypes = Array.isArray((deductionTypesData as any)?.result)
    ? (deductionTypesData as any).result
    : Array.isArray(deductionTypesData)
      ? deductionTypesData
      : [];

  const { data: entriesPayload, loading } = useCachedQuery(
    `finance:statutory-deduction-manual-entry:list:${refreshKey}`,
    () => financeApi.listStatutoryDeductionManualEntries({ page: 1, per_page: 50 }),
    { ttlMs: 0, storage: "memory" },
  );
  const entries = Array.isArray(entriesPayload?.result) ? entriesPayload.result : [];
  const { data: paymentVouchersPayload } = useCachedQuery(
    `finance:statutory-deduction-manual-entry:payment-vouchers:${refreshKey}`,
    () => financeApi.listPaymentVouchers({ per_page: 200 }),
    { ttlMs: 0, storage: "memory" },
  );
  const paymentVouchers = Array.isArray((paymentVouchersPayload as any)?.result) ? (paymentVouchersPayload as any).result : [];
  const { data: usersPayload } = useCachedQuery(
    "finance:statutory-deduction-manual-entry:users",
    () => adminUsersApi.listUsers({ page: 1, per_page: 200, status: "active" }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const users = Array.isArray(usersPayload?.data) ? usersPayload.data : [];

  const { data: pendingDeductionsPayload } = useCachedQuery(
    `finance:statutory-deduction-manual-entry:pending-deductions:${refreshKey}`,
    () => financeApi.listRequestDeductions({ per_page: 100 }),
    { ttlMs: 0, storage: "memory" },
  );
  const pendingDeductions = (pendingDeductionsPayload?.items ?? []).filter((row: RemittanceRecord) => row.status !== "remitted");

  const { data: remittedDeductionsPayload } = useCachedQuery(
    `finance:statutory-deduction-manual-entry:remitted-deductions:${refreshKey}`,
    () => financeApi.listRequestDeductions({ per_page: 200 }),
    { ttlMs: 0, storage: "memory" },
  );
  const { data: requestRemittancesPayload } = useCachedQuery(
    `finance:statutory-deduction-manual-entry:request-remittances:${refreshKey}`,
    () => financeApi.listRequestRemittances({ per_page: 100 }),
    { ttlMs: 0, storage: "memory" },
  );
  const requestRemittances = (requestRemittancesPayload?.items ?? []) as RequestRemittanceRecord[];

  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          acc.debit += Number(line.debit || 0);
          acc.credit += Number(line.credit || 0);
          return acc;
        },
        { debit: 0, credit: 0 },
      ),
    [lines],
  );
  const balanced = Math.abs(totals.debit - totals.credit) < 0.001;

  const setLine = (index: number, patch: Partial<EntryLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { chart_account_id: "", description: "", debit: 0, credit: 0 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditEntryDate((entry.entryDate || entry.entry_date || "").slice(0, 10));
    setEditMemo(entry.memo || "");
    setEditCurrency(entry.currency || "NGN");
    setEditLines(
      (entry.lines || []).map((l: any) => ({
        chart_account_id: l.chartAccountId || l.chart_account_id || "",
        description: l.description || "",
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      }))
    );
  };

  const resetRemittanceForm = () => {
    setLookupRemittance("");
    setRemitNumber("");
    setRemitRef("");
    setRemitDate(new Date().toISOString().slice(0, 10));
    setRemitAccountId("");
    setRemitTotalAmount(0);
    setRemitPaymentVoucherId("");
    setRemittedByUserId(user?.id ? String(user.id) : "");
    setRemitNotes("");
    setRemitEvidenceFiles([]);
    setSelectedDeductionIds([]);
    setAllocationAmounts({});
    setActiveRemittance(null);
  };

  const loadRemittance = async (lookupValue?: string) => {
    const value = String(lookupValue ?? lookupRemittance).trim();
    if (!value) return;
    try {
      setLoadingRemittance(true);
      let remittance = requestRemittances.find((row) => row.id === value) ?? null;
      if (!remittance) {
        const byId = await financeApi.listRequestRemittances({ id: value, per_page: 1 }).catch(() => ({ items: [] }));
        remittance = byId.items?.[0] ?? null;
      }
      if (!remittance) {
        const byRef = await financeApi.listRequestRemittances({ reference: value, per_page: 10 }).catch(() => ({ items: [] }));
        remittance = byRef.items?.[0] ?? null;
      }
      if (!remittance) {
        const byNumber = await financeApi.listRequestRemittances({ remittance_number: value, per_page: 10 }).catch(() => ({ items: [] }));
        remittance = byNumber.items?.[0] ?? null;
      }
      if (!remittance) {
        const lowered = value.toLowerCase();
        remittance = requestRemittances.find((row) =>
          String(row.reference || "").toLowerCase().includes(lowered) ||
          String(row.remittance_number || "").toLowerCase().includes(lowered),
        ) ?? null;
      }
      if (!remittance) {
        showToast({ tone: "warning", title: "Not found", message: "No remittance matched that ID or reference." });
        return;
      }
      setActiveRemittance(remittance);
      setSelectedDeductionIds(remittance.deductions.map((row) => row.deduction_id));
      setAllocationAmounts(Object.fromEntries(remittance.deductions.map((row) => [row.deduction_id, Number(row.allocated_amount || row.amount || 0)])));
      setLookupRemittance(value);
      setRemitNumber(String(remittance.remittance_number || ""));
      setRemitRef(String(remittance.reference || ""));
      setRemitDate(String(remittance.remitted_at || "").slice(0, 10));
      setRemitAccountId(String(remittance.paid_from_account?.id || ""));
      setRemitTotalAmount(Number(remittance.total_amount || 0));
      setRemitPaymentVoucherId(String(remittance.payment_voucher?.id || ""));
      setRemittedByUserId(String(remittance.remitted_by?.id || user?.id || ""));
      setRemitNotes(String(remittance.notes || ""));
      setRemitEvidenceFiles((remittance.evidence_files || []).map((file: any) => ({ id: String(file.id), file_name: String(file.file_name || file.id) })));
    } catch (err) {
      showToast({ tone: "danger", title: "Load failed", message: err instanceof Error ? err.message : "Unable to load remittance." });
    } finally {
      setLoadingRemittance(false);
    }
  };

  const toggleDeductionSelection = (id: string) => {
    setSelectedDeductionIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const detachDeduction = (id: string) => {
    setSelectedDeductionIds((prev) => prev.filter((item) => item !== id));
    setAllocationAmounts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const setAllocationAmount = (id: string, value: number) => {
    setAllocationAmounts((prev) => ({ ...prev, [id]: Number.isFinite(value) ? value : 0 }));
  };

  const handleSaveRemittance = async () => {
    if (!remitRef.trim()) {
      showToast({ tone: "warning", title: "Reference required", message: "Enter a remittance reference." });
      return;
    }
    if (selectedDeductionIds.length === 0) {
      showToast({ tone: "warning", title: "No deductions selected", message: "Select at least one deduction." });
      return;
    }
    const selectedRows = (activeRemittance ? activeRemittance.deductions.map((row) => ({
      id: row.deduction_id,
      remaining_amount: row.remaining_amount,
      amount: row.amount,
      remittance_allocations: row.allocation_id ? [{ id: row.allocation_id, allocated_amount: row.allocated_amount }] : [],
    })) : pendingDeductions).filter((row: any) => selectedDeductionIds.includes(row.id));
    const allocations = selectedRows.map((row: any) => ({
      deduction_id: row.id,
      allocated_amount: Number(allocationAmounts[row.id] ?? row.remaining_amount ?? row.amount ?? 0),
    }));
    if (allocations.some((entry) => entry.allocated_amount <= 0)) {
      showToast({ tone: "warning", title: "Invalid allocation", message: "Each selected deduction needs a positive allocated amount." });
      return;
    }
    const allocatedTotal = allocations.reduce((sum, entry) => sum + entry.allocated_amount, 0);
    if (remitTotalAmount > 0 && allocatedTotal - remitTotalAmount > 0.0001) {
      showToast({ tone: "warning", title: "Remittance too small", message: "Allocated deductions exceed the remittance total amount." });
      return;
    }
    try {
      setSavingRemittance(true);
      if (activeRemittance) {
        await financeApi.updateRemittanceRecord(activeRemittance.id, {
          remittance_number: remitNumber.trim() || undefined,
          remittance_ref: remitRef.trim(),
          remitted_at: remitDate || undefined,
          remittance_total_amount: remitTotalAmount || allocatedTotal,
          paid_from_account_id: remitAccountId || undefined,
          payment_voucher_id: remitPaymentVoucherId || undefined,
          remitted_by: remittedByUserId || undefined,
          evidence_file_ids: remitEvidenceFiles.map((file) => file.id),
          notes: remitNotes.trim() || undefined,
          allocations: activeRemittance.deductions.map((row) => ({
            id: row.allocation_id,
            allocated_amount: Number(allocationAmounts[row.deduction_id] ?? row.allocated_amount),
          })),
        });
        const newDeductionIds = selectedDeductionIds.filter((id) => !activeRemittance.deductions.some((row) => row.deduction_id === id));
        if (newDeductionIds.length > 0) {
          await financeApi.addRemittanceAllocations(activeRemittance.id, {
            deduction_ids: newDeductionIds,
            allocations: newDeductionIds.map((id) => ({ id, allocated_amount: Number(allocationAmounts[id] ?? 0) })),
          });
        }
        showToast({ tone: "success", title: "Updated", message: "Remittance updated." });
      } else {
        await financeApi.batchRemitDeductions({
          deduction_ids: selectedDeductionIds,
          remittance_number: remitNumber.trim() || undefined,
          reference: remitRef.trim(),
          remitted_at: remitDate ? new Date(remitDate).toISOString() : undefined,
          remittance_total_amount: remitTotalAmount || allocatedTotal,
          paid_from_account_id: remitAccountId || undefined,
          payment_voucher_id: remitPaymentVoucherId || undefined,
          remitted_by: remittedByUserId || undefined,
          evidence_file_ids: remitEvidenceFiles.map((file) => file.id),
          notes: remitNotes.trim() || undefined,
          allocations,
        });
        showToast({ tone: "success", title: "Created", message: "Remittance recorded." });
      }
      resetRemittanceForm();
      setRefreshKey((v) => v + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save remittance." });
    } finally {
      setSavingRemittance(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;
    if (!editEntryDate) {
      showToast({ tone: "warning", title: "Date required", message: "Set an entry date." });
      return;
    }
    const editTotals = editLines.reduce(
      (acc, l) => ({ debit: acc.debit + Number(l.debit || 0), credit: acc.credit + Number(l.credit || 0) }),
      { debit: 0, credit: 0 },
    );
    if (Math.abs(editTotals.debit - editTotals.credit) > 0.001) {
      showToast({ tone: "danger", title: "Not balanced", message: "Debits and credits must be equal." });
      return;
    }
    const normalized = editLines
      .map((l) => ({
        chart_account_id: l.chart_account_id,
        description: l.description || undefined,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      }))
      .filter((l) => l.chart_account_id && (l.debit > 0 || l.credit > 0));
    if (normalized.length < 2) {
      showToast({ tone: "warning", title: "Incomplete", message: "At least two valid lines required." });
      return;
    }
    try {
      setEditSaving(true);
      await financeApi.updateStatutoryDeductionManualEntry(editingEntry.id, {
        entry_date: editEntryDate,
        memo: editMemo.trim() || undefined,
        currency: editCurrency.toUpperCase(),
        lines: normalized,
      });
      showToast({ tone: "success", title: "Updated", message: "Journal entry updated." });
      setEditingEntry(null);
      setRefreshKey((v) => v + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Update failed", message: err instanceof Error ? err.message : "Unable to update." });
    } finally {
      setEditSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!entryDate) {
      showToast({ tone: "warning", title: "Date required", message: "Set an entry date." });
      return;
    }
    if (!deductionTypeId) {
      showToast({ tone: "warning", title: "Deduction type required", message: "Select a statutory deduction type." });
      return;
    }
    if (Number(grossAmount) <= 0) {
      showToast({ tone: "warning", title: "Gross amount required", message: "Enter a positive gross amount." });
      return;
    }
    if (Number(withheldAmount) <= 0) {
      showToast({ tone: "warning", title: "Withheld amount required", message: "Enter a positive withheld amount." });
      return;
    }
    if (Number(withheldAmount) > Number(grossAmount)) {
      showToast({ tone: "warning", title: "Invalid amounts", message: "Withheld amount cannot exceed gross amount." });
      return;
    }
    if (!balanced) {
      showToast({ tone: "danger", title: "Entry not balanced", message: "Debits and credits must be equal." });
      return;
    }

    const normalized = lines
      .map((line) => ({
        chart_account_id: line.chart_account_id,
        description: line.description || undefined,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
      }))
      .filter((line) => line.chart_account_id && (line.debit > 0 || line.credit > 0));

    if (normalized.length < 2) {
      showToast({ tone: "warning", title: "Incomplete lines", message: "Add at least two valid lines." });
      return;
    }

    try {
      setSaving(true);
      await financeApi.createStatutoryDeductionManualEntry({
        entry_date: entryDate,
        memo: memo.trim() || undefined,
        currency: currency.toUpperCase(),
        deduction_type_id: deductionTypeId,
        gross_amount: grossAmount,
        withheld_amount: withheldAmount,
        lines: normalized,
      });
      showToast({ tone: "success", title: "Posted", message: "Statutory deduction journal entry posted." });
      setMemo("");
      setGrossAmount(0);
      setWithheldAmount(0);
      setLines([
        { chart_account_id: "", description: "", debit: 0, credit: 0 },
        { chart_account_id: "", description: "", debit: 0, credit: 0 },
      ]);
      setRefreshKey((v) => v + 1);
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Post failed",
        message: err instanceof Error ? err.message : "Unable to post statutory deduction journal entry.",
      });
    } finally {
      setSaving(false);
    }
  };

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";
  const deductionLookupValue = deductionLookup.trim().toLowerCase();
  const filteredPendingDeductions = pendingDeductions.filter((row: RemittanceRecord) => {
    if (!deductionLookupValue) return true;
    return [row.request_number, row.request_id, row.deduction_type_name, row.remittance_ref, row.remittance_number]
      .some((value) => String(value || "").toLowerCase().includes(deductionLookupValue));
  });
  const workspaceRows = (activeRemittance ? activeRemittance.deductions.map((row) => ({
    id: row.deduction_id,
    request_id: row.request_id,
    request_number: row.request_number,
    deduction_type_name: row.deduction_type_name,
    amount: row.amount,
    allocated_amount: row.allocated_amount,
    remaining_amount: row.remaining_amount,
    remittance_allocations: row.allocation_id ? [{ id: row.allocation_id, allocated_amount: row.allocated_amount, remittance_number: activeRemittance.remittance_number, remittance_ref: activeRemittance.reference }] : [],
  })) : pendingDeductions).filter((row: any) => selectedDeductionIds.includes(row.id));
  const workspaceAllocatedTotal = workspaceRows.reduce((sum, row) => sum + Number(allocationAmounts[row.id] ?? row.allocated_amount ?? row.remaining_amount ?? row.amount ?? 0), 0);
  const loadedRemittanceSummary = activeRemittance;
  const filteredRemittances = requestRemittances.filter((row) => {
    const q = remittanceSearch.trim().toLowerCase();
    if (!q) return true;
    return [row.remittance_number, row.reference, row.payment_voucher?.voucher_number, row.paid_from_account?.name]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel="finance-statutory-deduction-entry"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Manual Tools" }, { label: "Statutory Deductions" }]}
        title="Manual Statutory Deductions"
          description="Backoffice workspace for entering, loading, correcting, and linking statutory deductions and standalone remittance records, including backdated records."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Open Deductions" value={String(pendingDeductions.length)} tone="warning" />
        <StatCard label="Remittance Batches" value={String(requestRemittances.length)} tone="neutral" />
        <StatCard label="Workspace Items" value={String(selectedDeductionIds.length)} tone="neutral" />
        <StatCard label="Entry Balance" value={balanced ? "Balanced" : "Unbalanced"} tone={balanced ? "success" : "danger"} />
      </div>

      <SectionCard title="Add Backdated Deduction" description="Use this only when you need to create a deduction manually and anchor it with its journal lines.">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-slate-700">Entry Date</span>
            <input type="date" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-slate-700">Currency</span>
            <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-3">
            <span className="font-semibold text-slate-700">Memo</span>
            <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Statutory withholding memo" />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Deduction Details">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="font-semibold text-slate-700">Deduction Type</span>
            <select className="rounded-2xl border border-slate-200 px-4 py-2.5" value={deductionTypeId} onChange={(e) => setDeductionTypeId(e.target.value)}>
              <option value="">Select deduction type</option>
              {deductionTypes.map((type: any) => (
                <option key={type.id} value={type.id}>{type.name}{type.code ? ` (${type.code})` : ""}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-slate-700">Gross Amount</span>
            <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={grossAmount} onChange={(e) => setGrossAmount(Number(e.target.value))} />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-3">
            <span className="font-semibold text-slate-700">Withheld Amount</span>
            <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={withheldAmount} onChange={(e) => setWithheldAmount(Number(e.target.value))} />
          </label>
        </div>
      </SectionCard>

      <div className="grid gap-5 xl:grid-cols-[1.5fr,0.9fr]">
        <SectionCard
          title="Remittance Workspace"
          description="Search, load, create, edit, and reattach deductions and allocations under a remittance."
          action={<Button variant="secondary" onClick={resetRemittanceForm}>New Remittance</Button>}
        >
        <div className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-1.5 text-sm md:col-span-3">
            <span className="font-semibold text-slate-700">Load Existing Remittance</span>
            <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={lookupRemittance} onChange={(e) => setLookupRemittance(e.target.value)} placeholder="Remittance number, payment reference, or deduction ID" />
          </label>
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => void loadRemittance()} disabled={loadingRemittance}>{loadingRemittance ? "Loading..." : "Load"}</Button>
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-slate-700">Remittance No.</span>
            <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remitNumber} onChange={(e) => setRemitNumber(e.target.value)} placeholder="e.g. TRM/2026/500" />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="font-semibold text-slate-700">Remittance Reference</span>
            <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remitRef} onChange={(e) => setRemitRef(e.target.value)} placeholder="e.g. FIRS/WHT/2026/Q2" />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="font-semibold text-slate-700">Remitted On</span>
            <input type="date" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remitDate} onChange={(e) => setRemitDate(e.target.value)} />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="font-semibold text-slate-700">Remittance Total Amount</span>
            <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remitTotalAmount} onChange={(e) => setRemitTotalAmount(Number(e.target.value) || 0)} />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="font-semibold text-slate-700">Created By</span>
            <select className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remittedByUserId} onChange={(e) => setRemittedByUserId(e.target.value)}>
              <option value="">Select user</option>
              {users.map((u: any) => {
                const label = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || u.username;
                return <option key={u.id} value={u.id}>{label}</option>;
              })}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-semibold text-slate-700">Paid From Account</span>
            <select className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remitAccountId} onChange={(e) => setRemitAccountId(e.target.value)}>
              <option value="">Select account</option>
              {financeAccounts.map((account: any) => (
                <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-4">
            <span className="font-semibold text-slate-700">Funding Payment Voucher</span>
            <select className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remitPaymentVoucherId} onChange={(e) => setRemitPaymentVoucherId(e.target.value)}>
              <option value="">Select payment voucher</option>
              {paymentVouchers.map((pv: any) => (
                <option key={pv.id} value={pv.id}>{pv.voucher_number} - {pv.request_number || pv.request_id || "Request"}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-4">
            <span className="font-semibold text-slate-700">Evidence Files</span>
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
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-4">
            <span className="font-semibold text-slate-700">Notes</span>
            <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={remitNotes} onChange={(e) => setRemitNotes(e.target.value)} placeholder="Internal note for this remittance batch" />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{activeRemittance ? "Edit Existing Remittance" : "Create New Remittance"}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attached Deductions</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{selectedDeductionIds.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Allocated Total</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(workspaceAllocatedTotal, "NGN")}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remittance Total</div>
            <div className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(remitTotalAmount || workspaceAllocatedTotal, "NGN")}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-800">Available Deductions</h4>
            <p className="mb-3 text-xs text-slate-500">Select deductions to attach to this remittance. You can allocate the full balance or only part of it.</p>
            <div className="mb-3 flex gap-2">
              <input className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm" value={deductionLookup} onChange={(e) => setDeductionLookup(e.target.value)} placeholder="Search by request, deduction type, remittance ref, or deduction id" />
              {deductionLookup ? <Button variant="secondary" onClick={() => setDeductionLookup("")}>Clear</Button> : null}
            </div>
            <div className="max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white">
              <Table caption="Pending deductions">
                <TableHead>
                  <TableHeaderRow>
                    <TableHeaderCell>{" "}</TableHeaderCell>
                    <TableHeaderCell>Request</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                    <TableHeaderCell className="text-right">Remaining</TableHeaderCell>
                    <TableHeaderCell>Allocate</TableHeaderCell>
                  </TableHeaderRow>
                </TableHead>
                <TableBody>
                  {filteredPendingDeductions.map((row: any) => (
                    <TableRow key={row.id}>
                      <TableCell><input type="checkbox" checked={selectedDeductionIds.includes(row.id)} onChange={() => toggleDeductionSelection(row.id)} /></TableCell>
                      <TableCell>{row.request_number || row.request_id}</TableCell>
                      <TableCell>{row.deduction_type_name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(row.amount || 0), "NGN")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(row.remaining_amount ?? row.amount ?? 0), "NGN")}</TableCell>
                      <TableCell><input type="number" min={0} step="0.01" value={String(allocationAmounts[row.id] ?? row.remaining_amount ?? row.amount ?? 0)} onChange={(e) => setAllocationAmount(row.id, Number(e.target.value))} className="w-24 rounded-xl border border-slate-200 px-2 py-1" /></TableCell>
                    </TableRow>
                  ))}
                  {filteredPendingDeductions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-slate-400">No deductions matched your search.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold text-slate-800">Loaded Remittance Deductions</h4>
            <p className="mb-3 text-xs text-slate-500">When a remittance is loaded, this shows the deductions already tied to it and the amount currently allocated on each one.</p>
            <div className="max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white">
              <Table caption="Loaded remittance deductions">
                <TableHead>
                  <TableHeaderRow>
                    <TableHeaderCell>Request</TableHeaderCell>
                    <TableHeaderCell>Type</TableHeaderCell>
                    <TableHeaderCell className="text-right">Amount</TableHeaderCell>
                    <TableHeaderCell className="text-right">Allocated</TableHeaderCell>
                    <TableHeaderCell>Actions</TableHeaderCell>
                  </TableHeaderRow>
                </TableHead>
                <TableBody>
                    {activeRemittance ? activeRemittance.deductions.map((row) => (
                      <TableRow key={row.deduction_id}>
                       <TableCell>{row.request_number || row.request_id}</TableCell>
                       <TableCell>{row.deduction_type_name}</TableCell>
                       <TableCell className="text-right">{formatCurrency(Number(row.amount || 0), "NGN")}</TableCell>
                       <TableCell className="text-right">{formatCurrency(Number(allocationAmounts[row.deduction_id] ?? row.allocated_amount ?? row.amount ?? 0), "NGN")}</TableCell>
                       <TableCell>
                         <button type="button" className="text-xs font-semibold text-red-600 hover:underline" onClick={() => detachDeduction(row.deduction_id)}>Remove</button>
                       </TableCell>
                     </TableRow>
                   )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400 py-8">No remittance loaded.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {activeRemittance ? (
               <div className="mt-4 space-y-3">
                {activeRemittance.deductions.map((row) => (
                  <div key={`${row.deduction_id}-history`} className="rounded-2xl border border-slate-200 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{row.deduction_type_name}</div>
                        <div className="text-xs text-slate-500">{row.request_number || row.request_id}</div>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">Remaining {formatCurrency(Number(row.remaining_amount ?? 0), "NGN")}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">
                        <span>{activeRemittance.remittance_number} {activeRemittance.reference ? `• ${activeRemittance.reference}` : ""}</span>
                        <span className="font-semibold">{formatCurrency(Number(row.allocated_amount || 0), "NGN")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Loaded Batch" description="Current remittance record in focus.">
            {loadedRemittanceSummary ? (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">TRM Number</dt>
                  <dd className="font-semibold text-slate-900">{loadedRemittanceSummary.remittance_number || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Reference</dt>
                  <dd className="font-semibold text-slate-900">{loadedRemittanceSummary.reference || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Remitted On</dt>
                  <dd className="font-semibold text-slate-900">{loadedRemittanceSummary.remitted_at ? formatDate(loadedRemittanceSummary.remitted_at) : "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Created By</dt>
                  <dd className="font-semibold text-slate-900">{loadedRemittanceSummary.remitted_by?.name || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Payment Voucher</dt>
                  <dd className="font-semibold text-slate-900">{loadedRemittanceSummary.payment_voucher?.voucher_number || "-"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Paid From</dt>
                  <dd className="font-semibold text-slate-900">{loadedRemittanceSummary.paid_from_account?.name || "-"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No remittance loaded yet. Start a new one or load an existing batch from the list below.</p>
            )}
          </SectionCard>

          <SectionCard title="Workspace Checklist" description="Quick audit before saving.">
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between"><span>Reference entered</span><span className="font-semibold">{remitRef.trim() ? "Yes" : "No"}</span></div>
              <div className="flex items-center justify-between"><span>Deductions attached</span><span className="font-semibold">{selectedDeductionIds.length}</span></div>
              <div className="flex items-center justify-between"><span>Allocated total</span><span className="font-semibold">{formatCurrency(workspaceAllocatedTotal, "NGN")}</span></div>
              <div className="flex items-center justify-between"><span>Evidence files</span><span className="font-semibold">{remitEvidenceFiles.length}</span></div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{selectedDeductionIds.length}</span> deductions attached
          <span className="mx-2 text-slate-300">|</span>
          Allocation total <span className="font-semibold text-slate-900">{formatCurrency(workspaceAllocatedTotal, "NGN")}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={resetRemittanceForm}>Reset Workspace</Button>
          <Button onClick={() => void handleSaveRemittance()} disabled={savingRemittance || selectedDeductionIds.length === 0}>
            {savingRemittance ? "Saving..." : activeRemittance ? "Update Remittance" : "Add Remittance"}
          </Button>
        </div>
      </div>

      <SectionCard
        title="Manual Journal Lines"
        description="Only needed when you are creating or correcting backdated deductions through this page."
        action={<Button variant="secondary" onClick={addLine}><Icon name="add" className="text-[16px]" />Add Line</Button>}
      >
        <div className="space-y-3">
          {lines.map((line, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-12 items-end">
              <label className="grid gap-1.5 text-sm md:col-span-4">
                <span className="font-semibold text-slate-700">Chart Account</span>
                <select className="rounded-2xl border border-slate-200 px-4 py-2.5" value={line.chart_account_id} onChange={(e) => setLine(index, { chart_account_id: e.target.value })}>
                  <option value="">Select account</option>
                  {chartAccounts.map((account: any) => (
                    <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm md:col-span-3">
                <span className="font-semibold text-slate-700">Description</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={line.description} onChange={(e) => setLine(index, { description: e.target.value })} />
              </label>
              <label className="grid gap-1.5 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Debit</span>
                <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={line.debit} onChange={(e) => setLine(index, { debit: Number(e.target.value) })} />
              </label>
              <label className="grid gap-1.5 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Credit</span>
                <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={line.credit} onChange={(e) => setLine(index, { credit: Number(e.target.value) })} />
              </label>
              <div className="md:col-span-1">
                <Button variant="danger" size="sm" onClick={() => removeLine(index)} disabled={lines.length <= 2}><Icon name="delete" className="text-sm" /></Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void handleSubmit()} disabled={saving || !balanced}>{saving ? "Posting..." : "Post Entry"}</Button>
        </div>
      </SectionCard>

      <SectionCard title="Recent Manual Deduction Entries" description="These are the journal-backed manual deductions created from this page.">
        {loading ? <p className="text-sm text-slate-500">Loading entries...</p> : null}
        {entries.length ? (
          <Table caption="Statutory deduction manual journal entries">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Entry No</TableHeaderCell>
                <TableHeaderCell>Memo</TableHeaderCell>
                <TableHeaderCell className="text-right">Debit</TableHeaderCell>
                <TableHeaderCell className="text-right">Credit</TableHeaderCell>
                <TableHeaderCell>{" "}</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {entries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.entryDate || entry.entry_date)}</TableCell>
                  <TableCell>{entry.entryNo || entry.entry_no || entry.id.slice(0, 8)}</TableCell>
                  <TableCell>{entry.memo || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(entry.totalDebit ?? entry.total_debit ?? 0), entry.currency || "NGN")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(entry.totalCredit ?? entry.total_credit ?? 0), entry.currency || "NGN")}</TableCell>
                  <TableCell>
                    <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => openEdit(entry)}>Edit</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : !loading ? (
          <EmptyState title="No statutory deduction entries" description="Posted statutory deduction journal entries will appear here." />
        ) : null}
      </SectionCard>

      <SectionCard title="Recent Remittances" description="Use this list to load, review, and correct remittance batches and their linked deductions.">
        <div className="mb-4">
          <input className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm" value={remittanceSearch} onChange={(e) => setRemittanceSearch(e.target.value)} placeholder="Search TRM number, reference, voucher, or account" />
        </div>
        {requestRemittances.length ? (
          <Table caption="Recent remittances">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Reference</TableHeaderCell>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Account</TableHeaderCell>
                <TableHeaderCell className="text-right">Total</TableHeaderCell>
                <TableHeaderCell className="text-right">Items</TableHeaderCell>
                <TableHeaderCell>{" "}</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {filteredRemittances.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>{group.remittance_number}</TableCell>
                  <TableCell>{formatDate(group.remitted_at)}</TableCell>
                  <TableCell>{group.paid_from_account?.name || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(group.total_amount, "NGN")}</TableCell>
                  <TableCell className="text-right">{group.deductions.length}</TableCell>
                  <TableCell>
                    <button className="text-xs font-semibold text-brand-700 hover:underline" onClick={() => void loadRemittance(group.id)}>Load</button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No remittances yet" description="Saved remittances will appear here for quick lookup and editing." />
        )}
      </SectionCard>

      {editingEntry && (
        <SlideOver open onClose={() => setEditingEntry(null)} size="md">
          <div className="space-y-4 p-4">
            <h3 className="font-semibold text-slate-800">Edit Journal Entry</h3>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-700">Entry Date</span>
              <input type="date" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={editEntryDate} onChange={(e) => setEditEntryDate(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-700">Currency</span>
              <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={editCurrency} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-semibold text-slate-700">Memo</span>
              <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={editMemo} onChange={(e) => setEditMemo(e.target.value)} />
            </label>
            <div className="space-y-2">
              <span className="font-semibold text-slate-700 text-sm">Lines</span>
              {editLines.map((line, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-12 items-end">
                  <select className="md:col-span-4 rounded-2xl border border-slate-200 px-3 py-2 text-sm" value={line.chart_account_id} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, chart_account_id: e.target.value } : l))}>
                    <option value="">Account</option>
                    {chartAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                  <input className="md:col-span-3 rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Description" value={line.description} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, description: e.target.value } : l))} />
                  <input type="number" className="md:col-span-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Debit" value={line.debit} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, debit: Number(e.target.value) } : l))} />
                  <input type="number" className="md:col-span-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Credit" value={line.credit} onChange={(e) => setEditLines((p) => p.map((l, i) => i === idx ? { ...l, credit: Number(e.target.value) } : l))} />
                  <button className="md:col-span-1 text-red-500 text-sm" onClick={() => setEditLines((p) => p.filter((_, i) => i !== idx))} disabled={editLines.length <= 2}>×</button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => setEditLines((p) => [...p, { chart_account_id: "", description: "", debit: 0, credit: 0 }])}>+ Line</Button>
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="secondary" onClick={() => setEditingEntry(null)}>Cancel</Button>
              <Button onClick={() => void handleUpdate()} disabled={editSaving}>{editSaving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </SlideOver>
      )}

      <MediaPickerModal
        open={showEvidencePicker}
        onClose={() => setShowEvidencePicker(false)}
        title="Select Remittance Evidence"
        multiple
        selectedIds={remitEvidenceFiles.map((file) => file.id)}
        loadFiles={async (search) => listFileAssets({ include_usage: true, per_page: 200, search })}
        uploadFiles={async (files, onProgress) => {
          const total = files.length;
          let uploaded = 0;
          for (const file of Array.from(files)) {
            onProgress?.({ uploaded, total, current_file_name: file.name });
            const asset = await uploadFileAsset(file, { metadata: { source: "statutory_remittance_evidence" } });
            uploaded += 1;
            onProgress?.({ uploaded, total, current_file_name: file.name });
            setRemitEvidenceFiles((prev) => prev.some((item) => item.id === asset.id) ? prev : [...prev, { id: asset.id, file_name: asset.file_name }]);
          }
        }}
        onSelect={(files) => setRemitEvidenceFiles(files.map((file) => ({ id: file.id, file_name: file.file_name })))}
      />
    </AppShell>
  );
}
