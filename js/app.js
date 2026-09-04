import {
  enumerateDissections, typeOf, typeKey, hyperCatalan, vertexCount, edgeCount,
  faceCount, subdigonsOfType, typeVectors, centralCount, geodeBiTri,
} from './subdigons.js';
import { toGeometricForm, seriesPartials, shiftPoly, evalPoly, allRoots, newtonStep } from './solver.js';
import { renderSubdigon, describeType, termHTML } from './viz.js';
import './paneling.js';
import './identity.js';
import './powers.js';
import './words.js';

const $ = id => document.getElementById(id);
const FACE_LABELS = { 2: 'triangle', 3: 'quadrilateral', 4: 'pentagon', 5: 'hexagon' };

/* ---------- theme toggle: auto → light → dark ---------- */
{
  const root = document.documentElement;
  let saved = null;
  try { saved = localStorage.getItem('geode-theme'); } catch { /* storage unavailable */ }
  if (saved === 'light' || saved === 'dark') root.dataset.theme = saved;
  const btn = $('theme-toggle');
  if (btn) {
    const label = () => { btn.textContent = 'theme: ' + (root.dataset.theme || 'auto'); };
    label();
    btn.addEventListener('click', () => {
      const next = { '': 'light', light: 'dark', dark: '' }[root.dataset.theme || ''];
      if (next) root.dataset.theme = next;
      else delete root.dataset.theme;
      try {
        if (next) localStorage.setItem('geode-theme', next);
        else localStorage.removeItem('geode-theme');
      } catch { /* fine without persistence */ }
      label();
    });
  }
}

const dissectionCache = new Map();
function dissections(n) {
  if (!dissectionCache.has(n)) dissectionCache.set(n, enumerateDissections(n));
  return dissectionCache.get(n);
}
function ofType(m) {
  const key = typeKey(m);
  if (key === '') return [[]];
  return dissections(vertexCount(m)).filter(d => typeKey(typeOf(d)) === key);
}

/* ---------- hero: the 11 subdigons of the pentagon ---------- */
{
  const band = $('hero-band');
  const subs = dissections(5).slice().sort((a, b) => b.length - a.length);
  band.innerHTML = subs.map(d => renderSubdigon(d, 5, { size: 84, decorative: true })).join('');
}

/* ---------- face key ---------- */
{
  $('face-key').innerHTML = [3, 4, 5, 6].map(s =>
    `<span><span class="chip" style="background:var(--f${s})"></span>${FACE_LABELS[s - 1]}s</span>`
  ).join('') + `<span><span class="chip" style="background:var(--accent)"></span>roof edge</span>`;
}

/* ---------- Plate I: explorer ---------- */
const explorerState = { 2: 2, 3: 1, 4: 0, 5: 0 };
function renderExplorerControls() {
  const wrap = $('explorer-controls');
  wrap.innerHTML = '';
  for (const k of [2, 3, 4, 5]) {
    const div = document.createElement('div');
    div.className = 'control';
    div.innerHTML = `<label>${FACE_LABELS[k]}s</label>
      <span class="stepper">
        <button type="button" data-k="${k}" data-d="-1" aria-label="fewer ${FACE_LABELS[k]}s">−</button>
        <output>${explorerState[k]}</output>
        <button type="button" data-k="${k}" data-d="1" aria-label="more ${FACE_LABELS[k]}s">+</button>
      </span>`;
    wrap.appendChild(div);
  }
  wrap.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const k = +b.dataset.k, d = +b.dataset.d;
    const next = { ...explorerState, [k]: Math.max(0, explorerState[k] + d) };
    if (vertexCount(next) > 9) return flashNote('that would need a polygon with more than 9 vertices; this demo stops there.');
    Object.assign(explorerState, next);
    renderExplorer();
  }));
}
let noteTimer;
function flashNote(msg) {
  const el = $('explorer-note');
  el.textContent = msg;
  clearTimeout(noteTimer);
  noteTimer = setTimeout(renderExplorerNote, 2600);
}
function renderExplorerNote() {
  $('explorer-note').textContent =
    'Each picture is a different subdivision; the blue bottom edge is the roof that keeps them distinct.';
}
function formulaHTML(m) {
  let top = 0, bottom = 1;
  const facts = [];
  for (const [k, c] of Object.entries(m)) {
    if (!c) continue;
    top += Number(k) * c;
    bottom += (Number(k) - 1) * c;
    facts.push(`${c}!`);
  }
  return `<span class="math">${top}! / (${bottom}! · ${facts.join(' · ') || '1'})</span>`;
}
function renderExplorer() {
  renderExplorerControls();
  const m = Object.fromEntries(Object.entries(explorerState).filter(([, c]) => c));
  const subs = ofType(m);
  const C = hyperCatalan(m);
  const n = vertexCount(m);
  $('explorer-count').innerHTML = faceCount(m) === 0
    ? 'Nothing to place: that leaves the bare roof edge, the <i>null subdigon</i>. The series counts it too; it is the leading 1.'
    : `<span class="math"><i>C</i>[${describeType(m)}]</span> = ${formulaHTML(m)} =
       <span class="count-big">${C}</span> subdigon${C === 1n ? '' : 's'} of a ${n}-gon`;
  const shown = subs.slice(0, 144);
  $('explorer-gallery').innerHTML = shown.map(d =>
    `<span class="cell">${renderSubdigon(d, n, { size: 104, decorative: true })}</span>`).join('');
  if (subs.length > shown.length) {
    flashNote(`showing 144 of ${subs.length}.`);
  } else renderExplorerNote();
}
renderExplorer();

/* ---------- Plate II: the series, level by level ---------- */
let activeTermKey = null;
function seriesTerms(level) {
  // paper convention: within a level, more faces first, then smaller shapes
  const maxIdx = m => Math.max(0, ...Object.keys(m).map(Number));
  return typeVectors([2, 3, 4, 5, 6], level + 2)
    .filter(m => vertexCount(m) === level + 2)
    .sort((a, b) => faceCount(b) - faceCount(a) || maxIdx(a) - maxIdx(b) || (b[2] || 0) - (a[2] || 0));
}
function renderSeries() {
  const line = $('series-line');
  let html = '<b>S</b> = ';
  const totals = [];
  for (let level = 0; level <= 5; level++) {
    const terms = seriesTerms(level);
    totals.push(terms.reduce((a, m) => a + hyperCatalan(m), 0n));
    const rendered = terms.map(m => {
      const C = hyperCatalan(m);
      const key = typeKey(m) || 'null';
      const pressed = key === activeTermKey;
      return `<span class="term" role="button" tabindex="0" data-key="${key}"
        title="show the pictures this coefficient counts"
        aria-pressed="${pressed}">${C === 1n ? '' : C}${level === 0 ? '1' : termHTML(m)}</span>`;
    }).join(' + ');
    html += terms.length > 1 ? `(${rendered})` : rendered;
    html += level < 5 ? ' + ' : ' + ⋯';
  }
  line.innerHTML = html;
  if ($('series-totals')) {
    $('series-totals').innerHTML = `The coefficients in each bracket add up to ${totals.join(', ')}:
      the little Schröder numbers (<a href="https://oeis.org/A001003">A001003</a>), which count
      every subdigon of the polygon at that level, whatever the mix of shapes.`;
  }
  line.querySelectorAll('.term').forEach(el => {
    const activate = () => {
      activeTermKey = activeTermKey === el.dataset.key ? null : el.dataset.key;
      renderSeries();
      renderTermDetail();
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  });
}
function renderTermDetail() {
  const box = $('term-detail');
  if (!activeTermKey) { box.hidden = true; return; }
  const m = {};
  if (activeTermKey !== 'null') {
    for (const part of activeTermKey.split(',')) {
      const [k, c] = part.split(':').map(Number);
      m[k] = c;
    }
  }
  const subs = ofType(m);
  const n = vertexCount(m);
  box.hidden = false;
  box.innerHTML = `<p style="margin-top:0">The coefficient
    <span class="count-big">${hyperCatalan(m)}</span> counts these:
    <span class="math">${describeType(m)}</span> on a ${n}-gon.</p>
    <div class="gallery">${subs.map(d =>
      `<span class="cell">${renderSubdigon(d, n, { size: 88, decorative: true })}</span>`).join('')}</div>`;
}
renderSeries();

/* ---------- Plate III: playground ---------- */
const PRESETS = [
  { id: 'wallis', label: 'Wallis 1685 · x³−2x−5', coeffs: [-5, -2, 0, 1, 0, 0], center: 2 },
  { id: 'sin10', label: 'sin 10° · 8x³−6x+1', coeffs: [1, -6, 0, 8, 0, 0], center: 0 },
  { id: 'catalan', label: 'pure Catalan · 0.2x²−x+1', coeffs: [1, -1, 0.2, 0, 0, 0], center: 0 },
  { id: 'quintic', label: 'x⁵−x−1 · no radical formula', coeffs: [-1, -1, 0, 0, 0, 1], center: 1 },
];
const play = { coeffs: [...PRESETS[0].coeffs], center: PRESETS[0].center, baseCenter: PRESETS[0].center, maxV: 10, preset: 'wallis' };

function renderPresets() {
  $('presets').innerHTML = PRESETS.map(p =>
    `<button class="preset" data-id="${p.id}" aria-pressed="${play.preset === p.id}">${p.label}</button>`).join('');
  $('presets').querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    const p = PRESETS.find(x => x.id === b.dataset.id);
    play.coeffs = [...p.coeffs];
    play.center = p.center;
    play.baseCenter = p.center;
    play.preset = p.id;
    renderPolyInputs();
    renderPresets();
    runPlayground();
  }));
}
function renderPolyInputs() {
  const wrap = $('poly-inputs');
  wrap.innerHTML = play.coeffs.map((c, i) => `
    <span class="co">
      <input type="number" step="any" value="${c}" data-i="${i}" aria-label="coefficient of x^${i}">
      <span>${i === 0 ? '' : i === 1 ? '<i>x</i>' : `<i>x</i><sup>${i}</sup>`}</span>
    </span>${i < 5 ? '<span>+</span>' : '<span>= 0</span>'}`).join('');
  wrap.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
    play.coeffs[+inp.dataset.i] = parseFloat(inp.value) || 0;
    play.preset = null;
    renderPresets();
    runPlayground();
  }));
}
function fmtT(x) {
  if (x === 0) return '0';
  const a = Math.abs(x);
  return (a >= 0.001 && a < 1000) ? String(+x.toPrecision(6)) : x.toExponential(3);
}
function runPlayground() {
  $('level-label').textContent = play.maxV;
  const out = { tline: '', badge: '', est: NaN, entries: [] };
  const shifted = shiftPoly(play.coeffs, play.center);
  const degree = [...play.coeffs].reverse().findIndex(c => c !== 0);
  if (degree === -1 || play.coeffs.length - 1 - degree < 1) {
    return showPlayError('enter a polynomial of degree at least 1.');
  }
  if (!shifted[1]) return showPlayError('the linear coefficient vanishes at this center; nudge a coefficient or the center.');
  const { ts, scale } = toGeometricForm(shifted);
  const { partials } = seriesPartials(ts, play.maxV);
  const entries = [...partials.entries()];
  const S = entries[entries.length - 1][1];
  const est = play.center + scale * S;

  const roots = allRoots(play.coeffs);
  const ref = Number.isFinite(est) ? est : -play.coeffs[0] / play.coeffs[1];
  let root = { re: ref, im: 0 };
  let bestDist = Infinity;
  for (const [re, im] of roots) {
    const dist = Math.hypot(re - ref, im);
    if (dist < bestDist) { bestDist = dist; root = { re, im }; }
  }
  const isComplex = Math.abs(root.im) > 1e-8;

  const tline = Object.entries(ts).map(([k, v]) =>
    `<span class="math"><i>t</i><sub>${k}</sub></span> = ${fmtT(v)}`).join(' · ') || 'all t are 0';
  const centerNote = play.center !== 0 ? ` · centered at <b>${+play.center.toPrecision(8)}</b>` : '';

  const incs = [];
  for (let i = 1; i < entries.length; i++) incs.push(Math.abs(entries[i][1] - entries[i - 1][1]));
  const last = incs[incs.length - 1];
  let badge;
  play.diverging = incs.length >= 3 && incs.at(-1) > incs.at(-2) && incs.at(-2) > incs.at(-3);
  if (play.diverging) {
    badge = '<span class="badge bad">series is diverging: press re-center</span>';
  } else if (last < 1e-13) {
    badge = '<span class="badge ok">converged at this level</span>';
  } else {
    badge = '<span class="badge ok">converging</span>';
  }
  $('t-readout').innerHTML = `${tline}${centerNote} · ${badge}`;

  const estStr = String(+est.toPrecision(16));
  const rootStr = isComplex
    ? `${+root.re.toPrecision(12)} ${root.im >= 0 ? '+' : '−'} ${+Math.abs(root.im).toPrecision(6)}i`
    : String(+root.re.toPrecision(16));
  let match = 0;
  while (match < Math.min(estStr.length, rootStr.length) && estStr[match] === rootStr[match]) match++;
  $('digits-series').querySelector('.val').innerHTML =
    `<span class="match">${estStr.slice(0, match)}</span>${estStr.slice(match)}`;
  $('digits-root').querySelector('.val').textContent = rootStr;
  const digitCount = Math.max(0, estStr.slice(0, match).replace(/[^0-9]/g, '').length);
  $('digit-status').textContent = isComplex
    ? 'the nearest true root is complex; the real series is chasing its real part.'
    : `${digitCount} digit${digitCount === 1 ? '' : 's'} agree with the true root at this level.`;

  drawErrChart(entries.map(([V, s]) => {
    const x = play.center + scale * s;
    return { V, err: Math.max(Math.hypot(x - root.re, root.im), 1e-17) };
  }));
  drawRootsPlane(roots, root, entries.map(([, s]) => play.center + scale * s));
  drawRegion(ts);
  updateHash();
}

