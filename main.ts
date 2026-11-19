// Leonida Trophy Guide — the hand-in program for this entry (Node 22+, stdlib only).
//
// The guide itself is app/: plain static files, no build step. app/index.html opens
// in a browser and works with the network off; every file it loads lives under app/,
// and its trophy list and guides live in app/data/trophies.json.
//
// This program copies app/ and screenshots/ from beside this file into the output
// directory and writes output/dossier.json with the vendored make.fun library
// (vendor/makefun-frontend.ts, the kit's copy, unchanged — the scorer rebuilds the
// dossier with its own copy and compares byte for byte).
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Refuse to hand in a half-built entry: the guide and its screenshots must be
// there before anything is copied, so a typo in a path fails loudly here
// instead of producing a dossier the scorer rejects.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — build the guide before running main.ts');
}
const shots = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((f) => !f.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 3 or 4 images, found ${shots.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others refuse an
// entry the scorer would refuse (more than 4 screenshots or one over 256 KiB; more
// than 993 files and directories in app/, or 48 MiB of app files — app/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

console.log(`Leonida Trophy Guide handed in: ${shots.length} screenshots, dossier.json written to ${out}`);
