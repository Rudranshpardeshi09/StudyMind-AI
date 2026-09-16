import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/AuthContext";

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const home = isAuthenticated ? "/overview" : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-surface-sunk text-muted-foreground">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-foreground">This page does not exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing is served at{" "}
          <code className="rounded bg-surface-sunk px-1.5 py-0.5 text-xs">
            {location.pathname}
          </code>
          . It may have been renamed, or the link may be incomplete.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link to={home}>
              <ArrowLeft aria-hidden="true" />
              {isAuthenticated ? "Back to Overview" : "Back to home"}
            </Link>
          </Button>
          {isAuthenticated && (
            <Button variant="outline" asChild>
              <Link to="/library">Go to Library</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
