// Core combinatorics for subdigons (subdivisions of a convex polygon by
// non-crossing diagonals) and the hyper-Catalan numbers that count them.
//
// Conventions follow Wildberger–Rubine: a type vector m assigns to each
// index k >= 2 the number m_k of (k+1)-gon faces, so m_2 counts triangles,
// m_3 counts quadrilaterals, and so on. A subdigon of type m lives in a
// polygon with n(m) = 2 + Σ (k-1)·m_k vertices.

export function factorial(n) {
  let r = 1n;
  for (let i = 2n; i <= BigInt(n); i++) r *= i;
  return r;
}

// m is a plain object {2: m2, 3: m3, ...} (missing keys = 0).
export function hyperCatalan(m) {
  let top = 0, bottom = 1, denom = 1n;
  for (const [k, c] of Object.entries(m)) {
    if (!c) continue;
    top += Number(k) * c;
    bottom += (Number(k) - 1) * c;
    denom *= factorial(c);
  }
  return factorial(top) / (factorial(bottom) * denom);
}

export function vertexCount(m) {
  let n = 2;
  for (const [k, c] of Object.entries(m)) n += (Number(k) - 1) * (c || 0);
  return n;
}

export function faceCount(m) {
  let f = 0;
  for (const c of Object.values(m)) f += c || 0;
  return f;
}

// All dissections of the convex n-gon on vertices 0..n-1.
// Each dissection is a list of faces; each face is a list of vertex indices.
// The empty dissection of the 2-gon is [] (no faces).
export function enumerateDissections(n) {
  function subsets(lo, hi) {
    // non-empty increasing subsets of {lo..hi}
    const out = [];
    const pool = [];
    for (let v = lo; v <= hi; v++) pool.push(v);
    const total = 1 << pool.length;
    for (let mask = 1; mask < total; mask++) {
      const s = [];
      for (let i = 0; i < pool.length; i++) if (mask & (1 << i)) s.push(pool[i]);
      out.push(s);
    }
    return out;
  }
  function rec(lo, hi) {
    if (hi - lo < 2) return [[]];
    const out = [];
    for (const S of subsets(lo + 1, hi - 1)) {
      const face = [lo, ...S, hi];
      let parts = [[]];
      for (let i = 0; i + 1 < face.length; i++) {
        const sub = rec(face[i], face[i + 1]);
        const next = [];
        for (const p of parts) for (const q of sub) next.push([...p, ...q]);
        parts = next;
      }
      for (const p of parts) out.push([face, ...p]);
    }
    return out;
  }
  return rec(0, n - 1);
}

export function typeOf(dissection) {
  const m = {};
  for (const face of dissection) {
    const k = face.length - 1; // (k+1)-gon contributes to m_k
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

export function typeKey(m) {
  return Object.entries(m)
    .filter(([, c]) => c)
    .sort((a, b) => a[0] - b[0])
    .map(([k, c]) => `${k}:${c}`)
    .join(',');
}

// All subdigons of a given type, by filtering the dissections of its polygon.
export function subdigonsOfType(m) {
  const key = typeKey(m);
  if (key === '') return [[]];
  return enumerateDissections(vertexCount(m)).filter(d => typeKey(typeOf(d)) === key);
}

// Central face of a subdigon: the face containing the roof edge (0, n-1).
// Theorem 5 of Rubine–Mukewar: the number of type-m subdigons whose central
// face is an (r+1)-gon is r · m_r · C_m / (E_m − 1), with E_m = 1 + Σ k·m_k.
export function centralFace(dissection, n) {
  return dissection.find(f => f.includes(0) && f.includes(n - 1)) || null;
}

export function edgeCount(m) {
  let e = 1;
  for (const [k, c] of Object.entries(m)) e += Number(k) * (c || 0);
  return e;
}

export function centralCount(m, r) {
  const mr = m[r] || 0;
  if (!mr) return 0n;
  return (BigInt(r) * BigInt(mr) * hyperCatalan(m)) / BigInt(edgeCount(m) - 1);
}

// Bi-Tri slice of the Geode array G, defined by S − 1 = (t2 + t3 + …)·G,
// i.e. C[m2,m3] = G[m2−1,m3] + G[m2,m3−1] for (m2,m3) ≠ (0,0). Solving for
// the first summand: G[a][b] = C[a+1,b] − G[a+1][b−1], so column b needs
// deeper rows of column b−1; compute rows+cols rows internally.
export function geodeBiTri(rows, cols) {
  const R = rows + cols;
  const G = Array.from({ length: R }, () => Array(cols).fill(0n));
  for (let b = 0; b < cols; b++) {
    for (let a = 0; a + 1 < R || b === 0; a++) {
      if (a >= R) break;
      const C = hyperCatalan({ 2: a + 1, 3: b });
      const diag = b > 0 && a + 1 < R ? G[a + 1][b - 1] : 0n;
      G[a][b] = C - diag;
    }
  }
  return G.slice(0, rows);
}

// All type vectors over face-size indices ks (e.g. [2,3,5]) whose polygon has
// at most maxVertices vertices, in increasing vertex order.
export function typeVectors(ks, maxVertices) {
  const out = [];
  function rec(i, m, n) {
    if (i === ks.length) {
      out.push({ ...m });
      return;
    }
    const k = ks[i];
    for (let c = 0; n + (k - 1) * c <= maxVertices; c++) {
      if (c > 0) m[k] = c;
      rec(i + 1, m, n + (k - 1) * c);
      delete m[k];
    }
  }
  rec(0, {}, 2);
  out.sort((a, b) => vertexCount(a) - vertexCount(b) || faceCount(a) - faceCount(b));
  return out;
}
