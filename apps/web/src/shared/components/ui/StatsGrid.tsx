import { StatCard } from "./StatCard";

type StatItem = {
  label: string;
  value: string;
  delta?: string;
  tone?: "neutral" | "success" | "warning" | "pending" | "danger";
  hint?: string;
  icon?: string;
  requiredPermissions?: string[];
};

type StatsGridProps = {
  items: StatItem[];
  cols?: 2 | 3 | 4;
};

export function StatsGrid({ items, cols }: StatsGridProps) {
  const colCount = cols ?? Math.min(items.length, 4);
  const gridColsClass = 
    colCount === 2 ? "grid-cols-2" :
    colCount === 3 ? "grid-cols-2 sm:grid-cols-3" :
    "grid-cols-2 lg:grid-cols-4";

  return (
    <div className={`grid grid-cols-2 gap-2.5 sm:gap-4 ${gridColsClass}`}>
      {items.map((item, idx) => (
        <StatCard key={idx} {...item} />
      ))}
    </div>
  );
}
