import { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileImage,
  FileJson,
  FileText,
  Maximize2,
  Minimize2,
  PenLine,
  Scan,
} from "lucide-react";

import { GridPaper } from "@/components/art";
import { Button } from "@/components/ui/button";
import { ErrorState, Eyebrow } from "@/components/ui/primitives";
import { ThinkingStage } from "@/components/wait";
import { springPop } from "@/lib/motion";
import { cn } from "@/lib/utils";
import EmptyCanvasArt from "./EmptyCanvasArt";
import SketchyEdge from "./SketchyEdge";
import { roughRect } from "./sketch";
import "./mindmap.css";

const NODE_WIDTHS = [300, 264, 238, 216];
const H_GAP = 130;
const V_GAP = 34;

const widthFor = (depth) => NODE_WIDTHS[Math.min(depth, NODE_WIDTHS.length - 1)];

const TITLE_TYPE = [
  { size: 22, line: 25, ratio: 0.55 },
  { size: 17, line: 21, ratio: 0.55 },
  { size: 13.5, line: 18, ratio: 0.53 },
];

function heightFor(node, depth) {
  const width = widthFor(depth);
  const inner = width - 32;
  const type = TITLE_TYPE[Math.min(depth, TITLE_TYPE.length - 1)];
  const hasChildren = (node.children ?? []).length > 0;
  const titleCols = Math.max(
    8,
    Math.floor((inner - (hasChildren ? 22 : 0)) / (type.size * type.ratio))
  );
  const titleLines = Math.ceil(((node.title?.length ?? 0) * 1.08) / titleCols) || 1;

  const bodySize = depth === 0 ? 13 : depth === 1 ? 12.5 : 12;
  const bodyLine = depth === 0 ? 18 : 17;
  const bodyCols = Math.max(12, Math.floor(inner / (bodySize * 0.5)));
  const bodyLines = node.description ? Math.ceil((node.description.length * 1.08) / bodyCols) : 0;

  let bulletRows = 0;
  let used = inner;
  for (const point of node.bullet_points ?? []) {
    const chip = Math.min(inner, String(point).length * 6.7 + 14);
    if (used + 4 + chip > inner) {
      bulletRows += 1;
      used = chip;
    } else {
      used += 4 + chip;
    }
  }

  const eyebrow = depth <= 1 ? 22 : 0;

  return Math.round(
    26 +
      eyebrow +
      titleLines * type.line +
      (bodyLines ? 6 + bodyLines * bodyLine : 0) +
      (bulletRows ? 10 + bulletRows * 22 - 4 : 0)
  );
}

const BRANCH_COUNT = 7;
const branchVar = (index) => (index === null ? "--branch-root-line" : `--branch-${index}-line`);
const branchLine = (index) => `hsl(var(${branchVar(index)}))`;

const SHAPES = {
  root: "rounded-card border-2 border-black bg-primary shadow-hs-lg",
  branch: "rounded-card border-2 border-border-strong bg-surface-raised shadow-hs-md",
  leaf: "rounded-control border border-foreground/25 bg-surface",
};

const SKETCH_FILL = {
  root: "hsl(var(--primary))",
  branch: "hsl(var(--surface-raised))",
  leaf: "hsl(var(--surface))",
};

const CHIPS = {
  root: "border-primary-foreground/40 text-primary-foreground",
  branch: "border-border bg-surface-sunk text-foreground/80",
  leaf: "border-border bg-surface-sunk/70 text-muted-foreground",
};

