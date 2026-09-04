// Plate IV·b: powers of the series, from the Involve paper. Theorem 7 gives the
// closed formula for the coefficients of S^r; Theorem 6 reads each one as
// subdigons carrying one extra (r+1)-gon against the roof. Clicking a term
// checks the two readings against each other by enumeration.

import {
  typeVectors, vertexCount, faceCount, edgeCount, typeKey, hyperCatalan,
  powerCoeff, subdigonsOfType, centralFace,
} from './subdigons.js';
import { renderSubdigon, describeType, termHTML } from './viz.js';

const pw = { r: 2, activeKey: null };
const PW_FACE = { 2: 'triangle', 3: 'quadrilateral', 4: 'pentagon' };

function pwEl(id) { return document.getElementById(id); }

function pwTerms(level) {
  const maxIdx = m => Math.max(0, ...Object.keys(m).map(Number));
  return typeVectors([2, 3, 4, 5], level + 2)
    .filter(m => vertexCount(m) === level + 2)
    .sort((a, b) => faceCount(b) - faceCount(a) || maxIdx(a) - maxIdx(b) || (b[2] || 0) - (a[2] || 0));
}

function renderPowers() {
  pwEl('pow-controls').innerHTML = [2, 3, 4].map(r =>
    `<button class="preset" data-r="${r}" aria-pressed="${r === pw.r}"><b>S</b><sup>${r}</sup> · central ${PW_FACE[r]}s</button>`
  ).join('');
  pwEl('pow-controls').querySelectorAll('button').forEach(b =>
    b.addEventListener('click', () => { pw.r = +b.dataset.r; pw.activeKey = null; renderPowers(); }));

  let html = `<b>S</b><sup>${pw.r}</sup> = `;
  for (let level = 0; level <= 3; level++) {
    const rendered = pwTerms(level).map(m => {
      const C = powerCoeff(pw.r, m);
      const key = typeKey(m) || 'null';
      return `<span class="term" role="button" tabindex="0" data-key="${key}"
        title="show the pictures this coefficient counts"
        aria-pressed="${key === pw.activeKey}">${C === 1n ? '' : C}${level === 0 ? '1' : termHTML(m)}</span>`;
    });
    html += rendered.length > 1 ? `(${rendered.join(' + ')})` : rendered.join('');
    html += level < 3 ? ' + ' : ' + ⋯';
  }
  pwEl('pow-line').innerHTML = html;
  pwEl('pow-line').querySelectorAll('.term').forEach(el => {
    const activate = () => {
      pw.activeKey = pw.activeKey === el.dataset.key ? null : el.dataset.key;
      renderPowers();
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  });
  renderPowDetail();
}

function renderPowDetail() {
  const box = pwEl('pow-detail');
  if (!pw.activeKey) { box.hidden = true; return; }
  const m = {};
  if (pw.activeKey !== 'null') {
    for (const part of pw.activeKey.split(',')) {
      const [k, c] = part.split(':').map(Number);
      m[k] = c;
    }
  }
  const r = pw.r;
  const big = { ...m, [r]: (m[r] || 0) + 1 };
  const n = vertexCount(big);
  const all = subdigonsOfType(big);
  const kept = all.filter(d => centralFace(d, n).length === r + 1);
  const C = powerCoeff(r, m);
  box.hidden = false;
  box.innerHTML = `<p style="margin-top:0">Theorem 6 reads this coefficient as pictures:
    take <span class="math">${describeType(big)}</span> on a ${n}-gon
    (${hyperCatalan(big)} in all) and keep the ones whose central face is the
    ${PW_FACE[r]}. That leaves <span class="count-big">${kept.length}</span>, and Theorem 7's
    closed formula <span class="math">${r} · ${r - 2 + edgeCount(m)}! / (${r - 2 + vertexCount(m)}! · <b>m</b>!)</span>
    gives the same <span class="count-big">${C}</span>.</p>
    <div class="gallery">${kept.map(d =>
      `<span class="cell">${renderSubdigon(d, n, { size: 88, highlightCentral: true, decorative: true })}</span>`).join('')}</div>`;
}

if (document.getElementById('pow-controls')) renderPowers();
