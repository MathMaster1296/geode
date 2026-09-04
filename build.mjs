// Bundles the modular site into single-file variants and refreshes the
// extension's copies of the shared modules. No dependencies; run `node build.mjs`.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';

const stripModules = f => readFileSync(f, 'utf8')
  .replace(/^import[\s\S]*?from '.\/[a-z]+\.js';\n/gm, '')
  .replace(/^import '.\/[a-z]+\.js';\n/gm, '')
  .replace(/^export /gm, '');

const css = readFileSync('css/style.css', 'utf8');
const js = ['js/subdigons.js', 'js/solver.js', 'js/viz.js', 'js/paneling.js', 'js/identity.js', 'js/powers.js', 'js/words.js', 'js/app.js'].map(stripModules).join('\n');
const html = readFileSync('index.html', 'utf8');

mkdirSync('dist', { recursive: true });

// full standalone page
writeFileSync('dist/single.html', html
  .replace('<link rel="stylesheet" href="css/style.css">', `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="js/app.js"></script>', `<script type="module">\n${js}\n</script>`));

// body-only variant (for hosts that wrap content in their own document shell)
const bodyInner = html.match(/<body>([\s\S]*)<\/body>/)[1]
  .replace('<script type="module" src="js/app.js"></script>', '');
const fontsLink = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]*>/)[0];
writeFileSync('dist/artifact.html', `<title>Solving Polynomials with Polygons</title>
${fontsLink}
<style>
${css}
</style>
${bodyInner}
<script type="module">
${js}
</script>
`);

// extension gets its own copies of the shared math/render modules
for (const f of ['subdigons.js', 'viz.js']) copyFileSync(`js/${f}`, `extension/${f}`);
console.log('built dist/single.html, dist/artifact.html; synced extension modules');
