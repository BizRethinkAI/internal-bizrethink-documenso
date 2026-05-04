#!/usr/bin/env node

/**
 * Pacta brand asset generator.
 *
 * Reads the master SVGs in this directory and emits all the rendered PNG/ICO
 * outputs the Documenso fork's apps/remix/public/ tree expects, plus inline
 * SVG variants for email templates.
 *
 * Run: `node packages/bizrethink/branding/build-assets.mjs`
 *
 * Outputs (relative to repo root):
 *   apps/remix/public/favicon.ico              (multi-res 16/32/48)
 *   apps/remix/public/apple-touch-icon.png     (180×180)
 *   apps/remix/public/android-chrome-192x192.png
 *   apps/remix/public/android-chrome-512x512.png
 *   apps/remix/public/static/logo.png          (signing-page header, ~600×200)
 *   apps/remix/public/static/logo-symbol.png   (256×256, square symbol-only)
 *
 * Re-run any time pacta-symbol.svg or pacta-horizontal.svg changes.
 */
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import toIco from 'to-ico';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..', '..');
const PUBLIC_DIR = resolve(REPO_ROOT, 'apps', 'remix', 'public');
const STATIC_DIR = resolve(PUBLIC_DIR, 'static');

const SYMBOL_SVG = resolve(HERE, 'pacta-symbol.svg');
const HORIZONTAL_SVG = resolve(HERE, 'pacta-horizontal.svg');

async function renderPng(svgPath, outPath, width, height = width, padding = 0) {
  const svg = await fs.readFile(svgPath);
  const padded =
    padding > 0
      ? sharp(svg, { density: 600 })
          .resize(width - padding * 2, height - padding * 2, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 255, g: 255, b: 255, alpha: 0 },
          })
      : sharp(svg, { density: 600 }).resize(width, height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        });
  await padded.png().toFile(outPath);
  console.log(`  ✓ ${outPath.replace(REPO_ROOT + '/', '')} (${width}×${height})`);
}

async function buildFaviconIco(outPath) {
  const sizes = [16, 32, 48];
  const buffers = [];
  for (const s of sizes) {
    const svg = await fs.readFile(SYMBOL_SVG);
    const png = await sharp(svg, { density: 600 })
      .resize(s, s, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    buffers.push(png);
  }
  const ico = await toIco(buffers);
  await fs.writeFile(outPath, ico);
  console.log(`  ✓ ${outPath.replace(REPO_ROOT + '/', '')} (multi-res ${sizes.join('/')})`);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  console.log('Pacta asset generator\n');
  await ensureDir(STATIC_DIR);

  console.log('Symbol-based outputs:');
  await buildFaviconIco(resolve(PUBLIC_DIR, 'favicon.ico'));
  // Browser-tab favicon PNGs — root.tsx specifically references these
  // sizes; without them the browser falls back to whatever stale
  // upstream PNGs ship in apps/remix/public/.
  await renderPng(SYMBOL_SVG, resolve(PUBLIC_DIR, 'favicon-16x16.png'), 16);
  await renderPng(SYMBOL_SVG, resolve(PUBLIC_DIR, 'favicon-32x32.png'), 32);
  // Apple/Android icons — the new symbol fills its tile (charcoal
  // rounded square), so no extra safe-inset is needed.
  await renderPng(SYMBOL_SVG, resolve(PUBLIC_DIR, 'apple-touch-icon.png'), 180);
  await renderPng(SYMBOL_SVG, resolve(PUBLIC_DIR, 'android-chrome-192x192.png'), 192);
  await renderPng(SYMBOL_SVG, resolve(PUBLIC_DIR, 'android-chrome-512x512.png'), 512);
  await renderPng(SYMBOL_SVG, resolve(STATIC_DIR, 'logo-symbol.png'), 256);

  console.log('\nHorizontal-lockup outputs:');
  // Horizontal lockup at signing-page header size — 480×160 viewBox at 1.5x = 720×240
  await renderPng(HORIZONTAL_SVG, resolve(STATIC_DIR, 'logo.png'), 720, 240);

  console.log('\nDone. Commit the updated assets.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
