import { useState } from "react";
import { financeApi, useCachedQuery } from "@/shared/lib/core";
import { EmptyState, StatCard, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableHeaderRow, TableRow } from "@/shared";

export default function PartiesTab() {
  const { data: customersData, loading: customersLoading } = useCachedQuery(
    "finance:settings:customers",
    () => financeApi.listCustomers(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const { data: vendorsData, loading: vendorsLoading } = useCachedQuery(
    "finance:settings:vendors",
    () => financeApi.listVendors(),
    { ttlMs: 60_000, storage: "memory" },
  );
  const customers = Array.isArray((customersData as any)?.result)
    ? (customersData as any).result
    : [];
  const vendors = Array.isArray((vendorsData as any)?.result)
    ? (vendorsData as any).result
    : [];

  const [showCustomers, setShowCustomers] = useState(true);

  return (
    <div className="space-y-4">
      <h3 className="font-headline text-lg font-semibold text-slate-950">Parties</h3>
      <p className="text-sm text-slate-500">Customers and vendors used in AR/AP workflows.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard label="Customers" value={String(customers.length)} tone="neutral" />
        <StatCard label="Vendors" value={String(vendors.length)} tone="neutral" />
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setShowCustomers(true)}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            showCustomers
              ? "border-brand-900 text-brand-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Customers ({customers.length})
        </button>
        <button
          onClick={() => setShowCustomers(false)}
          className={`px-4 py-2 font-medium border-b-2 -mb-px transition-colors ${
            !showCustomers
              ? "border-brand-900 text-brand-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Vendors ({vendors.length})
        </button>
      </div>

      {showCustomers ? (
        customers.length ? (
          <Table caption="Customers">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Email</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {customers.map((party: any) => (
                <TableRow key={party.id}>
                  <TableCell className="font-medium">{party.name}</TableCell>
                  <TableCell>{party.email || "-"}</TableCell>
                  <TableCell>{party.is_active ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState title="No customers" description="Customers will appear here once added." />
        )
      ) : vendors.length ? (
        <Table caption="Vendors">
          <TableHead>
            <TableHeaderRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableHeaderRow>
          </TableHead>
          <TableBody>
            {vendors.map((party: any) => (
              <TableRow key={party.id}>
                <TableCell className="font-medium">{party.name}</TableCell>
                <TableCell>{party.email || "-"}</TableCell>
                <TableCell>{party.is_active ? "Active" : "Inactive"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState title="No vendors" description="Vendors will appear here once added." />
      )}
    </div>
  );
}
