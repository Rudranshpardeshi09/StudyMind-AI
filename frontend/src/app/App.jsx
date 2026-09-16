import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { ThemeProvider } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/primitives";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext";
import { DocumentsProvider } from "@/features/library/DocumentsContext";
import { encodeNext, ProtectedRoute, PublicOnlyRoute } from "@/features/auth/ProtectedRoute";
import AppShell from "@/layouts/AppShell";

// Every route splits, so React Flow, jsPDF and html-to-image never reach the
// entry chunk.
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

/** Send the user to login on a 401, preserving where they were. */
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
            <Route path="/tutorial" element={<TutorialPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Readable before signing up. */}
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
      <AuthProvider>
        <DocumentsProvider>
          <AppRoutes />
        </DocumentsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
