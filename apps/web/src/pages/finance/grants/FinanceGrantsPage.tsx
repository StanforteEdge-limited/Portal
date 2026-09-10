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

type Grant = {
  id: string;
  code: string;
  name: string;
  donor_id: string | null;
  donor_name?: string;
  restriction_type: string;
  committed_amount: number;
  recognized_amount: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  purpose: string | null;
};

type Donor = { id: string; name: string };

const emptyForm = () => ({
  code: "",
  name: "",
  donor_id: "",
  restriction_type: "restricted",
  committed_amount: "",
  start_date: "",
  end_date: "",
  purpose: "",
  notes: "",
  status: "active",
});

export default function FinanceGrantsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Finance";
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [listKey, setListKey] = useState(0);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editing, setEditing] = useState<Grant | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({
      status: status !== "all" ? status : undefined,
      q: search.trim() || undefined,
      page,
      per_page: perPage,
    }),
    [status, search, page, perPage],
  );

  const { data: grantsData, loading, error } = useCachedQuery(
    `finance:grants:${listKey}:${JSON.stringify(query)}`,
    () => resourceApi.listFinanceGrants(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const grants: Grant[] = Array.isArray(grantsData?.result) ? grantsData.result : [];
  const total = Number(grantsData?.total ?? 0);
  const totalPages = Number(grantsData?.pages ?? 1);

  const { data: donorsData } = useCachedQuery(
    "finance:donors:select",
    () => resourceApi.listFinanceDonors({ per_page: 200 }),
    { ttlMs: 60_000, storage: "memory" },
  );
  const donors: Donor[] = Array.isArray(donorsData?.result) ? donorsData.result : [];

  const stats = useMemo(() => {
    const totalCommitted = grants.reduce((s, g) => s + Number(g.committed_amount ?? 0), 0);
    const totalRecognized = grants.reduce((s, g) => s + Number(g.recognized_amount ?? 0), 0);
    return { total, totalCommitted, totalRecognized };
  }, [grants, total]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSlideOverOpen(true);
  }

  function openEdit(grant: Grant) {
    setEditing(grant);
    setForm({
      code: grant.code ?? "",
      name: grant.name ?? "",
      donor_id: grant.donor_id ?? "",
      restriction_type: grant.restriction_type ?? "restricted",
      committed_amount: String(grant.committed_amount ?? ""),
      start_date: grant.start_date ? grant.start_date.slice(0, 10) : "",
      end_date: grant.end_date ? grant.end_date.slice(0, 10) : "",
      purpose: grant.purpose ?? "",
      notes: "",
      status: grant.status ?? "active",
    });
    setSlideOverOpen(true);
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim()) {
      showToast({ tone: "danger", title: "Validation error", message: "Code and name are required." });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim(),
        name: form.name.trim(),
        donor_id: form.donor_id || undefined,
        restriction_type: form.restriction_type,
        committed_amount: form.committed_amount ? Number(form.committed_amount) : undefined,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        purpose: form.purpose.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
      };
      if (editing) {
        await resourceApi.updateFinanceGrant(editing.id, payload);
        showToast({ tone: "success", title: "Grant updated", message: "Changes saved." });
      } else {
        await resourceApi.createFinanceGrant(payload);
        showToast({ tone: "success", title: "Grant created", message: "New grant added." });
      }
      setSlideOverOpen(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save." });
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<Grant>[] = useMemo(() => [
    {
      header: "Code",
      cell: (g) => <span className="font-mono text-xs font-semibold">{g.code}</span>,
    },
    { header: "Name", cell: (g) => <span className="font-medium">{g.name}</span> },
    { header: "Donor", cell: (g) => g.donor_name ?? "—" },
    {
      header: "Restriction",
      cell: (g) => (
        <Chip variant={g.restriction_type === "restricted" ? "warning" : "neutral"} className="capitalize">
          {g.restriction_type?.replace(/_/g, " ")}
        </Chip>
      ),
    },
    { header: "Committed", cell: (g) => asMoney(g.committed_amount), className: "text-right" },
    { header: "Recognized", cell: (g) => asMoney(g.recognized_amount), className: "text-right" },
    {
      header: "Status",
      cell: (g) => (
        <Chip variant={g.status === "active" ? "success" : g.status === "closed" ? "neutral" : "warning"} className="capitalize">
          {g.status}
        </Chip>
      ),
    },
    {
      header: "Actions",
      cell: (g) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(g); }}>
          <Icon name="edit" />
        </Button>
      ),
      className: "text-right",
    },
  ], []);

  return (
    <AppShell
      navigation={buildAppNavigation({ requestDetailsParent: "finance" })}
      activeLabel="finance-grants"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Grants" }]}
        title="Grants"
        description="Track grant awards, restrictions, and recognition."
        actions={
          <Button onClick={openCreate}>
            <Icon name="add" className="text-[18px]" />
            Add Grant
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Grants" value={String(stats.total)} tone="neutral" />
        <StatCard label="Total Committed" value={asMoney(stats.totalCommitted)} tone="neutral" />
        <StatCard label="Total Recognized" value={asMoney(stats.totalRecognized)} tone="success" />
      </div>

      <SectionCard
        title="Grant List"
        description="All active and completed grants."
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
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="suspended">Suspended</option>
          </SelectField>
          <TextField
            label="Search"
            placeholder="Code or name"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="min-w-[200px] flex-1"
          />
        </div>

        <DataTable
          columns={columns}
          data={grants}
          loading={loading}
          error={error}
          caption="Grants"
          emptyTitle="No grants yet"
          emptyDescription="Add grants to track restricted and unrestricted funding."
          onRowClick={openEdit}
          pagination={{ page, totalPages, totalCount: total, perPage, onPageChange: setPage, onPerPageChange: setPerPage }}
        />
      </SectionCard>

      <SlideOver open={slideOverOpen} onClose={() => setSlideOverOpen(false)}>
        <SlideOverPanel>
          <SlideOverHeader title={editing ? "Edit Grant" : "Add Grant"} onClose={() => setSlideOverOpen(false)} />
          <SlideOverContent>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Code *"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="GNT-001"
                />
                <SelectField
                  label="Status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="suspended">Suspended</option>
                </SelectField>
              </div>
              <TextField
                label="Name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. USAID Education Support Grant"
              />
              <SelectField
                label="Donor"
                value={form.donor_id}
                onChange={(e) => setForm((f) => ({ ...f, donor_id: e.target.value }))}
              >
                <option value="">— Select donor —</option>
                {donors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectField>
              <SelectField
                label="Restriction Type"
                value={form.restriction_type}
                onChange={(e) => setForm((f) => ({ ...f, restriction_type: e.target.value }))}
              >
                <option value="restricted">Restricted</option>
                <option value="unrestricted">Unrestricted</option>
                <option value="temporarily_restricted">Temporarily Restricted</option>
              </SelectField>
              <TextField
                label="Committed Amount"
                type="number"
                value={form.committed_amount}
                onChange={(e) => setForm((f) => ({ ...f, committed_amount: e.target.value }))}
                placeholder="0.00"
              />
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Start Date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
              <TextField
                label="Purpose"
                value={form.purpose}
                onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                placeholder="Brief description of grant purpose"
              />
            </div>
          </SlideOverContent>
          <SlideOverFooter>
            <Button variant="secondary" onClick={() => setSlideOverOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Add Grant"}</Button>
          </SlideOverFooter>
        </SlideOverPanel>
      </SlideOver>
    </AppShell>
  );
}
