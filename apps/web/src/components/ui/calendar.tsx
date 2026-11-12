import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarProps {
  selected?: Date | string | null;
  onSelect?: (date: Date) => void;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
}

export function Calendar({
  selected,
  onSelect,
  className,
  minDate,
  maxDate,
}: CalendarProps) {
  const selectedDate = React.useMemo(() => {
    if (!selected) return null;
    const d = typeof selected === "string" ? new Date(selected) : selected;
    return isNaN(d.getTime()) ? null : d;
  }, [selected]);

  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    return selectedDate ? new Date(selectedDate) : new Date();
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekDayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const isSameDay = (d1: Date | null, year2: number, month2: number, day2: number) => {
    if (!d1) return false;
    return (
      d1.getFullYear() === year2 &&
      d1.getMonth() === month2 &&
      d1.getDate() === day2
    );
  };

  const isToday = (year2: number, month2: number, day2: number) => {
    const today = new Date();
    return isSameDay(today, year2, month2, day2);
  };

  const handleSelectDay = (day: number) => {
    const picked = new Date(year, month, day);
    onSelect?.(picked);
  };

  return (
    <div className={cn("p-3 bg-white rounded-2xl select-none font-sans", className)}>
      {/* Month & Year Navigation Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={prevMonth}
          className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Previous Month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="text-xs font-bold text-slate-900">
          {monthNames[month]} {year}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Next Month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {weekDayNames.map((day) => (
          <span key={day} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider py-1">
            {day}
          </span>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Leading empty days */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-8 w-8" />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isSelected = isSameDay(selectedDate, year, month, day);
          const isCurrentDay = isToday(year, month, day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleSelectDay(day)}
              className={cn(
                "h-8 w-8 mx-auto rounded-xl text-xs font-bold flex items-center justify-center transition cursor-pointer",
                isSelected
                  ? "bg-[#ff6900] text-white shadow-sm shadow-orange-500/30"
                  : isCurrentDay
                  ? "bg-orange-50 text-[#ff6900] font-black border border-orange-200/60"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
