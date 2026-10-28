import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, LogOut, Trash2 } from "lucide-react";

import { useTheme, ThemeToggle } from "@/components/ThemeToggle";
import { BigNumeral, Sticker } from "@/components/art";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import { Eyebrow, PageHeader } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthContext";
import { useDocuments } from "@/features/library/DocumentsContext";
import { pageEnter, riseIn, useReducedMotionSafe } from "@/lib/motion";
import { cn } from "@/lib/utils";

const THEME_NOTES = {
  light: "Bone paper, ink type. Pinned to light.",
  dark: "Warm soot, bone type. Pinned to dark.",
  system: "Follows your device setting and updates when it changes.",
};

const SWATCHES = [
  { name: "Ink", className: "bg-ink" },
  { name: "Bone", className: "bg-bone" },
  { name: "Oxblood", className: "bg-primary" },
  { name: "Citron", className: "bg-citron" },
];

function Section({ number, title, description, children, className, id }) {
  const m = useReducedMotionSafe();
  return (
    <motion.section
      variants={m.variants(riseIn)}
      aria-labelledby={id}
      className={cn("relative grid gap-6 border-t border-border py-10 lg:grid-cols-12 lg:gap-8", className)}
    >
      <div className="relative lg:col-span-4">
        <BigNumeral value={number} size="md" className="absolute -top-6 right-0" />
        <Eyebrow number={number} className="relative mb-2">
          Section
        </Eyebrow>
        <h3
          id={id}
          className="relative font-display text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground"
        >
          {title}
        </h3>
        {description && (
          <p className="relative mt-2 max-w-[36ch] text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="relative min-w-0 lg:col-span-8">{children}</div>
    </motion.section>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const { documents, ready, resetAll } = useDocuments();
  const [resetOpen, setResetOpen] = useState(false);
  const m = useReducedMotionSafe();
  const initial = (user?.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-thin">
      <motion.div
        variants={m.variants(pageEnter)}
        initial={m.initial}
        animate="show"
        className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12"
      >
        <motion.div variants={m.variants(riseIn)} className="mb-10">
          <PageHeader
            as="h2"
            number={6}
            eyebrow="Settings"
            title="The fine"
            emphasis="print."
            description="Your account, how the app looks, and what happens to your data."
          />
        </motion.div>

        <Section number={1} id="settings-account" title="Account" description="The address you sign in with.">
          <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:flex-row sm:items-center">
            <span
              aria-hidden="true"
              className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-black bg-citron font-display text-2xl font-semibold text-citron-foreground shadow-hs-sm"
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-foreground">{user?.email}</p>
              <p className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                <span className="size-2 rounded-full bg-success" aria-hidden="true" />
                Signed in
              </p>
            </div>
            <Button variant="outline" onClick={logout} className="self-start sm:self-auto">
              <LogOut aria-hidden="true" />
              Log out
            </Button>
          </div>
        </Section>

        <Section
          number={2}
          id="settings-appearance"
          title="Appearance"
          description="Pick a paper. System follows your device setting and updates when it changes."
        >
          <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="eyebrow mb-2">Theme</p>
                <ThemeToggle showLabels size="default" />
              </div>
              <Sticker tone={theme === "dark" ? "citron" : "ink"} rotate={3} className="self-start sm:self-center">
                Now: {theme}
              </Sticker>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{THEME_NOTES[theme] ?? THEME_NOTES.system}</p>
            <div className="mt-6 grid grid-cols-4 gap-2 border-t border-border pt-5" aria-hidden="true">
              {SWATCHES.map((swatch) => (
                <div key={swatch.name} className="min-w-0">
                  <span
                    className={cn(
                      "block h-12 rounded-control border-2 border-black shadow-hs-sm",
                      swatch.className
                    )}
                  />
                  <span className="mt-2 block truncate font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                    {swatch.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          number={3}
          id="settings-data"
          title="Your data"
          description="Documents and indexes are stored privately against your account."
        >
          <dl className="grid grid-cols-2 border-y-2 border-border-strong">
            <div className="border-r border-border py-4 pr-4">
              <dt className="eyebrow">Documents</dt>
              <dd className="display tabular mt-2 text-5xl text-foreground">
                {String(documents.length).padStart(2, "0")}
              </dd>
            </div>
            <div className="py-4 pl-4">
              <dt className="eyebrow">Ready to study</dt>
              <dd className="display tabular mt-2 text-5xl text-foreground">
                {String(ready.length).padStart(2, "0")}
              </dd>
            </div>
          </dl>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            Private to your account · indexed per user
          </p>
        </Section>

        <Section
          number={4}
          id="settings-danger"
          title="Danger zone"
          description="Permanent actions. There is no undo."
        >
          <div className="relative rounded-card border-2 border-primary bg-surface-raised p-5 shadow-hs-lg sm:p-6">
            <Sticker tone="cherry" rotate={-4} className="absolute -top-3 right-5">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              Careful
            </Sticker>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="tabular font-display text-xl font-semibold text-foreground">
                  {documents.length} {documents.length === 1 ? "document" : "documents"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Removing them also deletes your search index.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setResetOpen(true)}
                disabled={documents.length === 0}
                className="self-start sm:self-auto"
              >
                <Trash2 aria-hidden="true" />
                Remove all documents
              </Button>
            </div>
          </div>
        </Section>
      </motion.div>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Remove all documents?"
        description={`All ${documents.length} documents and your search index will be deleted. Saved chats are kept, but their citations will no longer resolve. This cannot be undone.`}
        confirmLabel="Remove everything"
        onConfirm={async () => {
          await resetAll();
          setResetOpen(false);
        }}
      />
    </div>
  );
}
