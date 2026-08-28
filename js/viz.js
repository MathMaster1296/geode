// SVG rendering for subdigons. Pure string builders so the same code runs in
// the site, the bundled single-file build, and the new-tab extension.

// Vertices sit on a circle with the root edge (0, n-1) centered at the bottom.
export function vertexPositions(n, r = 44, cx = 50, cy = 50) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const theta = -Math.PI / 2 + ((i + 0.5) * 2 * Math.PI) / n;
    pts.push([cx + r * Math.cos(theta), cy - r * Math.sin(theta)]);
  }
  return pts;
}

// faces: list of vertex-index lists (a dissection from subdigons.js).
// Returns an <svg> string. Colors come from CSS classes face-3 .. face-8.
export function renderSubdigon(faces, n, { size = 120, showVertices = true, rootEdge = true, highlightCentral = false } = {}) {
  const pts = vertexPositions(n);
  const p = i => `${pts[i][0].toFixed(2)},${pts[i][1].toFixed(2)}`;
  let s = `<svg viewBox="0 0 100 100" width="${size}" height="${size}" class="subdigon" role="img" aria-label="subdigon with ${faces.length} faces">`;

  const faceList = faces.length ? faces : [[...Array(n).keys()]];
  for (const face of faceList) {
    const sides = Math.min(face.length, 8);
    const isCentral = highlightCentral && face.includes(0) && face.includes(n - 1);
    s += `<polygon class="face face-${faces.length ? sides : 'none'}${isCentral ? ' central' : ''}" points="${face.map(p).join(' ')}"/>`;
  }
  // boundary
  const hull = [...Array(n).keys()];
  s += `<polygon class="outline" points="${hull.map(p).join(' ')}"/>`;
  // diagonals: face edges that are not boundary edges
  const isBoundary = (a, b) => Math.abs(a - b) === 1 || Math.abs(a - b) === n - 1;
  const drawn = new Set();
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i], b = face[(i + 1) % face.length];
      const key = Math.min(a, b) + '-' + Math.max(a, b);
      if (!isBoundary(a, b) && !drawn.has(key)) {
        drawn.add(key);
        s += `<line class="diagonal" x1="${pts[a][0].toFixed(2)}" y1="${pts[a][1].toFixed(2)}" x2="${pts[b][0].toFixed(2)}" y2="${pts[b][1].toFixed(2)}"/>`;
      }
    }
  }
  if (rootEdge && n >= 2) {
    s += `<line class="root-edge" x1="${pts[0][0].toFixed(2)}" y1="${pts[0][1].toFixed(2)}" x2="${pts[n - 1][0].toFixed(2)}" y2="${pts[n - 1][1].toFixed(2)}"/>`;
  }
  if (showVertices) {
    for (const [x, y] of pts) s += `<circle class="vertex" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.2"/>`;
  }
  return s + '</svg>';
}

// Human-readable term for a type vector, e.g. {2:2, 3:1} → "2 triangles + 1 quadrilateral".
const FACE_NAMES = { 2: 'triangle', 3: 'quadrilateral', 4: 'pentagon', 5: 'hexagon', 6: 'heptagon', 7: 'octagon' };
export function describeType(m) {
  const parts = Object.entries(m)
    .filter(([, c]) => c)
    .sort((a, b) => a[0] - b[0])
    .map(([k, c]) => `${c} ${FACE_NAMES[k] || `${Number(k) + 1}-gon`}${c > 1 ? 's' : ''}`);
  return parts.length ? parts.join(' + ') : 'nothing (the empty subdivision)';
}

// Monomial for a type vector as HTML, e.g. t₂²t₃.
export function termHTML(m) {
  let s = '';
  for (const [k, c] of Object.entries(m).sort((a, b) => a[0] - b[0])) {
    if (!c) continue;
    s += `<i>t</i><sub>${k}</sub>` + (c > 1 ? `<sup>${c}</sup>` : '');
  }
  return s || '1';
}
