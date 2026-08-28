// Plate II·b — the paneling operator ∇̄_k from Mukewar (2025) / Rubine–Mukewar
// (2025). ∇̄_k takes k subdigons, glues them onto the k non-roof sides of a
// central (k+1)-gon, and returns one bigger subdigon; ψ turns that move into
// the product t_k·ψ(s₁)⋯ψ(s_k). The animation follows the paper's pipeline:
// show the decomposition, then interpolate every vertex into its position in
// the merged regular polygon.

import { enumerateDissections, typeOf, hyperCatalan } from './subdigons.js';
import { renderSubdigon, vertexPositions, termHTML } from './viz.js';

// the five subdigons small enough to sit in a slot: |, △, and the three
// subdivisions of the quadrilateral
const SLOT_OPTIONS = [
  { n: 2, faces: [] },
  ...enumerateDissections(3).map(f => ({ n: 3, faces: f })),
  ...enumerateDissections(4).map(f => ({ n: 4, faces: f })),
];

const pan = { k: 3, slots: [1, 0, 2], raf: null };

// Glue: central (k+1)-gon with roof (0, n−1); slot i occupies the vertex run
// offs[i]..offs[i+1] of the result, its own roof identified with a central edge.
function merged() {
  const pieces = pan.slots.slice(0, pan.k).map(i => SLOT_OPTIONS[i]);
  const offs = [0];
  for (const p of pieces) offs.push(offs[offs.length - 1] + p.n - 1);
  const n = offs[pan.k] + 1;
  const centralFace = offs.slice();
  const faces = [centralFace];
  pieces.forEach((p, i) => {
    for (const f of p.faces) faces.push(f.map(v => offs[i] + v));
  });
  return { pieces, offs, n, centralFace, faces };
}

function slotPsi(opt) {
  return termHTML(typeOf(opt.faces));
}

function el(id) { return document.getElementById(id); }

function renderControls() {
  el('pan-controls').innerHTML = [2, 3, 4].map(k =>
    `<button class="preset" data-k="${k}" aria-pressed="${k === pan.k}">∇̄<sub>${k}</sub> · ${k} slots, central ${k + 1}-gon</button>`
  ).join('') + `<button class="action" id="pan-replay">glue ⟳</button>`;
  el('pan-controls').querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
    pan.k = +b.dataset.k;
    while (pan.slots.length < pan.k) pan.slots.push((pan.slots.length * 2 + 1) % SLOT_OPTIONS.length);
    render();
  }));
  el('pan-replay').addEventListener('click', () => animate());
}

function renderSlots() {
  el('pan-slots').innerHTML = pan.slots.slice(0, pan.k).map((opt, i) => `
    <button class="slot" data-i="${i}" title="swap this subdigon">
      ${renderSubdigon(SLOT_OPTIONS[opt].faces, SLOT_OPTIONS[opt].n, { size: 58 })}
      <span class="slot-label">s<sub>${i + 1}</sub></span>
    </button>`).join('');
  el('pan-slots').querySelectorAll('.slot').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    pan.slots[i] = (pan.slots[i] + 1) % SLOT_OPTIONS.length;
    render();
  }));
}

function renderPsi() {
  const m = merged();
  const parts = m.pieces.map(p => slotPsi(p)).join(' · ');
  const type = typeOf(m.faces);
  const C = hyperCatalan(type);
  el('pan-psi').innerHTML =
    `<span class="math">ψ: <i>t</i><sub>${pan.k}</sub> · ${parts} = ${termHTML(type)}</span>
     — one of the <span class="count-big">${C}</span> subdigons counted in the term
     <span class="math">${C === 1n ? '' : C}${termHTML(type)}</span>.`;
}

function buildStage() {
  const m = merged();
  const W = 420, H = 300;
  const end = vertexPositions(m.n, 92, W / 2, 186);

  // start row: operator glyph, then the k slot pieces
  const items = pan.k + 1;
  const spacing = Math.min(96, (W - 60) / items);
  const cx = i => W / 2 + (i - (items - 1) / 2) * spacing;
  const glyphStart = vertexPositions(pan.k + 1, 25, cx(0), 46);
  const pieceStarts = m.pieces.map((p, i) => vertexPositions(p.n, 22, cx(i + 1), 46));

  // each animated polygon: {cls, start[], end[]}; null pieces become lines
  const polys = [];
  polys.push({
    cls: `face face-${pan.k + 1}`,
    start: glyphStart,
    end: m.centralFace.map(v => end[v]),
  });
  m.pieces.forEach((p, i) => {
    const off = m.offs[i];
    for (const f of p.faces) {
      polys.push({
        cls: `face face-${f.length}`,
        start: f.map(v => pieceStarts[i][v]),
        end: f.map(v => end[off + v]),
      });
    }
    if (!p.faces.length) {
      polys.push({
        cls: 'null-edge',
        start: pieceStarts[i],
        end: [end[off], end[off + 1]],
      });
    }
  });

  const svg = `<svg viewBox="0 0 ${W} ${H}" role="img"
      aria-label="the paneling operator gluing ${pan.k} subdigons around a central ${pan.k + 1}-gon">
    ${polys.map((p, i) => `<polygon id="pan-poly-${i}" class="${p.cls}" points=""/>`).join('')}
    <line id="pan-roof" class="root-edge" x1="${end[0][0]}" y1="${end[0][1]}"
      x2="${end[m.n - 1][0]}" y2="${end[m.n - 1][1]}" opacity="0"/>
    ${end.map(([x, y]) => `<circle class="vertex" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" opacity="0"/>`).join('')}
  </svg>`;
  el('pan-stage').innerHTML = `<div class="subdigon pan-svg">${svg}</div>`;
  return polys;
}

let stagePolys = [];
function setFrame(t) {
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  stagePolys.forEach((p, i) => {
    const node = el(`pan-poly-${i}`);
    if (!node) return;
    node.setAttribute('points', p.start.map((s, j) => {
      const q = p.end[j];
      return `${(s[0] + (q[0] - s[0]) * e).toFixed(2)},${(s[1] + (q[1] - s[1]) * e).toFixed(2)}`;
    }).join(' '));
  });
  const late = Math.max(0, (e - 0.7) / 0.3);
  const roof = el('pan-roof');
  if (roof) roof.setAttribute('opacity', late.toFixed(2));
  el('pan-stage').querySelectorAll('circle.vertex').forEach(c => c.setAttribute('opacity', late.toFixed(2)));
}

function animate() {
  cancelAnimationFrame(pan.raf);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setFrame(1);
  const t0 = performance.now(), hold = 350, dur = 1250;
  const tick = now => {
    const t = Math.min(1, Math.max(0, (now - t0 - hold) / dur));
    setFrame(t);
    if (t < 1) pan.raf = requestAnimationFrame(tick);
  };
  pan.raf = requestAnimationFrame(tick);
}

let seenOnce = false;
function render() {
  renderControls();
  renderSlots();
  renderPsi();
  stagePolys = buildStage();
  setFrame(0);
  if (seenOnce) animate();
}

if (document.getElementById('pan-stage')) {
  render();
  // play the first glue when the reader actually reaches the plate
  const io = new IntersectionObserver(entries => {
    if (!seenOnce && entries.some(e => e.isIntersecting)) {
      seenOnce = true;
      animate();
      io.disconnect();
    }
  }, { threshold: 0.35 });
  io.observe(document.getElementById('pan-stage'));
}
