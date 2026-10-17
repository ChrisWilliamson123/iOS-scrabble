#!/usr/bin/env node
// build/bundle.js — concatenates all src/game/*.js modules (in dependency order), inlines
// styles.css, embeds the base64 DAWG blob, and assembles the single dist/scrabble.html file.
// This is the ONLY build step that produces what actually gets opened on the iPad.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// Dependency order matters: each file is wrapped in an IIFE that attaches to a shared
// `Scrabble` namespace object (via `global.Scrabble.X = X` in the browser). As long as a
// module's dependencies appear earlier in this list, `global.Scrabble.Dep` will already
// exist when the dependent module's IIFE runs.
const JS_FILES = [
  'game/tileData.js',
  'game/board.js',
  'game/bag.js',
  'game/dawg.js',
  'game/dictionary.js',
  'game/state.js',
  'game/moveValidation.js',
  'game/scoring.js',
  'game/turnReducer.js',
  'game/timer.js',
  'game/persistence.js',
  'game/render/dom.js',
  'game/render/components/tile.js',
  'game/render/components/boardCell.js',
  'game/render/components/rack.js',
  'game/render/boardGrid.js',
  'game/render/setupScreen.js',
  'game/render/interstitialScreen.js',
  'game/render/gameOverScreen.js',
  'game/render/dictLookupModal.js',
  'game/render/boardRackScreen.js',
  'game/main.js'
];

function readSrc(relPath) {
  return fs.readFileSync(path.join(SRC, relPath), 'utf8');
}

function main() {
  console.log('Bundling', JS_FILES.length, 'JS modules...');
  const jsBundle = JS_FILES.map((f) => '// ---- ' + f + ' ----\n' + readSrc(f)).join('\n\n');

  console.log('Reading CSS...');
  const css = readSrc('styles.css');

  console.log('Reading compiled dictionary blob...');
  const dawgB64Path = path.join(__dirname, 'dawg.bin.b64');
  if (!fs.existsSync(dawgB64Path)) {
    console.error('Missing build/dawg.bin.b64 — run `npm run build:dict` first.');
    process.exit(1);
  }
  const dictBase64 = fs.readFileSync(dawgB64Path, 'utf8');

  // Credits text required by SCOWL's permissive license (attribution notice must remain
  // alongside any distribution of the word list -- see src/dictionary/SOURCE.md).
  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
<title>Scrabble — Pass &amp; Play</title>
<style>
${css}
</style>
</head>
<body>
<div id="app"></div>

<!-- Embedded dictionary data (base64-encoded DAWG). Not a script to be executed -- plain
     text payload decoded at runtime by game/dictionary.js. type="text/plain" avoids the
     browser attempting to parse/execute it, and avoids any risk of "</script>" collisions
     since it is never interpreted as script content. -->
<script id="dict-data" type="text/plain">${dictBase64}</script>

<script>
${jsBundle}

// Boot sequence: initialize the dictionary from the embedded blob, then mount the app.
(function () {
  var dictDataEl = document.getElementById('dict-data');
  if (!dictDataEl) {
    document.getElementById('app').textContent = 'Fatal error: dictionary data missing.';
    return;
  }
  try {
    Scrabble.Dictionary.init(dictDataEl.textContent.trim());
  } catch (e) {
    document.getElementById('app').textContent = 'Fatal error: dictionary failed to load (' + e.message + ').';
    return;
  }
  Scrabble.boot('app');
})();
</script>

<!--
  Word list credit (required by license -- see src/dictionary/SOURCE.md and
  src/dictionary/SCOWL-COPYRIGHT.txt in the project repository for full terms):
  Word list derived from SCOWL / English Speller Database (ESDB),
  Copyright 2000-2026 by Kevin Atkinson, used under its permissive license.
-->
</body>
</html>
`;

  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
  const outPath = path.join(DIST, 'scrabble.html');
  fs.writeFileSync(outPath, html, 'utf8');

  const stats = fs.statSync(outPath);
  console.log('Wrote', outPath, '(' + (stats.size / 1024 / 1024).toFixed(2) + ' MB)');
}

main();
