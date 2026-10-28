import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import { BigNumeral, CropMarks, Cube3D, GridPaper, Squiggle, Sticker } from "@/components/art";
import { Button } from "@/components/ui/button";
import { pageEnter, riseIn, useReducedMotionSafe } from "@/lib/motion";
import { useAuth } from "@/features/auth/AuthContext";

export default function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const home = isAuthenticated ? "/overview" : "/";
  const m = useReducedMotionSafe();

  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-canvas px-4 py-12 text-foreground sm:px-6">
      <GridPaper cell={28} />
      <BigNumeral outline size="poster" className="absolute -right-6 bottom-0">
        404
      </BigNumeral>

      <motion.div
        variants={m.variants(pageEnter)}
        initial={m.initial}
        animate="show"
        className="relative mx-auto grid w-full max-w-shell grid-cols-1 items-center gap-10 md:grid-cols-12"
      >
        <motion.div variants={m.variants(riseIn)} className="flex justify-center md:col-span-4 md:col-start-2">
          <div className="relative flex size-56 items-center justify-center sm:size-64">
            <CropMarks size={16} offset={0} />
            <div className={m.reduced ? "" : "animate-float"}>
              <Cube3D size={120} speed={3.2} />
            </div>
            <Sticker tone="cherry" rotate={-9} className="absolute left-2 top-4">
              Error 404
            </Sticker>
            <Sticker tone="citron" rotate={6} className="absolute bottom-6 right-0">
              plot: lost
            </Sticker>
          </div>
        </motion.div>

        <div className="min-w-0 md:col-span-6 md:col-start-7">
          <motion.p variants={m.variants(riseIn)} className="eyebrow">
            <span className="text-primary">404 /</span> Page not found
          </motion.p>
          <motion.h1 variants={m.variants(riseIn)} className="display mt-4 text-[3.25rem] sm:text-display-lg">
            Lost the{" "}
            <span className="relative inline-block">
              <em className="display-italic text-primary">plot.</em>
              <Squiggle color="citron" width="100%" height={12} className="absolute -bottom-1 left-0" />
            </span>
          </motion.h1>
          <motion.p variants={m.variants(riseIn)} className="mt-6 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
            This page does not exist. Nothing is served at{" "}
            <code className="break-all rounded-sm border border-border bg-surface-sunk px-1.5 py-0.5 font-mono text-[13px] text-foreground">
              {location.pathname}
            </code>
            . It may have been renamed, or the link may be incomplete.
          </motion.p>
          <motion.div variants={m.variants(riseIn)} className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
            <Button size="lg" asChild>
              <Link to={home}>
                <ArrowLeft aria-hidden="true" />
                {isAuthenticated ? "Back to Overview" : "Back to home"}
              </Link>
            </Button>
            {isAuthenticated && (
              <Button size="lg" variant="outline" asChild>
                <Link to="/library">Go to Library</Link>
              </Button>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
