# Solving Polynomials with Polygons

An interactive companion to the hyper-Catalan series solution of polynomial
equations — the combinatorics behind Wildberger–Rubine (2025) and the
follow-up papers by Mukewar & Rubine — as a website you can *play with*:

- **Subdigon explorer** — pick a mix of triangles, quadrilaterals, and
  pentagons; every subdivision of that type is enumerated and drawn live, and
  the count always matches the hyper-Catalan formula.
- **Series browser** — each term of the series that solves `y = 1 + t₂y² + t₃y³ + …`,
  with its coefficient linked to the pictures it counts.
- **Root playground** — type in a polynomial (up to degree 5) and watch the
  series converge digit-by-digit to a true root as bigger polygons join the sum,
  next to a live error chart.

No frameworks, no build step, no dependencies — plain ES modules, hostable on
GitHub Pages as-is.

## Run locally

```
python3 -m http.server 8000
# open http://localhost:8000
```

## Test the math engine

```
node test/test.mjs
```

Tests verify the dissection enumerator against the super-Catalan numbers,
every type-class count against the closed-form hyper-Catalan formula, the
classical Catalan special case, and that the series actually converges to
roots of sample quadratics and quintics.

## Layout

- `js/subdigons.js` — dissection enumeration, type vectors, hyper-Catalan numbers
- `js/solver.js` — general polynomial → geometric form, series partial sums, Durand–Kerner reference roots
- `js/viz.js` — SVG rendering of subdigons
- `js/app.js` — page wiring
- `extension/` — "Subdigon of the Day" new-tab Chrome extension
