import React, { useState } from "react";
import type { AttendanceDaily } from "./attendance-api";
import { ChevronDown, TrendingUp } from "lucide-react";

interface WeeklyAttendanceRhythmChartProps {
  daily?: AttendanceDaily[];
  title?: string;
  subtitle?: string;
  legendPresent?: string;
  legendLate?: string;
  className?: string;
}

export function WeeklyAttendanceRhythmChart({
  daily = [],
  title = "Attendance This Week",
  subtitle = "Your daily check-ins and on-time performance",
  className = "",
}: WeeklyAttendanceRhythmChartProps) {
  const [selectedRange, setSelectedRange] = useState("This Week");

  // Generate 7 days of current week (Mon - Sun)
  const daysOfWeek = React.useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, ..., 6 = Sun
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const defaultData = [
      { onTime: 96, height: "96%", hours: "8h 15m", label: "Mon" },
      { onTime: 98, height: "98%", hours: "8h 20m", label: "Tue" },
      { onTime: 97, height: "97%", hours: "8h 05m", label: "Wed" },
      { onTime: 95, height: "95%", hours: "8h 12m", label: "Thu" },
      { onTime: 99, height: "99%", hours: "8h 30m", label: "Fri" },
      { onTime: 88, height: "45%", hours: "Off-duty", label: "Sat", isWeekend: true },
      { onTime: 82, height: "35%", hours: "Off-duty", label: "Sun", isWeekend: true },
    ];

    return dayNames.map((name, idx) => {
      const isToday = idx === currentDayOfWeek;
      const sample = defaultData[idx];

      // If we have actual daily data from API, try to find matching record
      const actualRow = daily.find((d) => {
        if (!d.work_date) return false;
        const dDate = new Date(d.work_date);
        return ((dDate.getDay() + 6) % 7) === idx;
      });

      const onTimeRate = actualRow?.worked_minutes
        ? Math.min(100, Math.round((actualRow.worked_minutes / 480) * 100))
        : sample.onTime;

      return {
        index: idx,
        name,
        isToday,
        isWeekend: sample.isWeekend,
        rate: onTimeRate,
        height: `${Math.max(25, onTimeRate)}%`,
        hours: actualRow?.worked_minutes
          ? `${Math.floor(actualRow.worked_minutes / 60)}h ${actualRow.worked_minutes % 60}m`
          : sample.hours,
      };
    });
  }, [daily]);

  // Overall weekly attendance average
  const averageRate = Math.round(
    daysOfWeek.filter((d) => !d.isWeekend).reduce((acc, curr) => acc + curr.rate, 0) / 5
  ) || 96;

  return (
    <div className={`bg-white rounded-2xl border border-slate-100 shadow-2xs p-6 ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-headline">
            {title}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Attendance Rate
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black text-slate-900">{averageRate}%</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> 2%
              </span>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-2xs transition"
            >
              <span>{selectedRange}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 7 Daily Rhythm Bar Columns */}
      <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end pt-2">
        {daysOfWeek.map((item) => (
          <div key={item.name} className="group relative flex flex-col items-center gap-2">
            {/* Tooltip on hover */}
            <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-md whitespace-nowrap shadow-md transition-all z-20">
              {item.name}: {item.rate}% ({item.hours})
            </div>

            {/* Vertical Bar track */}
            <div className="w-full bg-slate-100/80 rounded-xl h-28 sm:h-36 flex flex-col justify-end p-1 transition-all">
              <div
                className={`w-full rounded-lg transition-all duration-500 ${
                  item.isToday
                    ? "bg-[#ff6900] shadow-sm shadow-orange-500/25"
                    : item.isWeekend
                    ? "bg-slate-300/80"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
                style={{ height: item.height }}
              />
            </div>

            {/* Day label */}
            <span
              className={`text-xs font-bold transition-colors ${
                item.isToday ? "text-[#ff6900]" : "text-slate-700"
              }`}
            >
              {item.name}
            </span>

            {/* Percentage */}
            <span
              className={`text-[11px] font-semibold transition-colors ${
                item.isToday ? "text-[#ff6900]" : "text-slate-400"
              }`}
            >
              {item.rate}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeeklyAttendanceRhythmChart;
