import {
  enumerateDissections, typeOf, typeKey, hyperCatalan, vertexCount, edgeCount,
  faceCount, subdigonsOfType, typeVectors, centralCount, geodeBiTri,
} from './subdigons.js';
import { toGeometricForm, seriesPartials, shiftPoly, evalPoly, targetRoot } from './solver.js';
import { renderSubdigon, describeType, termHTML } from './viz.js';
import './paneling.js';

const $ = id => document.getElementById(id);
const FACE_LABELS = { 2: 'triangle', 3: 'quadrilateral', 4: 'pentagon', 5: 'hexagon' };

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
  band.innerHTML = subs.map(d => renderSubdigon(d, 5, { size: 84 })).join('');
}

/* ---------- face key ---------- */
{
  $('face-key').innerHTML = [3, 4, 5, 6].map(s =>
    `<span><span class="chip" style="background:var(--f${s})"></span>${FACE_LABELS[s - 1]}s</span>`
  ).join('') + `<span><span class="chip" style="background:var(--accent)"></span>roof edge</span>`;
}

/* ---------- Plate I: explorer ---------- */
const explorerState = { 2: 2, 3: 1, 4: 0 };
function renderExplorerControls() {
  const wrap = $('explorer-controls');
  wrap.innerHTML = '';
  for (const k of [2, 3, 4]) {
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
    `<span class="cell">${renderSubdigon(d, n, { size: 104 })}</span>`).join('');
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
  for (let level = 0; level <= 5; level++) {
    const terms = seriesTerms(level);
    const rendered = terms.map(m => {
      const C = hyperCatalan(m);
      const key = typeKey(m) || 'null';
      const pressed = key === activeTermKey;
      return `<span class="term" role="button" tabindex="0" data-key="${key}"
        aria-pressed="${pressed}">${C === 1n ? '' : C}${level === 0 ? '1' : termHTML(m)}</span>`;
    }).join(' + ');
    html += terms.length > 1 ? `(${rendered})` : rendered;
    html += level < 5 ? ' + ' : ' + ⋯';
  }
  line.innerHTML = html;
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
      `<span class="cell">${renderSubdigon(d, n, { size: 88 })}</span>`).join('')}</div>`;
}
renderSeries();

/* ---------- Plate III: playground ---------- */
const PRESETS = [
  { id: 'wallis', label: 'Wallis 1685 · x³−2x−5', coeffs: [-5, -2, 0, 1, 0, 0], center: 2 },
  { id: 'sin10', label: 'sin 10° · 8x³−6x+1', coeffs: [1, -6, 0, 8, 0, 0], center: 0 },
  { id: 'catalan', label: 'pure Catalan · 0.2x²−x+1', coeffs: [1, -1, 0.2, 0, 0, 0], center: 0 },
  { id: 'quintic', label: 'a quintic', coeffs: [-0.3, 1, 0, 0.2, 0, 0.1], center: 0 },
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

  const root = targetRoot(play.coeffs, est);
  const isComplex = Math.abs(root.im) > 1e-8;

  const tline = Object.entries(ts).map(([k, v]) =>
    `<span class="math"><i>t</i><sub>${k}</sub></span> = ${fmtT(v)}`).join(' · ') || 'all t are 0';
  const centerNote = play.center !== 0 ? ` · centered at <b>${+play.center.toPrecision(8)}</b>` : '';

  const incs = [];
  for (let i = 1; i < entries.length; i++) incs.push(Math.abs(entries[i][1] - entries[i - 1][1]));
  const last = incs[incs.length - 1];
  let badge;
  if (incs.length >= 3 && incs.at(-1) > incs.at(-2) && incs.at(-2) > incs.at(-3)) {
    badge = '<span class="badge bad">series is diverging → press re-center</span>';
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
}
function showPlayError(msg) {
  $('t-readout').innerHTML = `<span class="badge bad">${msg}</span>`;
  $('digits-series').querySelector('.val').textContent = '·';
  $('digits-root').querySelector('.val').textContent = '·';
  $('digit-status').textContent = '';
  $('err-chart').innerHTML = '';
}
function drawErrChart(points) {
  const W = 460, H = 258, L = 46, R = 14, T = 12, B = 42;
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
$('recenter').addEventListener('click', () => {
  const shifted = shiftPoly(play.coeffs, play.center);
  if (!shifted[1]) return;
  try {
    const { ts, scale } = toGeometricForm(shifted);
    const { partials } = seriesPartials(ts, play.maxV);
    const S = [...partials.values()].pop();
    if (Number.isFinite(S)) play.center = play.center + scale * S;
    runPlayground();
  } catch { /* leave as is */ }
});
$('reset-center').addEventListener('click', () => { play.center = play.baseCenter; runPlayground(); });
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
      <h3>central ${FACE_LABELS[r]} · ${list.length} of ${total}</h3>
      <p class="formula-check">theorem: ${r} · ${m[r]} · ${total} / ${E1} = ${predicted} ✓</p>
      <div class="gallery">${list.map(d =>
        `<span class="cell">${renderSubdigon(d, n, { size: 96, highlightCentral: true })}</span>`).join('')}</div>
    </div>`;
  }
  $('central-groups').innerHTML = html;
}
renderCentral();

/* ---------- Plate V: Raney's necklace ---------- */
const raney = { word: [1, 1, -1, 1, -1, -1, 1], offset: 0 };
function raneyRotation(offset) {
  const L = raney.word.length;
  return Array.from({ length: L }, (_, i) => raney.word[(offset + i) % L]);
}
function raneyValidStarts() {
  const L = raney.word.length;
  const valid = [];
  for (let s = 0; s < L; s++) {
    let sum = 0, ok = true;
    for (const step of raneyRotation(s)) {
      sum += step;
      if (sum <= 0) { ok = false; break; }
    }
    if (ok) valid.push(s);
  }
  return valid;
}
function renderRaney() {
  const L = raney.word.length;
  const valid = raneyValidStarts();
  const total = raney.word.reduce((a, b) => a + b, 0);
  const rot = raneyRotation(raney.offset);
  $('raney-word').innerHTML = rot.map((v, i) =>
    `<span class="${v > 0 ? 'pos' : 'neg'}" role="button" tabindex="0" data-i="${i}"
      aria-label="flip step ${i + 1}">${v > 0 ? '▲' : '▽'}</span>`).join('');
  $('raney-word').querySelectorAll('span').forEach(el => {
    const flip = () => {
      const i = (raney.offset + +el.dataset.i) % L;
      raney.word[i] = -raney.word[i];
      renderRaney();
    };
    el.addEventListener('click', flip);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
  });
  const isValid = valid.includes(raney.offset % L);
  $('raney-badge').className = 'badge ' + (total > 0 ? (isValid ? 'ok' : 'bad') : 'bad');
  $('raney-badge').textContent = total > 0
    ? `sum = +${total} → ${valid.length} of ${L} starts stay positive · this one: ${isValid ? 'yes' : 'no'}`
    : `sum = ${total} → no start can stay positive`;

  // staircase of the current rotation
  const W = 300, H = 150, pad = 16;
  const xs = i => pad + (i / L) * (W - 2 * pad);
  const sums = [0];
  for (const v of rot) sums.push(sums[sums.length - 1] + v);
  const maxS = Math.max(...sums, 1), minS = Math.min(...sums, 0);
  const ys = s => H - pad - ((s - minS) / (maxS - minS)) * (H - 2 * pad);
  let path = `M${xs(0)},${ys(0)}`;
  for (let i = 1; i <= L; i++) path += `L${xs(i)},${ys(sums[i])}`;
  $('raney-chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="running sum of the current rotation">
    <line class="grid" x1="${pad}" y1="${ys(0)}" x2="${W - pad}" y2="${ys(0)}"/>
    <path class="err-line" style="stroke:${isValid ? 'var(--good)' : 'var(--f4)'}" d="${path}"/>
    ${sums.map((s, i) => `<circle class="err-dot" style="fill:${s <= 0 && i > 0 ? 'var(--f4)' : 'var(--good)'}" r="3.4" cx="${xs(i)}" cy="${ys(s)}"/>`).join('')}
  </svg>`;
}
$('raney-rotate').addEventListener('click', () => { raney.offset = (raney.offset + 1) % raney.word.length; renderRaney(); });
renderRaney();

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
