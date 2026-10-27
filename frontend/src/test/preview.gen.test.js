import fs from "node:fs";
import path from "node:path";
import { describe, it, vi } from "vitest";

import { buildRadialFlow } from "@/features/mind-maps/MindMapViewer";
import { roughConnector, roughRect, roughArrowhead } from "@/features/mind-maps/sketch";

const enabled = process.env.GEN_PREVIEW === "1";

const node = (title, description, bullets, children = []) => ({
  title,
  description,
  bullet_points: bullets,
  children,
});

const TREE = node(
  "Flow Control",
  "How a program chooses what to run next. Branching and looping are the two core tools.",
  ["branching", "looping"],
  [
    node("Conditional statements", "Choose a path based on whether a test is true.", ["if", "else if"], [
      node("if / else", "Runs one block when the condition holds, another when it does not.", ["binary choice"]),
      node("switch", "Matches one value against several cases.", ["many branches", "fallthrough"]),
    ]),
    node("Loops", "Repeat a block until a condition stops holding.", ["for", "while"], [
      node("for loop", "Best when the number of repetitions is known up front.", ["counter", "range"]),
      node("while loop", "Repeats as long as the condition stays true.", ["unknown count"]),
      node("do-while", "Runs the body once before testing the condition.", ["at least once"]),
    ]),
    node("Jump statements", "Change the normal order of execution inside a loop.", ["break", "continue"], [
      node("break", "Leaves the loop immediately.", ["exit early"]),
      node("continue", "Skips to the next iteration.", ["skip one"]),
    ]),
    node("Boolean operators", "Combine conditions into a single test.", ["AND", "OR", "NOT"], [
      node("AND", "True only when both sides are true.", ["both"]),
      node("OR", "True when either side is true.", ["either"]),
      node("NOT", "Inverts a condition.", ["invert"]),
    ]),
    node("Truthiness", "Values that behave as true or false outside a comparison.", ["falsy", "truthy"], [
      node("Falsy values", "Empty string, zero, null and undefined all read as false.", ["0", "null"]),
    ]),
  ]
);

const LINES = [
  "#b06000", "#0f7f93", "#7c4dd8", "#1f7a4a", "#1a68d8", "#c23b7a", "#9a7c00",
];
const FILLS = [
  "#3a2a12", "#0e2a2f", "#231a3a", "#12291d", "#13223d", "#2f1522", "#2b2410",
];
const ROOT_LINE = "#8f8bff";
const ROOT_FILL = "#1e1d3a";

const escape = (text) =>
  String(text).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);

function wrap(text, cols) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > cols) {
      if (current) lines.push(current.trim());
      current = word;
    } else current += ` ${word}`;
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