function SketchShape({ tier, width, height, id }) {
  const outlines = useMemo(
    () => roughRect(width, height, tier === "leaf" ? 9 : 14, id, tier === "leaf" ? 1.1 : 1.6),
    [tier, width, height, id]
  );
  const ink = "hsl(var(--border-strong))";
  const shadow = tier === "root" ? 6 : tier === "branch" ? 3 : 0;

  return (
    <svg
      className="pointer-events-none absolute inset-0 overflow-visible"
      width={width}
      height={height}
      aria-hidden="true"
    >
      {shadow > 0 && (
        <path d={outlines[0]} transform={`translate(${shadow} ${shadow})`} fill="#000" />
      )}
      <path d={outlines[0]} fill={SKETCH_FILL[tier]} stroke="none" />
      {tier === "leaf" ? (
        <path
          d={outlines[0]}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeOpacity={0.35}
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <>
          <path
            d={outlines[0]}
            fill="none"
            stroke={ink}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={outlines[1]}
            fill="none"
            stroke={ink}
            strokeWidth={1.1}
            strokeOpacity={0.45}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}

const MindMapNode = memo(function MindMapNode({ id, data }) {
  const {
    label,
    description,
    bulletPoints = [],
    depth,
    width,
    height,
    branch,
    side,
    collapsed,
    childCount,
    sketch,
    dimmed,
    onToggle,
    reveal = null,
  } = data;

  const reduced = useReducedMotion();
  const tier = depth === 0 ? "root" : depth === 1 ? "branch" : "leaf";
  const hasChildren = childCount > 0;
  const animateIn = reveal !== null && !reduced;
  const Chevron = collapsed ? (side === "left" ? ChevronLeft : ChevronRight) : ChevronDown;
  const branchNumber = depth === 1 ? Number(id.split("-")[1]) + 1 : null;

  return (
    <div
      style={{ width, height }}
      className={cn(
        "group relative rounded-card transition-opacity duration-200",
        hasChildren && "cursor-pointer",
        dimmed && "opacity-25"
      )}
      onClick={hasChildren ? onToggle : undefined}
      role={hasChildren ? "button" : undefined}
      tabIndex={hasChildren ? 0 : undefined}
      aria-expanded={hasChildren ? !collapsed : undefined}
      onKeyDown={(event) => {
        if (hasChildren && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <Handle
        type="target"
        position={side === "left" ? Position.Right : Position.Left}
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          border: "none",
          minWidth: 0,
          minHeight: 0,
        }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={side === "left" ? Position.Left : Position.Right}
        style={{
          opacity: 0,
          width: 1,
          height: 1,
          border: "none",
          minWidth: 0,
          minHeight: 0,
        }}
        isConnectable={false}
      />

      <motion.div
        className="absolute inset-0"
        initial={animateIn ? { opacity: 0, scale: 0.55, y: 10 } : false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={
          animateIn
            ? {
                ...springPop,
                delay: reveal,
                opacity: { duration: 0.18, delay: reveal },
              }
            : { duration: 0 }
        }
      >
        {sketch ? (
          <SketchShape tier={tier} width={width} height={height} id={id} />
        ) : (
          <div
            className={cn(
              "absolute inset-0 transition-transform duration-150",
              SHAPES[tier],
              hasChildren &&
                tier !== "leaf" &&
                "group-hover:-translate-x-px group-hover:-translate-y-px"
            )}
          />
        )}

        <div className="relative flex h-full flex-col px-4 py-[13px]">
          {tier !== "leaf" && (
            <div
              className={cn(
                "mb-1.5 flex h-4 items-center gap-1.5 font-mono text-[10px] font-semibold uppercase leading-none tracking-[0.1em]",
                tier === "root" ? "text-primary-foreground/80" : "text-muted-foreground"
              )}
            >
              {tier === "root" ? (
                <span aria-hidden="true">◎</span>
              ) : (
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[3px] border-[1.5px] border-black"
                  style={{ background: branchLine(branch) }}
                />
              )}
              <span>
                {tier === "root" ? "Core idea" : `Branch ${String(branchNumber).padStart(2, "0")}`}
              </span>
              {hasChildren && (
                <span className="ml-auto tabular">
                  {childCount} {childCount === 1 ? "idea" : "ideas"}
                </span>
              )}
            </div>
          )}

          <div className="flex items-start gap-1.5">
            <h3
              className={cn(
                "min-w-0 flex-1",
                tier === "root" &&
                  "font-display text-[22px] font-semibold leading-[25px] tracking-[-0.015em] text-primary-foreground",
                tier === "branch" &&
                  "font-display text-[17px] font-semibold leading-[21px] tracking-[-0.01em] text-foreground",
                tier === "leaf" && "text-[13.5px] font-semibold leading-[18px] text-foreground"
              )}
            >
              {label}
            </h3>
            {hasChildren && (
              <span
                className={cn(
                  "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-colors",
                  tier === "root"
                    ? "border-primary-foreground/60 text-primary-foreground"
                    : "border-border-strong text-foreground group-hover:bg-citron group-hover:text-citron-foreground"
                )}
                aria-hidden="true"
              >
                <Chevron className="size-3" strokeWidth={2.5} />
              </span>
            )}
          </div>

          {description && (
            <p
              className={cn(
                "mt-1.5",
                tier === "root" && "text-[13px] leading-[18px] text-primary-foreground/85",
                tier === "branch" && "text-[12.5px] leading-[17px] text-foreground/75",
                tier === "leaf" && "text-[12px] leading-[17px] text-muted-foreground"
              )}
            >
              {description}
            </p>
          )}

          {bulletPoints.length > 0 && (
            <ul className="mt-auto flex flex-wrap gap-1 pt-2.5">
              {bulletPoints.map((point) => (
                <li
                  key={point}
                  className={cn(
                    "max-w-full truncate whitespace-nowrap rounded-[4px] border px-1.5 font-mono text-[11px] leading-4",
                    CHIPS[tier]
                  )}
                >
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>

        {hasChildren && collapsed && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1/2 flex h-6 -translate-y-1/2 items-center rounded-full border-2 border-black bg-citron px-1.5 font-mono text-[10px] font-semibold text-citron-foreground shadow-hs-sm",
              side === "left" ? "-left-4" : "-right-4"
            )}
          >
            +{childCount}
          </span>
        )}
      </motion.div>
    </div>
  );
});

const nodeTypes = { mindMapNode: MindMapNode };
const edgeTypes = { sketchy: SketchyEdge };

export function buildRadialFlow(tree, collapsed, toggle, { sketch, focusBranch }) {
  const nodes = [];
  const edges = [];
  if (!tree?.title) return { nodes, edges };

  const isCollapsed = (id) => collapsed.has(id);

  function measure(node, id, depth) {
    const own = heightFor(node, depth);
    const children = isCollapsed(id) ? [] : node.children ?? [];
    if (!children.length) return { own, total: own, children: [] };

    const kids = children.map((child, index) =>
      measure(child, `${id}-${index}`, depth + 1)
    );
    const stacked =
      kids.reduce((sum, kid) => sum + kid.total, 0) + V_GAP * (kids.length - 1);
    return { own, total: Math.max(own, stacked), children: kids };
  }

  const rootMeasure = measure(tree, "root", 0);
  const rootChildren = isCollapsed("root") ? [] : tree.children ?? [];

  const half = Math.ceil(rootChildren.length / 2);
  const sides = rootChildren.map((_, index) =>
    index < half ? "right" : "left"
  );

  function place(node, id, depth, side, branch, xOuter, yTop, band, parentId, info) {
    const width = widthFor(depth);
    const height = heightFor(node, depth);
    const children = isCollapsed(id) ? [] : node.children ?? [];
    const x = side === "left" ? xOuter - width : xOuter;
    const y = yTop + band / 2 - height / 2;

    nodes.push({
      id,
      type: "mindMapNode",
      position: { x, y },
      draggable: false,
      selectable: false,
      data: {
        label: node.title,
        description: node.description ?? "",
        bulletPoints: node.bullet_points ?? [],
        depth,
        width,
        height,
        branch,
        side,
        sketch,
        collapsed: isCollapsed(id),
        childCount: (node.children ?? []).length,
        dimmed: focusBranch !== null && branch !== null && branch !== focusBranch,
        onToggle: () => toggle(id),
      },
    });

    if (parentId) {
      edges.push({
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: "sketchy",
        data: {
          color: branchLine(branch),
          depth,
          sketch,
          dimmed: focusBranch !== null && branch !== null && branch !== focusBranch,
        },
      });
    }

    if (!children.length) return;

    const childOuter = side === "left" ? x - H_GAP : x + width + H_GAP;
    let cursor = yTop + band / 2 - info.total / 2;

    children.forEach((child, index) => {
      const childInfo = info.children[index];
      const childBand = childInfo?.total ?? heightFor(child, depth + 1);
      place(
        child,
        `${id}-${index}`,
        depth + 1,
        side,
        branch,
        childOuter,
        cursor,
        childBand,
        id,
        childInfo
      );
      cursor += childBand + V_GAP;
    });
  }

  const rootWidth = widthFor(0);
  const rootHeight = heightFor(tree, 0);
  nodes.push({
    id: "root",
    type: "mindMapNode",
    position: { x: -rootWidth / 2, y: -rootHeight / 2 },
    draggable: false,
    selectable: false,
    data: {
      label: tree.title,
      description: tree.description ?? "",
      bulletPoints: tree.bullet_points ?? [],
      depth: 0,
      width: rootWidth,
      height: rootHeight,
      branch: null,
      side: "right",
      sketch,
      collapsed: isCollapsed("root"),
      childCount: (tree.children ?? []).length,
      dimmed: false,
      onToggle: () => toggle("root"),
    },
  });

  ["right", "left"].forEach((side) => {
    const indices = sides
      .map((value, index) => (value === side ? index : -1))
      .filter((index) => index >= 0);
    if (!indices.length) return;

    const bands = indices.map(
      (index) => rootMeasure.children[index]?.total ?? heightFor(rootChildren[index], 1)
    );
    const totalHeight =
      bands.reduce((sum, value) => sum + value, 0) + V_GAP * (bands.length - 1);

    let cursor = -totalHeight / 2;
    indices.forEach((index, position) => {
      const outer =
        side === "left" ? -rootWidth / 2 - H_GAP : rootWidth / 2 + H_GAP;
      place(
        rootChildren[index],
        `root-${index}`,
        1,
        side,
        index % BRANCH_COUNT,
        outer,
        cursor,
        bands[position],
        "root",
        rootMeasure.children[index]
      );
      cursor += bands[position] + V_GAP;
    });
  });

  return { nodes, edges };
}

function countNodes(node) {
  if (!node?.title) return 0;
  return 1 + (node.children ?? []).reduce((sum, child) => sum + countNodes(child), 0);
}

function withReveal(nodes, edges) {
  const perDepth = new Map();
  const delays = new Map();
  const revealedNodes = nodes.map((node) => {
    const depth = node.data.depth;
    const position = perDepth.get(depth) ?? 0;
    perDepth.set(depth, position + 1);
    const delay = Math.min(0.08 + depth * 0.3 + position * 0.045, 2);
    delays.set(node.id, delay);
    return { ...node, data: { ...node.data, reveal: delay } };
  });
  const revealedEdges = edges.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      reveal: Math.max(0, (delays.get(edge.target) ?? 0) - 0.22),
    },
  }));
  return { nodes: revealedNodes, edges: revealedEdges };
}

const toolButton = "bg-surface-raised max-sm:size-11";

function ViewerToolbar({ sketch, onToggleSketch, onExport, fullscreen, onToggleFullscreen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { fitView } = useReactFlow();

  return (
    <Panel position="top-right" className="flex items-center gap-1.5">
      <Button
        variant={sketch ? "default" : "outline"}
        size="icon-sm"
        onClick={onToggleSketch}
        aria-pressed={sketch}
        aria-label={sketch ? "Switch to clean lines" : "Switch to hand-drawn"}
        title={sketch ? "Hand-drawn (on)" : "Hand-drawn (off)"}
        className={cn("max-sm:size-11", !sketch && "bg-surface-raised")}
      >
        <PenLine />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        aria-label="Fit to view"
        title="Fit to view"
        className={toolButton}
      >
        <Scan />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        className={toolButton}
      >
        {fullscreen ? <Minimize2 /> : <Maximize2 />}
      </Button>

      <div className="relative">
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Export"
          aria-expanded={menuOpen}
          className="max-sm:size-11"
        >
          <Download />
        </Button>
        <AnimatePresence>
          {menuOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full z-50 mt-2 w-48 origin-top-right overflow-hidden rounded-control border-2 border-border-strong bg-surface-raised p-1 shadow-hs"
            >
              <li className="eyebrow px-2.5 pb-1 pt-1.5">Export as</li>
              {[
                { icon: FileImage, label: "PNG image", format: "png" },
                { icon: FileText, label: "PDF", format: "pdf" },
                { icon: FileJson, label: "JSON data", format: "json" },
              ].map((item) => (
                <li key={item.format}>
                  <button
                    type="button"
                    onClick={() => {
                      onExport(item.format);
                      setMenuOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-[7px] px-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-citron hover:text-citron-foreground"
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{item.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] opacity-60">
                      .{item.format}
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </Panel>
  );
}

function Frame({ className, children, frameRef }) {
  return (
    <div
      ref={frameRef}
      className={cn(
        "mm-frame relative h-full overflow-hidden rounded-hero border-2 border-border-strong bg-canvas shadow-hs",
        className
      )}
    >
      {children}
    </div>
  );
}

function solidBackground(element) {
  let node = element;
  while (node) {
    const color = getComputedStyle(node).backgroundColor;
    if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) return color;
    node = node.parentElement;
  }
  return document.documentElement.classList.contains("dark") ? "#1C1714" : "#F2EBDD";
}

const SKETCH_KEY = "sm_mindmap_sketch";
const REVEAL_WINDOW = 2600;

export default function MindMapViewer({
  data,
  loading,
  loadingSince,
  loadingDetail,
  fullscreen,
  onToggleFullscreen,
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [focusBranch, setFocusBranch] = useState(null);
  const [sketch, setSketch] = useState(() => {
    try {
      return localStorage.getItem(SKETCH_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const [exportError, setExportError] = useState(null);
  const deferred = useDeferredValue(data);
  const frameRef = useRef(null);
  const revealRef = useRef({ id: null, at: 0 });

  if (deferred?.id && revealRef.current.id !== deferred.id) {
    revealRef.current = { id: deferred.id, at: Date.now() };
  }
  const revealing = Boolean(deferred?.id) && Date.now() - revealRef.current.at < REVEAL_WINDOW;

  const toggleSketch = useCallback(() => {
    setSketch((value) => {
      try {
        localStorage.setItem(SKETCH_KEY, value ? "0" : "1");
      } catch {}
      return !value;
    });
  }, []);

  const toggle = useCallback((id) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!deferred?.mindmap) return { nodes: [], edges: [] };
    const flow = buildRadialFlow(deferred.mindmap, collapsed, toggle, {
      sketch,
      focusBranch,
    });
    const sized = flow.nodes.map((node) => ({
      ...node,
      width: node.data.width,
      height: node.data.height,
    }));
    return revealing ? withReveal(sized, flow.edges) : { nodes: sized, edges: flow.edges };
  }, [deferred, collapsed, toggle, sketch, focusBranch, revealing]);

  const branches = useMemo(
    () =>
      (deferred?.mindmap?.children ?? []).map((child, index) => ({
        title: child.title,
        index: index % BRANCH_COUNT,
        number: index + 1,
      })),
    [deferred]
  );

  const focusedTitle =
    focusBranch === null ? null : branches.find((branch) => branch.index === focusBranch)?.title;

  const nodeTotal = useMemo(() => countNodes(deferred?.mindmap), [deferred]);

  const exportMapUnsafe = useCallback(
    async (format) => {
      if (!deferred) return;
      const filename = (deferred.title || "mindmap").replace(/[^\w -]/g, "").slice(0, 60);

      if (format === "json") {
        const blob = new Blob([JSON.stringify(deferred.mindmap, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${filename}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }

      const element =
        frameRef.current?.querySelector(".react-flow__viewport") ??
        document.querySelector(".react-flow__viewport");
      if (!element) return;
      const surface = frameRef.current?.querySelector(".react-flow") ?? frameRef.current;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(element, {
        backgroundColor: solidBackground(surface ?? document.body),
        pixelRatio: 2,
      });

      if (format === "png") {
        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = `${filename}.png`;
        anchor.click();
        return;
      }

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("landscape", "mm", "a4");
      const properties = pdf.getImageProperties(dataUrl);
      const width = pdf.internal.pageSize.getWidth() - 20;
      const height = (properties.height * width) / properties.width;
      pdf.addImage(
        dataUrl,
        "PNG",
        10,
        10,
        width,
        Math.min(height, pdf.internal.pageSize.getHeight() - 20)
      );
      pdf.save(`${filename}.pdf`);
    },
    [deferred]
  );

  const exportMap = useCallback(
    async (format) => {
      setExportError(null);
      try {
        await exportMapUnsafe(format);
      } catch {
        setExportError({
          format,
          message: "The export failed. Please try again.",
        });
      }
    },
    [exportMapUnsafe]
  );

  if (loading) {
    return (
      <Frame className="overflow-y-auto scrollbar-thin">
        <GridPaper cell={24} />
        <div className="relative flex min-h-full flex-col items-center justify-center gap-4 p-3 sm:p-8">
          <div className="flex w-full max-w-2xl items-baseline justify-between gap-3">
            <Eyebrow number={1}>Map in progress</Eyebrow>
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground sm:inline">
              Stays here while it builds
            </span>
          </div>
          <ThinkingStage
            mode="mindmap"
            stageLabel="Generating mind map"
            detail={loadingDetail || undefined}
            startedAt={loadingSince ?? undefined}
            className="w-full max-w-2xl"
          />
        </div>
      </Frame>
    );
  }

  if (!deferred) {
    return (
      <Frame className="overflow-y-auto scrollbar-thin">
        <GridPaper cell={24} />
        <div className="relative flex min-h-full flex-col items-center justify-center px-5 py-10 text-center sm:px-10">
          <EmptyCanvasArt />
          <Eyebrow className="mt-8 justify-center">No mind map open</Eyebrow>
          <h2 className="display mt-3 text-[2.5rem] text-foreground sm:text-[3.25rem]">
            Nothing <span className="display-italic text-primary">mapped</span> yet
          </h2>
          <p className="mt-3 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
            Choose a document and a scope in the setup panel, then generate a map. Anything you have
            made before lives in the saved maps archive.
          </p>
          <ol className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground">
            {["Pick sources", "Set scope", "Generate"].map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                {index > 0 && (
                  <span aria-hidden="true" className="hidden h-px w-5 bg-foreground/40 sm:block" />
                )}
                <span className="rounded-full border-2 border-border-strong bg-surface-raised px-2.5 py-1 shadow-hs-sm">
                  <span className="text-primary">{String(index + 1).padStart(2, "0")}</span> {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Frame>
    );
  }

  return (
    <Frame frameRef={frameRef}>
      <ReactFlow
        key={`${deferred.id}-${sketch}`}
        className="mm-flow"
        style={{ background: "hsl(var(--canvas))" }}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        minZoom={0.1}
        maxZoom={2.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background
          id="minor"
          variant={BackgroundVariant.Lines}
          color="hsl(var(--foreground) / 0.05)"
          gap={24}
          lineWidth={1}
        />
        <Background
          id="major"
          variant={BackgroundVariant.Lines}
          color="hsl(var(--foreground) / 0.09)"
          gap={120}
          lineWidth={1}
        />
        <Controls
          position="bottom-right"
          orientation="horizontal"
          showInteractive={false}
          showFitView={false}
        />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          className="mm-minimap"
          style={{ width: 168, height: 116 }}
          bgColor="hsl(var(--surface-raised))"
          maskColor="hsl(var(--foreground) / 0.08)"
          maskStrokeColor="hsl(var(--primary))"
          maskStrokeWidth={2}
          nodeColor={(node) =>
            node.data?.depth === 0 ? "hsl(var(--primary))" : branchLine(node.data?.branch ?? null)
          }
          nodeBorderRadius={4}
          nodeStrokeWidth={0}
        />

        <Panel position="top-left" className="hidden max-w-[min(42%,22rem)] sm:block">
          <div className="rounded-control border-2 border-border-strong bg-surface-raised px-3.5 py-2.5 shadow-hs-sm">
            <p className="eyebrow">
              <span className="text-primary">Fig. 01</span> / Mind map
            </p>
            <p className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">
              {deferred.title}
            </p>
            <p className="mt-1 truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
              {[deferred.source, `${nodeTotal} nodes`].filter(Boolean).join(" · ")}
            </p>
          </div>
        </Panel>

        {branches.length > 1 && (
          <Panel position="bottom-left" className="max-w-[calc(100%-9.5rem)]">
            <div className="rounded-control border-2 border-border-strong bg-surface-raised p-1.5 shadow-hs-sm">
              <p className="eyebrow flex min-w-0 max-w-[15rem] items-center gap-1.5 px-1 pb-1 pt-0.5">
                <span className="shrink-0">Branches</span>
                {focusedTitle && (
                  <>
                    <span aria-hidden="true">/</span>
                    <span className="truncate text-foreground">{focusedTitle}</span>
                  </>
                )}
              </p>
              <div className="flex max-w-[11rem] gap-1 overflow-x-auto pb-0.5 sm:max-w-none sm:flex-wrap sm:overflow-visible sm:pb-0">
                {branches.map((branch) => (
                  <button
                    key={`${branch.number}-${branch.title}`}
                    type="button"
                    aria-label={`Highlight branch ${branch.number}: ${branch.title}`}
                    title={branch.title}
                    aria-pressed={focusBranch === branch.index}
                    onMouseEnter={() => setFocusBranch(branch.index)}
                    onMouseLeave={() => setFocusBranch(null)}
                    onFocus={() => setFocusBranch(branch.index)}
                    onBlur={() => setFocusBranch(null)}
                    onClick={() =>
                      setFocusBranch((current) => (current === branch.index ? null : branch.index))
                    }
                    className={cn(
                      "flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] border-[1.5px] px-1.5 transition-[opacity,background-color,border-color] [@media(pointer:coarse)]:h-11",
                      focusBranch === branch.index
                        ? "border-border-strong bg-citron text-citron-foreground"
                        : "border-border bg-surface hover:border-border-strong",
                      focusBranch !== null && focusBranch !== branch.index && "opacity-40"
                    )}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-[3px] border-[1.5px] border-black"
                      style={{ background: branchLine(branch.index) }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[11px] font-semibold tabular">
                      {String(branch.number).padStart(2, "0")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {exportError && (
          <Panel
            position="top-left"
            className="!mt-16 max-w-[min(calc(100vw-3.5rem),20rem)] sm:!mt-28"
          >
            <ErrorState
              title="Export failed"
              message={exportError.message}
              onRetry={() => exportMap(exportError.format)}
            />
          </Panel>
        )}

        <ViewerToolbar
          sketch={sketch}
          onToggleSketch={toggleSketch}
          onExport={exportMap}
          fullscreen={fullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      </ReactFlow>
    </Frame>
  );
}
