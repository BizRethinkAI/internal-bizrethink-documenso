#!/usr/bin/env node
// Merge BizRethink Prisma additions into Documenso's upstream schema.prisma.
//
// Wired by overlay 007 as a prebuild step in `packages/prisma/package.json`,
// running before `prisma generate`. Idempotent — running multiple times yields
// the same result. Safe to run from a dirty git state.
//
// Algorithm:
//   1. Read packages/bizrethink/prisma-extensions/additions.prisma
//   2. Read packages/prisma/schema.prisma
//   3. Strip any existing block between BIZRETHINK_ADDITIONS_BEGIN and END
//   4. Append a fresh block at the end of schema.prisma with the additions
//   5. Write schema.prisma in-place
//
// The marker block is the contract with future upstream merges:
//   - If upstream modifies schema.prisma, our marker block survives at the
//     bottom (git's merge sees content-only conflicts only if upstream also
//     happens to modify the bottom of the file)
//   - If a developer forgets to re-run this script, schema.prisma will be
//     missing our additions and Prisma generate will produce a stale client
//     for any code that imports our additive models. Always run via build.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADDITIONS_PATH = resolve(__dirname, 'additions.prisma');
const SCHEMA_PATH = resolve(__dirname, '../../prisma/schema.prisma');

const MARKER_BEGIN =
  '// BIZRETHINK_ADDITIONS_BEGIN — managed by packages/bizrethink/prisma-extensions/merge-into-schema.mjs';
const MARKER_END = '// BIZRETHINK_ADDITIONS_END';

function stripExistingBlock(schema) {
  const beginIdx = schema.indexOf(MARKER_BEGIN);
  if (beginIdx === -1) {
    return schema;
  }
  const endIdx = schema.indexOf(MARKER_END, beginIdx);
  if (endIdx === -1) {
    throw new Error(
      `Found ${MARKER_BEGIN} in schema.prisma but no matching ${MARKER_END}. Refusing to proceed; manually fix the schema and re-run.`,
    );
  }
  // Strip from the begin marker through the end marker + the newline after it.
  const afterEnd = schema.indexOf('\n', endIdx);
  const cutEnd = afterEnd === -1 ? schema.length : afterEnd + 1;
  return schema.slice(0, beginIdx).replace(/\n+$/, '') + '\n' + schema.slice(cutEnd);
}

function appendBlock(schema, additions) {
  const block = [
    '',
    MARKER_BEGIN,
    '// DO NOT EDIT BY HAND. Edit packages/bizrethink/prisma-extensions/additions.prisma',
    '// then run: npm run prisma:merge-additions (or trigger any prisma script in this package).',
    '',
    additions.trim(),
    '',
    MARKER_END,
    '',
  ].join('\n');
  return schema.replace(/\n+$/, '') + '\n' + block;
}

function main() {
  const additions = readFileSync(ADDITIONS_PATH, 'utf-8');
  const schema = readFileSync(SCHEMA_PATH, 'utf-8');

  const stripped = stripExistingBlock(schema);
  const merged = appendBlock(stripped, additions);

  if (merged === schema) {
    console.log('[bizrethink:prisma-merge] No changes needed (schema.prisma already up-to-date).');
    return;
  }

  writeFileSync(SCHEMA_PATH, merged, 'utf-8');
  console.log(
    `[bizrethink:prisma-merge] Merged additions.prisma into schema.prisma (${additions.split('\n').length} additions lines).`,
  );
}

main();
