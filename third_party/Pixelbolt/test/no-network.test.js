import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { packageFiles, root } from '../scripts/build-studio.mjs';
import { startStudio } from '../src/server.js';

const location = (file, source, at) => `${file}:${source.slice(0, at).split('\n').length}`;
async function packaging(folder = 'packaging') {
  const files = [];
  for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
    const file = `${folder}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await packaging(file)); else if (file.endsWith('.mjs')) files.push(file);
  }
  return files;
}
function checkSource(file, source) {
  const at = index => location(file, source, index);
  if (/\.(js|mjs)$/.test(file)) {
    // Deliberately conservative source checks: these spellings require review even in generated code strings.
    const httpImport = /\bimport\s+http\s+from\s*(['"])(?:node:)?http\1/.exec(source);
    const inImport = index => httpImport && index >= httpImport.index && index < httpImport.index + httpImport[0].length;
    for (const match of source.matchAll(/\b(?:from\s*|import\s*(?:\(\s*)?|require\s*\(\s*)(['"`])((?:node:)?(?:https|http2|net|tls|dgram|dns|http)(?:\/[^'"`]*)?)\1/g)) {
      assert.ok(file === 'src/server.js' && /^(?:node:)?http$/.test(match[2]) && inImport(match.index), `${at(match.index)}: network module ${match[2]} is forbidden; only the studio's http.createServer import is allowed`);
    }
    if (file === 'src/server.js') for (const match of source.matchAll(/\bhttp\b(?!:)/g)) {
      assert.ok(inImport(match.index) || /^http\s*\.\s*createServer\s*\(/.test(source.slice(match.index)), `${at(match.index)}: http may only be used as http.createServer`);
    }
    for (const match of source.matchAll(/\b(?:XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\b/g)) {
      assert.fail(`${at(match.index)}: ${match[0]} can make network calls`);
    }
    const fetches = [...source.matchAll(/\bfetch\s*\(/g)];
    if (file === 'src/runtime.js') {
      // The exported Canvas player loads the atlas URL supplied by its embedding page. It is not the studio:
      // allow its one existing fetch(url), not a blanket exception for future calls in this file.
      assert.equal(fetches.length, 1, `${at(fetches[1]?.index ?? fetches[0]?.index ?? 0)}: the Canvas player has exactly one caller-supplied fetch`);
      assert.match(source.slice(fetches[0].index), /^fetch\(url\)/, `${at(fetches[0].index)}: only the existing fetch(url) is allowed`);
    } else for (const match of fetches) {
      const literal = /^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1\s*[,)]/.exec(source.slice(match.index + match[0].length));
      assert.ok(file.startsWith('studio/') && literal && /^(?:\/(?![\/\\])|\.\/)/.test(literal[2]), `${at(match.index)}: fetch must take a same-origin relative string or template starting with / or ./`);
    }
  }
  if (file.startsWith('studio/') && /\.(html|css)$/.test(file)) {
    const local = (value, index) => assert.ok(!/^\s*(?:https?:|\/\/)/i.test(value), `${at(index)}: external resource ${value} is forbidden`);
    for (const tag of source.matchAll(/<(script|link|img)\b[^>]*>/gi)) {
      const attribute = new RegExp(`\\b${tag[1].toLowerCase() === 'link' ? 'href' : 'src'}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'gi');
      for (const match of tag[0].matchAll(attribute)) local(match[1] ?? match[2] ?? match[3], tag.index + match.index);
    }
    for (const match of source.matchAll(/(?:@import\s+(?!url\s*\()|\burl\s*\(\s*)(?:"([^"]*)"|'([^']*)'|([^\s);]+))/gi)) local(match[1] ?? match[2] ?? match[3], match.index);
  }
}

test('shipped JavaScript and studio resources make no external network calls', async () => {
  for (const file of [...await packageFiles(), ...await packaging()]) {
    if (/\.(js|mjs|html|css)$/.test(file)) checkSource(file, await readFile(path.join(root, file), 'utf8'));
  }
});

test('the network check rejects regressions with the file and line', async () => {
  const file = 'studio/studio.js', source = await readFile(path.join(root, file), 'utf8'), copy = `${source}\nfetch('https://example.com');\n`;
  assert.throws(() => checkSource(file, copy), { message: `${location(file, copy, source.length + 1)}: fetch must take a same-origin relative string or template starting with / or ./` }, `${file}:${source.split('\n').length + 1}: an external fetch added to a copy must fail`);
  for (const [file, source] of [
    ['src/example.js', "import { lookup } from 'node:dns/promises';"],
    ['packaging/common/launcher/example.mjs', "const tls = require('tls');"],
    ['src/example.js', "await import('node:https');"],
    ['src/example.js', "import http from 'http';"],
    ['src/server.js', "import http from 'node:http';\nhttp.request('/');"],
    ['src/server.js', "import http from 'node:http';\nhttp.get('/');"],
    ['src/server.js', "import http from 'node:http';\nnew http.Agent();"],
    ['src/runtime.js', 'fetch(url); fetch(url);'],
    ...['XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'importScripts'].map(name => ['studio/example.js', `${name}('/');`]),
    ['studio/example.js', "fetch('//example.com');"],
    ['studio/example.js', 'fetch(url);'],
    ['studio/example.js', "fetch('/' + host);"],
    ['studio/example.html', '<script\n src="https://example.com/a.js"></script>'],
    ['studio/example.html', '<link href=//example.com/a.css>'],
    ['studio/example.html', "<img src='http://example.com/a.png'>"],
    ['studio/example.css', '@import "https://example.com/a.css";'],
    ['studio/example.css', '@import url(//example.com/a.css);'],
    ['studio/example.css', 'body { background: url("http://example.com/a.png"); }']
  ]) assert.throws(() => checkSource(file, source), error => error.code === 'ERR_ASSERTION' && error.message.startsWith(`${file}:`), `${file}:1: the network regression must fail with its location`);
  checkSource('studio/example.html', '<a href="https://example.com">Visit</a><script src="/studio.js"></script>');
  checkSource('studio/example.js', 'fetch(`/examples/${name}.json`); fetch("./scene.json");');
});

test('the studio sends a self-only default Content-Security-Policy', async () => {
  const source = await readFile(path.join(root, 'src/server.js'), 'utf8'), at = location('src/server.js', source, Math.max(0, source.indexOf("'Content-Security-Policy'")));
  const server = await startStudio({ port: 0, quiet: true });
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/`);
    await response.arrayBuffer();
    assert.match(response.headers.get('content-security-policy') ?? '', /(?:^|;\s*)default-src 'self'(?:;|$)/, `${at}: responses must carry default-src 'self'`);
  } finally { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
