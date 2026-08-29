import { typeVectors, vertexCount, faceCount, hyperCatalan, subdigonsOfType, typeKey } from './subdigons.js';
import { renderSubdigon, describeType, termHTML } from './viz.js';

// Deterministic daily pick: everyone with the extension sees the same
// subdigon on the same date.
function hash(str) {
  let h = 2166136261;
  for (const ch of str) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

const today = new Date();
const dateStr = today.toISOString().slice(0, 10);
const seed = hash(dateStr);

const candidates = typeVectors([2, 3, 4, 5], 8).filter(m => faceCount(m) >= 2);
const m = candidates[seed % candidates.length];
const subs = subdigonsOfType(m);
const pick = subs[hash(dateStr + typeKey(m)) % subs.length];
const n = vertexCount(m);
const C = hyperCatalan(m);

document.getElementById('date').textContent = today.toLocaleDateString(undefined,
  { weekday: 'long', month: 'long', day: 'numeric' });
document.getElementById('figure').innerHTML = renderSubdigon(pick, n, { size: 260 });
document.getElementById('title').innerHTML = `${describeType(m)}`;
document.getElementById('detail').innerHTML =
  `There are exactly <span class="count">${C}</span> ways to subdivide this ${n}-gon
   like that, and today's picture is one of them. In the series that solves
   polynomial equations, it lives in the term
   <span class="math">${C}${termHTML(m)}</span>.`;
