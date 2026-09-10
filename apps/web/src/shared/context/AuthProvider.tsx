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
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [authIssue, setAuthIssue] = useState<AuthIssue>(null);
  const [lastKnownEmail, setLastKnownEmail] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setStatus("checking");

    try {
      const result = await authApi.fetchStatus();
      if (result.authenticated && result.user) {
        setUser(result.user);
        setLastKnownEmail(result.user.email || null);
        setStatus("authenticated");
        setAuthIssue(null);
        // Pre-fetch profile to cache for use throughout the app
        getWorkspaceProfile().catch(() => {});
      } else {
        const fallbackUser = await authApi.fetchCurrentUser();
        if (fallbackUser) {
          setUser(fallbackUser);
          setLastKnownEmail(fallbackUser.email || null);
          setStatus("authenticated");
          setAuthIssue(null);
          // Pre-fetch profile to cache
          getWorkspaceProfile().catch(() => {});
        } else {
          setUser(null);
          setStatus("unauthenticated");
          setAuthIssue(null);
        }
      }
    } catch {
      try {
        const fallbackUser = await authApi.fetchCurrentUser();
        if (fallbackUser) {
          setUser(fallbackUser);
          setLastKnownEmail(fallbackUser.email || null);
          setStatus("authenticated");
          setAuthIssue(null);
        } else {
          setUser(null);
          setStatus("unauthenticated");
          setAuthIssue(null);
        }
      } catch {
        setUser(null);
        setStatus("unauthenticated");
        setAuthIssue(null);
      }
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

  const signIn = useCallback(async (email: string, password: string) => {
    const { tokens, user: authUser } = await authApi.login(email, password);
    authSession.persistSession(
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in,
    );
    setUser(authUser);
    setLastKnownEmail(authUser.email || email);
    setStatus("authenticated");
    setAuthIssue(null);
    setInitialized(true);
  }, []);

  const signOut = useCallback(async () => {
    await authApi.logout();
    authSession.clearSession();
    setUser(null);
    setStatus("unauthenticated");
    setAuthIssue(null);
    setLastKnownEmail(null);
    setInitialized(true);
  }, []);

  const value = useMemo<AuthContextValue>(
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
    [authIssue, initialized, lastKnownEmail, refreshStatus, signIn, signOut, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
