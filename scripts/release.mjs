import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
function git(args, input) {
  const result = spawnSync('git', args, {
    cwd: project, input, maxBuffer: 512 * 1024 * 1024, windowsHide: true,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  });
  if (result.error || result.status !== 0) {
    throw new Error(result.error?.message || result.stderr.toString().trim() || `git ${args[0]} failed`);
  }
  return result.stdout;
}

// Standard ZIP DEFLATE. Fixed timestamps, sorted UTF-8 names and Git blobs make
// bytes repeatable within the same Node.js/zlib toolchain, without checkout EOL drift.
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function zip(entries) {
  if (entries.length > 65535) throw new Error('ZIP64 is not supported; too many files.');
  const parts = [], directory = [];
  let offset = 0;
  for (const entry of [...entries].sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)))) {
    const name = Buffer.from(entry.name, 'utf8'), data = entry.data;
    const compressed = deflateRawSync(data, { level: 9 });
    if (name.length > 65535 || data.length >= 0xffffffff) throw new Error('ZIP entry is too large.');
    const crc = crc32(data), local = Buffer.alloc(30), central = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8); // UTF-8; method 8 = DEFLATE.
    local.writeUInt16LE(33, 12); // 1980-01-01, 00:00:00.
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(0x0314, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(8, 10); central.writeUInt16LE(33, 14);
    central.writeUInt32LE(crc, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0x81a40000, 38); // regular file, 0644.
    central.writeUInt32LE(offset, 42);
    parts.push(local, name, compressed); directory.push(central, name);
    offset += local.length + name.length + compressed.length;
    if (offset >= 0xffffffff) throw new Error('ZIP64 is not supported; archive is too large.');
  }
  const directorySize = directory.reduce((sum, item) => sum + item.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directorySize, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...directory, end]);
}

function validatePath(name) {
  const parts = name.split('/');
  const forbidden = new Set(['.git', 'node_modules', 'work', 'outputs', 'artifacts', 'coverage', '.openai', '.sites-runtime',
    '.npmrc', '.netrc', '.git-credentials', '.ssh']);
  if (!name || name.startsWith('/') || name.includes('\\') || name.includes('\0') ||
      parts.some(part => !part || part === '.' || part === '..' || forbidden.has(part.toLowerCase())) ||
      parts.some(part => /^\.env(?:\.|$)/i.test(part)) ||
      /\.(?:pem|key|p12|pfx)$/i.test(name) || /(?:^|\/)(?:credentials|secrets?)\.(?:json|ya?ml|toml)$/i.test(name)) {
    throw new Error(`Refusing to archive private/runtime or unsafe path: ${name}`);
  }
}

function committedFiles(commit) {
  const listing = git(['ls-tree', '-r', '-z', commit]).toString('utf8').split('\0').filter(Boolean);
  const entries = listing.map(line => {
    const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(line);
    if (!match || match[2] !== 'blob' || !['100644', '100755'].includes(match[1])) {
      throw new Error('Release contains a symlink, submodule or unsupported Git entry.');
    }
    validatePath(match[4]);
    return { oid: match[3], name: match[4] };
  });
  const objects = [...new Set(entries.map(entry => entry.oid))];
  const output = git(['cat-file', '--batch'], objects.join('\n') + '\n'), blobs = new Map();
  let offset = 0;
  for (const oid of objects) {
    const end = output.indexOf(10, offset);
    const header = output.subarray(offset, end).toString('utf8').split(' ');
    const size = Number(header[2]);
    if (end < offset || header[0] !== oid || header[1] !== 'blob' || !Number.isSafeInteger(size) || size < 0) {
      throw new Error('Invalid git cat-file response.');
    }
    offset = end + 1;
    if (offset + size >= output.length || output[offset + size] !== 10) throw new Error('Truncated Git blob.');
    blobs.set(oid, output.subarray(offset, offset + size));
    offset += size + 1;
  }
  if (offset !== output.length) throw new Error('Unexpected trailing Git output.');
  return entries.map(entry => ({ name: entry.name, data: blobs.get(entry.oid) }));
}

