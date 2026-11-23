// gta6-meme-x-01 entry: this program's only job is to hand POST.json to the
// grader. The entry itself is the X post the file names; the house reads the
// post (its first picture and its text) from X and judges that. Nothing this
// program writes is judged, so it stays small, deterministic and stdlib-only.
//
// Local check (mirrors the grader's /bot -> /output layout):
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const BOT_DIR = resolve(process.env.MAKEFUN_BOT_DIR ?? '/bot');
const OUTPUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function fail(message: string): never {
  console.error(`gta6-meme-x-01: ${message}`);
  process.exit(1);
}

const source = join(BOT_DIR, 'POST.json');
if (!existsSync(source)) {
  fail(`POST.json not found in ${BOT_DIR}`);
}

let payload: Buffer;
try {
  payload = readFileSync(source);
} catch (err) {
  fail(`could not read ${source}: ${(err as Error).message}`);
}

// Fail fast on a malformed post file: the gate only accepts a JSON object
// with a string url, so there is no point copying anything else.
let parsed: unknown;
try {
  parsed = JSON.parse(payload.toString('utf8'));
} catch (err) {
  fail(`POST.json is not valid JSON: ${(err as Error).message}`);
}
if (
  typeof parsed !== 'object' ||
  parsed === null ||
  Array.isArray(parsed) ||
  typeof (parsed as { url?: unknown }).url !== 'string'
) {
  fail('POST.json must be a JSON object with a string "url" field');
}

// The gate wants exactly https://x.com/<handle>/status/<digits> — no
// query string, no fragment, digits-only id. A leftover placeholder or a
// pasted share link would pass the JSON check above and fail the gate, so
// reject it here before copying anything.
const url = (parsed as { url: string }).url;
if (!/^https:\/\/x\.com\/[^/\s]+\/status\/\d+$/.test(url)) {
  fail(`POST.json url is not a plain X post link: ${url}`);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

const destination = join(OUTPUT_DIR, 'POST.json');
try {
  writeFileSync(destination, payload);
} catch (err) {
  fail(`could not write POST.json to ${OUTPUT_DIR}: ${(err as Error).message}`);
}

// Confirm the copy landed byte for byte; a partial write would fail the gate.
if (!readFileSync(destination).equals(payload)) {
  fail(`POST.json copy to ${OUTPUT_DIR} does not match the source`);
}