describe.skipIf(!enabled)("preview", () => {
  it("writes an SVG of the sample map", () => {
    const { nodes, edges } = buildRadialFlow(TREE, new Set(), vi.fn(), {
      sketch: true,
      focusBranch: null,
    });

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const xs = nodes.flatMap((n) => [n.position.x, n.position.x + n.data.width]);
    const ys = nodes.flatMap((n) => [n.position.y, n.position.y + n.data.height]);
    const pad = 70;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const width = Math.max(...xs) - minX + pad;
    const height = Math.max(...ys) - minY + pad;

    const parts = [];

    for (const edge of edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      const sx =
        target.data.side === "left"
          ? source.position.x
          : source.position.x + source.data.width;
      const sy = source.position.y + source.data.height / 2;
      const tx =
        target.data.side === "left"
          ? target.position.x + target.data.width
          : target.position.x;
      const ty = target.position.y + target.data.height / 2;

      const color = LINES[target.data.branch % LINES.length];
      const [a, b] = roughConnector(sx, sy, tx, ty, edge.id, {
        wobble: target.data.depth <= 1 ? 2 : 1.4,
      });
      const stroke = target.data.depth <= 1 ? 2.4 : 1.8;
      parts.push(
        `<path d="${a}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" opacity="0.95"/>`,
        `<path d="${b}" fill="none" stroke="${color}" stroke-width="${stroke * 0.6}" stroke-linecap="round" opacity="0.45"/>`,
        `<path d="${roughArrowhead(tx, ty, Math.atan2(ty - sy, (tx - sx) * 0.35), edge.id)}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"/>`
      );
    }

    for (const n of nodes) {
      const { width: w, height: h, branch, depth, label, description, bulletPoints } = n.data;
      const line = branch === null ? ROOT_LINE : LINES[branch % LINES.length];
      const fill = branch === null ? ROOT_FILL : FILLS[branch % FILLS.length];
      const [outline, ghost] = roughRect(w, h, depth === 0 ? 18 : 12, n.id);

      parts.push(`<g transform="translate(${n.position.x} ${n.position.y})">`);
      parts.push(`<path d="${outline}" fill="${fill}"/>`);
      parts.push(`<path d="${outline}" fill="none" stroke="${line}" stroke-width="${depth === 0 ? 2.6 : 2}" stroke-linecap="round"/>`);
      parts.push(`<path d="${ghost}" fill="none" stroke="${line}" stroke-width="1.2" opacity="0.5" stroke-linecap="round"/>`);

      const titleSize = depth === 0 ? 19 : depth === 1 ? 16 : 14;
      let cursor = 16 + titleSize;
      for (const lineText of wrap(label, Math.floor(w / (titleSize * 0.52)))) {
        parts.push(
          `<text x="16" y="${cursor}" font-family="Kalam, Comic Sans MS, cursive" font-size="${titleSize}" font-weight="700" fill="${line}">${escape(lineText)}</text>`
        );
        cursor += titleSize + 4;
      }
      if (description) {
        cursor += 4;
        for (const lineText of wrap(description, Math.floor((w - 28) / 6.4))) {
          parts.push(
            `<text x="16" y="${cursor}" font-family="Kalam, Comic Sans MS, cursive" font-size="13" fill="#d7dbe6">${escape(lineText)}</text>`
          );
          cursor += 17;
        }
      }
      let chipX = 16;
      let chipY = h - 14;
      for (const bullet of bulletPoints ?? []) {
        const chipWidth = bullet.length * 7 + 14;
        if (chipX + chipWidth > w - 12) {
          chipX = 16;
          chipY -= 22;
        }
        parts.push(
          `<rect x="${chipX}" y="${chipY - 13}" width="${chipWidth}" height="18" rx="4" fill="${line}" opacity="0.16"/>`,
          `<text x="${chipX + 7}" y="${chipY}" font-family="Kalam, Comic Sans MS, cursive" font-size="12" fill="${line}">${escape(bullet)}</text>`
        );
        chipX += chipWidth + 6;
      }
      parts.push("</g>");
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" width="${Math.round(width)}" height="${Math.round(height)}"><rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#0f1115"/>${parts.join("")}</svg>`;

    const html = `<!doctype html><meta charset="utf-8"><title>Mind map preview</title>
<link href="https://fonts.googleapis.com/css2?family=Kalam:wght@300;400;700&display=swap" rel="stylesheet">
<style>body{margin:0;background:#0f1115;display:grid;place-items:center;min-height:100vh}
svg{max-width:100%;height:auto}
p{position:fixed;top:10px;left:14px;color:#848d9f;font:13px system-ui}</style>
<p>Static preview — generated from the real layout + sketch code</p>${svg}`;

    const outDir = path.resolve(process.cwd(), "preview");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "mindmap-preview.svg"), svg, "utf8");
    fs.writeFileSync(path.join(outDir, "mindmap-preview.html"), html, "utf8");
    // eslint-disable-next-line no-console
    console.log(`\nPreview written to ${path.join(outDir, "mindmap-preview.html")}`);
  });
});
