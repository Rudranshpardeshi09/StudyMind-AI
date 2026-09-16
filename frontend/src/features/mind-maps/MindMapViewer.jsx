import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
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
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileImage,
  FileJson,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  Network,
  PenLine,
  Scan,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import SketchyEdge from "./SketchyEdge";
import { roughRect } from "./sketch";

/* ----------------------------------------------------------------- sizing */

const NODE_WIDTHS = [300, 264, 238, 216];
const H_GAP = 130;
const V_GAP = 34;

const widthFor = (depth) => NODE_WIDTHS[Math.min(depth, NODE_WIDTHS.length - 1)];

/**
 * Estimate a node's rendered height from its content.
 *
 * The old viewer used one fixed height per depth, which left short nodes
 * floating in dead space and let long ones overlap their neighbours. Measuring
 * is not an option here because layout runs before paint, so this approximates
 * from character counts — and because the node is then pinned to exactly this
 * height, the hand-drawn border can be generated at a size that always matches.
 */
function heightFor(node, depth) {
  const width = widthFor(depth);
  const titleSize = depth === 0 ? 17 : depth === 1 ? 15 : 14;
  const titleCols = Math.max(10, Math.floor(width / (titleSize * 0.52)));
  const bodyCols = Math.max(12, Math.floor((width - 28) / 6.4));

  const titleLines = Math.ceil((node.title?.length ?? 0) / titleCols) || 1;
  const bodyLines = node.description
    ? Math.ceil(node.description.length / bodyCols)
    : 0;

  const bullets = node.bullet_points ?? [];
  // Chips wrap roughly two per row at these widths.
  const bulletRows = bullets.length ? Math.ceil(bullets.length / 2) : 0;

  return Math.round(
    24 + // padding
      titleLines * (titleSize + 6) +
      (bodyLines ? 6 + bodyLines * 17 : 0) +
      (bulletRows ? 8 + bulletRows * 24 : 0)
  );
}

/* ---------------------------------------------------------------- palette */

const BRANCH_COUNT = 7;
const branchVar = (index) => (index === null ? "--branch-root-line" : `--branch-${index}-line`);
const branchLine = (index) => `hsl(var(${branchVar(index)}))`;
const branchFill = (index) =>
  index === null ? "hsl(var(--branch-root-fill))" : `hsl(var(--branch-${index}-fill))`;
/** Alpha has to sit outside var(), not inside it. */
const branchTint = (index, alpha) => `hsl(var(${branchVar(index)}) / ${alpha})`;

