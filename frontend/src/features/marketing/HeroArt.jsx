import { Cube3D, CropMarks, GridPaper, OrbitRings, PaperStack3D, Sticker } from "@/components/art";
import { cn } from "@/lib/utils";

export default function HeroArt({ className, caption = "Fig. 1 — Your notes, orbited by their citations." }) {
  return (
    <figure className={cn("relative", className)} aria-hidden="true">
      <div className="relative">
        <CropMarks size={16} offset={10} />
        <div className="relative h-[300px] overflow-hidden rounded-hero border-2 border-border-strong bg-surface-raised shadow-hs-lg sm:h-[380px] lg:h-[440px]">
          <GridPaper cell={22} />
          <span className="absolute left-4 top-3.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Plate 01
          </span>
          <span className="absolute bottom-3.5 right-4 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Not to scale
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <OrbitRings size={300} active={false} className="opacity-90 sm:scale-110 lg:scale-125" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-[62%] -translate-y-[46%]">
            <PaperStack3D size={180} className="sm:scale-110 lg:scale-125" />
          </div>
          <div className="absolute right-[12%] top-[12%]">
            <Cube3D size={64} speed={0.8} className="sm:scale-110 lg:scale-125" />
          </div>
        </div>
        <Sticker tone="cherry" rotate={-7} className="absolute -left-3 top-10 sm:-left-5">
          p.42 ✓
        </Sticker>
        <Sticker tone="citron" rotate={5} className="absolute -right-2 bottom-16 sm:-right-4">
          cited
        </Sticker>
        <Sticker tone="paper" rotate={-3} shape="tag" className="absolute bottom-6 left-6">
          your notes only
        </Sticker>
      </div>
      {caption && (
        <figcaption className="mt-5 hairline-t pt-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
