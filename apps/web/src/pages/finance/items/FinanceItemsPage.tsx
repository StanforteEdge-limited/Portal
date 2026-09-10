import { useMemo, useState } from "react";
import {
  AppShell,
  Button,
  Chip,
  Icon,
  PageHeader,
  PaginationControls,
  SectionCard,
  SelectField,
  StatCard,
  useToast,
  DataTable,
  ColumnDef,
} from "@/shared";
import { useAuth } from "@/shared/context/AuthProvider";
import { resourceApi, useCachedQuery } from "@/shared/lib/core";
import { buildAppMobileNav, buildAppNavigation } from "@/shared/navigation";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";
import { formatCurrency } from "@stanforte/shared";

type ItemType = "service" | "product" | "other";

export default function FinanceItemsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [itemType, setItemType] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [listKey, setListKey] = useState(0);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    item_type: "service" as ItemType,
    unit: "",
    unit_price: "",
    cost_price: "",
    currency: "NGN",
    chart_account_id: "",
    is_active: true,
  });

  const { data: profile } = useCachedQuery(
    "finance:profile",
    () => getWorkspaceProfile(),
    { ttlMs: 60_000, storage: "memory" },
  );

  const { data: itemsPayload, loading, refetch } = useCachedQuery(
    `finance:items:${listKey}:${search}:${itemType}:${statusFilter}:${page}:${perPage}`,
    () =>
      resourceApi.listFinanceItems({
        search: search || undefined,
        item_type: itemType || undefined,
        is_active:
          statusFilter === "all" ? undefined : statusFilter === "active" ? true : false,
        page,
        per_page: perPage,
      }),
    { ttlMs: 0, storage: "memory" },
  );

  const { data: chartAccounts } = useCachedQuery(
    "finance:chart-accounts:all",
    () => resourceApi.listChartAccounts({ is_active: true }),
    { ttlMs: 60_000, storage: "memory" },
  );

  const items = Array.isArray(itemsPayload?.result) ? itemsPayload.result : [];
  const totalItems = Number(itemsPayload?.total ?? 0);
  const pagination = {
    page: itemsPayload?.page ?? page,
    pages: itemsPayload?.pages ?? 1,
    total_result: itemsPayload?.total ?? 0,
    per_page: itemsPayload?.per_page ?? perPage,
  };

  const activeCount = useMemo(
    () => items.filter((item: any) => item.isActive ?? item.is_active).length,
    [items],
  );
  const productCount = useMemo(
    () => items.filter((item: any) => (item.itemType ?? item.item_type) === "product").length,
    [items],
  );
  const serviceCount = useMemo(
    () => items.filter((item: any) => (item.itemType ?? item.item_type) === "service").length,
    [items],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      code: "",
      description: "",
      item_type: "service",
      unit: "",
      unit_price: "",
      cost_price: "",
      currency: "NGN",
      chart_account_id: "",
      is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name ?? "",
      code: item.code ?? "",
      description: item.description ?? "",
      item_type: (item.itemType ?? item.item_type ?? "service") as ItemType,
      unit: item.unit ?? "",
      unit_price: String(item.unitPrice ?? item.unit_price ?? ""),
      cost_price: String(item.costPrice ?? item.cost_price ?? ""),
      currency: item.currency ?? "NGN",
      chart_account_id: item.chartAccountId ?? item.chart_account_id ?? "",
      is_active: Boolean(item.isActive ?? item.is_active ?? true),
    });
    setShowModal(true);
  };

  const saveItem = async () => {
    if (!form.name.trim()) {
      showToast({ tone: "warning", title: "Name required", message: "Please enter item name." });
      return;
    }
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        description: form.description.trim() || undefined,
        item_type: form.item_type,
        unit: form.unit.trim() || undefined,
        unit_price: form.unit_price ? Number(form.unit_price) : 0,
        cost_price: form.cost_price ? Number(form.cost_price) : undefined,
        currency: form.currency.toUpperCase(),
        chart_account_id: form.chart_account_id || undefined,
        is_active: form.is_active,
      };
      if (editing?.id) {
        await resourceApi.updateFinanceItem(String(editing.id), payload);
      } else {
        await resourceApi.createFinanceItem(payload);
      }
      setShowModal(false);
      setListKey((k) => k + 1);
      showToast({ tone: "success", title: "Saved", message: "Item saved successfully." });
    } catch (error) {
      showToast({ tone: "danger", title: "Save failed", message: error instanceof Error ? error.message : "Unable to save item." });
    }
  };

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Finance";

  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      header: "Code",
      cell: (item: any) => item.code || "-"
    },
    {
      header: "Name",
      cell: (item: any) => (
        <div>
          <p className="font-medium text-slate-900">{item.name}</p>
          {item.description ? <p className="text-xs text-slate-500">{item.description}</p> : null}
        </div>
      )
    },
    {
      header: "Type",
      cell: (item: any) => (
        <span className="capitalize">
          {item.itemType ?? item.item_type ?? "service"}
        </span>
      )
    },
    {
      header: "Unit",
      cell: (item: any) => item.unit || "-"
    },
    {
      header: "Unit Price",
      cell: (item: any) => formatCurrency(Number(item.unitPrice ?? item.unit_price ?? 0), item.currency || "NGN"),
      className: "text-right text-slate-900 font-medium"
    },
    {
      header: "Status",
      cell: (item: any) => {
        const active = Boolean(item.isActive ?? item.is_active ?? true);
        return (
          <Chip variant={active ? "success" : "neutral"}>
            {active ? "Active" : "Inactive"}
          </Chip>
        );
      }
    },
    {
      header: "Actions",
      cell: (item: any) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
          <Icon name="edit" />
        </Button>
      ),
      className: "text-right"
    }
  ], [openEdit]);

  return (
    <AppShell
      navigation={buildAppNavigation({ requestDetailsParent: "finance" })}
      activeLabel="finance-items"
      user={{ name: userName, role: profile?.employee_profile?.job_title || "Finance" }}
      mobileNav={buildAppMobileNav("Dashboard")}
    >
      <PageHeader
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: "Items" }]}
        title="Items"
        description="Products and services catalog for invoicing and purchases."
      />

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Total Items" value={String(pagination.total_result || 0)} tone="neutral" />
          <StatCard label="Active" value={String(activeCount)} tone="success" />
          <StatCard label="Products" value={String(productCount)} tone="neutral" />
          <StatCard label="Services" value={String(serviceCount)} tone="neutral" />
        </div>

        <section className="section-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5 text-sm flex-1 min-w-[180px]">
              <span className="font-semibold text-slate-700">Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or code"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-[0.6rem] text-sm font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-brand-900/10"
              />
            </label>
            <SelectField label="Type" value={itemType} onChange={(event) => { setItemType(event.target.value); setPage(1); }}>
              <option value="">All</option>
              <option value="service">Service</option>
              <option value="product">Product</option>
              <option value="other">Other</option>
            </SelectField>
            <SelectField label="Status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectField>
            <Button variant="secondary" size="sm" onClick={() => void refetch()}>
              <Icon name="refresh" className="text-[16px]" />
              Refresh
            </Button>
          </div>
        </section>

        <SectionCard
          title="All Items"
          description="Track and manage inventory items."
          action={
            totalItems > 0 ? (
              <Chip variant="neutral">
                Showing{" "}
                {Math.min(totalItems, (page - 1) * perPage + 1)}-
                {Math.min(totalItems, page * perPage)} of {totalItems} item
                {totalItems === 1 ? "" : "s"}
              </Chip>
            ) : (
              <Button onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                New Item
              </Button>
            )
          }
        >
        <DataTable
          columns={columns}
          data={items}
          loading={loading}
          error={null}
          caption="Items"
          emptyTitle="No items found"
          emptyDescription="There are no catalog items to display."
          onRowClick={(item) => openEdit(item)}
          pagination={{
            page: Number(pagination.page || page),
            totalPages: Number(pagination.pages || 1),
            totalCount: Number(pagination.total_result || 0),
            perPage: Number(pagination.per_page || perPage),
            onPageChange: setPage,
            onPerPageChange: (value) => {
              setPerPage(value);
              setPage(1);
            },
          }}
        />
        </SectionCard>
      </div>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">{editing ? "Edit Item" : "New Item"}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <Icon name="close" />
              </Button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Name</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Code</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} />
              </label>
              <SelectField label="Type" value={form.item_type} onChange={(event) => setForm((prev) => ({ ...prev, item_type: event.target.value as ItemType }))}>
                <option value="service">Service</option>
                <option value="product">Product</option>
                <option value="other">Other</option>
              </SelectField>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Unit</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="pcs, hr, kg" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Currency</span>
                <input className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Unit Price</span>
                <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.unit_price} onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-semibold text-slate-700">Cost Price</span>
                <input type="number" className="rounded-2xl border border-slate-200 px-4 py-2.5" value={form.cost_price} onChange={(event) => setForm((prev) => ({ ...prev, cost_price: event.target.value }))} />
              </label>
              <SelectField label="Chart Account" value={form.chart_account_id} onChange={(event) => setForm((prev) => ({ ...prev, chart_account_id: event.target.value }))}>
                <option value="">Select chart account</option>
                {(Array.isArray(chartAccounts) ? chartAccounts : []).map((account: any) => (
                  <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                ))}
              </SelectField>
              <label className="flex items-center gap-2 text-sm pt-8">
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.checked }))} />
                <span className="font-semibold text-slate-700">Active</span>
              </label>
              <label className="grid gap-1.5 text-sm md:col-span-2">
                <span className="font-semibold text-slate-700">Description</span>
                <textarea className="rounded-2xl border border-slate-200 px-4 py-2.5" rows={3} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={() => void saveItem()}>{editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
