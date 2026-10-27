import { Navigate, useLocation } from "react-router-dom";

import { Skeleton } from "@/components/ui/primitives";
import { useAuth } from "./AuthContext";

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
