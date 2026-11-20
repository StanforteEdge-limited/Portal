import type { ReactNode } from "react";

type NavItem = {
  id: string;
  label: string;
  icon?: string;
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
      <div className="flex items-center gap-1 border-b border-neutral-900/[0.08]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={`px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
              activeTab === item.id
                ? "border-[#ff6900] text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
