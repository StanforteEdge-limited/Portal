import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "../ui/Icon";
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

type MobileMenuSheetProps = {
  open: boolean;
  navigation: SidebarItem[];
  activeLabel: string;
  user: {
    name: string;
    title: string;
  };
  onClose: () => void;
  onSignOut?: () => void;
};

export function MobileMenuSheet({ open, navigation, activeLabel, user, onClose, onSignOut }: MobileMenuSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-slate-950/40"
        onClick={onClose}
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-menu-title"
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-[32px] border-t border-outline-variant bg-surface-container-lowest px-5 pb-6 pt-5 shadow-card"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-500">Menu</p>
            <h2 id="mobile-menu-title" className="mt-1 font-headline text-xl font-semibold text-slate-950">
              {user.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{user.title}</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-5">
          {navigation.map((item, index) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const active = nodeHasActiveDescendant(item, activeLabel);
            const previousSection = index > 0 ? navigation[index - 1]?.section : undefined;
            const showSectionLabel = item.section && item.section !== previousSection;

            return (
              <div key={item.label} className="space-y-2">
              {showSectionLabel ? (
                  <div className="px-1 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {item.section}
                  </div>
                ) : null}
                <div className="rounded-[24px] border border-slate-100 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className={["flex h-10 w-10 items-center justify-center rounded-2xl", active ? "bg-brand-900 text-white" : "bg-slate-100 text-slate-600"].join(" ")}>
                      <Icon name={item.icon} fill={active} />
                    </div>
                    {item.path ? (
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        className={["text-sm font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10", active ? "text-brand-900" : "text-slate-900"].join(" ")}
                      >
                        {item.label}
                      </NavLink>
                    ) : (
                      <p className={["text-sm font-semibold", active ? "text-brand-900" : "text-slate-900"].join(" ")}>
                        {item.label}
                      </p>
                    )}
                  </div>

                  {hasChildren ? (
                    <div className="mt-4 space-y-2 border-l border-slate-200 pl-4">
                      {item.children!.map((child) => {
                        const childActive = nodeHasActiveDescendant(child, activeLabel);
                        const hasNestedChildren = Array.isArray(child.children) && child.children.length > 0;
                        return (
                          <div key={`${item.label}-${nodeKey(child)}`} className="space-y-2">
                            {child.path ? (
                              <NavLink
                                to={child.path}
                                onClick={onClose}
                                className={[
                                  "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                                  childActive ? "bg-brand-900/10 text-brand-900" : "text-slate-600 hover:bg-slate-50",
                                ].join(" ")}
                              >
                                {child.icon ? <Icon name={child.icon} className="text-[16px]" /> : null}
                                <span>{child.label}</span>
                              </NavLink>
                            ) : (
                              <p className="px-1 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-400">
                                {child.label}
                              </p>
                            )}
                            {hasNestedChildren ? (
                              <div className="space-y-2 border-l border-slate-100 pl-3">
                                {child.children!.map((grandChild) => {
                                  const grandChildActive = nodeHasActiveDescendant(grandChild, activeLabel);
                                  return grandChild.path ? (
                                    <NavLink
                                      key={`${item.label}-${nodeKey(child)}-${nodeKey(grandChild)}`}
                                      to={grandChild.path}
                                      onClick={onClose}
                                      className={[
                                        "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                                        grandChildActive ? "bg-brand-900/10 text-brand-900" : "text-slate-600 hover:bg-slate-50",
                                      ].join(" ")}
                                    >
                                      <Icon name={grandChild.icon || child.icon || item.icon} className="text-[16px]" />
                                      <span>{grandChild.label}</span>
                                    </NavLink>
                                  ) : null;
                                })}
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

        <div className="mt-5 space-y-3 border-t border-slate-200 pt-4">
          <NavLink
            to="/settings"
            onClick={onClose}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
          >
            <Icon name="settings" />
            Settings
          </NavLink>
          <NavLink
            to="/help"
            onClick={onClose}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10"
          >
            <Icon name="help" />
            Support
          </NavLink>
          <button
            type="button"
            onClick={onSignOut}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/10"
          >
            <Icon name="logout" />
            Sign Out
          </button>
        </div>
      </section>
    </div>
  );
}
