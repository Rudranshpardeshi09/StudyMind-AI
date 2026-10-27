import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Network, Quote, Search, Sparkles } from "lucide-react";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthContext";

const FEATURES = [
  {
    icon: Search,
    title: "Grounded answers",
    body: "Questions are answered from your own material, not from the model's memory.",
  },
  {
    icon: Quote,
    title: "Verifiable citations",
    body: "Every answer names the document, the page, and the passage it drew from.",
  },
  {
    icon: Network,
    title: "Revision mind maps",
    body: "Turn a chapter into a branching diagram you can export and study from.",
  },
];

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-8">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/overview" replace />;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <span className="flex items-center gap-2.5 text-foreground">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold tracking-tight">StudyMind</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tutorial">How it works</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.5rem] sm:leading-[1.15]">
            Ask your own textbooks, and see where every answer came from.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Upload your course material and StudyMind answers questions from it — citing the
            document and page each time, so you can check the source rather than trust the model.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/login">
                Get started
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/tutorial">See how it works</Link>
            </Button>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title} className="p-5">
              <span className="flex size-9 items-center justify-center rounded-md bg-surface-sunk text-muted-foreground">
                <feature.icon className="size-4" aria-hidden="true" />
              </span>
              <h2 className="mt-3.5 text-sm font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-5 py-6">
          <p className="text-xs text-muted-foreground">
            Retrieval-augmented study assistant. Your documents stay private to your account.
          </p>
        </div>
      </footer>
    </div>
  );
}
