// Plate V: from picture to word. Put a node in every face of a subdigon, join
// faces that share a diagonal, and root the tree at the central face. Reading
// the tree in preorder gives a word: each face writes its number of free sides,
// each outer edge writes 0. The rank of a word is the sum of (letter − 1), and
// a subdigon's word always has rank −1. Theorem 4 of Rubine–Mukewar (Raney's
// lemma) says a string of rank −n has exactly n cyclic rotations that parse as
// a list of n words, and the parsing rule below is their proof.

import { enumerateDissections } from './subdigons.js';
import { vertexPositions, renderSubdigon } from './viz.js';

export function dualTree(faces, n) {
  if (!faces.length) return { face: null, k: 0, children: [], edge: [0, n - 1] };
  const byRoof = new Map();
  for (const f of faces) byRoof.set(`${f[0]}-${f[f.length - 1]}`, f);
  const build = face => ({
    face,
    k: face.length - 1,
    children: face.slice(0, -1).map((v, i) => {
      const w = face[i + 1];
      if (w - v === 1) return { face: null, k: 0, children: [], edge: [v, w] };
      return build(byRoof.get(`${v}-${w}`));
    }),
  });
  return build(byRoof.get(`0-${n - 1}`));
}

export function wordOf(tree) {
  const out = [];
  const walk = t => { out.push(t.k); t.children.forEach(walk); };
  walk(tree);
  return out;
}

export function rank(letters) {
  return letters.reduce((a, k) => a + k - 1, 0);
}

// Reading from the right, a letter k followed by k finished words becomes one
// finished word. trace[i] is the number of finished words in hand after
// letter i, or null once parsing has failed.
export function parseWords(letters) {
  let c = 0, ok = true;
  const trace = Array(letters.length).fill(null);
  for (let i = letters.length - 1; i >= 0; i--) {
    if (c < letters[i]) { ok = false; break; }
    c = c - letters[i] + 1;
    trace[i] = c;
  }
  return { ok, count: ok ? c : 0, trace };
}

export function rotate(list, offset) {
  return list.map((_, i) => list[(i + offset) % list.length]);
}

export function validRotations(letters, n) {
  const out = [];
  for (let s = 0; s < letters.length; s++) {
    const p = parseWords(rotate(letters, s));
    if (p.ok && p.count === n) out.push(s);
  }
  return out;
}

// The subdigon with its dual tree drawn on top; nodes carry data-idx in
// preorder so a letter of the word can point back at its node.
export function renderTreeOverlay(faces, n, { size = 120 } = {}) {
  const base = renderSubdigon(faces, n, { size, showVertices: false, decorative: true });
  const pts = vertexPositions(n);
  const nodes = [];
  const centroid = f => f.reduce((a, v) => [a[0] + pts[v][0] / f.length, a[1] + pts[v][1] / f.length], [0, 0]);
  const walk = (t, parent) => {
    const idx = nodes.length;
    const pos = t.face
      ? centroid(t.face)
      : [(pts[t.edge[0]][0] + pts[t.edge[1]][0]) / 2, (pts[t.edge[0]][1] + pts[t.edge[1]][1]) / 2];
    nodes.push({ idx, k: t.k, pos, parent });
    t.children.forEach(c => walk(c, idx));
  };
  walk(dualTree(faces, n), null);
  let overlay = '';
  for (const nd of nodes) {
    if (nd.parent === null) continue;
    const p = nodes[nd.parent].pos;
    overlay += `<line class="tree-edge" x1="${p[0].toFixed(1)}" y1="${p[1].toFixed(1)}" x2="${nd.pos[0].toFixed(1)}" y2="${nd.pos[1].toFixed(1)}"/>`;
  }
  for (const nd of nodes) {
    overlay += `<g class="tree-node${nd.k ? '' : ' leaf'}" data-idx="${nd.idx}">
      <circle cx="${nd.pos[0].toFixed(1)}" cy="${nd.pos[1].toFixed(1)}" r="${nd.k ? 7 : 5.2}"/>
      <text x="${nd.pos[0].toFixed(1)}" y="${nd.pos[1].toFixed(1)}" dy="2.7" text-anchor="middle">${nd.k}</text></g>`;
  }
  return base.replace('</svg>', overlay + '</svg>');
}

/* ---------- Plate V UI ---------- */
const WORD_OPTIONS = [];
for (let n = 2; n <= 5; n++) for (const f of enumerateDissections(n)) WORD_OPTIONS.push({ n, faces: f });

