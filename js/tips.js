// Hover help. Any element with a data-tip attribute explains itself on hover,
// on keyboard focus, or on tap. One shared tooltip element is positioned near
// the target and linked with aria-describedby while it is showing.

const tip = document.createElement('div');
tip.id = 'tip';
tip.setAttribute('role', 'tooltip');
tip.hidden = true;
document.body.appendChild(tip);
let current = null;

function place(el) {
  const r = el.getBoundingClientRect();
  tip.style.left = '0px';
  tip.style.top = '0px';
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(8, Math.min(window.innerWidth - w - 8, left));
  let top = r.top - h - 10;
  let below = false;
  if (top < 8) { top = r.bottom + 10; below = true; }
  tip.style.left = `${left + window.scrollX}px`;
  tip.style.top = `${top + window.scrollY}px`;
  tip.classList.toggle('below', below);
}

function show(el) {
  if (current === el) return;
  hide();
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  place(el);
  el.setAttribute('aria-describedby', 'tip');
  current = el;
}

function hide() {
  if (!current) return;
  current.removeAttribute('aria-describedby');
  current = null;
  tip.hidden = true;
}

// prose terms are not otherwise focusable; give them a tab stop
function prepare(root = document) {
  root.querySelectorAll('.term-def[data-tip]').forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
  });
}
prepare();
new MutationObserver(muts => {
  for (const m of muts) for (const node of m.addedNodes) if (node.nodeType === 1) prepare(node);
}).observe(document.body, { childList: true, subtree: true });

document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-tip]');
  if (el) show(el);
  else if (current && !tip.contains(e.target)) hide();
});
document.addEventListener('focusin', e => {
  const el = e.target.closest('[data-tip]');
  if (el) show(el);
});
document.addEventListener('focusout', e => {
  if (current && e.target.closest('[data-tip]') === current) hide();
});
document.addEventListener('click', e => {
  const el = e.target.closest('.term-def[data-tip]');
  if (!el) return;
  if (current === el) hide();
  else show(el);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
window.addEventListener('scroll', () => { if (current) place(current); }, { passive: true });
window.addEventListener('resize', () => { if (current) place(current); });
