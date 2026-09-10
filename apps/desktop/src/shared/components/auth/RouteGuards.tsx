import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthProvider";

function AuthCheckingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section
        role="status"
        aria-live="polite"
        className="section-card w-full max-w-md p-6 text-center"
      >
        <h1 className="text-lg font-semibold text-slate-950">
          Preparing your workspace...
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Checking your active session.
        </p>
      </section>
    </main>
  );
}

export function ProtectedRoute() {
  const { status, initialized, authIssue } = useAuth();
  const location = useLocation();

  if (!initialized || status === "checking") {
    return <AuthCheckingScreen />;
  }

  if (status !== "authenticated") {
    const nextPath = authIssue === "session_expired" ? "/reauth" : "/login";
    return (
      <Navigate to={nextPath} replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status, initialized } = useAuth();

  if (!initialized || status === "checking") {
    return <AuthCheckingScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to="/requests" replace />;
  }

  return <Outlet />;
}
