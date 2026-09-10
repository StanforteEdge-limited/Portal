import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@/shared";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export type SidebarItem = {
  key?: string;
  label: string;
  icon: string;
  path?: string;
  section?: string;
  moduleKey?: string;
  permissions?: string[];
  requiresTeamLeadAssignment?: boolean;
  children?: SidebarChildItem[];
};

export type SidebarChildItem = {
  key?: string;
  label: string;
  icon?: string;
  path?: string;
  permissions?: string[];
  requiresTeamLeadAssignment?: boolean;
  children?: SidebarChildItem[];
};

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

function flattenLeafNodes(children: SidebarChildItem[]): SidebarChildItem[] {
  const leaves: SidebarChildItem[] = [];
  children.forEach((child) => {
    if (Array.isArray(child.children) && child.children.length > 0) {
      leaves.push(...flattenLeafNodes(child.children));
      return;
    }
    leaves.push(child);
  });
  return leaves;
}

type SidebarProps = {
  navigation: SidebarItem[];
  activeLabel: string;
  collapsed?: boolean;
  onSignOut: () => void | Promise<void>;
};

export function Sidebar({
  navigation,
  activeLabel,
  collapsed = false,
  onSignOut,
}: SidebarProps) {
  const activeParentLabel =
    navigation.find(
      (item) =>
        nodeKey(item) === activeLabel || nodeHasActiveDescendant(item, activeLabel),
    )?.label ?? null;
  const [openItem, setOpenItem] = useState<string | null>(activeParentLabel);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["finance-group-overview"]),
  );
  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const navRef = useRef<HTMLElement | null>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;

  function handleGroupAutoOpen() {
    for (const item of navigation) {
      for (const child of item.children ?? []) {
        if (!child.path && child.key && child.children) {
          const hasActive = child.children.some(
            (gc) => gc.path && pathname.startsWith(gc.path),
          );
          if (hasActive) {
            setOpenGroups((prev) => {
              if (prev.has(child.key!)) return prev;
              return new Set([...prev, child.key!]);
            });
          }
        }
      }
    }
  }

  useEffect(() => {
    handleGroupAutoOpen();
  }, [pathname]);

  function updateScrollState() {
    const el = navRef.current;
    if (!el) return;
    setCanScrollUp(el.scrollTop > 4);
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }

  useEffect(() => {
    if (!collapsed) {
      setOpenItem(activeParentLabel);
    }
  }, [activeParentLabel, collapsed]);

  useEffect(() => {
    updateScrollState();
    const el = navRef.current;
    if (!el) return;
    const handleScroll = () => updateScrollState();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [collapsed, navigation, openItem]);

  return (
    <aside
      className={[
        collapsed ? "w-20 px-3" : "w-64 p-4",
        "fixed left-0 top-16 z-40 hidden h-[calc(100vh-64px)] flex-col overflow-hidden border-r border-outline-variant bg-surface-container-low text-sm font-semibold transition-all duration-300 lg:flex",
      ].join(" ")}
    >
      <div className="relative flex h-full min-h-0 flex-col">
        {canScrollUp ? (
          <button
            type="button"
            className="absolute left-0 right-0 top-0 z-10 flex items-center justify-center bg-gradient-to-b from-surface-container-low to-transparent py-2 text-slate-400"
            aria-label="Scroll menu up"
            onClick={() => {
              navRef.current?.scrollBy({ top: -140, behavior: "smooth" });
            }}
          >
            <Icon name="expand_less" />
          </button>
        ) : null}

        <nav
          ref={navRef}
          className="flex-1 space-y-1 overflow-y-auto pb-4 pt-4 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
        {navigation.map((item, index) => {
          const hasChildren =
            Array.isArray(item.children) && item.children.length > 0;
          const childActive = hasChildren
            ? item.children!.some((child) => nodeHasActiveDescendant(child, activeLabel))
            : false;
          const active = nodeKey(item) === activeLabel || childActive;
          const previousSection =
            index > 0 ? navigation[index - 1]?.section : undefined;
          const showSectionLabel =
            !collapsed && item.section && item.section !== previousSection;
          const itemClasses = [
            "relative flex w-full items-center rounded-lg py-3 text-left transition",
            collapsed ? "justify-center px-2" : "gap-3 px-4",
            active
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "text-slate-600 hover:bg-slate-200/50",
          ].join(" ");

          return (
            <div key={item.label} className="group relative space-y-1">
              {showSectionLabel ? (
                <div className="px-4 pt-3 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {item.section}
                </div>
              ) : null}
              {hasChildren && !collapsed ? (
                <button
                  type="button"
                  className={itemClasses}
                  title={collapsed ? item.label : undefined}
                  aria-haspopup="menu"
                  aria-expanded={openItem === item.label}
                  onClick={() =>
                    setOpenItem((current) =>
                      current === item.label ? null : item.label,
                    )
                  }
                >
                  <Icon name={item.icon} fill={active} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <Icon
                    name={
                      openItem === item.label ? "expand_less" : "expand_more"
                    }
                    className={active ? "text-white" : "text-slate-400"}
                  />
                </button>
              ) : item.path ? (
                <NavLink
                  to={item.path}
                  className={itemClasses}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon name={item.icon} fill={active} />
                  {collapsed ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </NavLink>
              ) : (
                <button
                  type="button"
                  className={itemClasses}
                  title={collapsed ? item.label : undefined}
                  aria-haspopup={hasChildren ? "menu" : undefined}
                  aria-expanded={hasChildren ? active : undefined}
                  onClick={() =>
                    hasChildren
                      ? setOpenItem((current) => (current === item.label ? null : item.label))
                      : undefined
                  }
                >
                  <Icon name={item.icon} fill={active} />
                  {hasChildren && collapsed ? (
                    <Icon
                      name={openItem === item.label ? "expand_less" : "expand_more"}
                      className={`absolute bottom-1 right-1 text-[12px] ${active ? "text-white" : "text-slate-400"}`}
                    />
                  ) : null}
                  {collapsed ? (
                    <span className="sr-only">{item.label}</span>
                  ) : (
                    <span>{item.label}</span>
                  )}
                </button>
              )}

              {hasChildren && !collapsed && openItem === item.label ? (
                <div className="space-y-1 pl-4">
                  {item.children!.map((child) => {
                    const childIsActive = nodeHasActiveDescendant(child, activeLabel);
                    const nestedChildren = Array.isArray(child.children) && child.children.length > 0;
                    return (
                      <div key={`${item.label}-${nodeKey(child)}`} className="space-y-1">
                        {child.path ? (
                          <NavLink
                            className={[
                              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                              childIsActive
                                ? "bg-brand-900/10 text-brand-900"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                            ].join(" ")}
                            to={child.path}
                            aria-current={childIsActive ? "page" : undefined}
                          >
                            {child.icon ? <Icon name={child.icon} className="text-[14px]" /> : null}
                            <span className="flex-1">{child.label}</span>
                          </NavLink>
                        ) : child.children?.length ? (
                          <>
                            <button
                              onClick={() => child.key && toggleGroup(child.key)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                                "text-slate-400 hover:text-slate-600 hover:bg-slate-100",
                              )}
                            >
                              <span>{child.label}</span>
                              {child.key && (
                                <Icon
                                  name={openGroups.has(child.key) ? "expand_less" : "expand_more"}
                                  className="text-[14px]"
                                />
                              )}
                            </button>
                            {child.key && openGroups.has(child.key) && nestedChildren && (
                              <div className="space-y-1 pl-4">
                                {child.children!.map((grandChild) => {
                                    const grandChildIsActive = nodeHasActiveDescendant(grandChild, activeLabel);
                                    return grandChild.path ? (
                                      <NavLink
                                        key={`${item.label}-${nodeKey(child)}-${nodeKey(grandChild)}`}
                                        className={[
                                          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                                          grandChildIsActive
                                            ? "bg-brand-900/10 text-brand-900"
                                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                                        ].join(" ")}
                                        to={grandChild.path}
                                        aria-current={grandChildIsActive ? "page" : undefined}
                                      >
                                        <Icon name={grandChild.icon || child.icon || item.icon} className="text-[14px]" />
                                        <span className="flex-1">{grandChild.label}</span>
                                      </NavLink>
                                    ) : null;
                                  })}
                              </div>
                            )}
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {hasChildren && collapsed && openItem === item.label ? (
                <div className="mt-1 space-y-1">
                  {flattenLeafNodes(item.children!).map((child) => {
                    const childIsActive = nodeHasActiveDescendant(child, activeLabel);
                    return child.path ? (
                      <NavLink
                        key={`${item.label}-${nodeKey(child)}-collapsed`}
                        className={[
                          "group/child relative flex h-11 w-full items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-900/10",
                          childIsActive
                            ? "bg-brand-900/10 text-brand-900"
                            : "text-slate-500 hover:bg-slate-200/40 hover:text-slate-900",
                        ].join(" ")}
                        to={child.path}
                        aria-current={childIsActive ? "page" : undefined}
                        title={child.label}
                      >
                        {child.icon ? (
                          <Icon name={child.icon} className="text-[16px]" />
                        ) : (
                          <Icon name="circle" className="text-[10px]" />
                        )}
                        <span className="sr-only">{child.label}</span>
                        <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold text-white opacity-0 shadow-card transition group-hover/child:opacity-100 group-focus-visible/child:opacity-100">
                          {child.label}
                        </span>
                      </NavLink>
                    ) : null;
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        </nav>

        {canScrollDown ? (
          <button
            type="button"
            className="absolute bottom-16 left-0 right-0 z-10 flex items-center justify-center bg-gradient-to-t from-surface-container-low to-transparent py-2 text-slate-400"
            aria-label="Scroll menu down"
            onClick={() => {
              navRef.current?.scrollBy({ top: 140, behavior: "smooth" });
            }}
          >
            <Icon name="expand_more" />
          </button>
        ) : null}

        <div className="space-y-1 border-t border-slate-200/50 pt-4">
          <button
            type="button"
            onClick={() => void onSignOut()}
            className={[
              "flex w-full items-center rounded-lg py-3 text-left text-danger transition hover:bg-danger/5",
              collapsed ? "justify-center px-2" : "gap-3 px-4",
            ].join(" ")}
            title={collapsed ? "Sign Out" : undefined}
          >
            <Icon name="logout" />
            {collapsed ? (
              <span className="sr-only">Sign Out</span>
            ) : (
              <span>Sign Out</span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
