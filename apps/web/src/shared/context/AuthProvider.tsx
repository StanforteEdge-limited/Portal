import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "@stanforte/shared";
import { authApi, authSession } from "@/shared/lib/core";
import { getWorkspaceProfile } from "@/shared/api/workspace-api";

type AuthStatus = "checking" | "authenticated" | "unauthenticated";
type AuthIssue = "session_expired" | null;

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  initialized: boolean;
  authIssue: AuthIssue;
  lastKnownEmail: string | null;
  signIn: (email: string, password: string, organization?: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const CACHED_USER_KEY = "se_cached_auth_user";

function readCachedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialCachedUser = readCachedUser();
  const [status, setStatus] = useState<AuthStatus>(initialCachedUser ? "authenticated" : "checking");
  const [user, setUser] = useState<AuthUser | null>(initialCachedUser);
  const [initialized, setInitialized] = useState(Boolean(initialCachedUser));
  const [authIssue, setAuthIssue] = useState<AuthIssue>(null);
  const [lastKnownEmail, setLastKnownEmail] = useState<string | null>(initialCachedUser?.email || null);

  const refreshStatus = useCallback(async () => {
    const cached = readCachedUser();
    if (!cached) {
      setStatus("checking");
    }

    try {
      const result = await authApi.fetchStatus();
      if (result.authenticated && result.user) {
        writeCachedUser(result.user);
        setUser(result.user);
        setLastKnownEmail(result.user.email || null);
        setStatus("authenticated");
        setAuthIssue(null);
        getWorkspaceProfile().catch(() => {});
      } else {
        writeCachedUser(null);
        setUser(null);
        setStatus("unauthenticated");
        setAuthIssue(null);
      }
    } catch {
      // Transient network/5xx failure (e.g. server restarting): keep cached session intact
      if (cached) {
        setUser(cached);
        setLastKnownEmail(cached.email || null);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
      setAuthIssue(null);
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleAuthInvalidated() {
      writeCachedUser(null);
      setUser(null);
      setStatus("unauthenticated");
      setAuthIssue("session_expired");
      setInitialized(true);
    }

    window.addEventListener("se:auth-invalidated", handleAuthInvalidated as EventListener);
    return () => {
      window.removeEventListener("se:auth-invalidated", handleAuthInvalidated as EventListener);
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string, organization?: string) => {
    const { tokens, user: authUser } = await authApi.login(email, password, organization);
    authSession.persistSession(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
    );
    writeCachedUser(authUser);
    setUser(authUser);
    setLastKnownEmail(authUser.email || email);
    setStatus("authenticated");
    setAuthIssue(null);
    setInitialized(true);
    return authUser;
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    authSession.clearSession();
    writeCachedUser(null);
    setUser(null);
    setLastKnownEmail(null);
    setStatus("unauthenticated");
    setAuthIssue(null);
    setInitialized(true);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      initialized,
      authIssue,
      lastKnownEmail,
      signIn,
      signOut,
      refreshStatus,
    }),
    [authIssue, initialized, lastKnownEmail, refreshStatus, signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
