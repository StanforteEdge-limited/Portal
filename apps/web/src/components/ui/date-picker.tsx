import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";
import { cn } from "@/lib/utils";

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (dateString: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return null;
    const d = typeof value === "string" ? new Date(value) : value;
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  const displayString = React.useMemo(() => {
    if (!selectedDate) return "";
    return selectedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [selectedDate]);

  const handleSelect = (picked: Date) => {
    const yyyy = picked.getFullYear();
    const mm = String(picked.getMonth() + 1).padStart(2, "0");
    const dd = String(picked.getDate()).padStart(2, "0");
    const isoDateString = `${yyyy}-${mm}-${dd}`;
    onChange?.(isoDateString);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm font-medium transition hover:border-slate-300 focus:outline-none focus:border-[#ff6900] focus:ring-2 focus:ring-[#ff6900]/15 disabled:cursor-not-allowed disabled:opacity-50",
            !selectedDate ? "text-slate-400" : "text-slate-900",
            className
          )}
        >
          <div className="flex items-center gap-2.5 truncate min-w-0">
            <CalendarIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="truncate">{displayString || placeholder}</span>
          </div>

          {selectedDate && !disabled ? (
            <span
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
              title="Clear date"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar selected={selectedDate} onSelect={handleSelect} />
      </PopoverContent>
    </Popover>
  );
}
