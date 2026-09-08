// Plate III·b: the finite identity (Theorem 2 of both finite-interpretation
// papers), single-shape case, verified live in exact BigInt arithmetic.

import { hyperCatalan } from './subdigons.js';
import { residualCoeffs } from './solver.js';

const fid = { k: 2, D: 5 };
const FID_NAMES = { 2: 'triangles', 3: 'quadrilaterals', 4: 'pentagons' };

function fidEl(id) { return document.getElementById(id); }

function tPow(k, n) {
  if (n === 0) return '1';
  return `<i>t</i><sub>${k}</sub>` + (n > 1 ? `<sup>${n}</sup>` : '');
}

function renderIdentity() {
  const { k, D } = fid;
  fidEl('fid-controls').innerHTML = [2, 3, 4].map(kk =>
    `<button class="preset" data-k="${kk}" aria-pressed="${kk === k}" data-tip="Use only ${FID_NAMES[kk]}. The series is then a single-variable series in ${FID_NAMES[kk] === "triangles" ? "the Catalan numbers" : "Fuss–Catalan numbers"}.">${FID_NAMES[kk]} · <span class="math">${tPow(kk, 1)}</span></button>`
  ).join('') + `
    <div class="control" style="flex:1;min-width:180px">
      <label for="fid-slider" class="term-def" data-tip="Keep only the terms up to this degree, then plug the stump into the equation.">cut the series at degree ${D}</label>
      <input type="range" id="fid-slider" min="1" max="9" value="${D}">
    </div>`;
  fidEl('fid-controls').querySelectorAll('[data-k]').forEach(b =>
    b.addEventListener('click', () => { fid.k = +b.dataset.k; renderIdentity(); }));
  fidEl('fid-slider').addEventListener('input', e => { fid.D = +e.target.value; renderIdentity(); });

  const coeffs = [];
  for (let n = 0; n <= D; n++) coeffs.push(hyperCatalan(n ? { [k]: n } : {}));
  fidEl('fid-series').innerHTML =
    `<b>S</b><sub>${D}</sub> = ` + coeffs.map((c, n) =>
      `${n && c !== 1n ? c : (n === 0 ? '1' : '')}${n ? tPow(k, n) : ''}`).join(' + ');

  const res = residualCoeffs(k, D);
  const chips = [];
  for (let n = 0; n <= D; n++) chips.push(`<span class="fid-zero">0${n ? '·' + tPow(k, n) : ''}</span>`);
  chips.push(`<span class="fid-survivor">${res[D + 1]}·${tPow(k, D + 1)}</span>`);
  fidEl('fid-residual').innerHTML =
    `1 − <b>S</b><sub>${D}</sub> + ${tPow(k, 1)}·<b>S</b><sub>${D}</sub><sup>${k}</sup> = ` +
    chips.join(' + ') + ' + ⋯';

  fidEl('fid-note').innerHTML =
    `Every coefficient through degree ${D} cancels to exactly zero in integer arithmetic.
     The survivor <b>${res[D + 1]}</b> equals the next coefficient of the series,
     so the equation hands you <b>S</b> one coefficient at a time.`;
}

if (document.getElementById('fid-controls')) renderIdentity();
