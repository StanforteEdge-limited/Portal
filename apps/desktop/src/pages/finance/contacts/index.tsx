import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AppShell,
  Button,
  Chip,
  EmptyState,
  Icon,
  PageHeader,
  PaginationControls,
  SectionCard,
  SelectField,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TextField,
  useToast,
  DataTable,
  ColumnDef,
} from "@/shared";
import { buildAppMobileNav, buildRequestsNavigation } from "@/pages/requests/requests-data";
import { useAuth } from "@/shared/context/AuthProvider";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { ContactRecord, asMoney } from "@stanforte/shared";
import { emptyForm } from "./helpers";
import { ContactDetailView } from "./ContactDetailView";
import { ContactFormSlideOver } from "./ContactFormSlideOver";

interface FinanceContactsPageProps {
  defaultType?: "customer" | "vendor" | "both";
}

export default function FinanceContactsPage({ defaultType = "both" }: FinanceContactsPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const contactId = searchParams.get("id");
  
  const [contactType, setContactType] = useState(() => 
    defaultType !== "both" ? defaultType : "all"
  );
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [listKey, setListKey] = useState(0);

  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [form, setForm] = useState<any>(() => 
    emptyForm(defaultType !== "both" ? defaultType : "customer")
  );
  const [saving, setSaving] = useState(false);

  const query = useMemo(
    () => ({
      contact_type: contactType !== "all" ? contactType : undefined,
      is_active: status !== "all" ? String(status === "active") : undefined,
      q: search.trim() || undefined,
      page,
      per_page: perPage,
    }),
    [contactType, status, search, page, perPage],
  );

  const { data: contactsData, loading, error } = useCachedQuery(
    `finance:contacts:${listKey}:${JSON.stringify(query)}`,
    () => financeApi.listContacts(query),
    { ttlMs: 30_000, storage: "memory" },
  );
  const contacts = Array.isArray(contactsData?.result) ? contactsData.result : [];
  const totalContacts = Number(contactsData?.total ?? 0);
  const totalPages = Number(contactsData?.pages ?? 1);

  const stats = useMemo(() => {
    const totalOutstanding = contacts.reduce((sum: number, c: any) => sum + Number(c.outstanding_amount || 0), 0);
    const vendors = contacts.filter((c: any) => c.contact_type === "vendor" || c.contact_type === "both").length;
    const customers = contacts.filter((c: any) => c.contact_type === "customer" || c.contact_type === "both").length;
    return { totalOutstanding, count: totalContacts, vendors, customers };
  }, [contacts, totalContacts]);

  const userName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "Staff";

  function openCreate(type?: "customer" | "vendor" | "both") {
    setEditing(null);
    const resolvedType = defaultType !== "both" ? defaultType : (type || "customer");
    setForm(emptyForm(resolvedType));
    setSlideOverOpen(true);
  }

  function openEdit(contact: ContactRecord) {
    setEditing(contact);
    setForm({
      contact_type: contact.contact_type || (defaultType !== "both" ? defaultType : "customer"),
      sub_type: contact.sub_type || "business",
      name: contact.name || "",
      company_name: contact.company_name || "",
      legal_name: contact.legal_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address || "",
      billing_address: contact.billing_address,
      shipping_address: contact.shipping_address,
      tax_number: contact.tax_number || "",
      is_taxable: contact.is_taxable ?? true,
      is_active: contact.is_active ?? true,
      payment_terms: contact.payment_terms?.toString() || "",
      credit_limit: contact.credit_limit?.toString() || "",
      opening_balance: contact.opening_balance?.toString() || "",
      website: contact.website || "",
      notes: contact.notes || "",
      contact_persons: contact.contact_persons?.map((p: any) => ({
        salutation: p.salutation || "",
        first_name: p.first_name || "",
        last_name: p.last_name || "",
        email: p.email || "",
        phone: p.phone || "",
        mobile: p.mobile || "",
        designation: p.designation || "",
        department: p.department || "",
        is_primary: p.is_primary,
      })) || [],
    });
    setSlideOverOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      showToast({ tone: "danger", title: "Validation error", message: "Contact name is required." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        contact_type: form.contact_type,
        sub_type: form.sub_type,
        name: form.name.trim(),
        company_name: form.company_name.trim() || undefined,
        legal_name: form.legal_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        billing_address: form.billing_address,
        shipping_address: form.shipping_address,
        tax_number: form.tax_number.trim() || undefined,
        is_taxable: form.is_taxable,
        is_active: form.is_active,
        payment_terms: form.payment_terms ? Number(form.payment_terms) : undefined,
        credit_limit: form.credit_limit ? Number(form.credit_limit) : undefined,
        opening_balance: form.opening_balance ? Number(form.opening_balance) : undefined,
        website: form.website.trim() || undefined,
        notes: form.notes.trim() || undefined,
        contact_persons: form.contact_persons?.filter((p: any) => p.first_name || p.last_name).map((p: any) => ({
          salutation: p.salutation,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email || undefined,
          phone: p.phone || undefined,
          mobile: p.mobile || undefined,
          designation: p.designation || undefined,
          department: p.department || undefined,
          is_primary: p.is_primary,
        })),
      };
      if (editing) {
        await financeApi.updateContact(String(editing.id), payload);
        showToast({ tone: "success", title: "Contact updated", message: "Changes saved." });
      } else {
        await financeApi.createContact(payload);
        showToast({ tone: "success", title: "Contact created", message: "New contact added." });
      }
      setSlideOverOpen(false);
      setListKey((k) => k + 1);
    } catch (err) {
      showToast({
        tone: "danger",
        title: "Save failed",
        message: err instanceof Error ? err.message : "Unable to save.",
      });
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<ContactRecord>[] = useMemo(() => [
    {
      header: "Name",
      cell: (contact) => (
        <span 
          className="font-medium cursor-pointer hover:underline text-brand-900"
          onClick={(e) => {
            e.stopPropagation();
            setSearchParams({ id: contact.id });
          }}
        >
          {contact.name || "-"}
        </span>
      )
    },
    {
      header: "Company",
      cell: (contact) => contact.company_name || "-"
    },
    ...(defaultType === "both" ? [{
      header: "Type",
      cell: (contact: ContactRecord) => <Chip variant="neutral">{contact.contact_type}</Chip>
    }] : []),
    {
      header: "Outstanding",
      cell: (contact) => asMoney(contact.outstanding_amount),
      className: "text-right"
    },
    {
      header: "Status",
      cell: (contact) => (
        <Chip variant={contact.is_active ? "success" : "neutral"}>
          {contact.is_active ? "Active" : "Inactive"}
        </Chip>
      )
    },
    {
      header: "Actions",
      cell: (contact) => (
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(contact); }}>
          <Icon name="edit" />
        </Button>
      ),
      className: "text-right"
    }
  ], [defaultType, setSearchParams]);

  const activeLabelMap = {
    customer: "finance-customers",
    vendor: "finance-vendors",
    both: "finance-contacts",
  };
  const activeLabel = activeLabelMap[defaultType];

  const typeLabels = {
    customer: {
      singular: "Customer",
      plural: "Customers",
      description: "Manage customer accounts and track receivables.",
      breadcrumb: "Customers",
    },
    vendor: {
      singular: "Vendor",
      plural: "Vendors",
      description: "Manage vendor accounts and track payables.",
      breadcrumb: "Vendors",
    },
    both: {
      singular: "Contact",
      plural: "Contacts",
      description: "Manage all vendor and customer contacts.",
      breadcrumb: "Contacts",
    },
  };
  const labels = typeLabels[defaultType];

  if (contactId) {
    return (
      <AppShell
        navigation={buildRequestsNavigation()}
        activeLabel={activeLabel}
        user={{ name: userName, role: "Finance" }}
        mobileNav={buildAppMobileNav("Finance")}
      >
        <ContactDetailView contactId={contactId} contactType={defaultType} onEdit={openEdit} />
        <ContactFormSlideOver
          open={slideOverOpen}
          onClose={() => setSlideOverOpen(false)}
          editing={editing}
          contactType={defaultType}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSave}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      navigation={buildRequestsNavigation()}
      activeLabel={activeLabel}
      user={{ name: userName, role: "Finance" }}
      mobileNav={buildAppMobileNav("Finance")}
    >
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[{ label: "Finance", path: "/finance" }, { label: labels.breadcrumb }]}
        title={labels.plural}
        description={labels.description}
        actions={
          defaultType === "both" ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openCreate("customer")}>
                <Icon name="add" className="text-[18px]" />
                Add Customer
              </Button>
              <Button onClick={() => openCreate("vendor")}>
                <Icon name="add" className="text-[18px]" />
                Add Vendor
              </Button>
            </div>
          ) : (
            <Button onClick={() => openCreate(defaultType)}>
              <Icon name="add" className="text-[18px]" />
              Add {labels.singular}
            </Button>
          )
        }
      />

      <div className={`grid gap-4 ${defaultType === "both" ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
        <StatCard label={`Total ${labels.plural}`} value={String(stats.count)} tone="neutral" />
        <StatCard label="Total Outstanding" value={asMoney(stats.totalOutstanding)} tone="warning" />
        {defaultType === "both" && (
          <>
            <StatCard label="Vendors" value={String(stats.vendors)} tone="neutral" />
            <StatCard label="Customers" value={String(stats.customers)} tone="neutral" />
          </>
        )}
      </div>

      <SectionCard
        title={`${labels.singular} List`}
        description={`Manage all ${labels.plural.toLowerCase()}.`}
        action={
          totalContacts > 0 ? (
            <Chip variant="neutral">
              {Math.min(totalContacts, (page - 1) * perPage + 1)}-
              {Math.min(totalContacts, page * perPage)} of {totalContacts} {labels.singular.toLowerCase()}{totalContacts !== 1 ? "s" : ""}
            </Chip>
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap items-start gap-3">
          {defaultType === "both" && (
            <SelectField label="Type" value={contactType} onChange={(e) => { setContactType(e.target.value); setPage(1); }} className="min-w-[130px] flex-1 lg:flex-none">
              <option value="all">All types</option>
              <option value="customer">Customers</option>
              <option value="vendor">Vendors</option>
              <option value="both">Both</option>
            </SelectField>
          )}
          <SelectField label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-w-[130px] flex-1 lg:flex-none">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </SelectField>
          <TextField label="Search" placeholder="Name, email, company" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="min-w-[200px] flex-1 lg:flex-none" />
        </div>

        <DataTable
          columns={columns}
          data={contacts}
          loading={loading}
          error={error}
          caption={labels.plural}
          emptyTitle={`No ${labels.plural.toLowerCase()}`}
          emptyDescription={`${labels.plural} will appear here once added.`}
          onRowClick={(contact) => setSearchParams({ id: contact.id })}
          pagination={{
            page,
            totalPages,
            totalCount: totalContacts,
            perPage,
            onPageChange: setPage,
            onPerPageChange: setPerPage,
          }}
        />
      </SectionCard>

      <ContactFormSlideOver
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        editing={editing}
        contactType={defaultType}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
      />
    </AppShell>
  );
}