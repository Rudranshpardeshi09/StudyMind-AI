import { useEffect, useMemo, useState } from "react";
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
  { to: "/mind-maps", label: "Mind maps", icon: Network },
  { to: "/tutorial", label: "Guide", icon: GraduationCap },
  { to: "/settings", label: "Settings", icon: Settings },
];

const COLLAPSE_KEY = "sm_sidebar_collapsed";

const number = (index) => String(index + 1).padStart(2, "0");

function BrandMark({ className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-control border-2 border-black bg-primary font-display text-xl font-semibold leading-none text-primary-foreground shadow-hs-sm",
        className
      )}
    >
      <span className="-mt-0.5 italic">S</span>
    </span>
  );
}

function RailNav({ collapsed }) {
  return (
    <nav className="flex flex-col gap-1.5 px-3" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }, index) => (
        <NavLink
          key={to}
          to={to}
          title={label}
          className={({ isActive }) =>
            cn(
              "group flex min-h-11 items-center gap-3 rounded-control border-2 px-2.5 text-sm font-semibold " +
                "transition-[transform,box-shadow,background-color,color,border-color] [transition-duration:120ms] ease-out",
              collapsed ? "justify-center" : "justify-center lg:justify-start",
              isActive
                ? "border-black bg-primary text-primary-foreground shadow-hs -translate-x-px -translate-y-px"
                : "border-transparent text-foreground/75 hover:border-border hover:bg-surface-sunk hover:text-foreground"
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "font-mono text-[11px] font-semibold tabular tracking-[0.04em]",
                  isActive ? "text-primary-foreground/85" : "text-muted-foreground group-hover:text-primary",
                  !collapsed && "lg:w-5"
                )}
              >
                {number(index)}
              </span>
              <Icon className={cn("size-4 shrink-0", !collapsed ? "hidden lg:block" : "hidden")} aria-hidden="true" />
              <span className={cn("truncate", collapsed ? "sr-only" : "sr-only lg:not-sr-only")}>
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SheetNav({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1.5 px-3" aria-label="Main">
      {NAV_ITEMS.map(({ to, label, icon: Icon }, index) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex min-h-12 items-center gap-3 rounded-control border-2 px-3 text-base font-semibold transition-colors",
              isActive
                ? "border-black bg-primary text-primary-foreground shadow-hs"
                : "border-transparent text-foreground hover:bg-surface-sunk"
            )
          }
        >
          <span className="font-mono text-[11px] opacity-70">{number(index)}</span>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function TabBar() {
  return (
    <nav
      aria-label="Main"
      className="pb-safe shrink-0 border-t-2 border-border-strong bg-surface md:hidden"
    >
      <ul className="grid grid-cols-6">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              className="group flex min-h-[58px] flex-col items-center justify-center gap-1 px-0.5 py-1.5"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex h-7 w-10 items-center justify-center rounded-[8px] border-2 transition-[transform,box-shadow,background-color] [transition-duration:120ms]",
                      isActive
                        ? "border-black bg-primary text-primary-foreground shadow-hs-sm"
                        : "border-transparent text-foreground/70 group-active:bg-surface-sunk"
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      "max-w-full truncate font-mono text-[9.5px] font-semibold uppercase tracking-[0.02em]",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function UserChip({ email }) {
  const initial = (email || "?").trim().charAt(0).toUpperCase();
  return (
    <span className="hidden min-w-0 items-center gap-2 lg:flex" title={email}>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-black bg-citron font-display text-sm font-semibold text-citron-foreground"
      >
        {initial}
      </span>
      <span className="hidden max-w-[180px] truncate font-mono text-[11px] text-muted-foreground xl:inline">
        {email}
      </span>
    </span>
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
    }
  }, [collapsed]);

  useEffect(() => setMobileOpen(false), [location.pathname]);

  const activeIndex = NAV_ITEMS.findIndex((item) => item.to === location.pathname);
  const title = activeIndex >= 0 ? NAV_ITEMS[activeIndex].label : "StudyMind";
  const dateline = useMemo(
    () =>
      new Date()
        .toLocaleDateString("en-GB", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .toUpperCase(),
    []
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <aside
        className={cn(
          "relative hidden shrink-0 flex-col border-r-2 border-border-strong bg-surface transition-[width] duration-200 md:flex",
          collapsed ? "w-[76px]" : "w-[76px] lg:w-60"
        )}
      >
        <Link
          to="/overview"
          className={cn(
            "flex items-center gap-2.5 px-5 py-5 text-foreground",
            collapsed ? "justify-center px-0" : "justify-center lg:justify-start"
          )}
          aria-label="StudyMind, go to overview"
        >
          <BrandMark />
          <span className={cn("min-w-0 leading-none", collapsed ? "hidden" : "hidden lg:block")}>
            <span className="block font-display text-xl font-semibold tracking-[-0.02em]">
              StudyMind
            </span>
            <span className="eyebrow mt-1 block text-[10px]">Field notebook</span>
          </span>
        </Link>

        <div className="mx-4 mb-3 h-px bg-border" />

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2 scrollbar-thin">
          <RailNav collapsed={collapsed} />
        </div>

        <div className="border-t border-border p-3">
          <p className={cn("eyebrow mb-2 px-1 text-[10px]", collapsed ? "hidden" : "hidden lg:block")}>
            Vol. 01 — Ink &amp; Oxblood
          </p>
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={() => setCollapsed((value) => !value)}
            className={cn("hidden w-full lg:inline-flex", collapsed && "mx-auto w-9")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            {!collapsed && <span className="ml-1">Collapse</span>}
          </Button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title="Menu" description="StudyMind">
          <div className="py-3">
            <SheetNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <div className="mx-3 mt-2 border-t-2 border-border-strong pt-4">
            <p className="eyebrow mb-2">Theme</p>
            <ThemeToggle showLabels size="default" />
            <p className="mt-5 truncate font-mono text-xs text-muted-foreground" title={user?.email}>
              {user?.email}
            </p>
            <Button variant="outline" className="mt-3 w-full" onClick={logout}>
              <LogOut aria-hidden="true" />
              Log out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative shrink-0 border-b-2 border-border-strong bg-surface">
          <div className="flex min-h-14 items-center gap-3 px-3 py-2 sm:px-5 md:min-h-16">
            <Link to="/overview" className="md:hidden" aria-label="StudyMind, go to overview">
              <BrandMark className="size-8 text-lg" />
            </Link>

            <div className="min-w-0 flex-1">
              <p className="eyebrow hidden truncate text-[10px] sm:block">
                <span className="text-primary">
                  No. {activeIndex >= 0 ? number(activeIndex) : "00"}
                </span>
                <span aria-hidden="true"> — </span>
                <span>StudyMind</span>
                <span aria-hidden="true"> · </span>
                <time>{dateline}</time>
              </p>
              <h1 className="truncate font-display text-lg font-semibold leading-tight tracking-[-0.015em] text-foreground sm:text-xl">
                {title}
              </h1>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle className="hidden sm:inline-flex" />
              <UserChip email={user?.email} />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={logout}
                aria-label="Log out"
                title="Log out"
                className="hidden sm:inline-flex"
              >
                <LogOut />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu />
              </Button>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          <Outlet />
        </main>

        <TabBar />
      </div>
    </div>
  );
}