const wv = { r: 2, slots: [1, 6, 3], offset: 0 };
const wvEl = id => document.getElementById(id);

function slotWord(i) {
  const o = WORD_OPTIONS[wv.slots[i]];
  return wordOf(dualTree(o.faces, o.n));
}

function renderWords() {
  wvEl('wv-controls').innerHTML = [1, 2, 3].map(r =>
    `<button class="preset" data-r="${r}" aria-pressed="${r === wv.r}" data-tip="Chain ${r} subdigon word${r > 1 ? 's' : ''} together. The rank is −${r}, so exactly ${r} rotation${r > 1 ? 's' : ''} should parse.">${r} word${r > 1 ? 's' : ''} · rank −${r}</button>`
  ).join('') + `<button class="action" id="wv-surprise" data-tip="Fill every slot at random.">surprise me</button>`;
  wvEl('wv-controls').querySelectorAll('[data-r]').forEach(b =>
    b.addEventListener('click', () => { wv.r = +b.dataset.r; wv.offset = 0; renderWords(); }));
  wvEl('wv-surprise').addEventListener('click', () => {
    wv.slots = wv.slots.map(() => Math.floor(Math.random() * WORD_OPTIONS.length));
    wv.offset = 0;
    renderWords();
  });

  wvEl('wv-slots').innerHTML = wv.slots.slice(0, wv.r).map((opt, i) => {
    const o = WORD_OPTIONS[opt];
    return `<button class="word-slot slot-${i}" data-i="${i}" data-tip="Click to swap in the next subdigon. The numbers underneath are its word." aria-label="slot ${i + 1}: swap this subdigon">
      ${renderTreeOverlay(o.faces, o.n, { size: 120 })}
      <span class="slot-word">${slotWord(i).join(' ')}</span>
    </button>`;
  }).join('');
  wvEl('wv-slots').querySelectorAll('.word-slot').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.i;
    wv.slots[i] = (wv.slots[i] + 1) % WORD_OPTIONS.length;
    wv.offset = 0;
    renderWords();
  }));

  // the combined word, tagged so each letter remembers its slot and node
  const tagged = [];
  for (let i = 0; i < wv.r; i++) slotWord(i).forEach((k, idx) => tagged.push({ k, slot: i, idx }));
  const rot = rotate(tagged, wv.offset % tagged.length);
  const letters = rot.map(t => t.k);
  const parsed = parseWords(letters);
  const good = validRotations(letters, wv.r);
  const maxTrace = Math.max(1, ...parsed.trace.filter(v => v !== null));
  const failAt = parsed.ok ? -1 : parsed.trace.findIndex((v, i) => v === null && (i === letters.length - 1 || parsed.trace[i + 1] !== null));

  wvEl('wv-word').innerHTML = rot.map((t, i) => {
    const v = parsed.trace[i];
    const h = v === null ? 0 : 6 + (v / maxTrace) * 22;
    return `<span class="letter slot-${t.slot}${i === failAt ? ' fail' : ''}" data-slot="${t.slot}" data-idx="${t.idx}">
      <span class="glyph">${t.k}</span>
      <span class="bar${v === null ? ' none' : ''}" style="height:${h.toFixed(0)}px" title="${v === null ? 'stuck' : v + ' finished'}"></span>
    </span>`;
  }).join('');
  wvEl('wv-word').querySelectorAll('.letter').forEach(el => {
    const node = () => wvEl('wv-slots').querySelector(`.word-slot.slot-${el.dataset.slot} .tree-node[data-idx="${el.dataset.idx}"]`);
    el.addEventListener('mouseenter', () => node()?.classList.add('hl'));
    el.addEventListener('mouseleave', () => node()?.classList.remove('hl'));
  });

  const thisOne = parsed.ok && parsed.count === wv.r;
  wvEl('wv-badge').className = 'badge ' + (thisOne ? 'ok' : 'bad');
  wvEl('wv-badge').textContent =
    `rank ${rank(letters)} · this rotation parses as ${wv.r} word${wv.r > 1 ? 's' : ''}: ${thisOne ? 'yes' : 'no'} · ${good.length} of ${letters.length} rotations do`;
}

if (typeof document !== 'undefined' && document.getElementById('wv-controls')) {
  renderWords();
  document.getElementById('wv-rotate').addEventListener('click', () => { wv.offset += 1; renderWords(); });
}
