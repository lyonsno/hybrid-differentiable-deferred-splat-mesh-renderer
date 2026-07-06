#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutDir = resolve(homedir(), '.local/state/kaminos/renderer-packages/meshsplat');

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] || null;
}

function gitValue(args, fallback = null) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    return fallback;
  }
}

const outDir = resolve(
  argValue('--out-dir')
    || process.env.KAMINOS_MESH_SPLAT_RENDERER_PACKAGE_DIR
    || defaultOutDir,
);

mkdirSync(outDir, { recursive: true });

await build({
  root: repoRoot,
  configFile: false,
  publicDir: false,
  assetsInclude: ['**/*.wgsl'],
  logLevel: 'info',
  build: {
    emptyOutDir: true,
    outDir,
    sourcemap: true,
    target: 'es2022',
    lib: {
      entry: resolve(repoRoot, 'src/splatOverlay.ts'),
      formats: ['es'],
      fileName: () => 'splatOverlay.js',
    },
  },
});

const manifest = {
  schema: 'meshsplat.renderer-package.v0',
  entry: 'splatOverlay.js',
  builtAt: new Date().toISOString(),
  sourceRepo: repoRoot,
  sourceBranch: gitValue(['rev-parse', '--abbrev-ref', 'HEAD']),
  sourceCommit: gitValue(['rev-parse', 'HEAD']),
};

writeFileSync(resolve(outDir, 'package-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  packageDir: outDir,
  entry: resolve(outDir, manifest.entry),
  manifest,
}, null, 2));
