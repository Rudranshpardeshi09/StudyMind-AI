import { Component, Suspense, lazy, useEffect } from "react";
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { ThemeProvider, ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/primitives";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { DocumentsProvider } from "@/features/library/DocumentsContext";
import { encodeNext, ProtectedRoute, PublicOnlyRoute } from "@/features/auth/ProtectedRoute";
import AppShell from "@/layouts/AppShell";

const LandingPage = lazy(() => import("@/features/marketing/LandingPage"));
const LoginPage = lazy(() => import("@/features/auth/LoginPage"));
const OverviewPage = lazy(() => import("@/features/overview/OverviewPage"));
const LibraryPage = lazy(() => import("@/features/library/LibraryPage"));
const StudyPage = lazy(() => import("@/features/study/StudyPage"));
const MindMapsPage = lazy(() => import("@/features/mind-maps/MindMapsPage"));
const TutorialPage = lazy(() => import("@/features/tutorial/TutorialPage"));
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));
const NotFoundPage = lazy(() => import("@/features/marketing/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-52" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="max-w-sm text-center">
          <p className="text-base font-semibold text-foreground">Something went wrong</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The page hit an unexpected error. Reloading usually fixes it.
          </p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}

function TutorialLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <RouteFallback />;
  if (isAuthenticated) return <AppShell />;

  return (
    <div className="flex h-screen flex-col bg-canvas">
      <header className="shrink-0 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 text-foreground">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">StudyMind</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function UnauthorizedRedirect() {
  const { registerUnauthorizedRedirect } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    registerUnauthorizedRedirect(() => {
      const next = encodeNext(location);
      navigate(next ? `/login?next=${next}` : "/login", { replace: true });
    });
  }, [registerUnauthorizedRedirect, navigate, location]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <UnauthorizedRedirect />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />

          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/mind-maps" element={<MindMapsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route element={<TutorialLayout />}>
            <Route path="/tutorial" element={<TutorialPage />} />
          </Route>

          <Route path="/guide" element={<Navigate to="/tutorial" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <DocumentsProvider>
            <AppRoutes />
          </DocumentsProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
