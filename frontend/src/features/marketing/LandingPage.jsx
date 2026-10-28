import { Link, Navigate } from "react-router-dom";
import { ArrowRight, FileText, Lock, Network, Quote, Search } from "lucide-react";

import { BigNumeral, CropMarks, Marquee, OrbitRings, PaperStack3D, PipelineDiagram, PIPELINE_STEPS, Squiggle, Sticker } from "@/components/art";
import { Button } from "@/components/ui/button";
import { Eyebrow, Skeleton } from "@/components/ui/primitives";
import { clipReveal } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/AuthContext";

import HeroArt from "./HeroArt";
import PublicHeader from "./PublicHeader";
import { Reveal, RevealItem } from "./Reveal";

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

const FACTS = [
  { icon: FileText, text: "PDF & DOCX" },
  { icon: Quote, text: "Page-level citations" },
  { icon: Lock, text: "Private to your account" },
];

const PIPELINE_NOTES = {
  pdf: "Your document is parsed page by page.",
  chunks: "Text is split into passages.",
  vectors: "Passages are embedded into an index only you can search.",
  retrieve: "Your question pulls back the most relevant passages.",
  answer: "The answer is written from them, with citations.",
};

const TAPE = [
  "Grounded answers",
  "Page-level citations",
  "Revision mind maps",
  "Your notes only",
  "Receipts included",
  "No cap",
];

