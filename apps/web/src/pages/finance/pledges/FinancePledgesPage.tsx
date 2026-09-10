import { useMemo, useState } from "react";
import {
  AppShell,
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  SelectField,
  StatCard,
  TextField,
  useToast,
  DataTable,
  ColumnDef,
  SlideOver,
  SlideOverPanel,
  SlideOverHeader,
  SlideOverContent,
  SlideOverFooter,
} from "@/shared";
import { buildAppMobileNav, buildAppNavigation } from "@/shared/navigation";
import { useAuth } from "@/shared/context/AuthProvider";
import { resourceApi, useCachedQuery } from "@/shared/lib/core";
import { asMoney } from "@stanforte/shared";
import { downloadBase64File } from "@/shared/lib/download";

type Pledge = {
  id: string;
  pledge_number: string;
  donor_id: string;
  donor_name?: string;
  grant_id: string | null;
  fund_id: string | null;
  amount: number;
  received_amount: number;
  currency: string;
  status: string;
  pledged_at: string;
  expected_at: string | null;
  purpose: string | null;
};

type Donor = { id: string; name: string };
type Grant = { id: string; code: string; name: string };
type Fund = { id: string; code: string; name: string };

const emptyForm = () => ({
  donor_id: "",
  grant_id: "",
  fund_id: "",
  amount: "",
  currency: "NGN",
  pledged_at: new Date().toISOString().slice(0, 10),
  expected_at: "",
  purpose: "",
  notes: "",
});

const statusVariant = (s: string) =>
  s === "fulfilled" ? "success" : s === "partial" ? "warning" : s === "cancelled" ? "neutral" : "neutral";

