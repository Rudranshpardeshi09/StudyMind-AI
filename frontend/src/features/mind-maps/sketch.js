/**
 * Hand-drawn geometry helpers.
 *
 * Produces the wobbly, double-stroked look of a whiteboard sketch without
 * pulling in a drawing library. Everything is seeded off a stable string (a
 * node or edge id), so a shape wobbles the same way on every render — an
 * unseeded random would make the whole map shimmer on each state change.
 */

/* ------------------------------------------------------------ randomness */

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Small, fast, deterministic PRNG. */
function mulberry32(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRandom(key) {
  const next = mulberry32(hashSeed(key));
  /** Jitter in [-amount, +amount]. */
  return (amount = 1) => (next() * 2 - 1) * amount;
}

/* ----------------------------------------------------------- rough rect */

/**
 * A rounded rectangle drawn the way a person would: corners slightly off,
 * edges not quite straight, and the pen not landing exactly where it started.
 *
 * Returns two path strings so the caller can overlay them — that doubled
 * stroke is most of what reads as "hand drawn".
 */
export function roughRect(width, height, radius, key, wobble = 1.6) {
  const build = (suffix) => {
    const jitter = seededRandom(`${key}:${suffix}`);
    const r = Math.min(radius, width / 2, height / 2);
    const j = () => jitter(wobble);

    // Start a little past the top-left corner, like an overshooting pen.
    const points = [
      `M ${r + j()} ${j()}`,
      // top edge, with a midpoint so it can bow slightly
      `Q ${width / 2 + j()} ${j() - wobble * 0.6} ${width - r + j()} ${j()}`,
      // top-right corner
      `Q ${width + j()} ${j()} ${width + j()} ${r + j()}`,
      // right edge
      `Q ${width + j() + wobble * 0.5} ${height / 2 + j()} ${width + j()} ${height - r + j()}`,
      // bottom-right corner
      `Q ${width + j()} ${height + j()} ${width - r + j()} ${height + j()}`,
      // bottom edge
      `Q ${width / 2 + j()} ${height + j() + wobble * 0.6} ${r + j()} ${height + j()}`,
      // bottom-left corner
      `Q ${j()} ${height + j()} ${j()} ${height - r + j()}`,
      // left edge
      `Q ${j() - wobble * 0.5} ${height / 2 + j()} ${j()} ${r + j()}`,
      // close back over the start, slightly overshooting
      `Q ${j()} ${j()} ${r + j()} ${j()}`,
    ];
    return points.join(" ");
  };

  return [build("a"), build("b")];
}

/* ----------------------------------------------------------- rough curve */

function catmullRomToBezier(points) {
  if (points.length < 2) return "";
  let path = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return path;
}

function cubicAt(t, p0, p1, p2, p3) {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

/**
 * A connector that leaves the parent horizontally and arrives at the child
 * horizontally, sampled off a cubic and then nudged off-true so it reads as
 * drawn rather than computed.
 */
export function roughConnector(sx, sy, tx, ty, key, { wobble = 1.5, samples = 14 } = {}) {
  const distance = Math.abs(tx - sx);
  // Control points pull outward from each end, which is what gives the
  // connector its swing instead of a flat arc. Direction matters: branches on
  // the left of the root run right-to-left, and without this the curve would
  // double back on itself.
  const direction = Math.sign(tx - sx) || 1;
  const pull = Math.max(40, Math.min(distance * 0.55, 160)) * direction;
  const c1x = sx + pull;
  const c2x = tx - pull;

  const build = (suffix, strength) => {
    const jitter = seededRandom(`${key}:${suffix}`);
    const points = [];
    for (let i = 0; i <= samples; i += 1) {
      const t = i / samples;
      // Ends stay put so the line still visibly meets both boxes.
      const taper = Math.sin(t * Math.PI);
      points.push([
        cubicAt(t, sx, c1x, c2x, tx) + jitter(wobble * strength) * taper,
        cubicAt(t, sy, sy, ty, ty) + jitter(wobble * strength) * taper,
      ]);
    }
    return catmullRomToBezier(points);
  };

  return [build("a", 1), build("b", 1.35)];
}

/** Arrowhead as two short strokes, angled to the incoming direction. */
export function roughArrowhead(tx, ty, angle, key, size = 9) {
  const jitter = seededRandom(`${key}:head`);
  const spread = 0.42;
  const wing = (sign) => {
    const a = angle + Math.PI + sign * spread;
    const x = tx + Math.cos(a) * size + jitter(1);
    const y = ty + Math.sin(a) * size + jitter(1);
    return `M ${tx.toFixed(2)} ${ty.toFixed(2)} L ${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  return [wing(1), wing(-1)].join(" ");
}
