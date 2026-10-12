// Builds a single-file version of the site (three.js loaded from a CDN) for quick sharing/previewing.
// Usage: node scripts/build-preview.mjs <output.html>
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = process.argv[2] || path.join(root, 'preview.html');
const shim = path.join(root, 'scripts', '.three-global.cjs');
fs.writeFileSync(shim, 'module.exports = window.THREE;');
const stub = path.join(root, 'scripts', '.analytics-stub.js');
fs.writeFileSync(stub, 'export const inject = () => {};'); // no analytics in the single-file preview
const r = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', write: false, minifyWhitespace: true, minifySyntax: true, alias: { three: shim, '@vercel/analytics': stub }, logLevel: 'error', define: { 'import.meta.env': 'undefined' } });
fs.unlinkSync(shim); fs.unlinkSync(stub);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = html.split('<!-- app:start -->')[1].split('<!-- app:end -->')[0];
const title = html.match(/<title>.*<\/title>/)[0];
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
fs.writeFileSync(out, `${title}
${html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0]}
<style>
${css}</style>
${body}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
${r.outputFiles[0].text}</script>
`);
console.log('wrote', out);
