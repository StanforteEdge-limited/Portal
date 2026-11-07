import React, { useMemo, useCallback } from "react";
import {
  useNavigate as useTanStackNavigate,
  useLocation as useTanStackLocation,
  useParams as useTanStackParams,
  Link as TanStackLink,
  Navigate as TanStackNavigate,
  Outlet as TanStackOutlet,
} from "@tanstack/react-router";

/**
 * Drop-in TanStack Router Adapter for legacy react-router-dom bindings.
 * Maps React Router's hooks and components to TanStack Router primitives seamlessly.
 */

export function useNavigate() {
  const navigate = useTanStackNavigate();
  return useCallback(
    (to: any, options?: { replace?: boolean; state?: any }) => {
      if (typeof to === "number") {
        window.history.go(to);
      } else if (typeof to === "string") {
        navigate({ to: to as any, replace: options?.replace });
      } else if (to && typeof to === "object") {
        navigate({ to: (to.pathname || "/") as any, replace: options?.replace });
      }
    },
    [navigate]
  );
}

export function useLocation() {
  const loc = useTanStackLocation();
  return {
    pathname: loc.pathname,
    search: loc.searchStr || window.location.search || "",
    hash: loc.hash || window.location.hash || "",
    state: (loc as any).state || null,
    key: "default",
  };
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  try {
    return (useTanStackParams as any)({ strict: false }) as T;
  } catch {
    return {} as T;
  }
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string, string> | ((prev: URLSearchParams) => URLSearchParams)) => void
] {
  const navigate = useTanStackNavigate();
  const location = useLocation();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const setSearchParams = useCallback(
    (next: any) => {
      const current = new URLSearchParams(window.location.search);
      const updated = typeof next === "function" ? next(current) : next;
      const str = updated instanceof URLSearchParams ? updated.toString() : new URLSearchParams(updated).toString();
      navigate({ to: `${window.location.pathname}${str ? `?${str}` : ""}` as any });
    },
    [navigate]
  );

  return [searchParams, setSearchParams];
}

export const Link = React.forwardRef<HTMLAnchorElement, any>(function Link(
  { to, replace, className, children, ...rest },
  ref
) {
  if (typeof to === "string" && (to.startsWith("http://") || to.startsWith("https://") || to.startsWith("mailto:"))) {
    return (
      <a ref={ref} href={to} className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <TanStackLink
      ref={ref}
      to={to || "/"}
      replace={replace}
      className={className}
      {...rest}
    >
      {children}
    </TanStackLink>
  );
});

export const NavLink = React.forwardRef<HTMLAnchorElement, any>(function NavLink(
  { to, className, children, ...rest },
  ref
) {
  const location = useLocation();
  const target = typeof to === "string" ? to : to?.pathname || "/";
  const isActive = location.pathname === target || (target !== "/" && location.pathname.startsWith(target));

  const resolvedClass = typeof className === "function" ? className({ isActive }) : className;

  return (
    <TanStackLink
      ref={ref}
      to={target}
      className={resolvedClass}
      {...rest}
    >
      {typeof children === "function" ? children({ isActive }) : children}
    </TanStackLink>
  );
});

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  return <TanStackNavigate to={to as any} replace={replace} />;
}

export const Outlet = TanStackOutlet;

export function BrowserRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Routes({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Route() {
  return null;
}

