import {
  EmptyState,
  SectionCard,
  StatCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableHeaderRow,
  TableRow,
} from "@/shared";
import { formatCurrency, formatDisplayDate } from "@stanforte/shared";

type RepaymentRecord = {
  id: string;
  due_date?: string | null;
  amount?: number | null;
  paid_amount?: number | null;
  status?: string | null;
};

type Props = {
  request: any;
  requestData: Record<string, any>;
  teamName: string;
  organizationName: string;
  repaymentSchedule?: RepaymentRecord[];
};

export function LoanRequestBody({ request, requestData, teamName, organizationName, repaymentSchedule = [] }: Props) {
  return (
    <div className="space-y-6">
      {teamName || organizationName ? (
        <SectionCard
          title="Work Context"
          description="The workstream and ownership context for this loan."
        >
          <div className="grid gap-4 md:grid-cols-2">
            {teamName ? <StatCard label="Team" value={teamName} tone="neutral" /> : null}
            {organizationName ? <StatCard label="Organization" value={organizationName} tone="neutral" /> : null}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Repayment Schedule"
        description="Scheduled installments and payment status."
      >
        {repaymentSchedule.length ? (
          <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
            <Table caption="Repayment schedule">
              <TableHead>
                <TableHeaderRow>
                  <TableHeaderCell>Due Date</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Paid</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableHeaderRow>
              </TableHead>
              <TableBody>
                {repaymentSchedule.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-slate-700">
                      {formatDisplayDate(row.due_date)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-slate-700">
                      {formatCurrency(row.amount, request?.currency)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {row.paid_amount != null ? formatCurrency(row.paid_amount, request?.currency) : "-"}
                    </TableCell>
                    <TableCell className="text-sm capitalize text-slate-600">
                      {String(row.status || "pending").replaceAll("_", " ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            title="No repayment schedule yet"
            description="Once the loan is disbursed, the repayment schedule will appear here."
          />
        )}
      </SectionCard>
    </div>
  );
}