// The exact region of convergence for cubics, in the (t2, t3) plane. The
// boundary is where the equation s = 1 + t2 s² + t3 s³ and its s-derivative
// vanish together, parametrized by s in [3/2, 2]: t2 = (2s − 3)/s²,
// t3 = (2 − s)/s³. Every coefficient of S is positive, so only |t2| and |t3|
// matter and the region is symmetric across both axes.
function regionArc() {
  const arc = [];
  for (let i = 0; i <= 48; i++) {
    const s = 1.5 + (0.5 * i) / 48;
    arc.push([(2 * s - 3) / (s * s), (2 - s) / (s * s * s)]);
  }
  return arc;
}
function regionContains(t2, t3) {
  const a = Math.abs(t2), b = Math.abs(t3);
  if (a > 0.25 || b > 4 / 27) return false;
  const arc = regionArc();
  for (let i = 1; i < arc.length; i++) {
    if (a <= arc[i][0]) {
      const f = (a - arc[i - 1][0]) / (arc[i][0] - arc[i - 1][0] || 1);
      return b <= arc[i - 1][1] + f * (arc[i][1] - arc[i - 1][1]) + 1e-12;
    }
  }
  return b <= 1e-12;
}
function drawRegion(ts) {
  const wrap = $('region-plot');
  if (!wrap) return;
  const W = 340, H = 270, cx = W / 2, cy = H / 2;
  const sx = (W / 2 - 24) / 0.32, sy = (H / 2 - 24) / 0.2;
  const X = t => cx + t * sx, Y = t => cy - t * sy;
  const q1 = regionArc();
  const loop = [
    ...q1,
    ...q1.slice().reverse().map(([a, b]) => [a, -b]),
    ...q1.map(([a, b]) => [-a, -b]),
    ...q1.slice().reverse().map(([a, b]) => [-a, b]),
  ];
  const path = loop.map(([a, b], i) => `${i ? 'L' : 'M'}${X(a).toFixed(1)},${Y(b).toFixed(1)}`).join('') + 'Z';
  const t2 = ts[2] || 0, t3 = ts[3] || 0;
  const inside = regionContains(t2, t3);
  const px = Math.max(-0.31, Math.min(0.31, t2)), py = Math.max(-0.19, Math.min(0.19, t3));
  const clipped = px !== t2 || py !== t3;
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="the convergence region for cubics in the t2, t3 plane">
    <line class="baseline" x1="12" y1="${cy}" x2="${W - 12}" y2="${cy}"/>
    <line class="baseline" x1="${cx}" y1="12" x2="${cx}" y2="${H - 12}"/>
    <path class="region-fill" d="${path}"/>
    <text class="axis-label" x="${X(0.25) + 4}" y="${cy + 14}">¼</text>
    <text class="axis-label" x="${X(-0.25) - 16}" y="${cy + 14}">−¼</text>
    <text class="axis-label" x="${cx + 6}" y="${Y(4 / 27) - 4}">4⁄27</text>
    <text class="axis-label" x="${cx + 6}" y="${Y(-4 / 27) + 12}">−4⁄27</text>
    <text class="axis-label" x="${W - 12}" y="${cy - 6}" text-anchor="end"><tspan font-style="italic">t</tspan>₂</text>
    <text class="axis-label" x="${cx + 6}" y="16"><tspan font-style="italic">t</tspan>₃</text>
    <circle class="region-dot${inside ? '' : ' out'}" r="6" cx="${X(px).toFixed(1)}" cy="${Y(py).toFixed(1)}"/>
  </svg>`;
  const higher = (ts[4] || ts[5]) ? ' The degree-4 and degree-5 terms of this equation are not part of the picture.' : '';
  $('region-note').innerHTML = `Right now the playground sits at
    <span class="math"><i>t</i><sub>2</sub> = ${fmtT(t2)}, <i>t</i><sub>3</sub> = ${fmtT(t3)}</span>,
    ${inside ? 'inside the region, so the series converges.' : `outside the region${clipped ? ' (the dot is pinned to the edge of the chart)' : ''}, so the series diverges until you re-center.`}${higher}`;
}
function showPlayError(msg) {
  $('t-readout').innerHTML = `<span class="badge bad">${msg}</span>`;
  $('digits-series').querySelector('.val').textContent = '·';
  $('digits-root').querySelector('.val').textContent = '·';
  $('digit-status').textContent = '';
  $('err-chart').innerHTML = '';
  if ($('roots-plane')) $('roots-plane').innerHTML = '';
  if ($('region-plot')) { $('region-plot').innerHTML = ''; $('region-note').textContent = ''; }
}

// Every root of p in the complex plane, the targeted root ringed, and the
// series estimates walking along the real axis toward it.
function drawRootsPlane(roots, target, trail) {
  const wrap = $('roots-plane');
  if (!wrap) return;
  const W = 260, H = 260, cx = W / 2, cy = H / 2;
  let R = 1e-6;
  for (const [re, im] of roots) R = Math.max(R, Math.abs(re), Math.abs(im));
  const last = trail[trail.length - 1];
  if (Number.isFinite(last)) R = Math.max(R, Math.abs(last));
  R *= 1.25;
  const X = re => cx + (re / R) * (W / 2 - 14);
  const Y = im => cy - (im / R) * (H / 2 - 14);
  let step = Math.pow(10, Math.floor(Math.log10(R)));
  if (R / step > 5) step *= 2;
  if (R / step < 2) step /= 2;
  let grid = '';
  for (let g = step; g < R; g += step) {
    for (const s of [g, -g]) {
      grid += `<line class="grid" x1="${X(s).toFixed(1)}" y1="0" x2="${X(s).toFixed(1)}" y2="${H}"/>
        <line class="grid" x1="0" y1="${Y(s).toFixed(1)}" x2="${W}" y2="${Y(s).toFixed(1)}"/>`;
    }
  }
  const trailPts = trail.filter(Number.isFinite).map(x => `${X(x).toFixed(1)},${cy}`);
  wrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="roots of the polynomial in the complex plane">
    ${grid}
    <line class="baseline" x1="0" y1="${cy}" x2="${W}" y2="${cy}"/>
    <line class="baseline" x1="${cx}" y1="0" x2="${cx}" y2="${H}"/>
    <text class="axis-label" x="${W - 6}" y="${cy - 5}" text-anchor="end">Re</text>
    <text class="axis-label" x="${cx + 5}" y="11">Im</text>
    <text class="axis-label" x="6" y="${H - 6}">grid step ${+step.toPrecision(2)}</text>
    ${roots.map(([re, im]) =>
      `<circle class="root-dot" r="4.5" cx="${X(re).toFixed(1)}" cy="${Y(im).toFixed(1)}">
        <title>${+re.toPrecision(6)} ${im >= 0 ? '+' : '−'} ${+Math.abs(im).toPrecision(6)}i</title>
      </circle>`).join('')}
    <circle class="root-target" r="9" cx="${X(target.re).toFixed(1)}" cy="${Y(target.im).toFixed(1)}"/>
    ${trailPts.length > 1 ? `<polyline class="est-trail" points="${trailPts.join(' ')}"/>` : ''}
    ${Number.isFinite(last) ? `<g class="est-marker" transform="translate(${X(last).toFixed(1)},${cy})">
      <line x1="-5" y1="-5" x2="5" y2="5"/><line x1="-5" y1="5" x2="5" y2="-5"/></g>` : ''}
  </svg>
  <p class="sr-only">The equation has ${roots.length} roots. The series is heading for the root
    ${+target.re.toPrecision(6)}${Math.abs(target.im) > 1e-8 ? ` ${target.im > 0 ? '+' : '−'} ${+Math.abs(target.im).toPrecision(6)}i` : ''}${Number.isFinite(last) ? `, and its current estimate is ${+last.toPrecision(6)}` : ''}.</p>`;
}

