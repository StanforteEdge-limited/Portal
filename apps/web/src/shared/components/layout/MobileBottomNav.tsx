import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { Button, Icon } from "@/shared";
import type { SidebarChildItem, SidebarItem } from "./Sidebar";

function nodeKey(node: { key?: string; label: string }) {
  return node.key ?? node.label;
}

function nodeHasActiveDescendant(
  node: { key?: string; label: string; children?: SidebarChildItem[] },
  activeLabel: string,
): boolean {
  if (nodeKey(node) === activeLabel) return true;
  if (!Array.isArray(node.children) || node.children.length === 0) return false;
  return node.children.some((child) => nodeHasActiveDescendant(child, activeLabel));
}

type MobileNavItem = {
  label: string;
  icon: string;
  path?: string;
  active?: boolean;
  onClick?: () => void;
};

type MobileBottomNavProps = {
  items: MobileNavItem[];
  navigation: SidebarItem[];
  activeLabel: string;
  user: {
    name: string;
    title?: string;
  };
  onSignOut: () => void | Promise<void>;
};

type DrawerEntry = {
  key?: string;
  label: string;
  icon: string;
  path?: string;
  active: boolean;
  section?: string;
  children?: DrawerEntry[];
};

export function MobileBottomNav({
  items,
  navigation,
  activeLabel,
  user,
  onSignOut,
}: MobileBottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  useEffect(() => {
    if (menuOpen) {
      closeButtonRef.current?.focus();
      const activeParent =
        navigation.find(
          (item) =>
            nodeHasActiveDescendant(item, activeLabel),
        )?.label ?? null;
      setOpenItem(activeParent);
      const newOpenGroups = new Set<string>();
      for (const item of navigation) {
        for (const child of item.children ?? []) {
          if (!child.path && child.key && child.children) {
            const hasActive = child.children.some(
              (gc) => gc.path && nodeHasActiveDescendant(gc, activeLabel),
            );
            if (hasActive) newOpenGroups.add(child.key);
          }
        }
      }
      setOpenGroups(newOpenGroups);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) return;
      const focusables = Array.from(
        menuRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((node) => !node.hasAttribute("disabled"));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const drawerEntries = useMemo<DrawerEntry[]>(() => {
    return [
      ...navigation.map((item) => ({
        key: item.key,
        label: item.label,
        icon: item.icon,
        path: item.path,
        active: nodeHasActiveDescendant(item, activeLabel),
        section: item.section,
        children: item.children?.map((child) => ({
          key: child.key,
          label: child.label,
          icon: child.icon || item.icon,
          path: child.path,
          active: nodeHasActiveDescendant(child, activeLabel),
          children: child.children?.map((grandChild) => ({
            key: grandChild.key,
            label: grandChild.label,
            icon: grandChild.icon || child.icon || item.icon,
            path: grandChild.path,
            active: nodeHasActiveDescendant(grandChild, activeLabel),
          })),
        })),
      })),
      {
        label: "Support",
        icon: "help_outline",
        path: "/help",
        active: activeLabel === "Support",
      },
    ];
  }, [activeLabel, navigation]);

  return (
    <>
      <nav className="fixed bottom-0 z-50 flex w-full items-center justify-around border-t border-outline-variant bg-surface/95 px-2 py-2 backdrop-blur-md lg:hidden">
        {items.map((item) => {
          const active = item.active;
          const classes = [
            "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
            active ? "text-primary" : "text-on-surface-variant",
          ].join(" ");

          const content = (
            <>
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  active ? "bg-primary text-white" : "bg-transparent",
                ].join(" ")}
              >
                <Icon name={item.icon} fill={active} />
              </span>
              <span className="truncate">{item.label}</span>
            </>
          );

          if (item.path) {
            return (
              <NavLink key={item.label} to={item.path} className={classes}>
                {content}
              </NavLink>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              className={classes}
              onClick={() => {
                if (item.onClick) item.onClick();
                else setMenuOpen((value) => !value);
              }}
              aria-label={item.label}
              aria-haspopup={item.label === "More" ? "dialog" : undefined}
              aria-expanded={item.label === "More" ? menuOpen : undefined}
              aria-controls={item.label === "More" ? "mobile-full-menu" : undefined}
            >
              {content}
            </button>
          );
        })}
      </nav>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close full menu"
            className="fixed inset-0 z-[59] bg-slate-950/40 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <div
            ref={menuRef}
            id="mobile-full-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Full menu"
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[82dvh] overflow-y-auto rounded-t-[28px] border-t border-outline-variant bg-surface-container-lowest px-5 pb-8 pt-5 shadow-card lg:hidden"
          >
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-200" />
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-500">Full Menu</p>
                <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">{user.name}</h2>
                <p className="mt-1 text-sm text-slate-500">{user.title || "Staff"}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
                aria-label="Close menu"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="space-y-2">
              {drawerEntries.map((entry, index) => {
                const previousSection =
                  index > 0 ? drawerEntries[index - 1]?.section : undefined;
                const showSectionLabel =
                  entry.section && entry.section !== previousSection;
                const hasChildren = Array.isArray(entry.children) && entry.children.length > 0;
                const isOpen = openItem === entry.label;

                return (
                  <div key={entry.label} className="space-y-2">
                    {showSectionLabel ? (
                      <div className="px-1 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {entry.section}
                      </div>
                    ) : null}
                    <div className="rounded-[24px] border border-slate-100 bg-white p-4">
                      {entry.path && !hasChildren ? (
                        <NavLink
                          to={entry.path}
                          onClick={() => setMenuOpen(false)}
                          className={[
                            "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                            entry.active
                              ? "bg-brand-900 text-white"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                          ].join(" ")}
                        >
                          <Icon name={entry.icon} fill={entry.active} />
                          <span className="flex-1">{entry.label}</span>
                          <Icon name="chevron_right" className="text-[18px]" />
                        </NavLink>
                      ) : hasChildren ? (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenItem((current) =>
                              current === entry.label ? null : entry.label,
                            )
                          }
                          className={[
                            "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                            isOpen
                              ? "bg-brand-900 text-white"
                              : entry.active
                                ? "bg-brand-900/10 text-brand-900"
                                : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                          ].join(" ")}
                          aria-expanded={isOpen}
                        >
                          <Icon name={entry.icon} fill={isOpen || entry.active} />
                          <span className="flex-1 text-left">{entry.label}</span>
                          <Icon
                            name={isOpen ? "expand_less" : "expand_more"}
                            className={isOpen ? "text-white" : "text-[18px] text-slate-400"}
                          />
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-900">
                          <Icon name={entry.icon} fill={entry.active} />
                          <span className="flex-1">{entry.label}</span>
                        </div>
                      )}

                      {hasChildren && isOpen ? (
                        <div className="mt-4 space-y-2 border-l border-slate-200 pl-4">
                          {entry.children!.map((child) => {
                            const nestedChildren = Array.isArray(child.children) && child.children.length > 0;
                            return (
                              <div key={`${entry.label}-${nodeKey(child)}`} className="space-y-2">
                                {child.path ? (
                                  <NavLink
                                    to={child.path}
                                    onClick={() => setMenuOpen(false)}
                                    className={[
                                      "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                                      child.active
                                        ? "bg-brand-900/10 text-brand-900"
                                        : "text-slate-600 hover:bg-slate-50",
                                    ].join(" ")}
                                  >
                                    <Icon name={child.icon} className="text-[16px]" />
                                    <span>{child.label}</span>
                                  </NavLink>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => child.key && toggleGroup(child.key)}
                                    className={[
                                      "flex w-full items-center justify-between px-1 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                                      "text-slate-400 hover:text-slate-600",
                                    ].join(" ")}
                                  >
                                    <span>{child.label}</span>
                                    {child.key ? (
                                      <Icon
                                        name={openGroups.has(child.key) ? "expand_less" : "expand_more"}
                                        className="text-[14px]"
                                      />
                                    ) : null}
                                  </button>
                                )}

                                {nestedChildren && child.key && openGroups.has(child.key) ? (
                                  <div className="space-y-2 border-l border-slate-100 pl-3">
                                    {child.children!.map((grandChild) =>
                                      grandChild.path ? (
                                        <NavLink
                                          key={`${entry.label}-${nodeKey(child)}-${nodeKey(grandChild)}`}
                                          to={grandChild.path}
                                          onClick={() => setMenuOpen(false)}
                                          className={[
                                            "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                                            grandChild.active
                                              ? "bg-brand-900/10 text-brand-900"
                                              : "text-slate-600 hover:bg-slate-50",
                                          ].join(" ")}
                                        >
                                          <Icon name={grandChild.icon} className="text-[16px]" />
                                          <span>{grandChild.label}</span>
                                        </NavLink>
                                      ) : null,
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6">
              <Button
                variant="danger"
                className="w-full justify-center"
                onClick={() => {
                  setMenuOpen(false);
                  void onSignOut();
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
