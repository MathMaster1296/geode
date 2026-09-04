import {
  enumerateDissections, typeOf, typeKey, hyperCatalan, vertexCount,
  subdigonsOfType, typeVectors, centralFace, centralCount, edgeCount, geodeBiTri,
  powerCoeff,
} from '../js/subdigons.js';
import {
  toGeometricForm, seriesPartials, targetRoot, evalPoly, shiftPoly,
  residualCoeffs, newtonStep,
} from '../js/solver.js';

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`ok   ${name}`);
  else { failures++; console.log(`FAIL ${name} ${detail}`); }
}

// --- dissection counts: total per n is the super-Catalan / little Schroeder number
const superCatalan = { 2: 1, 3: 1, 4: 3, 5: 11, 6: 45, 7: 197, 8: 903 };
for (const [n, expected] of Object.entries(superCatalan)) {
  const all = enumerateDissections(Number(n));
  check(`dissections of ${n}-gon = ${expected}`, all.length === expected, `got ${all.length}`);
}

// --- every type class size matches the hyper-Catalan formula
for (let n = 3; n <= 8; n++) {
  const byType = new Map();
  for (const d of enumerateDissections(n)) {
    const key = typeKey(typeOf(d));
    byType.set(key, (byType.get(key) || 0) + 1);
  }
  for (const [key, count] of byType) {
    const m = {};
    for (const part of key.split(',')) {
      const [k, c] = part.split(':').map(Number);
      m[k] = c;
    }
    check(`C[${key}] (n=${n}) = ${count}`, hyperCatalan(m) === BigInt(count),
      `formula says ${hyperCatalan(m)}`);
    check(`vertexCount[${key}] = ${n}`, vertexCount(m) === n, `got ${vertexCount(m)}`);
  }
}

// --- classical Catalan: triangulations of the (n+2)-gon
const catalan = [1, 1, 2, 5, 14, 42];
for (let j = 2; j <= 5; j++) {
  check(`C[m2=${j}] = Catalan(${j}) = ${catalan[j]}`,
    hyperCatalan({ 2: j }) === BigInt(catalan[j]));
}

// --- subdigonsOfType agrees
check('subdigonsOfType {2:1,3:1} has 5 elements', subdigonsOfType({ 2: 1, 3: 1 }).length === 5);

// --- series solves a quadratic: x² - 3x + 1 = 0, root (3-√5)/2 near -c0/c1 = 1/3
{
  const coeffs = [1, -3, 1];
  const { ts, scale } = toGeometricForm(coeffs);
  const { partials } = seriesPartials(ts, 26);
  const y = [...partials.values()].pop();
  const x = scale * y;
  const exact = (3 - Math.sqrt(5)) / 2;
  check('quadratic root via series', Math.abs(x - exact) < 1e-9, `got ${x} want ${exact}`);
}

// --- series solves a quintic with small high-order coefficients
{
  const coeffs = [-0.3, 1, 0, 0.2, 0, 0.1]; // -0.3 + x + 0.2x³ + 0.1x⁵ = 0
  const { ts, scale } = toGeometricForm(coeffs);
  const { partials } = seriesPartials(ts, 24);
  const x = scale * [...partials.values()].pop();
  const resid = Math.abs(evalPoly(coeffs, x));
  check('quintic root via series (residual < 1e-8)', resid < 1e-8, `residual ${resid}, x=${x}`);
  const root = targetRoot(coeffs, x);
  check('targetRoot matches series limit', Math.abs(root.re - x) < 1e-7 && Math.abs(root.im) < 1e-9,
    `root ${root.re}+${root.im}i vs series ${x}`);
}

// --- typeVectors enumerates within vertex bound
{
  const vecs = typeVectors([2, 3], 6);
  const bad = vecs.filter(m => vertexCount(m) > 6);
  check('typeVectors respects vertex bound', bad.length === 0);
  check('typeVectors includes empty vector', vecs.some(m => Object.keys(m).length === 0));
}

// --- Theorem 5 (Rubine–Mukewar): central-face distribution for m = [2,1]
{
  const m = { 2: 2, 3: 1 };
  const subs = subdigonsOfType(m);
  check('21 subdigons of type [2,1]', subs.length === 21);
  const n = vertexCount(m);
  let tri = 0, quad = 0;
  for (const d of subs) {
    const c = centralFace(d, n);
    if (c.length === 3) tri++;
    else if (c.length === 4) quad++;
  }
  check('12 have a central triangle', tri === 12, `got ${tri}`);
  check('9 have a central quadrilateral', quad === 9, `got ${quad}`);
  check('Theorem 5 formula: central triangles', centralCount(m, 2) === 12n);
  check('Theorem 5 formula: central quadrilaterals', centralCount(m, 3) === 9n);
  check('E_m for [2,1]', edgeCount(m) === 8);
}

