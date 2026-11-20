import React, { useMemo, useCallback, useEffect, useRef } from "react";
import {
  useNavigate as useTanStackNavigate,
  useLocation as useTanStackLocation,
  useParams as useTanStackParams,
  Link as TanStackLink,
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
        navigate({ to: to as any, replace: options?.replace, state: options?.state as any });
      } else if (to && typeof to === "object") {
        navigate({ to: (to.pathname || "/") as any, replace: options?.replace, state: (options?.state ?? to.state) as any });
      }
    },
    [navigate]
  );
}

export function useLocation() {
  const loc = useTanStackLocation();
  const pathname = loc.pathname;
  const search = loc.searchStr || (typeof window !== "undefined" ? window.location.search : "") || "";
  const hash = loc.hash || (typeof window !== "undefined" ? window.location.hash : "") || "";
  const state = (loc as any).state || null;

  return useMemo(
    () => ({
      pathname,
      search,
      hash,
      state,
      key: "default",
    }),
    [pathname, search, hash, state]
  );
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

export function Navigate({ to, replace, state }: { to: string; replace?: boolean; state?: any }) {
  const navigate = useTanStackNavigate();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    navigate({ to: to as any, replace, state: stateRef.current as any });
  }, [navigate, to, replace]);

  return null;
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