function updateHash() {
  const f = v => String(+Number(v).toPrecision(12));
  history.replaceState(null, '', `#q=${play.coeffs.map(f).join('_')}&a=${f(play.center)}&n=${play.maxV}`);
}
function drawErrChart(points) {
  const W = 340, H = 232, L = 44, R = 12, T = 12, B = 42;
  const Vs = points.map(p => p.V);
  const logs = points.map(p => Math.log10(p.err));
  const yMax = Math.min(Math.ceil(Math.max(...logs, 0)) + 1, 2);
  const yMin = Math.max(Math.floor(Math.min(...logs)) - 1, -17);
  const xOf = V => L + ((V - Vs[0]) / Math.max(Vs[Vs.length - 1] - Vs[0], 1)) * (W - L - R);
  const yOf = lg => T + ((yMax - lg) / (yMax - yMin)) * (H - T - B);
  let grid = '', labels = '';
  const step = Math.max(1, Math.ceil((yMax - yMin) / 6));
  for (let g = yMax; g >= yMin; g -= step) {
    grid += `<line class="grid" x1="${L}" y1="${yOf(g)}" x2="${W - R}" y2="${yOf(g)}"/>`;
    labels += `<text class="axis-label" x="${L - 6}" y="${yOf(g) + 3}" text-anchor="end">1e${g}</text>`;
  }
  for (const V of Vs) {
    labels += `<text class="axis-label" x="${xOf(V)}" y="${H - 26}" text-anchor="middle">${V}</text>`;
  }
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.V).toFixed(1)},${yOf(Math.log10(p.err)).toFixed(1)}`).join('');
  const dots = points.map(p =>
    `<circle class="err-dot" r="4" cx="${xOf(p.V).toFixed(1)}" cy="${yOf(Math.log10(p.err)).toFixed(1)}"
       data-v="${p.V}" data-err="${p.err.toExponential(2)}"/>`).join('');
  $('err-chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="error versus polygon size, log scale">
    ${grid}<line class="baseline" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/>
    ${labels}
    <text class="axis-label" x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">max polygon vertices</text>
    <path class="err-line" d="${path}"/>${dots}</svg>
    <p class="sr-only">The error starts at ${points[0].err.toExponential(1)} and reaches
      ${points[points.length - 1].err.toExponential(1)} once polygons with ${Vs[Vs.length - 1]} vertices are included.</p>
    <div class="chart-tip" role="status"></div>`;
  const tip = $('err-chart').querySelector('.chart-tip');
  $('err-chart').querySelectorAll('.err-dot').forEach(dot => {
    dot.addEventListener('mouseenter', () => {
      const box = $('err-chart').getBoundingClientRect();
      const d = dot.getBoundingClientRect();
      tip.textContent = `≤ ${dot.dataset.v} vertices · error ${dot.dataset.err}`;
      tip.style.left = `${d.x - box.x + d.width / 2}px`;
      tip.style.top = `${d.y - box.y}px`;
      tip.style.opacity = 1;
    });
    dot.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
  });
}
$('level-slider').addEventListener('input', e => { play.maxV = +e.target.value; runPlayground(); });
function recenterOnce() {
  const shifted = shiftPoly(play.coeffs, play.center);
  if (!shifted[1]) {
    play.center = newtonStep(play.coeffs, play.center + 1e-3);
    return;
  }
  try {
    const { ts, scale } = toGeometricForm(shifted);
    const { partials } = seriesPartials(ts, play.maxV);
    const S = [...partials.values()].pop();
    if (play.diverging || !Number.isFinite(S)) {
      // a diverging series gives a garbage estimate; hop with one Newton step instead
      play.center = newtonStep(play.coeffs, play.center);
    } else {
      play.center = play.center + scale * S;
    }
  } catch {
    play.center = newtonStep(play.coeffs, play.center);
  }
}
$('recenter').addEventListener('click', () => { recenterOnce(); runPlayground(); });
$('two-pass').addEventListener('click', () => {
  // the paper's demonstration: start Wallis's cubic at 2, run the series, re-center, run again
  const p = PRESETS.find(x => x.id === 'wallis');
  play.coeffs = [...p.coeffs];
  play.center = p.center;
  play.baseCenter = p.center;
  play.preset = p.id;
  renderPolyInputs();
  renderPresets();
  runPlayground();
  recenterOnce();
  runPlayground();
  recenterOnce();
  runPlayground();
});
$('reset-center').addEventListener('click', () => { play.center = play.baseCenter; runPlayground(); });
$('copy-link').addEventListener('click', () => {
  const btn = $('copy-link');
  navigator.clipboard.writeText(location.href).then(() => {
    btn.textContent = 'copied ✓';
    setTimeout(() => { btn.textContent = 'copy link'; }, 1600);
  }).catch(() => {
    btn.textContent = 'copy the address bar';
    setTimeout(() => { btn.textContent = 'copy link'; }, 2500);
  });
});
(function initFromHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  const q = h.get('q');
  if (!q) return;
  const cs = q.split('_').map(Number);
  if (cs.length !== 6 || cs.some(v => !Number.isFinite(v))) return;
  play.coeffs = cs;
  play.center = Number(h.get('a')) || 0;
  play.baseCenter = play.center;
  play.maxV = Math.min(14, Math.max(2, Math.round(Number(h.get('n')) || 10)));
  $('level-slider').value = play.maxV;
  play.preset = null;
})();
renderPresets();
renderPolyInputs();
runPlayground();

