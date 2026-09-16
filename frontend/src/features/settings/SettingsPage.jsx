import { useState } from "react";
import { LogOut, Mail, Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlays";
import { Card, PageHeader } from "@/components/ui/primitives";
import { useAuth } from "@/features/auth/AuthContext";
import { useDocuments } from "@/features/library/DocumentsContext";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

function Section({ title, description, children }) {
  return (
    <Card>
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { documents, resetAll } = useDocuments();
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-2xl space-y-5 p-4 sm:p-6">
        <PageHeader
          title="Settings"
          description="Your account, how the app looks, and what happens to your data."
        />

        <Section title="Account">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-sunk text-muted-foreground">
              <Mail className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Signed in</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut aria-hidden="true" />
              Log out
            </Button>
          </div>
        </Section>

        <Section
          title="Appearance"
          description="System follows your device setting and updates when it changes."
        >
          <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
            {THEMES.map((option) => {
              const active = theme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 transition-colors",
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border text-muted-foreground hover:border-border-strong hover:text-foreground"
                  )}
                >
                  <option.icon className="size-4" aria-hidden="true" />
                  <span className="text-sm">{option.label}</span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section
          title="Your data"
          description="Documents and indexes are stored privately against your account."
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="tabular text-sm text-foreground">
                {documents.length} {documents.length === 1 ? "document" : "documents"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Removing them also deletes your search index.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setResetOpen(true)}
              disabled={documents.length === 0}
            >
              Remove all documents
            </Button>
          </div>
        </Section>
      </div>

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
