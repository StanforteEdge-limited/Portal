import { getDaysDifference, formatTime } from "@stanforte/shared";

type TimeWithNextDayProps = {
  time: string | Date | null | undefined;
  referenceDate?: string | Date | null | undefined;
  className?: string;
};

export function TimeWithNextDay({ time, referenceDate, className = "" }: TimeWithNextDayProps) {
  const formatted = formatTime(time);
  const diffDays = getDaysDifference(time, referenceDate);
  
  if (diffDays === 0) {
    return <span className={className}>{formatted}</span>;
  }
  
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <span>{formatted}</span>
      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
        +{diffDays} Day{diffDays > 1 ? 's' : ''}
      </span>
    </span>
  );
}