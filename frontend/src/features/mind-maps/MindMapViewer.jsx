import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------ node style */

const DEPTH_STYLES = [
  {
    shell: "rounded-lg border-primary/30 bg-primary text-primary-foreground",
    title: "text-sm font-semibold",
    description: "text-xs leading-relaxed opacity-90",
    bullet: "bg-white/15",
    width: "w-[280px]",
  },
  {
    shell: "rounded-lg border-border bg-surface text-foreground",
    title: "text-sm font-semibold",
    description: "text-xs leading-relaxed text-muted-foreground",
    bullet: "bg-surface-sunk text-muted-foreground",
    width: "w-[250px]",
  },
  {
    shell: "rounded-md border-border bg-surface text-foreground",
    title: "text-[13px] font-medium",
    description: "text-xs leading-relaxed text-muted-foreground",
    bullet: "bg-surface-sunk text-muted-foreground",
    width: "w-[230px]",
  },
  {
    shell: "rounded-md border-border bg-surface-sunk text-foreground",
    title: "text-xs font-medium",
    description: "text-xs leading-relaxed text-muted-foreground",
    bullet: "bg-surface text-muted-foreground",
    width: "w-[210px]",
  },
];

const NODE_WIDTHS = [280, 250, 230, 210];
const NODE_HEIGHTS = [168, 164, 156, 144];
const H_GAP = 150;
const V_GAP = 72;

/* ------------------------------------------------------------------ node */