export default function FinancePledgesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Finance";
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [listKey, setListKey] = useState(0);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editing, setEditing] = useState<Pledge | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const query = useMemo(
    () => ({
      status: status !== "all" ? status : undefined,
      q: search.trim() || undefined,
      page,
      per_page: perPage,
    }),
    [status, search, page, perPage],
  );

  const { data: pledgesData, loading, error } = useCachedQuery(
    `finance:pledges:${listKey}:${JSON.stringify(query)}`,
    () => resourceApi.listFinancePledges(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const pledges: Pledge[] = Array.isArray(pledgesData?.result) ? pledgesData.result : [];
  const total = Number(pledgesData?.total ?? 0);
  const totalPages = Number(pledgesData?.pages ?? 1);

  const { data: donorsData } = useCachedQuery(
    "finance:donors:select",
    () => resourceApi.listFinanceDonors({ per_page: 200 }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const donors: Donor[] = Array.isArray(donorsData?.result) ? donorsData.result : [];

  const { data: grantsData } = useCachedQuery(
    "finance:grants:select",
    () => resourceApi.listFinanceGrants({ per_page: 200 }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const grants: Grant[] = Array.isArray(grantsData?.result) ? grantsData.result : [];

  const { data: fundsData } = useCachedQuery(
    "finance:funds:select",
    () => resourceApi.listFinanceFunds({ per_page: 200 }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const funds: Fund[] = Array.isArray(fundsData?.result) ? fundsData.result : [];

  const stats = useMemo(() => {
    const totalPledged = pledges.reduce((s, p) => s + Number(p.amount ?? 0), 0);
    const totalReceived = pledges.reduce((s, p) => s + Number(p.received_amount ?? 0), 0);
    const pending = pledges.filter((p) => p.status === "pending").length;
    return { total, totalPledged, totalReceived, pending };
  }, [pledges, total]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSlideOverOpen(true);
  }

  function openEdit(pledge: Pledge) {
    setEditing(pledge);
    setForm({
      donor_id: pledge.donor_id ?? "",
      grant_id: pledge.grant_id ?? "",
      fund_id: pledge.fund_id ?? "",
      amount: String(pledge.amount ?? ""),
      currency: pledge.currency ?? "NGN",
      pledged_at: pledge.pledged_at ? pledge.pledged_at.slice(0, 10) : "",
      expected_at: pledge.expected_at ? pledge.expected_at.slice(0, 10) : "",
      purpose: pledge.purpose ?? "",
      notes: "",
    });
    setSlideOverOpen(true);
  }

  async function handleSave() {
    if (!form.donor_id) {
      showToast({ tone: "danger", title: "Validation error", message: "Donor is required." });
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      showToast({ tone: "danger", title: "Validation error", message: "Amount must be greater than zero." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        donor_id: form.donor_id,
        grant_id: form.grant_id || undefined,
        fund_id: form.fund_id || undefined,
        amount: Number(form.amount),
        currency: form.currency || "NGN",
        pledged_at: form.pledged_at,
        expected_at: form.expected_at || undefined,
        purpose: form.purpose.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (editing) {
        await resourceApi.updateFinancePledge(editing.id, payload);
        showToast({ tone: "success", title: "Pledge updated", message: "Changes saved." });
      } else {
        await resourceApi.createFinancePledge(payload);
        showToast({ tone: "success", title: "Pledge created", message: "Pledge recorded." });
      }
      setSlideOverOpen(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadAcknowledgment(pledge: Pledge) {
    setDownloadingId(pledge.id);
    try {
      const pdf = await resourceApi.downloadPledgeAcknowledgment(pledge.id);
      downloadBase64File(pdf.file_name, pdf.mime_type, pdf.content_base64);
    } catch (err) {
      showToast({ tone: "danger", title: "Download failed", message: err instanceof Error ? err.message : "Unable to download." });
    } finally {
      setDownloadingId(null);
    }
  }

  const columns: ColumnDef<Pledge>[] = useMemo(() => [
    {
      header: "Pledge #",
      cell: (p) => <span className="font-mono text-xs font-semibold">{p.pledge_number}</span>,
    },
    { header: "Donor", cell: (p) => <span className="font-medium">{p.donor_name ?? "—"}</span> },
    { header: "Pledged", cell: (p) => asMoney(p.amount), className: "text-right" },
    { header: "Received", cell: (p) => asMoney(p.received_amount), className: "text-right" },
    {
      header: "Status",
      cell: (p) => (
        <Chip variant={statusVariant(p.status)} className="capitalize">{p.status}</Chip>
      ),
    },
    { header: "Pledge Date", cell: (p) => p.pledged_at ? new Date(p.pledged_at).toLocaleDateString() : "—" },
    {
      header: "Actions",
      cell: (p) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            title="Download Acknowledgment"
            disabled={downloadingId === p.id}
            onClick={(e) => { e.stopPropagation(); handleDownloadAcknowledgment(p); }}
          >
            <Icon name="download" />
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(p); }}>
            <Icon name="edit" />
          </Button>
        </div>
      ),
      className: "text-right",
    },
  ], [downloadingId]);

  return (
    <AppShell
      navigation={buildAppNavigation({ requestDetailsParent: "finance" })}
      activeLabel="finance-pledges"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Pledges" }]}
        title="Pledges"
        description="Track donor pledge commitments and fulfilment status."
        actions={
          <Button onClick={openCreate}>
            <Icon name="add" className="text-[18px]" />
            Record Pledge
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Pledges" value={String(stats.total)} tone="neutral" />
        <StatCard label="Total Pledged" value={asMoney(stats.totalPledged)} tone="neutral" />
        <StatCard label="Total Received" value={asMoney(stats.totalReceived)} tone="success" />
        <StatCard label="Pending" value={String(stats.pending)} tone="warning" />
      </div>

      <SectionCard
        title="Pledge Register"
        description="All pledge commitments from donors."
        action={
          total > 0 ? (
            <Chip variant="neutral">
              {Math.min(total, (page - 1) * perPage + 1)}–{Math.min(total, page * perPage)} of {total}
            </Chip>
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="min-w-[130px]"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </SelectField>
          <TextField
            label="Search"
            placeholder="Pledge # or donor"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="min-w-[200px] flex-1"
          />
        </div>

        <DataTable
          columns={columns}
          data={pledges}
          loading={loading}
          error={error}
          caption="Pledges"
          emptyTitle="No pledges yet"
          emptyDescription="Record a pledge to start tracking donor commitments."
          onRowClick={openEdit}
          pagination={{ page, totalPages, totalCount: total, perPage, onPageChange: setPage, onPerPageChange: setPerPage }}
        />
      </SectionCard>

      <SlideOver open={slideOverOpen} onClose={() => setSlideOverOpen(false)}>
        <SlideOverPanel>
          <SlideOverHeader title={editing ? "Edit Pledge" : "Record Pledge"} onClose={() => setSlideOverOpen(false)} />
          <SlideOverContent>
            <div className="flex flex-col gap-4">
              <SelectField
                label="Donor *"
                value={form.donor_id}
                onChange={(e) => setForm((f) => ({ ...f, donor_id: e.target.value }))}
              >
                <option value="">— Select donor —</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectField>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Amount *"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                />
                <SelectField
                  label="Currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="NGN">NGN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </SelectField>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Pledge Date *"
                  type="date"
                  value={form.pledged_at}
                  onChange={(e) => setForm((f) => ({ ...f, pledged_at: e.target.value }))}
                />
                <TextField
                  label="Expected By"
                  type="date"
                  value={form.expected_at}
                  onChange={(e) => setForm((f) => ({ ...f, expected_at: e.target.value }))}
                />
              </div>
              <SelectField
                label="Grant (optional)"
                value={form.grant_id}
                onChange={(e) => setForm((f) => ({ ...f, grant_id: e.target.value }))}
              >
                <option value="">— None —</option>
                {grants.map((g) => (
                  <option key={g.id} value={g.id}>{g.code} — {g.name}</option>
                ))}
              </SelectField>
              <SelectField
                label="Fund (optional)"
                value={form.fund_id}
                onChange={(e) => setForm((f) => ({ ...f, fund_id: e.target.value }))}
              >
                <option value="">— None —</option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>{f.code} — {f.name}</option>
                ))}
              </SelectField>
              <TextField
                label="Purpose"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                placeholder="Purpose of the pledge"
              />
              <TextField
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </SlideOverContent>
          <SlideOverFooter>
            <Button variant="secondary" onClick={() => setSlideOverOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Record Pledge"}</Button>
          </SlideOverFooter>
        </SlideOverPanel>
      </SlideOver>
    </AppShell>
  );
}
