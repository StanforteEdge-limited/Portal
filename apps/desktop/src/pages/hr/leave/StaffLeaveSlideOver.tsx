import { Button, Chip, SectionCard, StatCard } from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { SlideOver, SlideOverHeader, SlideOverContent } from "@/shared/components/ui/SlideOver";
import { useCachedQuery } from "@/shared/lib/core";
import { requestStatusTone } from "@/pages/requests/request-helpers";
import { listHrLeaveRequests, getHrLeaveBalances, type RequestRecord } from "./hr-leave-api";

function formatDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  userId: string;
  userName: string;
  year: number;
  onClose: () => void;
};

export default function StaffLeaveSlideOver({ userId, userName, year, onClose }: Props) {
  const { data: requestsData, loading: reqLoading } = useCachedQuery(
    `hr:leave:staff:${userId}:${year}`,
    () => listHrLeaveRequests({ user_id: userId }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const { data: balancesData, loading: balLoading } = useCachedQuery(
    `hr:leave:balances:${userId}:${year}`,
    () => getHrLeaveBalances({ year, user_id: userId }),
    { ttlMs: 1000 * 60, storage: "memory" },
  );

  const requests: RequestRecord[] = requestsData ?? [];
  const staffBalances = balancesData?.data.filter((b) => String(b.user_id) === String(userId)) || [];

  return (
    <SlideOver open={true} onClose={onClose} size="xl">
      <SlideOverHeader
        title={userName}
        subtitle={`${year} leave year`}
        onClose={onClose}
      />
      <SlideOverContent>
        {!balLoading ? (
          <SectionCard title="Leave Balances">
            <div className="grid gap-3 md:grid-cols-3">
              {staffBalances.map((b) => (
                <StatCard
                  key={b.leave_type_key}
                  label={b.leave_type_key.replace(/_/g, ' ')}
                  value={`${b.available}d`}
                  tone={b.available <= 2 ? "danger" : "success"}
                  hint={`${b.used}d used of ${b.entitled}d`}
                />
              ))}
            </div>
            {!staffBalances.length ? (
              <p className="text-sm text-slate-500">No balance data available.</p>
            ) : null}
          </SectionCard>
        ) : balLoading ? (
          <div className="text-sm text-slate-500">Loading balances...</div>
        ) : null}

        <SectionCard title="Leave Requests">
          {reqLoading ? (
            <div className="text-sm text-slate-500">Loading requests...</div>
          ) : (
            <DataTable
              columns={[
                { header: "Type", cell: (r) => r.request_type?.name ?? "Leave" },
                { header: "Dates", cell: (r) => {
                  const d = r.data ?? {};
                  const start = formatDate(String(d.start_date ?? ""));
                  const end = formatDate(String(d.end_date ?? ""));
                  return `${start} – ${end}`;
                }},
                { header: "Days", cell: (r) => {
                  const d = r.data ?? {};
                  const days = Number(d.days_requested ?? 0);
                  return days > 0 ? `${days}d` : "-";
                }},
                { header: "Status", cell: (r) => <Chip variant={requestStatusTone(r.status)}>{r.status}</Chip> },
              ]}
              data={requests}
            />
          )}
        </SectionCard>
      </SlideOverContent>
    </SlideOver>
  );
}