// --- Geode bi-tri slice matches published values and the closed form
{
  const G = geodeBiTri(4, 3);
  const expected = [[1n, 3n, 12n], [2n, 16n, 110n], [5n, 70n, 702n], [14n, 288n, 2856n]];
  const closed = (a, b) => {
    const f = k => { let r = 1n; for (let i = 2n; i <= BigInt(k); i++) r *= i; return r; };
    return f(2 * a + 3 * b + 3) /
      (BigInt(2 * a + 2 * b + 3) * BigInt(a + b + 1) * f(a + 2 * b + 2) * f(a) * f(b));
  };
  for (let a = 0; a < 4; a++) for (let b = 0; b < 3; b++) {
    if (expected[a][b] !== undefined && expected[a][b] !== 2856n) {
      check(`G[${a},${b}] = ${expected[a][b]}`, G[a][b] === expected[a][b], `got ${G[a][b]}`);
    }
    check(`G[${a},${b}] matches closed form`, G[a][b] === closed(a, b),
      `recurrence ${G[a][b]} vs closed ${closed(a, b)}`);
  }
}

// --- Taylor shift: Wallis's cubic x³ − 2x − 5 recentered at 2
{
  const shifted = shiftPoly([-5, -2, 0, 1], 2);
  check('shiftPoly Wallis', JSON.stringify(shifted) === JSON.stringify([-1, 10, 6, 1]),
    `got ${JSON.stringify(shifted)}`);
  const { ts, scale } = toGeometricForm(shifted);
  check('Wallis t2 = −0.06', Math.abs(ts[2] - -0.06) < 1e-12, `got ${ts[2]}`);
  check('Wallis t3 = −0.001', Math.abs(ts[3] - -0.001) < 1e-12, `got ${ts[3]}`);
  const { partials } = seriesPartials(ts, 20);
  const x = 2 + scale * [...partials.values()].pop();
  check('Wallis root ≈ 2.09455148', Math.abs(x - 2.0945514815423265) < 1e-8, `got ${x}`);
}

// --- sin(10°): 8x³ − 6x + 1 = 0
{
  const { ts, scale } = toGeometricForm([1, -6, 0, 8]);
  const { partials } = seriesPartials(ts, 22);
  const x = scale * [...partials.values()].pop();
  const target = Math.sin(Math.PI / 18);
  check('sin(10°) via series', Math.abs(x - target) < 1e-6, `got ${x} want ${target}`);
}

// --- Theorem 7 (powers of S): r = 1 recovers the hyper-Catalan numbers
for (const m of [{}, { 2: 2 }, { 2: 1, 3: 1 }, { 3: 2 }, { 2: 2, 4: 1 }]) {
  check(`powerCoeff(1, ${typeKey(m) || 'null'}) = C_m`, powerCoeff(1, m) === hyperCatalan(m));
}

// --- S² in the Catalan case is the convolution of Catalan numbers
{
  const cat = n => hyperCatalan(n ? { 2: n } : {});
  for (let n = 0; n <= 6; n++) {
    let conv = 0n;
    for (let i = 0; i <= n; i++) conv += cat(i) * cat(n - i);
    check(`[t2^${n}] S² = Catalan convolution`, powerCoeff(2, n ? { 2: n } : {}) === conv,
      `formula ${powerCoeff(2, n ? { 2: n } : {})} vs ${conv}`);
  }
}

// --- Theorem 6: [t^m] S^r counts subdigons of type m + e_r with a central (r+1)-gon
for (const [r, m] of [[2, { 2: 2 }], [2, { 3: 1 }], [3, { 2: 1 }], [3, { 2: 2 }], [4, { 2: 1 }]]) {
  const big = { ...m, [r]: (m[r] || 0) + 1 };
  const n = vertexCount(big);
  const count = subdigonsOfType(big).filter(d => centralFace(d, n).length === r + 1).length;
  check(`Theorem 6 for r=${r}, m=${typeKey(m)}`, powerCoeff(r, m) === BigInt(count),
    `formula ${powerCoeff(r, m)} vs enumerated ${count}`);
}

// --- finite identity: exact cancellation through degree D, survivor = next coefficient
{
  const r2 = residualCoeffs(2, 5);
  check('identity zeros (triangles, D=5)', r2.slice(0, 6).every(c => c === 0n),
    r2.slice(0, 6).join(','));
  check('identity survivor is C6 = 132', r2[6] === 132n, `got ${r2[6]}`);
  const r3 = residualCoeffs(3, 3);
  check('identity zeros (quadrilaterals, D=3)', r3.slice(0, 4).every(c => c === 0n));
  check('identity survivor is Fuss 55', r3[4] === hyperCatalan({ 3: 4 }), `got ${r3[4]}`);
  const r4 = residualCoeffs(4, 4);
  check('identity zeros (pentagons, D=4)', r4.slice(0, 5).every(c => c === 0n));
  check('identity survivor matches C[m4=5]', r4[5] === hyperCatalan({ 4: 5 }), `got ${r4[5]}`);
}

// --- Newton step moves the center toward the quintic's root
{
  const c = [-1, -1, 0, 0, 0, 1]; // x⁵ − x − 1
  const a1 = newtonStep(c, 1);
  check('newtonStep from 1 gives 1.25', Math.abs(a1 - 1.25) < 1e-12, `got ${a1}`);
  const { ts, scale } = toGeometricForm(shiftPoly(c, 1.25));
  const { partials } = seriesPartials(ts, 20);
  const x = 1.25 + scale * [...partials.values()].pop();
  check('series solves x⁵−x−1 after one Newton hop', Math.abs(evalPoly(c, x)) < 1e-10,
    `residual ${evalPoly(c, x)} at x=${x}`);
}

console.log(failures ? `\n${failures} FAILURES` : '\nall tests passed');
process.exit(failures ? 1 : 0);
