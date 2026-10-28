import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { ArrowRight, BookOpen, Lock, Mail, Network } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/primitives";
import { toMessage } from "@/services/http";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BrandLink } from "@/features/marketing/PublicHeader";
import AuthArt, { RotatingLine } from "./AuthArt";
import { useAuth } from "./AuthContext";
import { safeNext } from "./ProtectedRoute";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function passwordProblem(password) {
  if (password.length < 8 || password.length > 128) {
    return "Use between 8 and 128 characters.";
  }
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return "Include at least one letter and one number.";
  }
  return null;
}

const INPUT =
  "h-12 w-full rounded-control border-2 border-transparent bg-surface-sunk px-3.5 text-[15px] text-foreground " +
  "shadow-[inset_0_2px_0_0_hsl(var(--foreground)/0.06)] placeholder:text-muted-foreground " +
  "transition-[border-color,background-color,box-shadow] duration-150 hover:border-border " +
  "focus:border-border-strong focus:bg-surface-raised focus:shadow-hs-sm " +
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ring " +
  "disabled:opacity-60";

const LABEL = "mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground";

const HIGHLIGHTS = [
  { icon: BookOpen, text: "Answers cite the page they came from" },
  { icon: Network, text: "Turn dense chapters into mind maps" },
  { icon: Lock, text: "Your documents stay private to your account" },
];

export default function LoginPage() {
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const next = useMemo(() => safeNext(searchParams.get("next")), [searchParams]);
  const destination = next ?? "/overview";

  const copy =
    mode === "login"
      ? { title: "Welcome back", cta: "Sign in", alt: "Need an account?", altCta: "Create one" }
      : {
          title: "Create your account",
          cta: "Create account",
          alt: "Already have an account?",
          altCta: "Sign in",
        };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Enter your email and password.");
      return;
    }
    if (mode === "signup") {
      if (password !== confirm) {
        setError("Those passwords do not match.");
        return;
      }
      const problem = passwordProblem(password);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "login") await login(normalizedEmail, password);
      else await register(normalizedEmail, password);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(toMessage(requestError, "That did not work. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async (credential) => {
    if (!credential) return;
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle(credential);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(toMessage(requestError, "Google sign-in did not complete."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-clip bg-canvas text-foreground lg:grid lg:grid-cols-12">
      <aside className="relative hidden flex-col gap-12 px-10 py-8 lg:col-span-7 lg:flex xl:px-14">
        <div className="flex items-center justify-between gap-4 pr-12">
          <BrandLink />
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            No. 02 — Sign-in desk
          </span>
        </div>

        <div className="grid grid-cols-7 items-end gap-x-8 gap-y-8 pr-16 xl:pr-24">
          <div className="col-span-7">
            <p className="eyebrow">
              <span className="text-primary">02 /</span> Retrieval-augmented answers
            </p>
            <RotatingLine size="lg" className="mt-4 min-h-[9.5rem] xl:min-h-[11.5rem]" />
          </div>
          <AuthArt className="col-span-4 ml-3" />
          <ul className="col-span-3 space-y-3 self-end">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 hairline-t pt-3 text-sm text-foreground/85">
                <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-auto font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          Retrieval-augmented answers from your own material.
        </p>
      </aside>

      <main className="relative flex min-h-screen flex-col px-4 pb-10 pt-3 sm:px-8 lg:col-span-5 lg:justify-center lg:border-l-2 lg:border-border-strong lg:bg-surface-sunk lg:px-0 lg:py-10">
        <div className="flex items-center justify-between gap-3 lg:absolute lg:right-6 lg:top-6">
          <BrandLink className="lg:hidden" />
          <ThemeToggle />
        </div>

        <div className="mt-6 lg:hidden">
          <RotatingLine className="min-h-[6.5rem]" />
        </div>

        <div className="relative mx-auto mt-8 w-full max-w-[26rem] lg:-ml-16 lg:mt-0 xl:-ml-20">
          <div className="relative rounded-hero border-2 border-border-strong bg-surface-raised p-6 shadow-hs-lg sm:p-8">
            <p className="eyebrow">
              <span className="text-primary">{mode === "login" ? "01" : "02"} /</span>{" "}
              {mode === "login" ? "Returning reader" : "New reader"}
            </p>
            <h1 className="display mt-3 text-[2.25rem] text-foreground sm:text-[2.6rem]">
              {copy.title}
            </h1>
            <p className="mt-2.5 text-sm text-muted-foreground">
              {mode === "login"
                ? "Sign in to reach your documents and saved chats."
                : "Start indexing your study material in a couple of minutes."}
            </p>

            <div
              role="tablist"
              aria-label="Authentication mode"
              className="mt-6 grid grid-cols-2 gap-1 rounded-control border-2 border-border-strong bg-surface-sunk p-1"
            >
              {["login", "signup"].map((value) => (
                <button
                  key={value}
                  role="tab"
                  type="button"
                  aria-selected={mode === value}
                  onClick={() => {
                    setMode(value);
                    setError(null);
                  }}
                  className={cn(
                    "min-h-11 rounded-[6px] px-3 text-sm font-semibold transition-colors duration-150",
                    mode === value
                      ? "bg-ink text-bone shadow-hs-sm dark:bg-bone dark:text-ink"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground"
                  )}
                >
                  {value === "login" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className={LABEL}>
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    disabled={busy}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={cn(INPUT, "pl-10")}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className={LABEL}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    value={password}
                    disabled={busy}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "signup" ? "8+ characters, with a number" : "Your password"}
                    className={cn(INPUT, "pl-10")}
                  />
                </div>
              </div>

              {mode === "signup" && (
                <div>
                  <label htmlFor="confirm" className={LABEL}>
                    Confirm password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    disabled={busy}
                    onChange={(event) => setConfirm(event.target.value)}
                    className={INPUT}
                  />
                </div>
              )}

              {error && <ErrorState title="Could not sign you in" message={error} />}

              <Button type="submit" size="lg" className="w-full" loading={busy}>
                {copy.cta}
                {!busy && <ArrowRight aria-hidden="true" />}
              </Button>
            </form>

            {GOOGLE_CLIENT_ID && (
              <div className="mt-6">
                <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="mt-4 flex justify-center overflow-hidden">
                  <GoogleLogin
                    onSuccess={(response) => handleGoogle(response.credential)}
                    onError={() => setError("Google sign-in was cancelled.")}
                    useOneTap={false}
                    text="continue_with"
                    shape="rectangular"
                    width="320"
                  />
                </div>
              </div>
            )}

            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1.5 border-t border-border pt-3 text-sm text-muted-foreground">
              {copy.alt}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setError(null);
                }}
                className="inline-flex min-h-11 items-center rounded-sm px-1 font-semibold text-primary underline decoration-2 underline-offset-4 hover:decoration-citron"
              >
                {copy.altCta}
              </button>
            </p>
          </div>
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-4 rotate-6 rounded-full border-2 border-black bg-citron px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-citron-foreground shadow-hs-sm"
          >
            {mode === "login" ? "welcome back" : "new here"}
          </span>
        </div>

        <ul className="mx-auto mt-10 w-full max-w-[26rem] space-y-2.5 lg:hidden">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 hairline-t pt-2.5 text-sm text-muted-foreground">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

