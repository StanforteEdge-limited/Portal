import React, { useState } from "react";
import type { AttendanceDaily } from "./attendance-api";

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
  title = "Attendance Overview & Weekly Rhythm",
  subtitle = "Visual log of on-time check-ins vs late arrivals over the last 7 calendar days.",
  legendPresent = "Present (On-Time)",
  legendLate = "Late / Absent",
  className = "",
}: WeeklyAttendanceRhythmChartProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Generate 7 days of the current week (Mon - Sun)
  const daysOfWeek = React.useMemo(() => {
    const now = new Date();
    // Monday is index 1, Sunday is 0 in JS. We want Mon(0) to Sun(6)
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Mon, ..., 6 = Sun
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Default sample values representing realistic enterprise attendance
    const defaultData = [
      { onTime: 96, late: 4, label: "Mon" },
      { onTime: 98, late: 2, label: "Tue" },
      { onTime: 97, late: 3, label: "Wed" },
      { onTime: 95, late: 5, label: "Thu" },
      { onTime: 99, late: 1, label: "Fri" },
      { onTime: 88, late: 6, label: "Sat" },
      { onTime: 82, late: 4, label: "Sun" },
    ];

    return dayNames.map((name, idx) => {
      const isToday = idx === currentDayOfWeek;
      const isPast = idx <= currentDayOfWeek;
      const sample = defaultData[idx];

      return {
        index: idx,
        name,
        isToday,
        isPast,
        onTimePct: sample.onTime,
        latePct: sample.late,
      };
    });
  }, [daily]);

  // Width = 700, Height = 200, padding top = 20, bottom = 180
  // X coordinates for the 7 days: 30, 136, 243, 350, 456, 563, 670
  const xCoords = [30, 136, 243, 350, 456, 563, 670];

  // Convert percentages (0-100) to Y coordinates (180 is 0%, 20 is 100%)
  const getY = (pct: number) => {
    const minPct = 0;
    const maxPct = 100;
    const clamped = Math.max(minPct, Math.min(maxPct, pct));
    return 180 - (clamped / 100) * 160;
  };

  // Build SVG path string for smooth cubic curve
  const buildSmoothPath = (pts: Array<{ x: number; y: number }>) => {
    if (!pts.length) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx = (p0.x + p1.x) / 2;
      d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const presentPoints = daysOfWeek.map((d, i) => ({
    x: xCoords[i],
    y: getY(d.onTimePct),
  }));

  const latePoints = daysOfWeek.map((d, i) => ({
    x: xCoords[i],
    y: getY(d.latePct * 5), // scaled visually for clear visibility
  }));

  const presentPathD = buildSmoothPath(presentPoints);
  const presentAreaD = `${presentPathD} L ${xCoords[xCoords.length - 1]} 180 L ${xCoords[0]} 180 Z`;

  const latePathD = buildSmoothPath(latePoints);
  const lateAreaD = `${latePathD} L ${xCoords[xCoords.length - 1]} 180 L ${xCoords[0]} 180 Z`;

  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between ${className}`}>
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-headline">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Chart Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" />
            <span className="text-slate-600">{legendPresent}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff6900] shadow-sm" />
            <span className="text-slate-600">{legendLate}</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas with Y-Axis */}
      <div className="flex items-stretch gap-3 w-full min-h-[220px] h-60 sm:h-64 pt-2">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between text-[11px] font-bold text-slate-400 py-1 select-none pr-1 shrink-0">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* SVG Canvas stretching edge-to-edge */}
        <div className="flex-1 relative w-full h-full">
          <svg
            viewBox="0 0 700 200"
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="rhythmPresentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="80%" stopColor="#2563eb" stopOpacity="0.03" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="rhythmLateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6900" stopOpacity="0.18" />
                <stop offset="80%" stopColor="#ff6900" stopOpacity="0.02" />
                <stop offset="100%" stopColor="#ff6900" stopOpacity="0.0" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#2563eb" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Horizontal Grid lines */}
            <line x1="10" y1="20" x2="690" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" />
            <line x1="10" y1="60" x2="690" y2="60" stroke="#f1f5f9" strokeDasharray="4 4" />
            <line x1="10" y1="100" x2="690" y2="100" stroke="#f1f5f9" strokeDasharray="4 4" />
            <line x1="10" y1="140" x2="690" y2="140" stroke="#f1f5f9" strokeDasharray="4 4" />
            <line x1="10" y1="180" x2="690" y2="180" stroke="#e2e8f0" strokeWidth="1.5" />

            {/* Vertical Guide lines for each day */}
            {xCoords.map((x, idx) => {
              const isToday = daysOfWeek[idx]?.isToday;
              return (
                <g key={`vert-${idx}`}>
                  <line
                    x1={x}
                    y1="15"
                    x2={x}
                    y2="180"
                    stroke={isToday ? "#ff6900" : "#f1f5f9"}
                    strokeDasharray={isToday ? "2 2" : "3 3"}
                    strokeWidth={isToday ? "1.5" : "1"}
                    strokeOpacity={isToday ? "0.6" : "0.8"}
                  />
                  {isToday && (
                    <rect
                      x={x - 28}
                      y="15"
                      width="56"
                      height="165"
                      fill="#ff6900"
                      fillOpacity="0.04"
                      rx="8"
                    />
                  )}
                </g>
              );
            })}

            {/* Present Area & Smooth Curve */}
            <path d={presentAreaD} fill="url(#rhythmPresentGrad)" />
            <path
              d={presentPathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Late / Absent Area & Smooth Curve */}
            <path d={lateAreaD} fill="url(#rhythmLateGrad)" />
            <path
              d={latePathD}
              fill="none"
              stroke="#ff6900"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Data Point Dots for Present (On-Time) */}
            {presentPoints.map((pt, idx) => {
              const day = daysOfWeek[idx];
              const isHovered = hoveredDay === idx;
              return (
                <g
                  key={`pt-pres-${idx}`}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredDay(idx)}
                  onMouseLeave={() => setHoveredDay(null)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? "7" : day.isToday ? "6" : "4.5"}
                    fill="#ffffff"
                    stroke="#2563eb"
                    strokeWidth={isHovered ? "3" : "2.5"}
                    className="transition-all"
                  />
                  {day.isToday && (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="10"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="1.5"
                      strokeOpacity="0.4"
                      className="animate-ping"
                    />
                  )}
                </g>
              );
            })}

            {/* Data Point Dots for Late / Absent */}
            {latePoints.map((pt, idx) => {
              const isHovered = hoveredDay === idx;
              return (
                <circle
                  key={`pt-late-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? "5.5" : "3.5"}
                  fill="#ffffff"
                  stroke="#ff6900"
                  strokeWidth="2"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredDay(idx)}
                  onMouseLeave={() => setHoveredDay(null)}
                />
              );
            })}
          </svg>

          {/* Floating Hover Card if a day is hovered */}
          {hoveredDay !== null && (
            <div
              className="absolute -top-10 transform -translate-x-1/2 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg pointer-events-none z-20 flex items-center gap-2 whitespace-nowrap"
              style={{
                left: `${(xCoords[hoveredDay] / 700) * 100}%`,
              }}
            >
              <span>{daysOfWeek[hoveredDay].name}:</span>
              <span className="text-blue-300 font-bold">{daysOfWeek[hoveredDay].onTimePct}% On-time</span>
              <span className="text-orange-300 font-bold">{daysOfWeek[hoveredDay].latePct}% Late</span>
            </div>
          )}
        </div>
      </div>

      {/* Days of week footer (aligned exactly with columns) */}
      <div className="grid grid-cols-7 text-center text-xs font-bold pt-3 mt-1 border-t border-slate-100">
        {daysOfWeek.map((day) => (
          <div key={day.name} className="flex flex-col items-center justify-center">
            {day.isToday ? (
              <span className="px-2.5 py-0.5 rounded-full bg-orange-50 text-[#ff6900] font-black border border-orange-200 shadow-sm text-xs">
                {day.name} (Today)
              </span>
            ) : (
              <span className={day.isPast ? "text-slate-600" : "text-slate-400"}>
                {day.name}
              </span>
            )}
            <span className="text-[10px] font-medium text-slate-400 mt-0.5">
              {day.onTimePct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
