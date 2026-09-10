import { useState, useMemo } from "react";
import { DataTable } from "@/shared/components/ui/DataTable";
import { useCachedQuery } from "@/shared/lib/core";
import { getHrLeaveBalances, listHrLeaveRequestsPaged, type RequestRecord } from "@/pages/hr/leave/hr-leave-api";
import { formatDate } from "@stanforte/shared";
import { deriveRequestWorkflowStatus, requestStatusTone } from "@/pages/requests/request-helpers";
import { Chip, Button, SelectField } from "@/shared";
import { useNavigate } from "react-router-dom";

type Props = {
  employeeId: string;
};

function humanize(str: string) {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function EmployeeLeaveTab({ employeeId }: Props) {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  // 1. Fetch Balances
  const { data: balancesResponse, loading: balancesLoading } = useCachedQuery(
    `hr:employee:leave:balances:${employeeId}:${year}`,
    () => getHrLeaveBalances({ year, user_id: employeeId }),
    { ttlMs: 1000 * 60, storage: "memory" }
  );

  // Safely extract the balances for this user
  const balances = useMemo(() => {
    return balancesResponse?.data || [];
  }, [balancesResponse]);

  // 2. Fetch History
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(10);
  
  const { data: historyData, loading: historyLoading } = useCachedQuery(
    `hr:employee:leave:history:${employeeId}:${historyPage}:${historyPerPage}`,
    () => listHrLeaveRequestsPaged({
      user_id: employeeId,
      page: historyPage,
      per_page: historyPerPage,
    }),
    { ttlMs: 1000 * 30, storage: "memory" }
  );

  const historyLeaveRequests = historyData?.items ?? [];
  const historySafePage = historyData?.meta?.page ?? historyPage;
  const historyTotalPages = historyData?.meta?.total_pages ?? 1;
  const historyTotalCount = historyData?.meta?.total ?? 0;

  const historyColumns = [
    {
      header: "Type",
      cell: (r: RequestRecord) => r.request_type?.name ?? "Leave"
    },
    {
      header: "From",
      cell: (r: RequestRecord) => formatDate(String(r.data?.start_date ?? ""))
    },
    {
      header: "To",
      cell: (r: RequestRecord) => formatDate(String(r.data?.end_date ?? ""))
    },
    {
      header: "Days",
      cell: (r: RequestRecord) => {
        const days = Number(r.data?.days_requested ?? 0);
        return days > 0 ? `${days}d` : "-";
      }
    },
    {
      header: "Status",
      cell: (r: RequestRecord) => {
        const workflowStatus = deriveRequestWorkflowStatus(r);
        return (
          <Chip variant={requestStatusTone(workflowStatus)}>
            {workflowStatus}
          </Chip>
        );
      }
    },
    {
      header: "",
      cell: (r: RequestRecord) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/hr/requests/${r.id}`);
          }}
        >
          Detail
        </Button>
      ),
      className: "text-right"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-900">Leave Balances ({year})</h3>
        <div className="overflow-x-auto rounded-[22px] border border-slate-200">
          <DataTable
            columns={[
              { header: "Leave Type", className: "font-medium text-slate-900", cell: (row) => humanize(row.leave_type_key) },
              { header: "Entitled", cell: (row) => `${row.entitled} days` },
              { header: "Used", cell: (row) => `${row.used} days` },
              { header: "Adjustments", cell: (row) => row.adjustments !== 0 ? `${row.adjustments > 0 ? '+' : ''}${row.adjustments} days` : "-" },
              { 
                header: "Available", 
                cell: (row) => (
                  <span className={`font-semibold ${row.available <= 0 ? 'text-red-600' : row.available <= 3 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {row.available} days
                  </span>
                )
              },
            ]}
            data={balances}
            loading={balancesLoading}
            emptyTitle="No balances found"
            emptyDescription="Leave balances have not been generated for this year."
          />
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-base font-semibold text-slate-900">Leave History</h3>
        <div className="overflow-x-auto rounded-[22px] border border-slate-200">
          <DataTable
            columns={historyColumns}
            data={historyLeaveRequests}
            loading={historyLoading}
            emptyTitle="No leave history"
            emptyDescription="This employee has not submitted any leave requests."
            onRowClick={(r) => navigate(`/hr/requests/${r.id}`)}
            pagination={{
              page: historySafePage,
              totalPages: historyTotalPages,
              totalCount: historyTotalCount,
              perPage: historyPerPage,
              onPageChange: setHistoryPage,
              onPerPageChange: (value) => {
                setHistoryPerPage(value);
                setHistoryPage(1);
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