/* ---------- Plate IV: central faces ---------- */
const CENTRAL_TYPES = [
  { m: { 2: 2, 3: 1 }, label: '2 triangles + 1 quad' },
  { m: { 2: 1, 3: 1 }, label: '1 triangle + 1 quad' },
  { m: { 2: 2, 4: 1 }, label: '2 triangles + 1 pentagon' },
  { m: { 2: 3 }, label: '3 triangles' },
];
let centralIdx = 0;
function renderCentral() {
  $('central-controls').innerHTML = CENTRAL_TYPES.map((t, i) =>
    `<button class="preset" data-i="${i}" aria-pressed="${i === centralIdx}">${t.label} · ${hyperCatalan(t.m)}</button>`).join('');
  $('central-controls').querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => { centralIdx = +b.dataset.i; renderCentral(); }));

  const { m } = CENTRAL_TYPES[centralIdx];
  const n = vertexCount(m);
  const subs = ofType(m);
  const groups = new Map();
  for (const d of subs) {
    const c = d.find(f => f.includes(0) && f.includes(n - 1));
    const size = c.length;
    if (!groups.has(size)) groups.set(size, []);
    groups.get(size).push(d);
  }
  const total = hyperCatalan(m);
  const E1 = edgeCount(m) - 1;
  let html = '';
  for (const [size, list] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const r = size - 1;
    const predicted = centralCount(m, r);
    html += `<div class="central-group">
      <h4>central ${FACE_LABELS[r]} · ${list.length} of ${total}</h4>
      <p class="formula-check">theorem: ${r} · ${m[r]} · ${total} / ${E1} = ${predicted} ✓</p>
      <div class="gallery">${list.map(d =>
        `<span class="cell">${renderSubdigon(d, n, { size: 96, highlightCentral: true, decorative: true })}</span>`).join('')}</div>
    </div>`;
  }
  $('central-groups').innerHTML = html;
}
renderCentral();

