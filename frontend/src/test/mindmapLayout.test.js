import { describe, expect, it, vi } from "vitest";

import { buildRadialFlow } from "@/features/mind-maps/MindMapViewer";

const leaf = (title, extra = {}) => ({
  title,
  description: "A short description for this concept.",
  bullet_points: ["one", "two"],
  children: [],
  ...extra,
});

const TREE = {
  title: "Flow Control",
  description: "How a program decides what runs next.",
  bullet_points: ["branching", "looping"],
  children: [
    { ...leaf("Conditionals"), children: [leaf("if / else"), leaf("switch")] },
    { ...leaf("Loops"), children: [leaf("for"), leaf("while"), leaf("do-while")] },
    { ...leaf("Jumps"), children: [leaf("break"), leaf("continue")] },
    { ...leaf("Boolean logic"), children: [leaf("AND"), leaf("OR"), leaf("NOT")] },
    { ...leaf("Truthiness"), children: [leaf("falsy values")] },
  ],
};

const build = (tree = TREE, collapsed = new Set()) =>
  buildRadialFlow(tree, collapsed, vi.fn(), { sketch: true, focusBranch: null });

const rectOf = (node) => ({
  left: node.position.x,
  right: node.position.x + node.data.width,
  top: node.position.y,
  bottom: node.position.y + node.data.height,
});

const overlaps = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

describe("radial layout", () => {
  it("emits every node in the tree", () => {
    const { nodes } = build();
    expect(nodes).toHaveLength(17);
  });

  it("connects every non-root node to exactly one parent", () => {
    const { nodes, edges } = build();
    const targets = edges.map((edge) => edge.target);

    for (const node of nodes) {
      if (node.id === "root") continue;
      const incoming = targets.filter((target) => target === node.id);
      expect(incoming, `${node.id} should have exactly one parent edge`).toHaveLength(1);
    }
  });

  it("leaves no edge pointing at a node that does not exist", () => {
    const { nodes, edges } = build();
    const ids = new Set(nodes.map((node) => node.id));
    for (const edge of edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
  });

  it("fans branches out to both sides of the root", () => {
    const { nodes } = build();
    const branches = nodes.filter((node) => node.data.depth === 1);
    const sides = new Set(branches.map((node) => node.data.side));
    expect(sides).toEqual(new Set(["left", "right"]));
  });

  it("places left-side nodes left of the root and right-side nodes right", () => {
    const { nodes } = build();
    const root = nodes.find((node) => node.id === "root");
    const rootCentre = root.position.x + root.data.width / 2;

    for (const node of nodes) {
      if (node.id === "root") continue;
      const centre = node.position.x + node.data.width / 2;
      if (node.data.side === "left") expect(centre).toBeLessThan(rootCentre);
      else expect(centre).toBeGreaterThan(rootCentre);
    }
  });

  it("gives every descendant its branch colour", () => {
    const { nodes } = build();
    for (const node of nodes) {
      if (node.id === "root") continue;
      const branchIndex = Number(node.id.split("-")[1]);
      expect(node.data.branch).toBe(branchIndex % 7);
    }
  });

  it("colours each edge to match the branch it belongs to", () => {
    const { nodes, edges } = build();
    const byId = new Map(nodes.map((node) => [node.id, node]));
    for (const edge of edges) {
      const target = byId.get(edge.target);
      expect(edge.data.color).toBe(
        `hsl(var(--branch-${target.data.branch}-line))`
      );
    }
  });

  it("never overlaps two boxes", () => {
    const { nodes } = build();
    const rects = nodes.map(rectOf);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        expect(
          overlaps(rects[i], rects[j]),
          `${nodes[i].id} overlaps ${nodes[j].id}`
        ).toBe(false);
      }
    }
  });

  it("sizes a node to its content rather than a fixed height", () => {
    const short = build({ title: "A", children: [] }).nodes[0];
    const long = build({
      title: "A considerably longer heading that has to wrap onto more lines",
      description: "x".repeat(400),
      bullet_points: ["a", "b", "c", "d"],
      children: [],
    }).nodes[0];
    expect(long.data.height).toBeGreaterThan(short.data.height);
  });

  it("drops the subtree of a collapsed node", () => {
    const expanded = build();
    const collapsed = build(TREE, new Set(["root-0"]));
    expect(collapsed.nodes.length).toBe(expanded.nodes.length - 2);
    expect(collapsed.nodes.find((node) => node.id === "root-0").data.collapsed).toBe(true);
    const ids = new Set(collapsed.nodes.map((node) => node.id));
    for (const edge of collapsed.edges) expect(ids.has(edge.target)).toBe(true);
  });

  it("handles a root with no children without throwing", () => {
    const { nodes, edges } = build({ title: "Lonely", children: [] });
    expect(nodes).toHaveLength(1);
    expect(edges).toHaveLength(0);
  });

  it("returns nothing for an empty tree", () => {
    expect(build({}).nodes).toHaveLength(0);
  });
});

describe("focus dimming", () => {
  it("dims every branch except the focused one", () => {
    const { nodes } = buildRadialFlow(TREE, new Set(), vi.fn(), {
      sketch: true,
      focusBranch: 1,
    });
    const branchOne = nodes.filter((node) => node.data.branch === 1);
    const others = nodes.filter(
      (node) => node.data.branch !== 1 && node.id !== "root"
    );

    expect(branchOne.every((node) => node.data.dimmed === false)).toBe(true);
    expect(others.every((node) => node.data.dimmed === true)).toBe(true);
    expect(nodes.find((node) => node.id === "root").data.dimmed).toBe(false);
  });
});
