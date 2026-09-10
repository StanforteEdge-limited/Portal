// apps/pwa/src/modules/hr/attendance/StaffAttendanceSlideOver.tsx
import {
  Button,
  Chip,
  SectionCard,
} from "@/shared";
import { DataTable } from "@/shared/components/ui/DataTable";
import { SlideOver, SlideOverHeader, SlideOverContent } from "@/shared/components/ui/SlideOver";
import { attendanceApi, useCachedQuery } from "@/shared/lib/core";
import { type AttendanceDaily } from "@stanforte/shared";

import { formatDate, formatTime, formatDuration, humanize } from "@stanforte/shared";
import { deriveAttendanceStatus, toneFromStatus } from "./attendance-data";
import { TimeWithNextDay } from "@/shared/components/ui/TimeWithNextDay";

type Props = {
  userId: string;
  userName: string;
  from: string;
  to: string;
  onClose: () => void;
};

export default function StaffAttendanceSlideOver({
  userId,
  userName,
  from,
  to,
  onClose,
}: Props) {
  const { data, loading, error } = useCachedQuery(
    `hr:attendance:staff:${userId}:${from}:${to}`,
    () => attendanceApi.listRecords({ from, to, user_id: userId }),
    { ttlMs: 1000 * 30, storage: "memory" },
  );

  const daily: AttendanceDaily[] = (data as any)?.items || [];

  return (
    <SlideOver open={true} onClose={onClose} size="xl">
      <SlideOverHeader
        title="Attendance Detail"
        subtitle={`${from} → ${to}`}
        onClose={onClose}
      />
      <SlideOverContent>
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : error ? (
          <div className="text-sm text-danger">{error}</div>
        ) : (
          <SectionCard title="Daily Records">
            <DataTable
              columns={[
                { header: "Date", cell: (row) => formatDate(row.work_date) },
                { header: "Clock In", cell: (row) => formatTime(row.first_in_at) },
                { header: "Clock Out", cell: (row) => <TimeWithNextDay time={row.last_out_at} referenceDate={row.first_in_at} /> },
                { header: "Worked", cell: (row) => formatDuration(row.worked_minutes) },
                { header: "Late", cell: (row) => row.late_minutes > 0 ? formatDuration(row.late_minutes) : "-" },
                { header: "Status", cell: (row) => (
                  <Chip variant={toneFromStatus(deriveAttendanceStatus(row))}>
                    {humanize(deriveAttendanceStatus(row))}
                  </Chip>
                ) },
              ]}
              data={daily}
            />
          </SectionCard>
        )}
      </SlideOverContent>
    </SlideOver>
  );
}
