import { useState } from "react";
import {
  Button,
  Chip,
  Icon,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import type { ContactRecord } from "@stanforte/shared";
import { asMoney } from "./helpers";

type Props = {
  contactId: string;
  contactType: "customer" | "vendor" | "both";
  onEdit: (c: ContactRecord) => void;
  transactionsTab?: React.ReactNode;
  whtTab?: React.ReactNode;
};

export function ContactDetailView({ contactId, contactType, onEdit, transactionsTab, whtTab }: Props) {
  const [activeTab, setActiveTab] = useState<"info" | "contacts" | "transactions" | "wht">("info");

  const { data: contact } = useCachedQuery(
    `finance:contact:${contactId}`,
    () => financeApi.getContact(contactId),
    { ttlMs: 60_000, storage: "memory" },
  );

  const c = contact as ContactRecord | undefined;
  if (!c) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500">Loading details...</p>
      </div>
    );
  }

  const label = contactType === "vendor" ? "Vendor" : contactType === "customer" ? "Customer" : "Contact";
  const breadcrumbLabel = contactType === "vendor" ? "Vendors" : contactType === "customer" ? "Customers" : "Contacts";
  const breadcrumbPath = contactType === "vendor" ? "/finance/vendors" : contactType === "customer" ? "/finance/customers" : "/finance/contacts";
  
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: "info", label: "Details" },
  ];
  if (c.sub_type === "business") tabs.push({ key: "contacts", label: "Contact Persons" });
  tabs.push({ key: "transactions", label: "Transactions" });
  if (contactType === "vendor" || c.contact_type === "both") tabs.push({ key: "wht", label: "WHT" });

  const primaryPerson = c.contact_persons?.find((p) => p.is_primary);

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        breadcrumbs={[
          { label: "Finance", path: "/finance" },
          { label: breadcrumbLabel, path: breadcrumbPath },
          { label: c.name || contactId.slice(0, 8) },
        ]}
        title={c.company_name || c.name || `${label} Details`}
        actions={
          <Button onClick={() => onEdit(c)}>
            <Icon name="edit" className="text-[18px]" />
            Edit
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Outstanding" value={asMoney(c.outstanding_amount)} tone="warning" />
        {contactType !== "customer" && <StatCard label="Opening Balance" value={asMoney(c.opening_balance)} tone="neutral" />}
        {contactType !== "vendor" && <StatCard label="Credit Limit" value={asMoney(c.credit_limit)} tone="neutral" />}
        <StatCard label="Type" value={c.sub_type === "business" ? "Business" : "Individual"} tone="neutral" />
        <StatCard label="Status" value={c.is_active ? "Active" : "Inactive"} tone={c.is_active ? "success" : "neutral"} />
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? "border-brand-900 text-brand-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "info" ? (
        <SectionCard>
          <DataTable
            columns={[
              { header: "", className: "w-40 font-medium text-slate-500", cell: (r) => r.field },
              { header: "", className: "font-medium", cell: (r) => r.value }
            ]}
            data={[
              c.company_name && { field: "Company Name", value: <span className="font-semibold">{c.company_name}</span> },
              { field: "Contact Name", value: <span className="font-semibold">{c.name || "-"}</span> },
              c.legal_name && { field: "Legal Name", value: c.legal_name },
              { field: "Email", value: c.email || "-" },
              { field: "Phone", value: c.phone || "-" },
              { field: "Address", value: c.address || "-" },
              { field: "Tax Number", value: c.tax_number || "-" },
              { field: "Website", value: c.website || "-" },
              { field: "Payment Terms", value: c.payment_terms ? `${c.payment_terms} days` : "-" },
              primaryPerson && { field: "Primary Contact", value: `${[primaryPerson.first_name, primaryPerson.last_name].filter(Boolean).join(" ") || "-"} ${primaryPerson.email ? `(${primaryPerson.email})` : ""}` },
              { field: "Type", value: <Chip variant="neutral">{c.contact_type}</Chip> },
              { field: "Taxable", value: c.is_taxable ? "Yes" : "No" }
            ].filter(Boolean) as { field: string; value: React.ReactNode }[]}
          />
        </SectionCard>
      ) : activeTab === "contacts" ? (
        <SectionCard title="Contact Persons">
          {c.contact_persons?.length ? (
            <DataTable
              caption="Contact Persons"
              columns={[
                { header: "Name", cell: (p) => [p.salutation, p.first_name, p.last_name].filter(Boolean).join(" ") },
                { header: "Email", cell: (p) => p.email || "-" },
                { header: "Phone", cell: (p) => p.phone || p.mobile || "-" },
                { header: "Designation", cell: (p) => p.designation || "-" },
                { header: "Primary", cell: (p) => p.is_primary ? <Chip variant="success">Yes</Chip> : "No" }
              ]}
              data={c.contact_persons}
            />
          ) : (
            <p className="text-sm text-slate-500">No contact persons.</p>
          )}
        </SectionCard>
      ) : activeTab === "transactions" ? (
        transactionsTab ?? <SectionCard><p className="text-sm text-slate-500">No transactions to display.</p></SectionCard>
      ) : (
        whtTab ?? <SectionCard><p className="text-sm text-slate-500">No withholding data to display.</p></SectionCard>
      )}
    </>
  );
}