/* ------------------------------------------------------------------- node */

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
  } = data;

  const line = branchLine(branch);
  const fill = branchFill(branch);
  const hasChildren = childCount > 0;

  // Two overlapping wobbly outlines, regenerated only when the box resizes.
  const outlines = useMemo(
    () => (sketch ? roughRect(width, height, depth === 0 ? 18 : 12, id) : null),
    [sketch, width, height, depth, id]
  );

  return (
    <div
      style={{ width, height }}
      className={cn(
        "group relative transition-opacity duration-200",
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
      {/* Handles are what React Flow anchors edges to; they stay invisible. */}
      <Handle
        type="target"
        position={side === "left" ? Position.Right : Position.Left}
        style={{ opacity: 0, width: 1, height: 1, border: "none", minWidth: 0, minHeight: 0 }}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={side === "left" ? Position.Left : Position.Right}
        style={{ opacity: 0, width: 1, height: 1, border: "none", minWidth: 0, minHeight: 0 }}
        isConnectable={false}
      />

      {sketch ? (
        <svg
          className="pointer-events-none absolute inset-0 overflow-visible"
          width={width}
          height={height}
          aria-hidden="true"
        >
          <path d={outlines[0]} fill={fill} stroke="none" />
          <path
            d={outlines[0]}
            fill="none"
            stroke={line}
            strokeWidth={depth === 0 ? 2.6 : 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={outlines[1]}
            fill="none"
            stroke={line}
            strokeWidth={depth === 0 ? 1.6 : 1.2}
            strokeOpacity={0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <div
          className="absolute inset-0 rounded-lg border-2"
          style={{ background: fill, borderColor: line }}
        />
      )}

      <div
        className={cn(
          "relative flex h-full flex-col px-4 py-3",
          sketch && "font-sketch"
        )}
      >
        <div className="flex items-start gap-1.5">
          {hasChildren && (
            <span className="mt-0.5 shrink-0" style={{ color: line }}>
              {collapsed ? (
                <ChevronRight className="size-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-4" aria-hidden="true" />
              )}
            </span>
          )}
          <h3
            className={cn(
              "min-w-0 flex-1 leading-tight",
              depth === 0 ? "text-lg font-bold" : depth === 1 ? "text-base font-bold" : "text-sm font-bold"
            )}
            style={{ color: line }}
          >
            {label}
          </h3>
        </div>

        {description && (
          <p
            className={cn(
              "mt-1.5 leading-snug text-foreground/85",
              sketch ? "text-sm" : "text-xs"
            )}
          >
            {description}
          </p>
        )}

        {bulletPoints.length > 0 && (
          <ul className="mt-auto flex flex-wrap gap-1 pt-2">
            {bulletPoints.map((point) => (
              <li
                key={point}
                className="rounded px-1.5 py-0.5 text-xs leading-tight"
                style={{ background: branchTint(branch, 0.15), color: line }}
              >
                {point}
              </li>
            ))}
          </ul>
        )}

        {hasChildren && collapsed && (
          <p className="mt-auto pt-1.5 text-xs" style={{ color: line, opacity: 0.8 }}>
            +{childCount} more
          </p>
        )}
      </div>
    </div>
  );
});

const nodeTypes = { mindMapNode: MindMapNode };
const edgeTypes = { sketchy: SketchyEdge };

/* ----------------------------------------------------------------- layout */

/**
 * Radial layout: the root sits in the middle and its branches fan out to both
 * sides, the way someone would actually draw a mind map on a whiteboard.
 *
 * The previous layout ran strictly left-to-right, so a wide map turned into a
 * long horizontal ribbon with every branch the same grey — which is why it read
 * as a list of disconnected boxes rather than a structure.
 */
export function buildRadialFlow(tree, collapsed, toggle, { sketch, focusBranch }) {
  const nodes = [];
  const edges = [];
  if (!tree?.title) return { nodes, edges };

  const isCollapsed = (id) => collapsed.has(id);

  // --- measure ---
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

  // --- split branches across the two sides, preserving reading order ---
  const half = Math.ceil(rootChildren.length / 2);
  const sides = rootChildren.map((_, index) =>
    index < half ? "right" : "left"
  );

  // --- place ---
  // `info` is this node's pre-computed measurement. Passing it down keeps the
  // whole layout linear; re-measuring inside place() made it quadratic.
  function place(node, id, depth, side, branch, xOuter, yTop, band, parentId, info) {
    const width = widthFor(depth);
    const height = heightFor(node, depth);
    const children = isCollapsed(id) ? [] : node.children ?? [];
    // Right side grows rightwards from xOuter; left side grows leftwards, so
    // its x is the outer edge minus the box width.
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

  // Root, centred on the origin.
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

  // Stack each side independently, vertically centred on the root.
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

/* ---------------------------------------------------------------- toolbar */

function ViewerToolbar({ title, sketch, onToggleSketch, onExport, fullscreen, onToggleFullscreen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { fitView } = useReactFlow();

  return (
    <Panel position="top-right" className="flex items-center gap-1.5">
      <span className="hidden max-w-[200px] truncate rounded-md border border-border bg-surface/90 px-2.5 py-1.5 text-xs font-medium text-foreground backdrop-blur sm:block">
        {title}
      </span>
      <Button
        variant={sketch ? "default" : "outline"}
        size="icon-sm"
        onClick={onToggleSketch}
        aria-pressed={sketch}
        aria-label={sketch ? "Switch to clean lines" : "Switch to hand-drawn"}
        title={sketch ? "Hand-drawn (on)" : "Hand-drawn (off)"}
        className={sketch ? "" : "bg-surface"}
      >
        <PenLine />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => fitView({ padding: 0.2, duration: 400 })}
        aria-label="Fit to view"
        title="Fit to view"
        className="bg-surface"
      >
        <Scan />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onToggleFullscreen}
        aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
        className="bg-surface"
      >
        {fullscreen ? <Minimize2 /> : <Maximize2 />}
      </Button>

      <div className="relative">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Export"
          aria-expanded={menuOpen}
          className="bg-surface"
        >
          <Download />
        </Button>
        <AnimatePresence>
          {menuOpen && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-md border border-border bg-popover shadow-md"
            >
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
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-surface-sunk"
                  >
                    <item.icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    {item.label}
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

/* ------------------------------------------------------------------- view */

const SKETCH_KEY = "sm_mindmap_sketch";

export default function MindMapViewer({ data, loading, fullscreen, onToggleFullscreen }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [focusBranch, setFocusBranch] = useState(null);
  const [sketch, setSketch] = useState(() => {
    try {
      return localStorage.getItem(SKETCH_KEY) !== "0";
    } catch {
      return true;
    }
  });
  const deferred = useDeferredValue(data);

  const toggleSketch = useCallback(() => {
    setSketch((value) => {
      try {
        localStorage.setItem(SKETCH_KEY, value ? "0" : "1");
      } catch {
        /* per-viewer convenience only */
      }
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
    return buildRadialFlow(deferred.mindmap, collapsed, toggle, { sketch, focusBranch });
  }, [deferred, collapsed, toggle, sketch, focusBranch]);

  const branches = useMemo(
    () => (deferred?.mindmap?.children ?? []).map((child, index) => ({
      title: child.title,
      index: index % BRANCH_COUNT,
    })),
    [deferred]
  );

  const exportMap = useCallback(
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

      const element = document.querySelector(".react-flow__viewport");
      if (!element) return;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(element, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-surface">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">Building your mind map</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reading the document and organising it into branches.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!deferred) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-border bg-surface">
        <EmptyState
          icon={Network}
          title="No mind map open"
          description="Choose a document and a scope on the left, then generate a map."
          className="border-0"
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden rounded-lg border border-border bg-canvas">
      <ReactFlow
        key={`${deferred.id}-${sketch}`}
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
          variant={BackgroundVariant.Dots}
          color="hsl(var(--border-strong))"
          gap={26}
          size={1.4}
        />
        <Controls showInteractive={false} className="!border-border !bg-surface !shadow-sm" />
        <MiniMap
          pannable
          zoomable
          className="!border-border !bg-surface"
          maskColor="hsl(var(--canvas) / 0.75)"
          nodeColor={(node) => branchLine(node.data?.branch ?? null)}
          nodeStrokeWidth={0}
        />

        {/* Branch legend: hovering a branch dims the rest, which is how you
            follow one thread through a dense map. */}
        {branches.length > 1 && (
          <Panel position="bottom-left" className="max-w-[min(calc(100vw-2rem),22rem)]">
            <div className="flex flex-wrap gap-1 rounded-md border border-border bg-surface/90 p-1.5 backdrop-blur">
              {branches.map((branch) => (
                <button
                  key={branch.title}
                  type="button"
                  onMouseEnter={() => setFocusBranch(branch.index)}
                  onMouseLeave={() => setFocusBranch(null)}
                  onFocus={() => setFocusBranch(branch.index)}
                  onBlur={() => setFocusBranch(null)}
                  onClick={() =>
                    setFocusBranch((current) =>
                      current === branch.index ? null : branch.index
                    )
                  }
                  className={cn(
                    "flex max-w-[150px] items-center gap-1.5 rounded px-1.5 py-1 text-xs transition-opacity",
                    focusBranch !== null && focusBranch !== branch.index && "opacity-40"
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: branchLine(branch.index) }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-foreground">{branch.title}</span>
                </button>
              ))}
            </div>
          </Panel>
        )}

        <ViewerToolbar
          title={deferred.title}
          sketch={sketch}
          onToggleSketch={toggleSketch}
          onExport={exportMap}
          fullscreen={fullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      </ReactFlow>
    </div>
  );
}
