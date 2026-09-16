import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

test('release uses committed bytes and refuses unsafe or inconsistent inputs', async t => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'disney-release-test-'));
  t.after(async () => {
    const target = path.resolve(fixture);
    assert.equal(path.dirname(target), path.resolve(tmpdir()));
    assert.ok(path.basename(target).startsWith('disney-release-test-'));
    await rm(target, { recursive: true, force: true });
  });
  const run = (program, args) => spawnSync(program, args, {
    cwd: fixture, encoding: 'utf8', maxBuffer: 1024 * 1024, windowsHide: true
  });
  const git = (...args) => {
    const result = run('git', args);
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    return result.stdout.trim();
  };
  const commit = message => {
    git('add', '.');
    git('-c', 'user.name=Release Test', '-c', 'user.email=release-test@example.invalid', 'commit', '-m', message);
  };
  const release = (...args) => run(process.execPath, ['scripts/release.mjs', ...args]);
  await mkdir(path.join(fixture, 'scripts')); await mkdir(path.join(fixture, 'dist'));
  await copyFile(fileURLToPath(new URL('./release.mjs', import.meta.url)), path.join(fixture, 'scripts', 'release.mjs'));
  await Promise.all([
    writeFile(path.join(fixture, 'package.json'), '{"name":"test-explorer","version":"1.0.0"}\n'),
    writeFile(path.join(fixture, '.gitignore'), 'artifacts/\n'),
    writeFile(path.join(fixture, 'README.md'), '# Fixture\n'),
    writeFile(path.join(fixture, 'LICENSE.md'), 'Fixture only\n'),
    writeFile(path.join(fixture, 'THIRD_PARTY_NOTICES.md'), 'Fixture only\n'),
    writeFile(path.join(fixture, 'dist', 'index.html'), '<!doctype html><title>Fixture</title>\n'),
    writeFile(path.join(fixture, 'dist', '花园.bin'), Buffer.from([0, 255, 128, 10, 13, 42]))
  ]);
  git('init', '--initial-branch=main');
  // Simulate Windows checkout conversion. Archives must still use LF Git blobs.
  git('config', 'core.autocrlf', 'true');
  commit('fixture');
  await t.test('source and website manifest, checksums and repeated output', async () => {
    const first = release('--version', '1.0.0', '--verify-reproducible');
    assert.equal(first.status, 0, first.stderr);
    const directory = path.join(fixture, 'artifacts', 'v1.0.0');
    const manifest = JSON.parse(await readFile(path.join(directory, 'release-manifest.json'), 'utf8'));
    assert.equal(manifest.commit, git('rev-parse', 'HEAD')); assert.equal(manifest.version, '1.0.0');
    assert.equal(manifest.archives[1].files, 2);
    const before = new Map();
    for (const file of await readdir(directory)) before.set(file, await readFile(path.join(directory, file)));
    const sums = (await readFile(path.join(directory, 'SHA256SUMS.txt'), 'utf8')).trim().split('\n');
    for (const line of sums) {
      const [expected, filename] = line.split('  ');
      assert.equal(createHash('sha256').update(before.get(filename)).digest('hex'), expected);
    }
    assert.equal(release().status, 0);
    for (const [filename, bytes] of before) assert.deepEqual(await readFile(path.join(directory, filename)), bytes);
  });
  await t.test('explicit version mismatch is rejected', () => {
    const result = release('--version', '2.0.0');
    assert.equal(result.status, 1); assert.match(result.stderr, /version/);
  });
  await t.test('uncommitted changes are rejected', async () => {
    await writeFile(path.join(fixture, 'not-committed.txt'), 'private draft');
    const result = release();
    assert.equal(result.status, 1); assert.match(result.stderr, /clean working tree/);
    await rm(path.join(fixture, 'not-committed.txt'));
  });
  await t.test('tracked private configuration is rejected', async () => {
    await writeFile(path.join(fixture, '.env'), 'TEST_ONLY=not-a-secret\n');
    commit('unsafe fixture');
    const result = release();
    assert.equal(result.status, 1); assert.match(result.stderr, /Refusing to archive.*\.env/);
    git('rm', '.env'); commit('remove fixture secret');
  });
  await t.test('a version tag on another commit cannot be reused', async () => {
    git('tag', 'v1.0.0');
    await writeFile(path.join(fixture, 'README.md'), '# New fixture\n'); commit('new fixture commit');
    const result = release();
    assert.equal(result.status, 1); assert.match(result.stderr, /already identifies another commit/);
  });
});
