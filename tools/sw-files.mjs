import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const check = args.includes('--check');
const rootArg = args.find((a) => !a.startsWith('--'));
const root = rootArg ? resolve(rootArg) : join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const out = join(root, 'sw-files.js');

const EXCLUDE = [
    /(^|\/)\./,
    /\.md$/,
    /^CNAME$/,
    /^sitemap\.xml$/,
    /^naver[0-9a-f]+\.html$/,
    /^thumbnail/,
    /^sw\.js$/,
    /^sw-files\.js$/,
];

function walk(dir, prefix) {
    const found = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (EXCLUDE.some((re) => re.test(rel))) continue;
        if (entry.isDirectory()) found.push(...walk(join(dir, entry.name), rel));
        else if (entry.isFile()) found.push(rel);
    }
    return found;
}

const files = walk(root, '').sort();
const hash = createHash('sha256');
for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(join(root, file)));
    hash.update('\0');
}
const digest = hash.digest('hex').slice(0, 16);
const content = `self.SW_FILES = ${JSON.stringify({ digest, files }, null, 1)};\n`;

if (check) {
    const current = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (current !== content) {
        console.error('sw-files.js is stale: run `node tools/sw-files.mjs`');
        process.exit(1);
    }
} else {
    writeFileSync(out, content);
    console.log(`${files.length} files, digest ${digest}`);
}