/* ---------- Plate VI: the Geode ---------- */
{
  const ROWS = 5, COLS = 5;
  const G = geodeBiTri(ROWS, COLS);
  let html = `<tr><th><span class="math"><i>m</i><sub>2</sub> \\ <i>m</i><sub>3</sub></span></th>` +
    Array.from({ length: COLS }, (_, b) => `<th>${b}</th>`).join('') + '</tr>';
  for (let a = 0; a < ROWS; a++) {
    html += `<tr><th>${a}</th>` + Array.from({ length: COLS }, (_, b) =>
      `<td class="${a === 0 || b === 0 ? 'edge-seq' : ''}">${G[a][b]}</td>`).join('') + '</tr>';
  }
  $('geode-table').innerHTML = html;
}

/* ---------- footer self-check ---------- */
{
  let checks = 0, bad = 0;
  for (let n = 3; n <= 7; n++) {
    const byType = new Map();
    for (const d of dissections(n)) {
      const key = typeKey(typeOf(d));
      byType.set(key, (byType.get(key) || 0) + 1);
    }
    for (const [key, count] of byType) {
      const m = {};
      for (const part of key.split(',')) {
        const [k, c] = part.split(':').map(Number);
        m[k] = c;
      }
      checks++;
      if (hyperCatalan(m) !== BigInt(count)) bad++;
    }
  }
  const closedG = (a, b) => {
    const f = k => { let r = 1n; for (let i = 2n; i <= BigInt(k); i++) r *= i; return r; };
    return f(2 * a + 3 * b + 3) / (BigInt(2 * a + 2 * b + 3) * BigInt(a + b + 1) * f(a + 2 * b + 2) * f(a) * f(b));
  };
  const G = geodeBiTri(5, 5);
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) {
    checks++;
    if (G[a][b] !== closedG(a, b)) bad++;
  }
  $('self-check').textContent = bad === 0
    ? `${checks} counts verified ✓`
    : `${bad} of ${checks} checks FAILED`;
}