function artifacts({ entries, version, commit, committedAt, name }) {
  const source = entries;
  const website = entries.filter(entry => entry.name.startsWith('dist/'))
    .map(entry => ({ ...entry, name: entry.name.slice(5) }));
  if (!website.some(entry => entry.name === 'index.html')) throw new Error('Missing dist/index.html');
  for (const required of ['package.json', 'README.md', 'THIRD_PARTY_NOTICES.md']) {
    if (!source.some(entry => entry.name === required)) throw new Error(`Missing release document: ${required}`);
  }
  if (!source.some(entry => ['LICENSE', 'LICENSE.md'].includes(entry.name))) {
    throw new Error('Missing release document: LICENSE or LICENSE.md');
  }
  const output = new Map(), archives = [];
  for (const [kind, files] of [['source', source], ['website', website]]) {
    const filename = `${name}-v${version}-${kind}.zip`, buffer = zip(files);
    output.set(filename, buffer);
    archives.push({
      filename, sha256: sha256(buffer), archiveBytes: buffer.length,
      files: files.length, uncompressedBytes: files.reduce((sum, entry) => sum + entry.data.length, 0)
    });
  }
  const manifest = {
    schemaVersion: 1, name, version, tag: `v${version}`, commit, committedAt,
    archives,
    reproducibility: {
      input: 'Tracked regular files at the specified Git commit; working-tree line endings are not used.',
      zip: 'DEFLATE level 9, UTF-8 names sorted by UTF-8 bytes, 1980-01-01 timestamps, regular-file mode 0644.',
      toolchain: { node: process.versions.node, zlib: process.versions.zlib },
      scope: 'Identical Git commit, script and Node.js/zlib versions produce identical outputs. Byte identity across different zlib versions is not promised.',
      privacy: 'No deployment or repository visibility change is performed. Distribution access is controlled by the host.'
    }
  };
  output.set('release-manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  output.set('SHA256SUMS.txt', Buffer.from([...output].map(([filename, buffer]) => `${sha256(buffer)}  ${filename}`).join('\n') + '\n'));
  return output;
}

async function main() {
  const args = process.argv.slice(2), options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--verify-reproducible') options.verify = true;
    else if (['--out', '--version'].includes(args[i]) && args[i + 1]) options[args[i].slice(2)] = args[++i];
    else throw new Error('Usage: node scripts/release.mjs [--out directory] [--version 1.0.0] [--verify-reproducible]');
  }
  if (git(['status', '--porcelain', '--untracked-files=all']).length) {
    throw new Error('Release requires a clean working tree. Commit all intended changes first.');
  }
  const commit = git(['rev-parse', 'HEAD']).toString().trim();
  const committedAt = git(['show', '-s', '--format=%cI', commit]).toString().trim();
  const entries = committedFiles(commit);
  const packageEntry = entries.find(entry => entry.name === 'package.json');
  if (!packageEntry) throw new Error('Missing committed package.json');
  const pkg = JSON.parse(packageEntry.data.toString('utf8'));
  const working = JSON.parse(await readFile(path.join(project, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(pkg.version) || working.version !== pkg.version ||
      (options.version && options.version !== pkg.version)) throw new Error('Release version is invalid or does not match the committed package.json.');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(pkg.name)) throw new Error('Unsafe package name.');
  const tag = git(['tag', '--list', `v${pkg.version}`]).toString().trim();
  if (tag && git(['rev-list', '-n', '1', tag]).toString().trim() !== commit) {
    throw new Error(`Tag ${tag} already identifies another commit. Bump the version before releasing.`);
  }
  const parameters = { entries, version: pkg.version, commit, committedAt, name: pkg.name };
  const output = artifacts(parameters);
  if (options.verify) {
    const repeated = artifacts(parameters);
    for (const [filename, buffer] of output) {
      if (!buffer.equals(repeated.get(filename))) throw new Error(`Reproducibility check failed: ${filename}`);
    }
    console.log('PASS: repeated archive, manifest and checksum generation is byte-identical.');
  }
  const destination = options.out ? path.resolve(options.out) : path.join(project, 'artifacts', `v${pkg.version}`);
  await mkdir(destination, { recursive: true });
  for (const [filename, buffer] of output) {
    await writeFile(path.join(destination, filename), buffer);
    console.log(`${filename}  ${buffer.length} bytes  SHA256 ${sha256(buffer)}`);
  }
  console.log(`Release v${pkg.version} from ${commit}\nOutput: ${destination}\nNo website was deployed.`);
}

main().catch(error => { console.error(`Release failed: ${error.message}`); process.exitCode = 1; });
