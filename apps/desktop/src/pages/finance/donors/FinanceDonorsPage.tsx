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

type Donor = {
  id: string;
  name: string;
  donor_type: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
};

const emptyForm = () => ({
  name: "",
  donor_type: "grantor",
  email: "",
  phone: "",
  address: "",
  is_active: true,
});

export default function FinanceDonorsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Finance";
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [listKey, setListKey] = useState(0);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editing, setEditing] = useState<Donor | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({
      is_active: status !== "all" ? String(status === "active") : undefined,
      q: search.trim() || undefined,
      page,
      per_page: perPage,
    }),
    [status, search, page, perPage],
  );

  const { data: donorsData, loading, error } = useCachedQuery(
    `finance:donors:${listKey}:${JSON.stringify(query)}`,
    () => resourceApi.listFinanceDonors(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const donors: Donor[] = Array.isArray(donorsData?.result) ? donorsData.result : [];
  const total = Number(donorsData?.total ?? 0);
  const totalPages = Number(donorsData?.pages ?? 1);

  const stats = useMemo(() => ({
    total,
    active: donors.filter((d) => d.is_active).length,
  }), [donors, total]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setSlideOverOpen(true);
  }

  function openEdit(donor: Donor) {
    setEditing(donor);
    setForm({
      name: donor.name,
      donor_type: donor.donor_type ?? "grantor",
      email: donor.email ?? "",
      phone: donor.phone ?? "",
      address: donor.address ?? "",
      is_active: donor.is_active ?? true,
    });
    setSlideOverOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast({ tone: "danger", title: "Validation error", message: "Donor name is required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        donor_type: form.donor_type,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      };
      if (editing) {
        await resourceApi.updateFinanceDonor(editing.id, payload);
        showToast({ tone: "success", title: "Donor updated", message: "Changes saved." });
      } else {
        await resourceApi.createFinanceDonor(payload);
        showToast({ tone: "success", title: "Donor created", message: "New donor added." });
      }
      setSlideOverOpen(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({ tone: "danger", title: "Save failed", message: err instanceof Error ? err.message : "Unable to save." });
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<Donor>[] = useMemo(() => [
    {
      header: "Name",
      cell: (d) => <span className="font-medium">{d.name}</span>,
    },
    {
      header: "Type",
      cell: (d) => <Chip variant="neutral" className="capitalize">{d.donor_type?.replace(/_/g, " ")}</Chip>,
    },
    { header: "Email", cell: (d) => d.email ?? "—" },
    { header: "Phone", cell: (d) => d.phone ?? "—" },
    {
      header: "Status",
      cell: (d) => <Chip variant={d.is_active ? "success" : "neutral"}>{d.is_active ? "Active" : "Inactive"}</Chip>,
    },
    {
      header: "Actions",
      cell: (d) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(d); }}>
          <Icon name="edit" />
        </Button>
      ),
      className: "text-right",
    },
  ], []);

  return (
    <AppShell
      navigation={buildAppNavigation({ requestDetailsParent: "finance" })}
      activeLabel="finance-donors"
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Donors" }]}
        title="Donors"
        description="Manage donors, grantors, and funding partners."
        actions={
          <Button onClick={openCreate}>
            <Icon name="add" className="text-[18px]" />
            Add Donor
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Total Donors" value={String(stats.total)} tone="neutral" />
        <StatCard label="Active" value={String(stats.active)} tone="success" />
      </div>

      <SectionCard
        title="Donor List"
        description="All registered donors and funding partners."
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
            <option value="inactive">Inactive</option>
          </SelectField>
          <TextField
            label="Search"
            placeholder="Name or email"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="min-w-[200px] flex-1"
          />
        </div>

        <DataTable
          columns={columns}
          data={donors}
          loading={loading}
          error={error}
          caption="Donors"
          emptyTitle="No donors yet"
          emptyDescription="Add your first donor to start tracking funding."
          onRowClick={openEdit}
          pagination={{ page, totalPages, totalCount: total, perPage, onPageChange: setPage, onPerPageChange: setPerPage }}
        />
      </SectionCard>

      <SlideOver open={slideOverOpen} onClose={() => setSlideOverOpen(false)}>
        <SlideOverPanel>
          <SlideOverHeader title={editing ? "Edit Donor" : "Add Donor"} onClose={() => setSlideOverOpen(false)} />
          <SlideOverContent>
            <div className="flex flex-col gap-4">
              <TextField
                label="Name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. USAID, Gates Foundation"
              />
              <SelectField
                label="Donor Type"
                value={form.donor_type}
                onChange={(e) => setForm((f) => ({ ...f, donor_type: e.target.value }))}
              >
                <option value="grantor">Grantor</option>
                <option value="individual">Individual</option>
                <option value="corporate">Corporate</option>
                <option value="government">Government</option>
                <option value="ngo">NGO</option>
                <option value="other">Other</option>
              </SelectField>
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contact@donor.org"
              />
              <TextField
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <TextField
                label="Address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
              {editing && (
                <SelectField
                  label="Status"
                  value={form.is_active ? "active" : "inactive"}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "active" }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </SelectField>
              )}
            </div>
          </SlideOverContent>
          <SlideOverFooter>
            <Button variant="secondary" onClick={() => setSlideOverOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editing ? "Save Changes" : "Add Donor"}</Button>
          </SlideOverFooter>
        </SlideOverPanel>
      </SlideOver>
    </AppShell>
  );
}