function FeatureCard({ feature, index, className, tone = "surface", children }) {
  const ink = tone === "ink";
  return (
    <RevealItem
      className={cn(
        "lift-card relative overflow-hidden rounded-card border-2 border-border-strong p-6 shadow-hs sm:p-8",
        ink ? "bg-ink text-bone dark:bg-surface-raised dark:text-foreground" : tone === "raised" ? "bg-surface-raised" : "bg-surface",
        className
      )}
    >
      <BigNumeral
        value={index + 1}
        size="lg"
        inverse={ink}
        className="absolute right-3 top-0 sm:right-6"
      />
      <span
        className={cn(
          "relative flex size-11 items-center justify-center rounded-control border-2 border-black shadow-hs-sm",
          index === 0 && "bg-citron text-citron-foreground",
          index === 1 && "bg-primary text-primary-foreground",
          index === 2 && "bg-bone text-ink"
        )}
      >
        <feature.icon className="size-5" aria-hidden="true" />
      </span>
      <Eyebrow number={index + 1} inverse={ink} className="relative mt-6">
        Feature
      </Eyebrow>
      <h3 className="display relative mt-2 text-[2rem] sm:text-[2.5rem]">{feature.title}</h3>
      <p
        className={cn(
          "relative mt-3 max-w-[44ch] text-base leading-relaxed",
          ink ? "text-bone/80 dark:text-muted-foreground" : "text-muted-foreground"
        )}
      >
        {feature.body}
      </p>
      {children}
    </RevealItem>
  );
}

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
    <div className="min-h-screen overflow-x-clip bg-canvas text-foreground">
      <PublicHeader />

      <main>
        <section className="mx-auto max-w-shell px-4 pb-14 pt-6 sm:px-6 sm:pb-20 sm:pt-8">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b-2 border-border-strong pb-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <span>No. 01 — The cited-answer issue</span>
            <span className="hidden sm:inline">Retrieval-augmented study assistant</span>
          </div>

          <Reveal stagger amount={0.1} className="mt-10 grid grid-cols-1 gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-6">
            <div className="min-w-0 lg:col-span-7">
              <RevealItem>
                <Eyebrow number={1}>Study from your own material</Eyebrow>
              </RevealItem>
              <RevealItem
                as="h1"
                className="display mt-5 text-[2.9rem] text-foreground min-[420px]:text-[3.4rem] sm:text-display-lg lg:text-[5.25rem] xl:text-[5.75rem]"
              >
                Ask your own <em className="display-italic text-primary">textbooks</em>, and see where every answer{" "}
                <span className="marker">came from.</span>
              </RevealItem>
              <RevealItem
                as="p"
                className="mt-7 max-w-[56ch] text-lg leading-relaxed text-muted-foreground"
              >
                Upload your course material and StudyMind answers questions from it — citing the
                document and page each time, so you can check the source rather than trust the model.
              </RevealItem>
              <RevealItem className="mt-8 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
                <Button size="lg" asChild>
                  <Link to="/login">
                    Get started
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/tutorial">See how it works</Link>
                </Button>
              </RevealItem>
              <RevealItem as="ul" className="mt-10 flex flex-wrap gap-x-6 gap-y-2.5 hairline-t pt-4">
                {FACTS.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground/80"
                  >
                    <Icon className="size-3.5 text-primary" aria-hidden="true" />
                    {text}
                  </li>
                ))}
              </RevealItem>
            </div>

            <RevealItem className="min-w-0 px-2 sm:px-4 lg:col-span-4 lg:col-start-9 lg:px-0 lg:pt-6">
              <HeroArt />
            </RevealItem>
          </Reveal>
        </section>

        <Marquee items={TAPE} speed={36} className="-my-2" />

        <section aria-labelledby="how-heading" className="mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-24">
          <Reveal stagger className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-6">
            <div className="min-w-0 lg:col-span-4">
              <RevealItem>
                <Eyebrow number={2}>How it works</Eyebrow>
              </RevealItem>
              <RevealItem as="h2" id="how-heading" variants={clipReveal} className="display mt-4 pb-1 text-display-sm">
                From PDF to a <em className="display-italic text-primary">cited</em> answer.
              </RevealItem>
              <RevealItem as="p" className="mt-4 max-w-[46ch] text-base leading-relaxed text-muted-foreground">
                Your material is split into passages and indexed for your account. Each question
                retrieves the most relevant passages, and the answer is written from them — with the
                document and page attached.
              </RevealItem>
              <RevealItem className="mt-6">
                <Link
                  to="/tutorial"
                  className="inline-flex min-h-11 items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-citron"
                >
                  Read the full guide
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </RevealItem>
            </div>

            <RevealItem className="min-w-0 lg:col-span-8">
              <div className="relative">
                <CropMarks />
                <div className="relative rounded-hero border-2 border-border-strong bg-surface p-5 shadow-hs-lg sm:p-8">
                  <div className="flex items-center justify-between gap-3">
                    <span className="eyebrow">Fig. 2 — The pipeline</span>
                    <Sticker tone="citron" rotate={3} className="hidden min-[480px]:inline-flex">
                      5 steps
                    </Sticker>
                  </div>
                  <div className="mt-6 hidden min-[480px]:block">
                    <PipelineDiagram activeStep="answer" />
                  </div>
                  <ol className="mt-5 grid gap-x-5 gap-y-4 min-[480px]:grid-cols-2 lg:grid-cols-5">
                    {PIPELINE_STEPS.map((step, index) => (
                      <li key={step.id} className="hairline-t pt-3">
                        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
                          {String(index + 1).padStart(2, "0")} {step.label}
                        </p>
                        <p className="mt-1.5 text-sm leading-snug text-muted-foreground">
                          {PIPELINE_NOTES[step.id]}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </RevealItem>
          </Reveal>
        </section>

        <section aria-labelledby="features-heading" className="hairline-t">
          <div className="mx-auto max-w-shell px-4 py-16 sm:px-6 sm:py-24">
            <Reveal stagger className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-start">
              <div className="min-w-0 md:col-span-6 md:col-start-2">
                <RevealItem>
                  <Eyebrow number={3}>What you get</Eyebrow>
                </RevealItem>
                <RevealItem as="h2" id="features-heading" variants={clipReveal} className="display mt-4 pb-1 text-display-sm">
                  Three tools, <em className="display-italic text-primary">one</em> notebook.
                </RevealItem>
              </div>

              <FeatureCard feature={FEATURES[0]} index={0} className="md:col-span-7 md:mt-6">
                <div className="pointer-events-none absolute bottom-4 right-6 hidden sm:block">
                  <PaperStack3D size={110} />
                </div>
              </FeatureCard>
              <FeatureCard feature={FEATURES[1]} index={1} tone="raised" className="md:col-span-5 md:mt-20">
                <div className="relative mt-6 flex flex-wrap items-center gap-2 rounded-control border border-border bg-surface-sunk px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <Quote className="size-3.5 text-primary" aria-hidden="true" />
                  <span className="text-foreground">document.pdf</span>
                  <span>·</span>
                  <span>page</span>
                  <span>·</span>
                  <span>passage</span>
                </div>
              </FeatureCard>
              <FeatureCard feature={FEATURES[2]} index={2} tone="ink" className="md:col-span-8 md:col-start-3">
                <div className="pointer-events-none absolute bottom-2 right-6 hidden opacity-90 sm:block">
                  <OrbitRings size={130} active={false} />
                </div>
              </FeatureCard>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-shell px-4 pb-20 sm:px-6 sm:pb-28">
          <Reveal className="relative">
            <CropMarks />
            <div className="relative overflow-hidden rounded-hero border-2 border-border-strong bg-ink px-6 py-12 text-bone shadow-hs-lg dark:bg-surface-raised dark:text-foreground sm:px-12 sm:py-16">
              <BigNumeral value={4} inverse className="absolute -bottom-10 right-4" />
              <div className="relative grid gap-8 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-8">
                  <Eyebrow number={4} inverse>
                    Get started
                  </Eyebrow>
                  <h2 className="display mt-4 text-[2.5rem] sm:text-display">
                    Bring the textbook. Leave with the{" "}
                    <span className="relative inline-block">
                      <em className="display-italic text-citron dark:text-primary">receipts.</em>
                      <Squiggle width="100%" height={12} className="absolute -bottom-2 left-0" />
                    </span>
                  </h2>
                  <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-bone/75 dark:text-muted-foreground">
                    Every answer points back to the page it came from. Your documents stay private
                    to your account.
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-[420px]:flex-row lg:col-span-4 lg:justify-end">
                  <Button size="lg" asChild>
                    <Link to="/login">
                      Get started
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
              <Sticker tone="citron" rotate={8} className="absolute right-6 top-6 hidden sm:inline-flex">
                no cap
              </Sticker>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t-2 border-border-strong">
        <div className="mx-auto flex max-w-shell flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Retrieval-augmented study assistant. Your documents stay private to your account.
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            StudyMind — ask, read, check the page
          </p>
        </div>
      </footer>
    </div>
  );
}
