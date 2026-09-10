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
    colCount === 2 ? "sm:grid-cols-2" :
    colCount === 3 ? "sm:grid-cols-2 md:grid-cols-3" :
    "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className={`grid gap-4 ${gridColsClass}`}>
      {items.map((item, idx) => (
        <StatCard key={idx} {...item} />
      ))}
    </div>
  );
}
