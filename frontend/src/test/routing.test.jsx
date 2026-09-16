/**
 * Route protection, redirect-after-login, and the open-redirect guard.
 */

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { PublicOnlyRoute, ProtectedRoute, safeNext, encodeNext } from "@/features/auth/ProtectedRoute";

const authState = { user: null, loading: false, isAuthenticated: false };

vi.mock("@/features/auth/AuthContext", () => ({
  useAuth: () => authState,
  AuthProvider: ({ children }) => children,
}));

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<p>Login screen</p>} />
        <Route path="/overview" element={<p>Overview screen</p>} />
        <Route path="/study" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("redirects an anonymous visitor to login", () => {
    Object.assign(authState, { isAuthenticated: false, loading: false });
    renderAt("/study", <ProtectedRoute><p>Study screen</p></ProtectedRoute>);
    expect(screen.getByText("Login screen")).toBeInTheDocument();
    expect(screen.queryByText("Study screen")).not.toBeInTheDocument();
  });

  it("renders the route for a signed-in user", () => {
    Object.assign(authState, { isAuthenticated: true, loading: false });
    renderAt("/study", <ProtectedRoute><p>Study screen</p></ProtectedRoute>);
    expect(screen.getByText("Study screen")).toBeInTheDocument();
  });

  it("shows a skeleton instead of redirecting while auth resolves", () => {
    // The old implementation bounced through the auth screen on every cold load.
    Object.assign(authState, { isAuthenticated: false, loading: true });
    renderAt("/study", <ProtectedRoute><p>Study screen</p></ProtectedRoute>);
    expect(screen.queryByText("Login screen")).not.toBeInTheDocument();
    expect(screen.queryByText("Study screen")).not.toBeInTheDocument();
  });
});

describe("PublicOnlyRoute", () => {
  it("sends a signed-in user to the overview", () => {
    Object.assign(authState, { isAuthenticated: true, loading: false });
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><p>Login form</p></PublicOnlyRoute>} />
          <Route path="/overview" element={<p>Overview screen</p>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Overview screen")).toBeInTheDocument();
  });
});

describe("next-parameter handling", () => {
  it("preserves an in-app destination", () => {
    expect(encodeNext({ pathname: "/study", search: "?session=abc" })).toBe(
      encodeURIComponent("/study?session=abc")
    );
    expect(safeNext(encodeURIComponent("/study?session=abc"))).toBe("/study?session=abc");
  });

  it("never returns to the login page itself", () => {
    expect(encodeNext({ pathname: "/login", search: "" })).toBe("");
    expect(encodeNext({ pathname: "/", search: "" })).toBe("");
  });

  it.each([
    "https://evil.example.com",
    "//evil.example.com",
    "http://evil.example.com/path",
    "javascript:alert(1)",
  ])("rejects the off-site destination %s", (candidate) => {
    expect(safeNext(encodeURIComponent(candidate))).toBeNull();
  });

  it("rejects a malformed encoding rather than throwing", () => {
    expect(safeNext("%E0%A4%A")).toBeNull();
  });
});
