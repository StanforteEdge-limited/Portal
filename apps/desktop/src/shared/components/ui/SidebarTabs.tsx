import type { ReactNode } from "react";

type NavItem = {
  id: string;
  label: string;
  icon: string;
};

type SidebarTabsProps = {
  items: NavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  children?: ReactNode;
};

export function SidebarTabs({ items, activeTab, onTabChange, children }: SidebarTabsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-slate-200">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === item.id
                ? "border-brand-900 text-brand-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}