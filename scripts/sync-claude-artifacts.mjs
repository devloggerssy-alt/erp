#!/usr/bin/env node
/**
 * Sync canonical .ai/skills → .claude/skills for Claude Code teammates.
 * Run after adding or updating skills in .ai/skills/
 *
 * Usage: node scripts/sync-claude-artifacts.mjs
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const source = join(root, '.ai', 'skills');
const target = join(root, '.claude', 'skills');

const SKIP_FILES = new Set(['UPSTREAM.md']);

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    if (SKIP_FILES.has(entry.name)) continue;

    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      cpSync(srcPath, destPath);
    }
  }
}

function main() {
  if (!existsSync(source)) {
    console.error('Missing .ai/skills/ — nothing to sync.');
    process.exit(1);
  }

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(target, { recursive: true });

  copyDir(source, target);

  const rel = relative(root, target);
  console.log(`Synced .ai/skills/ → ${rel}/ (skipped UPSTREAM.md files)`);
  console.log('Claude Code will discover skills from .claude/skills/*/SKILL.md');
}

main();
