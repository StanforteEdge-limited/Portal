import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import type { TaskAssignee } from "@/pages/tasks/types";
import { UserHoverCard } from "./UserHoverCard";

interface ColleagueMultiSelectProps {
  colleagues: TaskAssignee[];
  selectedIds: string[];
  onChange: (nextIds: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
  maxVisible?: number;
}

export function ColleagueMultiSelect({
  colleagues,
  selectedIds,
  onChange,
  placeholder = "Search staff by name, email, or role...",
  emptyLabel = "No matching staff found.",
  maxVisible = 25,
}: ColleagueMultiSelectProps) {
  const [query, setQuery] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedColleagues = useMemo(
    () => colleagues.filter((c) => selectedSet.has(c.id)),
    [colleagues, selectedSet],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colleagues;
    return colleagues.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.role && c.role.toLowerCase().includes(q)),
    );
  }, [colleagues, query]);

  const visible = filtered.slice(0, maxVisible);
  const hiddenCount = Math.max(0, filtered.length - visible.length);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-2">
      {/* Selected chips */}
      {selectedColleagues.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedColleagues.map((member) => (
            <UserHoverCard key={member.id} user={member} side="top">
              <span className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-[#C2410C]/30 dark:border-[#C2410C]/40 text-xs font-medium text-neutral-900 dark:text-neutral-100 transition-colors">
                <span className="relative">
                  <span className="w-4 h-4 rounded-full bg-[#C2410C] text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                    {member.avatar || member.name.slice(0, 2).toUpperCase()}
                  </span>
                </span>
                <span className="max-w-[140px] truncate">{member.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(member.id);
                  }}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  aria-label={`Remove ${member.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            </UserHoverCard>
          ))}
          {selectedColleagues.length > 1 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 px-1.5 py-0.5 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Search box */}
      <div className="relative">
        <Search className="h-3.5 w-3.5 text-neutral-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-8 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-[#C2410C] dark:focus:border-[#C2410C] focus:ring-1 focus:ring-[#ff6900]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filtered selectable list */}
      <div className="max-h-48 overflow-y-auto rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/60 divide-y divide-neutral-100 dark:divide-neutral-800">
        {visible.length === 0 ? (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4 px-3">
            {emptyLabel}
          </p>
        ) : (
          visible.map((member) => {
            const isSelected = selectedSet.has(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => toggle(member.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-orange-50/80 dark:bg-orange-950/30 text-neutral-900 dark:text-white"
                    : "bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 text-neutral-700 dark:text-neutral-200"
                }`}
              >
                <UserHoverCard user={member} side="top" className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 min-w-0 w-full">
                    <div className="relative shrink-0">
                      <div
                        className={`w-6 h-6 rounded-full text-white text-[10px] font-semibold flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-[#C2410C]" : "bg-neutral-800 dark:bg-neutral-700"
                        }`}
                      >
                        {member.avatar || member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white dark:border-neutral-900 bg-emerald-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {member.name}
                      </div>
                    </div>
                  </div>
                </UserHoverCard>

                <span
                  className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-[#C2410C] border-[#C2410C] text-white"
                      : "border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" strokeWidth={2.5} />}
                </span>
              </button>
            );
          })
        )}
        {hiddenCount > 0 && (
          <div className="px-3 py-2 text-[11px] text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900/90 text-center">
            Showing {visible.length} of {filtered.length} staff — type a name, email, or role to narrow down
          </div>
        )}
      </div>
    </div>
  );
}
