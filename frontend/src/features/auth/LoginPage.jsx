import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { ArrowRight, BookOpen, Lock, Mail, Network, Quote, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/primitives";
import { toMessage } from "@/services/http";
import { cn } from "@/lib/utils";
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
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between bg-surface p-10 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 text-foreground">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-tight">StudyMind</span>
        </Link>

        <div className="max-w-md">
          <Quote className="size-6 text-primary" aria-hidden="true" />
          <p className="mt-4 text-xl font-medium leading-relaxed text-foreground">
            Ask your textbook a question and get an answer that shows its working — the
            document, the page, the passage.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-sunk">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Retrieval-augmented answers from your own material.
        </p>
      </aside>

      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex items-center gap-2.5 text-foreground lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">StudyMind</span>
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {copy.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "login"
              ? "Sign in to reach your documents and saved chats."
              : "Start indexing your study material in a couple of minutes."}
          </p>

          <div
            role="tablist"
            aria-label="Authentication mode"
            className="mt-6 grid grid-cols-2 rounded-md bg-surface-sunk p-1"
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
                  "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === value
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {value === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-3.5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
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
                  className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label
                  htmlFor="confirm"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
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
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-60"
                />
              </div>
            )}

            {error && <ErrorState title="Could not sign you in" message={error} />}

            <Button type="submit" className="w-full" loading={busy}>
              {copy.cta}
              {!busy && <ArrowRight aria-hidden="true" />}
            </Button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="mt-5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="mt-4 flex justify-center">
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

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {copy.alt}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError(null);
              }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {copy.altCta}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
