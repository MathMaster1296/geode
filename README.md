# Geode

Live at [mathmaster1296.github.io/geode](https://mathmaster1296.github.io/geode/).

In 2025, Wildberger and Rubine published a power series that solves every
polynomial equation, with coefficients that count subdivided polygons rather
than coming from nested radicals. I worked on two follow-up papers about the
finite structure behind that series, and this site is the interactive version
of the math. Every number on the page is computed in your browser: the polygons
behind each coefficient are enumerated and drawn while you watch, and the
series converges to roots of real equations in front of you.

Things to try:

- Pick a mix of triangles, quadrilaterals, and pentagons in Plate I. The site
  draws every subdivision of that type, and the count lands exactly on the
  hyper-Catalan formula.
- Click any term of the series in Plate II to see the pictures its coefficient
  counts.
- Fill the slots of the paneling operator in Plate II·b and watch it glue the
  pieces into one subdigon. That single move is the reason the series solves
  the equation.
- Load Wallis's cubic x³ − 2x − 5 = 0 in the playground and drag the
  polygon-size slider. Nine digits of the root appear before the polygons
  reach ten vertices, and the complex-plane panel shows the estimate walking
  onto the circled root.
- Load x⁵ − x − 1, a quintic with no formula in radicals. The series diverges
  at first; press re-center once and it lands on the root anyway.
- Press "replay the paper's two passes" and watch Wallis's cubic go from a
  diverging series to sixteen matching digits, exactly as the Monthly paper
  reports. Plate III·b shows why the first pass needed re-centering: the dot
  starts far outside the convergence region and lands deep inside it.
- Cut the series at degree 7 in Plate III·c. Every coefficient cancels to an
  exact zero in big-integer arithmetic, and the lone survivor is the next
  Catalan number.
- Fill the slots in Plate V with subdigons, then rotate the combined word.
  With three subdigons the rank is −3 and exactly three rotations parse, which
  is Raney's lemma doing its job in front of you.
- Open a term of S³ in Plate IV·b to see the subdigons with a central
  quadrilateral that the coefficient counts.
- Set up any equation you like, press copy link, and send it. The URL
  reproduces your exact setup.

The site is plain HTML, CSS, and ES modules, with no framework and no build
step, so GitHub Pages serves the repo as-is.

## The papers

- Pratham Mukewar, *Finite Interpretations of a Hyper-Catalan Series Solution
  to Polynomial Equations and Visualizations*, Journal of Student Research.
  [arXiv:2507.20003](https://arxiv.org/abs/2507.20003)
- Dean Rubine and Pratham Mukewar, *Finite Interpretation of the Hyper-Catalan
  Series Zero and its Powers*, submitted to Involve.
  [arXiv:2508.06739](https://arxiv.org/abs/2508.06739)
- N. J. Wildberger and Dean Rubine, *A Hyper-Catalan Series Solution to
  Polynomial Equations, and the Geode*, The American Mathematical Monthly
  132:5 (2025). [doi:10.1080/00029890.2025.2460966](https://doi.org/10.1080/00029890.2025.2460966)

## Run locally

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Tests

```
node test/test.mjs
```

The tests enumerate all dissections of small polygons and compare the totals to
the super-Catalan numbers, check every type class against the closed
hyper-Catalan formula, build the Geode table two independent ways, and run the
series solver on equations with known roots, including Wallis's cubic and the
cubic whose root is sin 10°. They also check the powers formula against brute
enumeration of central faces and expand the finite identity exactly, zero by
zero.

## Layout

| Path | What it is |
|---|---|
| `js/subdigons.js` | dissection enumeration, type vectors, hyper-Catalan and Geode numbers |
| `js/solver.js` | polynomial to geometric form, series partial sums, Durand–Kerner reference roots |
| `js/viz.js` | SVG rendering of subdigons |
| `js/paneling.js` | the paneling-operator animation |
| `js/identity.js` | the finite-identity checker |
| `js/powers.js` | the powers-of-S explorer |
| `js/words.js` | dual trees, Łukasiewicz words, and the Raney parsing rule |
| `js/app.js` | page wiring |
| `extension/` | the "Subdigon of the Day" new-tab Chrome extension |
| `build.mjs` | bundles everything into `dist/single.html` |
