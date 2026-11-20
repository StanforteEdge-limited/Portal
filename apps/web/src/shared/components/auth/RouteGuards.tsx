import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthProvider";

function AuthCheckingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafafa] p-6">
      <section
        role="status"
        aria-live="polite"
        className="section-card w-full max-w-md p-6 text-center"
      >
        <h1 className="text-base font-medium text-neutral-900">
          Preparing your workspace
        </h1>
        <p className="mt-1.5 text-sm text-neutral-500">
          Checking your active session.
        </p>
      </section>
    </main>
  );
}

export function ProtectedRoute() {
  const { status, initialized, authIssue } = useAuth();

  if (!initialized || status === "checking") {
    return <AuthCheckingScreen />;
  }

  if (status !== "authenticated") {
    const nextPath = authIssue === "session_expired" ? "/reauth" : "/login";
    const from = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
    return <Navigate to={nextPath} replace state={{ from }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { status, initialized } = useAuth();

  if (!initialized || status === "checking") {
    return <AuthCheckingScreen />;
  }

  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
