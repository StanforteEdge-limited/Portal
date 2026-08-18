import { useEffect, useState } from "react";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { uploadFileAsset } from "@/pages/files/files-api";
import {
  Button,
  Chip,
  EmptyState,
  Icon,
  SelectField,
  StatCard,
  TextField,
  useToast,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import {
  SlideOver,
  SlideOverContent,
  SlideOverFooter,
  SlideOverHeader,
} from "@/shared/components/ui/SlideOver";

type Signatory = { name: string; title: string; signature_file_id: string; signature_url: string | null };

type Donor = {
  id: string;
  name: string;
  donor_type: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
};

type Fund = {
  id: string;
  code: string;
  name: string;
  fund_type: string | null;
  restriction_type: string | null;
  purpose: string | null;
  is_active: boolean;
  donor: { id: string; name: string } | null;
};

type Grant = {
  id: string;
  code: string;
  name: string;
  status: string | null;
  committed_amount: number;
  start_date: string | null;
  end_date: string | null;
  donor: { id: string; name: string } | null;
  fund: { id: string; code: string; name: string } | null;
};

type DonorForm = { name: string; donor_type: string; email: string; phone: string };
type FundForm = { code: string; name: string; fund_type: string; restriction_type: string; donor_id: string; purpose: string };
type GrantForm = { code: string; name: string; donor_id: string; fund_id: string; start_date: string; end_date: string; committed_amount: string; status: string };

const emptyDonorForm = (): DonorForm => ({ name: "", donor_type: "grantor", email: "", phone: "" });
const emptyFundForm = (): FundForm => ({ code: "", name: "", fund_type: "operating", restriction_type: "unrestricted", donor_id: "", purpose: "" });
const emptyGrantForm = (): GrantForm => ({ code: "", name: "", donor_id: "", fund_id: "", start_date: "", end_date: "", committed_amount: "", status: "active" });

export default function NonprofitSetupTab() {
  const { showToast } = useToast();

  const { data: settingsData, refetch: refetchSettings } = useCachedQuery(
    "finance:settings:doc",
    () => financeApi.getSettings(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: donorsData, refetch: refetchDonors } = useCachedQuery(
    "finance:settings:donors",
    () => financeApi.listDonors(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: fundsData, refetch: refetchFunds } = useCachedQuery(
    "finance:settings:funds",
    () => financeApi.listFunds(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: grantsData, refetch: refetchGrants } = useCachedQuery(
    "finance:settings:grants",
    () => financeApi.listGrants(),
    { ttlMs: 60_000, storage: "memory" },
  );

  const donors = (Array.isArray(donorsData) ? donorsData : []) as Donor[];
  const funds = (Array.isArray(fundsData) ? fundsData : []) as Fund[];
  const grants = (Array.isArray(grantsData) ? grantsData : []) as Grant[];
  const settings = (settingsData ?? {}) as Record<string, unknown>;

  // Signatory state
  const emptySignatory = (): Signatory => ({ name: "", title: "", signature_file_id: "", signature_url: null });
  const [preparedBy, setPreparedBy] = useState<Signatory>(emptySignatory());
  const [reviewedBy, setReviewedBy] = useState<Signatory>(emptySignatory());
  const [approvedBy, setApprovedBy] = useState<Signatory>(emptySignatory());
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState<"prepared_by" | "reviewed_by" | "approved_by" | null>(null);

  useEffect(() => {
    if (settingsData) {
      const getSig = (key: string): Signatory => {
        const v = settings[key] as { name?: string; title?: string; signature_file_id?: string; signature_url?: string } | undefined;
        return {
          name: v?.name ?? "",
          title: v?.title ?? "",
          signature_file_id: v?.signature_file_id ?? "",
          signature_url: v?.signature_url ?? null,
        };
      };
      setPreparedBy(getSig("prepared_by"));
      setReviewedBy(getSig("reviewed_by"));
      setApprovedBy(getSig("approved_by"));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsData]);

  const signatorySetters = {
    prepared_by: setPreparedBy,
    reviewed_by: setReviewedBy,
    approved_by: setApprovedBy,
  } as const;

  const handleUploadSignature = async (key: keyof typeof signatorySetters, file: File | null) => {
    if (!file) return;
    setUploadingSignature(key);
    try {
      const uploaded = await uploadFileAsset(file, { metadata: { source: "finance_settings_signature" } });
      signatorySetters[key]((prev) => ({ ...prev, signature_file_id: uploaded.id, signature_url: null }));
    } catch {
      showToast({ tone: "danger", title: "Upload failed", message: "Could not upload signature image." });
    } finally {
      setUploadingSignature(null);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await financeApi.updateSettings({
        prepared_by: { name: preparedBy.name, title: preparedBy.title, signature_file_id: preparedBy.signature_file_id || undefined },
        reviewed_by: { name: reviewedBy.name, title: reviewedBy.title, signature_file_id: reviewedBy.signature_file_id || undefined },
        approved_by: { name: approvedBy.name, title: approvedBy.title, signature_file_id: approvedBy.signature_file_id || undefined },
      });
      showToast({ tone: "success", title: "Saved", message: "Signatory settings updated." });
      refetchSettings?.();
    } catch {
      showToast({ tone: "danger", title: "Save failed", message: "Could not update signatory settings." });
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Donor slide ---
  const [donorSlide, setDonorSlide] = useState<{ open: boolean; editing: Donor | null }>({ open: false, editing: null });
  const [donorForm, setDonorForm] = useState<DonorForm>(emptyDonorForm());
  const [savingDonor, setSavingDonor] = useState(false);
  const setD = (patch: Partial<DonorForm>) => setDonorForm((p) => ({ ...p, ...patch }));

  const openAddDonor = () => { setDonorForm(emptyDonorForm()); setDonorSlide({ open: true, editing: null }); };
  const openEditDonor = (d: Donor) => {
    setDonorForm({ name: d.name, donor_type: d.donor_type ?? "grantor", email: d.email ?? "", phone: d.phone ?? "" });
    setDonorSlide({ open: true, editing: d });
  };
  const closeDonor = () => setDonorSlide({ open: false, editing: null });
  const handleSaveDonor = async () => {
    if (!donorForm.name.trim()) { showToast({ tone: "danger", message: "Name is required." }); return; }
    setSavingDonor(true);
    try {
      const dto = {
        name: donorForm.name,
        ...(donorForm.donor_type && { donor_type: donorForm.donor_type }),
        ...(donorForm.email && { email: donorForm.email }),
        ...(donorForm.phone && { phone: donorForm.phone }),
      };
      if (donorSlide.editing) {
        await financeApi.updateDonor(donorSlide.editing.id, dto);
      } else {
        await financeApi.createDonor(dto);
      }
      showToast({ tone: "success", message: donorSlide.editing ? "Donor updated." : "Donor added." });
      closeDonor();
      refetchDonors?.();
    } catch {
      showToast({ tone: "danger", message: "Could not save donor." });
    } finally {
      setSavingDonor(false);
    }
  };

  // --- Fund slide ---
  const [fundSlide, setFundSlide] = useState<{ open: boolean; editing: Fund | null }>({ open: false, editing: null });
  const [fundForm, setFundForm] = useState<FundForm>(emptyFundForm());
  const [savingFund, setSavingFund] = useState(false);
  const setF = (patch: Partial<FundForm>) => setFundForm((p) => ({ ...p, ...patch }));

  const openAddFund = () => { setFundForm(emptyFundForm()); setFundSlide({ open: true, editing: null }); };
  const openEditFund = (f: Fund) => {
    setFundForm({ code: f.code, name: f.name, fund_type: f.fund_type ?? "operating", restriction_type: f.restriction_type ?? "unrestricted", donor_id: f.donor?.id ?? "", purpose: f.purpose ?? "" });
    setFundSlide({ open: true, editing: f });
  };
  const closeFund = () => setFundSlide({ open: false, editing: null });
  const handleSaveFund = async () => {
    if (!fundForm.code.trim() || !fundForm.name.trim()) { showToast({ tone: "danger", message: "Code and Name are required." }); return; }
    setSavingFund(true);
    try {
      const dto = {
        code: fundForm.code,
        name: fundForm.name,
        ...(fundForm.fund_type && { fund_type: fundForm.fund_type }),
        ...(fundForm.restriction_type && { restriction_type: fundForm.restriction_type }),
        ...(fundForm.donor_id && { donor_id: fundForm.donor_id }),
        ...(fundForm.purpose && { purpose: fundForm.purpose }),
      };
      if (fundSlide.editing) {
        await financeApi.updateFund(fundSlide.editing.id, dto);
      } else {
        await financeApi.createFund(dto);
      }
      showToast({ tone: "success", message: fundSlide.editing ? "Fund updated." : "Fund added." });
      closeFund();
      refetchFunds?.();
    } catch {
      showToast({ tone: "danger", message: "Could not save fund." });
    } finally {
      setSavingFund(false);
    }
  };

  // --- Grant slide ---
  const [grantSlide, setGrantSlide] = useState<{ open: boolean; editing: Grant | null }>({ open: false, editing: null });
  const [grantForm, setGrantForm] = useState<GrantForm>(emptyGrantForm());
  const [savingGrant, setSavingGrant] = useState(false);
  const setG = (patch: Partial<GrantForm>) => setGrantForm((p) => ({ ...p, ...patch }));

  const openAddGrant = () => { setGrantForm(emptyGrantForm()); setGrantSlide({ open: true, editing: null }); };
  const openEditGrant = (g: Grant) => {
    setGrantForm({
      code: g.code,
      name: g.name,
      donor_id: g.donor?.id ?? "",
      fund_id: g.fund?.id ?? "",
      start_date: g.start_date ? new Date(g.start_date).toISOString().split("T")[0] : "",
      end_date: g.end_date ? new Date(g.end_date).toISOString().split("T")[0] : "",
      committed_amount: g.committed_amount ? String(g.committed_amount) : "",
      status: g.status ?? "active",
    });
    setGrantSlide({ open: true, editing: g });
  };
  const closeGrant = () => setGrantSlide({ open: false, editing: null });
  const handleSaveGrant = async () => {
    if (!grantForm.code.trim() || !grantForm.name.trim()) { showToast({ tone: "danger", message: "Code and Name are required." }); return; }
    setSavingGrant(true);
    try {
      const dto = {
        code: grantForm.code,
        name: grantForm.name,
        ...(grantForm.donor_id && { donor_id: grantForm.donor_id }),
        ...(grantForm.fund_id && { fund_id: grantForm.fund_id }),
        ...(grantForm.start_date && { start_date: grantForm.start_date }),
        ...(grantForm.end_date && { end_date: grantForm.end_date }),
        ...(grantForm.committed_amount && { committed_amount: Number(grantForm.committed_amount) }),
        ...(grantForm.status && { status: grantForm.status }),
      };
      if (grantSlide.editing) {
        await financeApi.updateGrant(grantSlide.editing.id, dto);
      } else {
        await financeApi.createGrant(dto);
      }
      showToast({ tone: "success", message: grantSlide.editing ? "Grant updated." : "Grant added." });
      closeGrant();
      refetchGrants?.();
    } catch {
      showToast({ tone: "danger", message: "Could not save grant." });
    } finally {
      setSavingGrant(false);
    }
  };

  // --- Delete confirm ---
  const [confirmDelete, setConfirmDelete] = useState<{ type: "donor" | "fund" | "grant"; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === "donor") { await financeApi.deleteDonor(confirmDelete.id); refetchDonors?.(); }
      else if (confirmDelete.type === "fund") { await financeApi.deleteFund(confirmDelete.id); refetchFunds?.(); }
      else { await financeApi.deleteGrant(confirmDelete.id); refetchGrants?.(); }
      showToast({ tone: "success", message: `${confirmDelete.name} deleted.` });
      setConfirmDelete(null);
    } catch {
      showToast({ tone: "danger", message: "Could not delete. It may be in use." });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-headline text-lg font-semibold text-slate-950">Nonprofit Setup</h3>
        <p className="text-sm text-slate-500">Donors, funds, grants, and signature setup.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Donors" value={String(donors.length)} tone="neutral" />
        <StatCard label="Funds" value={String(funds.length)} tone="neutral" />
        <StatCard label="Grants" value={String(grants.length)} tone="neutral" />
      </div>

      {/* Donors */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Donors</p>
          <Button variant="secondary" size="sm" onClick={openAddDonor}>Add Donor</Button>
        </div>
        {donors.length === 0 ? (
          <EmptyState title="No donors yet" description="Add your first donor to get started." />
        ) : (
          <DataTable
            columns={[
              { header: "Name", className: "font-medium", cell: (d) => d.name },
              { header: "Type", cell: (d) => d.donor_type ?? "—" },
              { header: "Email", cell: (d) => d.email ?? "—" },
              { header: "Phone", cell: (d) => d.phone ?? "—" },
              { header: "Status", cell: (d) => <Chip variant={d.is_active ? "success" : "neutral"}>{d.is_active ? "Active" : "Inactive"}</Chip> },
              { header: "", cell: (d) => (
                confirmDelete?.id === d.id ? (
                  <span className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => void handleConfirmDelete()} disabled={deleting}>
                      {deleting ? "Deleting..." : "Confirm"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditDonor(d)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ type: "donor", id: d.id, name: d.name })}>Delete</Button>
                  </span>
                )
              ) }
            ]}
            data={donors}
          />
        )}
      </div>

      {/* Funds */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Funds</p>
          <Button variant="secondary" size="sm" onClick={openAddFund}>Add Fund</Button>
        </div>
        {funds.length === 0 ? (
          <EmptyState title="No funds yet" description="Add your first fund to get started." />
        ) : (
          <DataTable
            columns={[
              { header: "Code", className: "font-mono text-xs", cell: (f) => f.code },
              { header: "Name", className: "font-medium", cell: (f) => f.name },
              { header: "Type", cell: (f) => f.fund_type ?? "—" },
              { header: "Restriction", cell: (f) => f.restriction_type ?? "—" },
              { header: "Donor", cell: (f) => f.donor?.name ?? "—" },
              { header: "Status", cell: (f) => <Chip variant={f.is_active ? "success" : "neutral"}>{f.is_active ? "Active" : "Inactive"}</Chip> },
              { header: "", cell: (f) => (
                confirmDelete?.id === f.id ? (
                  <span className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => void handleConfirmDelete()} disabled={deleting}>
                      {deleting ? "Deleting..." : "Confirm"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditFund(f)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ type: "fund", id: f.id, name: f.name })}>Delete</Button>
                  </span>
                )
              ) }
            ]}
            data={funds}
          />
        )}
      </div>

      {/* Grants */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Grants</p>
          <Button variant="secondary" size="sm" onClick={openAddGrant}>Add Grant</Button>
        </div>
        {grants.length === 0 ? (
          <EmptyState title="No grants yet" description="Add your first grant to get started." />
        ) : (
          <DataTable
            columns={[
              { header: "Code", className: "font-mono text-xs", cell: (g) => g.code },
              { header: "Name", className: "font-medium", cell: (g) => g.name },
              { header: "Donor", cell: (g) => g.donor?.name ?? "—" },
              { header: "Fund", cell: (g) => g.fund?.name ?? "—" },
              { header: "Status", cell: (g) => <Chip variant={g.status === "active" ? "success" : g.status === "closed" ? "neutral" : "warning"}>{g.status ?? "unknown"}</Chip> },
              { header: "", cell: (g) => (
                confirmDelete?.id === g.id ? (
                  <span className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => void handleConfirmDelete()} disabled={deleting}>
                      {deleting ? "Deleting..." : "Confirm"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEditGrant(g)}>Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDelete({ type: "grant", id: g.id, name: g.name })}>Delete</Button>
                  </span>
                )
              ) }
            ]}
            data={grants}
          />
        )}
      </div>

      {/* PDF Signatories */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">PDF Signatories</p>
          <p className="text-sm text-slate-500 mt-1">These names appear in the Approvals section of all request and payment voucher PDFs.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Prepared By (Accountant)</p>
            <TextField label="Name" value={preparedBy.name} onChange={(e) => setPreparedBy((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Dunsin Babatunde" />
            <TextField label="Title" value={preparedBy.title} onChange={(e) => setPreparedBy((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Accountant" />
            {preparedBy.signature_url && (
              <img src={preparedBy.signature_url} alt="Signature" className="h-10 rounded border border-slate-200 bg-white p-1" />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <Icon name="draw" className="text-[16px]" />
              {uploadingSignature === "prepared_by" ? "Uploading…" : preparedBy.signature_file_id ? "Replace Signature" : "Upload Signature"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingSignature !== null} onChange={(e) => { void handleUploadSignature("prepared_by", e.target.files?.[0] ?? null); e.target.value = ""; }} />
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Reviewed By (COO)</p>
            <TextField label="Name" value={reviewedBy.name} onChange={(e) => setReviewedBy((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Olalekan Owonikoko" />
            <TextField label="Title" value={reviewedBy.title} onChange={(e) => setReviewedBy((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Finance Manager / COO" />
            {reviewedBy.signature_url && (
              <img src={reviewedBy.signature_url} alt="Signature" className="h-10 rounded border border-slate-200 bg-white p-1" />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <Icon name="draw" className="text-[16px]" />
              {uploadingSignature === "reviewed_by" ? "Uploading…" : reviewedBy.signature_file_id ? "Replace Signature" : "Upload Signature"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingSignature !== null} onChange={(e) => { void handleUploadSignature("reviewed_by", e.target.files?.[0] ?? null); e.target.value = ""; }} />
            </label>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Approved By (ED)</p>
            <TextField label="Name" value={approvedBy.name} onChange={(e) => setApprovedBy((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Olusola Owonikoko" />
            <TextField label="Title" value={approvedBy.title} onChange={(e) => setApprovedBy((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Executive Director" />
            {approvedBy.signature_url && (
              <img src={approvedBy.signature_url} alt="Signature" className="h-10 rounded border border-slate-200 bg-white p-1" />
            )}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
              <Icon name="draw" className="text-[16px]" />
              {uploadingSignature === "approved_by" ? "Uploading…" : approvedBy.signature_file_id ? "Replace Signature" : "Upload Signature"}
              <input type="file" accept="image/*" className="hidden" disabled={uploadingSignature !== null} onChange={(e) => { void handleUploadSignature("approved_by", e.target.files?.[0] ?? null); e.target.value = ""; }} />
            </label>
          </div>
        </div>
        <p className="text-xs text-slate-400">If no signature is uploaded, only the name and title are shown on generated documents.</p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={() => void handleSaveSettings()} disabled={savingSettings}>
            {savingSettings ? "Saving..." : "Save Signatories"}
          </Button>
        </div>
      </div>

      {/* Donor SlideOver */}
      <SlideOver open={donorSlide.open} onClose={closeDonor} size="md">
        <SlideOverHeader title={donorSlide.editing ? "Edit Donor" : "Add Donor"} onClose={closeDonor} />
        <SlideOverContent>
          <div className="space-y-4">
            <TextField label="Name *" value={donorForm.name} onChange={(e) => setD({ name: e.target.value })} placeholder="e.g. MacArthur Foundation" />
            <SelectField label="Type" value={donorForm.donor_type} onChange={(e) => setD({ donor_type: e.target.value })}>
              <option value="grantor">Grantor</option>
              <option value="individual">Individual</option>
              <option value="corporate">Corporate</option>
              <option value="government">Government</option>
            </SelectField>
            <TextField label="Email" value={donorForm.email} onChange={(e) => setD({ email: e.target.value })} placeholder="grants@example.org" type="email" />
            <TextField label="Phone" value={donorForm.phone} onChange={(e) => setD({ phone: e.target.value })} placeholder="+234..." />
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <Button variant="ghost" onClick={closeDonor}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSaveDonor()} disabled={savingDonor}>
            {savingDonor ? "Saving..." : donorSlide.editing ? "Update Donor" : "Add Donor"}
          </Button>
        </SlideOverFooter>
      </SlideOver>

      {/* Fund SlideOver */}
      <SlideOver open={fundSlide.open} onClose={closeFund} size="md">
        <SlideOverHeader title={fundSlide.editing ? "Edit Fund" : "Add Fund"} onClose={closeFund} />
        <SlideOverContent>
          <div className="space-y-4">
            <TextField label="Code *" value={fundForm.code} onChange={(e) => setF({ code: e.target.value })} placeholder="e.g. UNR-001" />
            <TextField label="Name *" value={fundForm.name} onChange={(e) => setF({ name: e.target.value })} placeholder="e.g. Unrestricted Operations Fund" />
            <SelectField label="Fund Type" value={fundForm.fund_type} onChange={(e) => setF({ fund_type: e.target.value })}>
              <option value="operating">Operating</option>
              <option value="capital">Capital</option>
              <option value="endowment">Endowment</option>
              <option value="reserve">Reserve</option>
            </SelectField>
            <SelectField label="Restriction Type" value={fundForm.restriction_type} onChange={(e) => setF({ restriction_type: e.target.value })}>
              <option value="unrestricted">Unrestricted</option>
              <option value="temporarily_restricted">Temporarily Restricted</option>
              <option value="permanently_restricted">Permanently Restricted</option>
            </SelectField>
            <SelectField label="Donor (optional)" value={fundForm.donor_id} onChange={(e) => setF({ donor_id: e.target.value })}>
              <option value="">— None —</option>
              {donors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </SelectField>
            <TextField label="Purpose" value={fundForm.purpose} onChange={(e) => setF({ purpose: e.target.value })} placeholder="Brief description..." />
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <Button variant="ghost" onClick={closeFund}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSaveFund()} disabled={savingFund}>
            {savingFund ? "Saving..." : fundSlide.editing ? "Update Fund" : "Add Fund"}
          </Button>
        </SlideOverFooter>
      </SlideOver>

      {/* Grant SlideOver */}
      <SlideOver open={grantSlide.open} onClose={closeGrant} size="md">
        <SlideOverHeader title={grantSlide.editing ? "Edit Grant" : "Add Grant"} onClose={closeGrant} />
        <SlideOverContent>
          <div className="space-y-4">
            <TextField label="Code *" value={grantForm.code} onChange={(e) => setG({ code: e.target.value })} placeholder="e.g. GRT-2026-001" />
            <TextField label="Name *" value={grantForm.name} onChange={(e) => setG({ name: e.target.value })} placeholder="e.g. Education Program Grant 2026" />
            <SelectField label="Donor (optional)" value={grantForm.donor_id} onChange={(e) => setG({ donor_id: e.target.value })}>
              <option value="">— None —</option>
              {donors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </SelectField>
            <SelectField label="Fund (optional)" value={grantForm.fund_id} onChange={(e) => setG({ fund_id: e.target.value })}>
              <option value="">— None —</option>
              {funds.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
            </SelectField>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Start Date" value={grantForm.start_date} onChange={(e) => setG({ start_date: e.target.value })} type="date" />
              <TextField label="End Date" value={grantForm.end_date} onChange={(e) => setG({ end_date: e.target.value })} type="date" />
            </div>
            <TextField label="Committed Amount" value={grantForm.committed_amount} onChange={(e) => setG({ committed_amount: e.target.value })} type="number" placeholder="0" />
            <SelectField label="Status" value={grantForm.status} onChange={(e) => setG({ status: e.target.value })}>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
              <option value="suspended">Suspended</option>
            </SelectField>
          </div>
        </SlideOverContent>
        <SlideOverFooter>
          <Button variant="ghost" onClick={closeGrant}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSaveGrant()} disabled={savingGrant}>
            {savingGrant ? "Saving..." : grantSlide.editing ? "Update Grant" : "Add Grant"}
          </Button>
        </SlideOverFooter>
      </SlideOver>
    </div>
  );
}
