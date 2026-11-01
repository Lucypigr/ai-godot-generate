import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createRevisionStore } from '../src/revisions.js';

async function directory(t) {
  const root = path.resolve(os.tmpdir()), dir = await mkdtemp(path.join(root, 'pixelbolt-revisions-'));
  t.after(async () => { assert.ok(dir.startsWith(root + path.sep)); await rm(dir, { recursive: true, force: true }); });
  return dir;
}
const recipe = { version: 1, name: 'sprite', width: 1, height: 1, frames: [{ name: 'idle' }] };

test('revisions persist across store instances and concurrent saves do not overwrite snapshots', async t => {
  const dir = await directory(t), one = createRevisionStore(dir), two = createRevisionStore(dir);
  const ids = await Promise.all([one.remember(recipe), two.remember(recipe), one.remember(recipe)]);
  assert.equal(new Set(ids).size, 1);
  assert.deepEqual(await createRevisionStore(dir).read(ids[0]), recipe);
  assert.deepEqual(await readdir(path.join(dir, '.revisions')), [`${ids[0]}.json`]);
  const changed = { ...recipe, width: 2 }, next = await two.remember(changed);
  assert.notEqual(next, ids[0]);
  assert.deepEqual(await one.read(ids[0]), recipe);
  assert.deepEqual(await one.read(next), changed);
});

test('revision reads reject traversal and corruption, and never overwrite damaged files', async t => {
  const dir = await directory(t), store = createRevisionStore(dir), id = await store.remember(recipe);
  for (const bad of ['../recipe', '/absolute', '..\\recipe', {}, null, 1]) await assert.rejects(store.read(bad), /12-character revision/);
  await assert.rejects(store.read('000000000000'), /same MCP --out directory/);
  const file = path.join(dir, '.revisions', `${id}.json`);
  await writeFile(file, 'damaged');
  await assert.rejects(store.read(id), /damaged/);
  await assert.rejects(store.remember(recipe), /refusing to overwrite/);
  assert.equal(await readFile(file, 'utf8'), 'damaged');
});

test('older rendered recipes recover the same revision id without modifying the bundle', async t => {
  const dir = await directory(t), bundle = path.join(dir, 'sprite-legacy');
  await mkdir(bundle);
  const text = JSON.stringify(recipe, null, 2) + '\n', file = path.join(bundle, 'sprite.pixel.json');
  await writeFile(file, text);
  await writeFile(path.join(bundle, 'broken.pixel.json'), '{');
  const id = createHash('sha256').update(JSON.stringify(recipe)).digest('hex').slice(0, 12);
  assert.deepEqual(await createRevisionStore(dir).read(id), recipe);
  assert.equal(await readFile(file, 'utf8'), text);
  assert.deepEqual(await readdir(path.join(dir, '.revisions')), [`${id}.json`]);
  assert.deepEqual(await createRevisionStore(dir).read(id), recipe);
});
