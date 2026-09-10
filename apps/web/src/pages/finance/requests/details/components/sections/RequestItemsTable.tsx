import {
  Chip,
  EmptyState,
  Icon,
  SectionCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "@/shared";
import { formatCurrency } from "@stanforte/shared";
import { useRequestDetails } from "../../context";

export function RequestItemsTable() {
  const { lineItems, request } = useRequestDetails();

  return (
    <SectionCard
      title="Request Items"
      description="Itemized request costs and supporting notes."
      action={
        <Chip variant="neutral">
          {lineItems.length} item{lineItems.length === 1 ? "" : "s"}
        </Chip>
      }
    >
      {lineItems.length ? (
        <div className="rounded-[22px] border border-slate-200 bg-white">
          <Table caption="Request items">
            <TableHead>
              <TableHeaderRow>
                <TableHeaderCell className="w-[50%]">Item</TableHeaderCell>
                <TableHeaderCell className="w-14 text-center">
                  Qty
                </TableHeaderCell>
                <TableHeaderCell>Unit Price</TableHeaderCell>
                <TableHeaderCell>Total</TableHeaderCell>
              </TableHeaderRow>
            </TableHead>
            <TableBody>
              {lineItems.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">
                          {item.description || "Untitled item"}
                        </p>
                        {(item.files?.length ?? 0) > 0 ? (
                          <span
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-900/10 text-brand-900"
                            title={`${item.files?.length} attachment${item.files?.length === 1 ? "" : "s"}`}
                          >
                            <Icon name="attach_file" className="text-[16px]" />
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {item.notes || ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="w-14 text-center text-sm font-semibold text-slate-700">
                    {item.quantity ?? 1}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-slate-700">
                    {formatCurrency(item.amount, request?.currency)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-slate-700">
                    {formatCurrency(
                      (item.amount ?? 0) * (item.quantity ?? 1),
                      request?.currency,
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          title="No line items"
          description="This request does not include any itemized costs."
        />
      )}
    </SectionCard>
  );
}
