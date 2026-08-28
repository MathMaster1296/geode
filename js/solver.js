// Solving polynomial equations with the hyper-Catalan series.
//
// Given 0 = c0 + c1·x + c2·x² + ... with c1 ≠ 0, the substitution
// x = -(c0/c1)·y turns the equation into the geometric form
//     y = 1 + t2·y² + t3·y³ + ...
// with t_k = (-1)^k · c_k · c0^(k-1) / c1^k. The unique formal power-series
// solution is y = S[t2, t3, ...] = Σ_m C_m · t2^m2 · t3^m3 · ..., summed over
// all type vectors m, where C_m is the hyper-Catalan number. When the t_k are
// small enough the series converges to the root of p that perturbs the linear
// estimate x ≈ -c0/c1.

import { hyperCatalan, vertexCount, faceCount, typeVectors } from './subdigons.js';

export function toGeometricForm(coeffs) {
  const [c0, c1] = coeffs;
  if (!c1) throw new Error('need c1 ≠ 0');
  const ts = {};
  for (let k = 2; k < coeffs.length; k++) {
    if (!coeffs[k]) continue;
    ts[k] = ((k % 2 === 0 ? 1 : -1) * coeffs[k] * Math.pow(c0, k - 1)) / Math.pow(c1, k);
  }
  return { ts, scale: -c0 / c1 };
}

// Partial sums of S[t] grouped by polygon size: partials[n] = Σ over type
// vectors with vertexCount ≤ n. Returns {partials, terms} where terms lists
// every contributing term for display.
export function seriesPartials(ts, maxVertices) {
  const ks = Object.keys(ts).map(Number).sort((a, b) => a - b);
  const vectors = typeVectors(ks, maxVertices);
  const terms = [];
  for (const m of vectors) {
    const C = hyperCatalan(m);
    let value = Number(C);
    for (const [k, c] of Object.entries(m)) value *= Math.pow(ts[k], c);
    terms.push({ m, C, value, n: vertexCount(m), faces: faceCount(m) });
  }
  const partials = new Map();
  let sum = 0;
  for (const t of terms) {
    // terms arrive sorted by vertex count
    sum += t.value;
    partials.set(t.n, sum);
  }
  return { terms, partials };
}

// Coefficients of p(a + y) as a polynomial in y (Taylor shift, via repeated
// synthetic division). This is the "bootstrap" step from Wildberger–Rubine:
// when the t_k are too big for the series to converge, re-center the
// polynomial at the current best estimate and run the series again.
export function shiftPoly(coeffs, a) {
  const q = [...coeffs];
  const out = [];
  for (let i = 0; i < coeffs.length; i++) {
    for (let j = q.length - 2; j >= i; j--) q[j] += a * q[j + 1];
    out.push(q[i]);
  }
  return out;
}

export function evalPoly(coeffs, x) {
  let r = 0;
  for (let k = coeffs.length - 1; k >= 0; k--) r = r * x + coeffs[k];
  return r;
}

// All roots via Durand–Kerner on complex numbers (coeffs low-to-high, real).
export function allRoots(coeffs) {
  const c = [...coeffs];
  while (c.length && c[c.length - 1] === 0) c.pop();
  const d = c.length - 1;
  if (d < 1) return [];
  const lead = c[c.length - 1];
  const a = c.map(v => v / lead);
  let roots = [];
  for (let i = 0; i < d; i++) {
    const ang = (2 * Math.PI * i) / d + 0.4;
    const r = 0.4 + Math.pow(1 + Math.max(...a.slice(0, d).map(Math.abs)), 1 / d);
    roots.push([r * Math.cos(ang), r * Math.sin(ang)]);
  }
  const cmul = (p, q) => [p[0] * q[0] - p[1] * q[1], p[0] * q[1] + p[1] * q[0]];
  const csub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const cdiv = (p, q) => {
    const den = q[0] * q[0] + q[1] * q[1];
    return [(p[0] * q[0] + p[1] * q[1]) / den, (p[1] * q[0] - p[0] * q[1]) / den];
  };
  const peval = z => {
    let r = [0, 0];
    for (let k = d; k >= 0; k--) r = [r[0] * z[0] - r[1] * z[1] + a[k], r[0] * z[1] + r[1] * z[0]];
    return r;
  };
  for (let iter = 0; iter < 200; iter++) {
    let maxStep = 0;
    const next = roots.map((z, i) => {
      let denom = [1, 0];
      for (let j = 0; j < d; j++) if (j !== i) denom = cmul(denom, csub(z, roots[j]));
      const step = cdiv(peval(z), denom);
      maxStep = Math.max(maxStep, Math.hypot(step[0], step[1]));
      return csub(z, step);
    });
    roots = next;
    if (maxStep < 1e-14) break;
  }
  return roots;
}

// The real root the series targets: the actual root of p closest to the
// series estimate (or to the linear estimate if the series is useless).
export function targetRoot(coeffs, seriesX) {
  const roots = allRoots(coeffs);
  const ref = Number.isFinite(seriesX) ? seriesX : -coeffs[0] / coeffs[1];
  let best = null, bestDist = Infinity;
  for (const [re, im] of roots) {
    const dist = Math.hypot(re - ref, im);
    if (dist < bestDist) {
      bestDist = dist;
      best = { re, im };
    }
  }
  return best;
}
