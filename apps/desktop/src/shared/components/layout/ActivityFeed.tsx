import { useState } from "react";
import { Chip } from "../ui/Chip";
import { Icon } from "../ui/Icon";

export type ActivityItem = {
  title: string;
  description: string;
  time: string;
  tone?: "neutral" | "success" | "warning" | "pending" | "danger";
  icon?: string;
};

type ActivityFeedProps = {
  items: ActivityItem[];
  emptyState?: string;
  /** Show at most this many items; renders expand/collapse when there are more */
  limit?: number;
};

export function ActivityFeed({ items, emptyState, limit }: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(false);

  if (!items.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-outline-variant bg-surface-container-low p-6 text-sm text-slate-500">
        {emptyState ?? "No activity yet."}
      </div>
    );
  }

  const sorted = [...items].reverse();
  const visible = limit && !expanded ? sorted.slice(0, limit) : sorted;
  const hasMore = limit ? items.length > limit : false;

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <article
          key={`${item.title}-${item.time}`}
          className="flex gap-4 rounded-[22px] border border-outline-variant/40 bg-surface-container-lowest p-4 shadow-sm"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-900/8 text-brand-900">
            <Icon name={item.icon ?? "bolt"} fill />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {item.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>
              </div>
              {item.tone ? <Chip variant={item.tone}>{item.time}</Chip> : null}
            </div>
            {!item.tone ? (
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {item.time}
              </p>
            ) : null}
          </div>
        </article>
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-[14px] border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          <Icon name={expanded ? "expand_less" : "expand_more"} className="text-[16px]" />
          {expanded ? "Show less" : `Show ${items.length - limit!} more`}
        </button>
      )}
    </div>
  );
}
