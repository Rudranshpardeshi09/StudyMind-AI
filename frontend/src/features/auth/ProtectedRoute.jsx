import { Navigate, useLocation } from "react-router-dom";

import { Skeleton } from "@/components/ui/primitives";
import { useAuth } from "./AuthContext";

/**
 * Build the ?next= value from a location.
 *
 * Only a same-origin relative path is ever produced or accepted: an unchecked
 * `next` is an open redirect.
 */
export function encodeNext(location) {
  const target = `${location.pathname}${location.search}`;
  if (target === "/" || target.startsWith("/login")) return "";
  return encodeURIComponent(target);
}

export function safeNext(raw) {
  if (!raw) return null;
  let candidate;
  try {
    candidate = decodeURIComponent(raw);
  } catch {
    return null;
  }
  // Must be a single-slash relative path. "//evil.com" and "https://evil.com"
  // are both rejected.
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return null;
  if (candidate.includes("://")) return null;
  return candidate;
}

function RouteSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Never decide before the session is known, or every cold load flashes login.
  if (loading) return <RouteSkeleton />;

  if (!isAuthenticated) {
    const next = encodeNext(location);
    return <Navigate to={next ? `/login?next=${next}` : "/login"} replace />;
  }
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <RouteSkeleton />;
  if (isAuthenticated) return <Navigate to="/overview" replace />;
  return children;
}
