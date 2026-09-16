import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sparkles,
} from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/overlays";
import { useAuth } from "@/features/auth/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/library", label: "Library", icon: Library },
  { to: "/study", label: "Study", icon: BookOpen },
  { to: "/mind-maps", label: "Mind Maps", icon: Network },
  { to: "/tutorial", label: "Tutorial", icon: GraduationCap },
  { to: "/settings", label: "Settings", icon: Settings },
];

const TITLES = {
  "/overview": "Overview",
  "/library": "Library",
  "/study": "Study",
  "/mind-maps": "Mind Maps",
  "/tutorial": "Tutorial",
  "/settings": "Settings",
};

const COLLAPSE_KEY = "sm_sidebar_collapsed";

function NavItems({ collapsed, onNavigate }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              collapsed && "justify-center px-0",
              isActive
                ? "bg-primary-soft text-primary"
                : "text-muted-foreground hover:bg-surface-sunk hover:text-foreground"
            )
          }
        >
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand({ collapsed }) {
  return (
    <Link
      to="/overview"
      className="flex items-center gap-2.5 px-4 py-4 text-foreground"
      aria-label="StudyMind, go to overview"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      {!collapsed && (
        <span className="truncate text-sm font-semibold tracking-tight">StudyMind</span>
      )}
    </Link>
  );
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* per-viewer convenience only */
    }
  }, [collapsed]);

  // Close the drawer on navigation so a link tap does not leave it open.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const title = TITLES[location.pathname] ?? "StudyMind";

  return (
    <div className="flex h-full bg-canvas">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <Brand collapsed={collapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto py-2 scrollbar-thin">
          <NavItems collapsed={collapsed} />
        </div>
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={() => setCollapsed((value) => !value)}
            className={cn("w-full", collapsed && "w-8")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!collapsed && <span className="ml-1">Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title="Menu">
          <div className="py-2">
            <NavItems collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="mt-2 border-t border-border p-3">
            <p className="truncate text-xs text-muted-foreground" title={user?.email}>
              {user?.email}
            </p>
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={logout}>
              <LogOut aria-hidden="true" />
              Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-3 sm:px-5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>

          <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">{title}</h1>

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <span
              className="hidden max-w-[180px] truncate text-xs text-muted-foreground xl:inline"
              title={user?.email}
            >
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={logout}
              aria-label="Log out"
              className="hidden sm:inline-flex"
            >
              <LogOut />
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