const MindMapNode = memo(function MindMapNode({ data }) {
  const style = DEPTH_STYLES[Math.min(data.depth, DEPTH_STYLES.length - 1)];
  const hasChildren = data.childCount > 0;

  return (
    <div
      className={cn(
        "border p-3 shadow-sm transition-shadow hover:shadow-md",
        style.shell,
        style.width,
        data.isSelected && "ring-2 ring-ring"
      )}
      onClick={data.onToggle}
      role={hasChildren ? "button" : undefined}
      tabIndex={hasChildren ? 0 : undefined}
      onKeyDown={(event) => {
        if (hasChildren && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          data.onToggle();
        }
      }}
      aria-expanded={hasChildren ? !data.collapsed : undefined}
    >
      <div className="flex items-start gap-2">
        {hasChildren && (
          <span className="mt-0.5 shrink-0 opacity-70">
            {data.collapsed ? (
              <ChevronRight className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            )}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className={style.title}>{data.label}</h3>
          {data.description && <p className={cn("mt-1.5", style.description)}>{data.description}</p>}
        </div>
      </div>

      {data.bulletPoints?.length > 0 && (
        <ul className="mt-2.5 flex flex-wrap gap-1">
          {data.bulletPoints.map((point) => (
            <li
              key={point}
              className={cn("rounded-sm px-1.5 py-0.5 text-xs", style.bullet)}
            >
              {point}
            </li>
          ))}
        </ul>
      )}

      {hasChildren && data.collapsed && (
        <p className="mt-2 text-xs opacity-70">
          {data.childCount} hidden {data.childCount === 1 ? "branch" : "branches"}
        </p>
      )}
    </div>
  );
});

const nodeTypes = { mindMapNode: MindMapNode };

/* ---------------------------------------------------------------- layout */

function getWidth(depth) {
  return NODE_WIDTHS[Math.min(depth, NODE_WIDTHS.length - 1)];
}
function getHeight(depth) {
  return NODE_HEIGHTS[Math.min(depth, NODE_HEIGHTS.length - 1)];
}

function convertTreeToFlow(tree, collapsed, toggle, selectedId) {
  const nodes = [];
  const edges = [];
  if (!tree?.title) return { nodes, edges };

  function subtreeSize(node, id, depth) {
    const children = collapsed.has(id) ? [] : node.children ?? [];
    const width = getWidth(depth);
    const height = getHeight(depth);
    if (!children.length) return { width, height };

    const childSizes = children.map((child, index) =>
      subtreeSize(child, `${id}-${index}`, depth + 1)
    );
    const total = childSizes.reduce(
      (sum, size, index) => sum + size.height + (index > 0 ? V_GAP : 0),
      0
    );
    return {
      width: width + H_GAP + Math.max(...childSizes.map((size) => size.width)),
      height: Math.max(height, total),
      childSizes,
    };
  }

  function place(node, id, depth, x, y, available, parentId = null) {
    const isCollapsed = collapsed.has(id);
    const children = node.children ?? [];
    const height = getHeight(depth);

    nodes.push({
      id,
      type: "mindMapNode",
      position: { x, y: y + available / 2 - height / 2 },
      data: {
        label: node.title,
        description: node.description ?? "",
        bulletPoints: node.bullet_points ?? [],
        depth,
        collapsed: isCollapsed,
        childCount: children.length,
        isSelected: selectedId === id,
        onToggle: () => toggle(id),
      },
      sourcePosition: "right",
      targetPosition: "left",
      draggable: false,
      selectable: false,
    });

    if (parentId) {
      const color =
        depth === 1
          ? "hsl(var(--primary))"
          : depth === 2
            ? "hsl(var(--border-strong))"
            : "hsl(var(--border))";
      edges.push({
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: "smoothstep",
        style: { stroke: color, strokeWidth: depth === 1 ? 2 : 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
      });
    }

    if (!children.length || isCollapsed) return;

    const info = subtreeSize(node, id, depth);
    let cursor = y;
    children.forEach((child, index) => {
      const childId = `${id}-${index}`;
      const childHeight = info.childSizes?.[index]?.height ?? getHeight(depth + 1);
      place(child, childId, depth + 1, x + getWidth(depth) + H_GAP, cursor, childHeight, id);
      cursor += childHeight + V_GAP;
    });
  }

  place(tree, "root", 0, 0, 0, subtreeSize(tree, "root", 0).height);
  return { nodes, edges };
}

/* ------------------------------------------------------------------ view */

function ViewerToolbar({ title, onExport, fullscreen, onToggleFullscreen }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { fitView } = useReactFlow();

  return (
    <Panel position="top-right" className="flex items-center gap-1.5">
      <span className="max-w-[220px] truncate rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground">
        {title}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => fitView({ padding: 0.25, duration: 300 })}
        aria-label="Fit to view"
        title="Fit to view"
        className="bg-surface"
      >
        <Minimize2 />
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

export default function MindMapViewer({ data, loading, fullscreen, onToggleFullscreen }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState("root");
  const deferred = useDeferredValue(data);

  const toggle = useCallback((id) => {
    setSelectedId(id);
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (id !== "root") next.add(id);
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(() => {
    if (!deferred?.mindmap) return { nodes: [], edges: [] };
    return convertTreeToFlow(deferred.mindmap, collapsed, toggle, selectedId);
  }, [deferred, collapsed, toggle, selectedId]);

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
      // Loaded on demand so neither library reaches the entry chunk.
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
      pdf.addImage(dataUrl, "PNG", 10, 10, width, Math.min(height, pdf.internal.pageSize.getHeight() - 20));
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
    <div className="h-full overflow-hidden rounded-lg border border-border bg-surface">
      <ReactFlow
        key={deferred.id}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.28 }}
        minZoom={0.15}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        onlyRenderVisibleElements
        proOptions={{ hideAttribution: true }}
      >
        <Background color="hsl(var(--border))" gap={22} size={1} />
        <Controls showInteractive={false} className="!border-border !bg-surface !shadow-sm" />
        <MiniMap
          pannable
          zoomable
          className="!border-border !bg-surface"
          maskColor="hsl(var(--canvas) / 0.7)"
          nodeColor={(node) =>
            node.data?.depth === 0 ? "hsl(var(--primary))" : "hsl(var(--border-strong))"
          }
        />
        <ViewerToolbar
          title={deferred.title}
          onExport={exportMap}
          fullscreen={fullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
      </ReactFlow>
    </div>
  );
}
