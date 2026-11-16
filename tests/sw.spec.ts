import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import type { AddressInfo } from 'node:net';
import { waitForGame, startBattle, playMatchOut } from './helpers';

test.use({ serviceWorkers: 'allow' });

const ROOT = path.join(__dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const GEN = path.join(ROOT, 'tools', 'sw-files.mjs');

const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.woff2': 'font/woff2',
    '.webmanifest': 'application/manifest+json',
};

function listedFiles(dir: string): string[] {
    const text = fs.readFileSync(path.join(dir, 'sw-files.js'), 'utf8');
    return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)).files;
}

interface Copy { dir: string; base: string; stop: () => Promise<void>; remove: () => void }

async function serveCopy(): Promise<Copy> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'haiyuki-sw-'));
    fs.cpSync(DOCS, dir, { recursive: true });
    const server = http.createServer((req, res) => {
        let rel = decodeURIComponent(new URL(req.url || '/', 'http://x').pathname);
        if (rel.endsWith('/')) rel += 'index.html';
        const file = path.join(dir, rel);
        if (!file.startsWith(dir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, {
            'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
        });
        fs.createReadStream(file).pipe(res);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    let stopped = false;
    return {
        dir,
        base: `http://localhost:${(server.address() as AddressInfo).port}`,
        stop: () => new Promise<void>((resolve) => {
            if (stopped) { resolve(); return; }
            stopped = true;
            server.close(() => resolve());
            server.closeAllConnections();
        }),
        remove: () => fs.rmSync(dir, { recursive: true, force: true }),
    };
}

async function waitForControl(page: Page) {
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
}

async function cacheState(page: Page) {
    return page.evaluate(async () => {
        const names = await caches.keys();
        const counts: Record<string, number> = {};
        for (const name of names) counts[name] = (await (await caches.open(name)).keys()).length;
        return { names, counts };
    });
}

test('sw-files.js가 docs/의 현재 파일과 같다', () => {
    execFileSync('node', [GEN, '--check'], { stdio: 'pipe' });
});

let copy: Copy;

test.beforeEach(async () => {
    copy = await serveCopy();
});

test.afterEach(async () => {
    await copy.stop();
    copy.remove();
});

test('오프라인에서 CPU 대전이 끝까지 돈다', async ({ page }) => {
    await page.goto(copy.base + '/');
    await waitForGame(page);
    await waitForControl(page);

    const state = await cacheState(page);
    expect(state.names).toHaveLength(1);
    expect(state.counts[state.names[0]]).toBeGreaterThanOrEqual(listedFiles(copy.dir).length);

    await copy.stop();
    const failedRequests: string[] = [];
    page.on('requestfailed', (r) => {
        if (r.url().startsWith(copy.base)) failedRequests.push(r.url());
    });

    await page.reload();
    await waitForGame(page);
    await page.waitForFunction(() => {
        const a = (0, eval)('Assets');
        return a.toLoad.length > 0 && a.loadedCount === a.toLoad.length;
    }, undefined, { timeout: 30_000 });

    const probe = await page.evaluate(async () => {
        const uncached = await fetch('CNAME').then((r) => r.status, () => 'network-error');
        const yaku = await fetch('yaku-calc.html?live').then((r) => r.status);
        const ranged = await fetch('assets/audio/bgm_00.mp3', { headers: { Range: 'bytes=10-109' } });
        return {
            uncached,
            yaku,
            rangeStatus: ranged.status,
            rangeHeader: ranged.headers.get('Content-Range'),
            rangeBytes: (await ranged.arrayBuffer()).byteLength,
            failedAssets: (0, eval)('Assets').failed.slice(),
        };
    });
    expect(probe.uncached).toBe('network-error');
    expect(probe.yaku).toBe(200);
    expect(probe.rangeStatus).toBe(206);
    expect(probe.rangeHeader).toMatch(/^bytes 10-109\/\d+$/);
    expect(probe.rangeBytes).toBe(100);
    expect(probe.failedAssets).toEqual([]);

    await startBattle(page, { seed: 101 });
    const outcome = await playMatchOut(page);
    expect(outcome.result.winner).not.toBeNull();
    expect(failedRequests.filter((u) => !u.endsWith('/CNAME'))).toEqual([]);
});

test('온라인이면 새 배포가 바로 반영되고, 스위치를 끄면 해제된다', async ({ page }) => {
    const { dir, base } = copy;
    await page.goto(base + '/');
    await waitForControl(page);
    const first = await cacheState(page);
    expect(first.names).toHaveLength(1);

    fs.appendFileSync(path.join(dir, 'haiyuki.css'), '\n.sw-spec-marker { color: red; }\n');
    await page.reload();
    const css = await page.evaluate(() => fetch('haiyuki.css').then((r) => r.text()));
    expect(css).toContain('sw-spec-marker');

    execFileSync('node', [GEN, dir], { stdio: 'pipe' });
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r!.update()));
    await expect.poll(async () => {
        const names = (await cacheState(page)).names;
        return names.length === 1 && names[0] !== first.names[0];
    }, { timeout: 60_000 }).toBe(true);
    const second = await cacheState(page);
    expect(second.counts[second.names[0]]).toBeGreaterThanOrEqual(listedFiles(dir).length);

    const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
    expect(sw).toContain('const ENABLED = true;');
    fs.writeFileSync(path.join(dir, 'sw.js'), sw.replace('const ENABLED = true;', 'const ENABLED = false;'));
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r!.update()));
    await expect.poll(async () => page.evaluate(async () => ({
        registrations: (await navigator.serviceWorker.getRegistrations()).length,
        caches: (await caches.keys()).length,
    })), { timeout: 60_000 }).toEqual({ registrations: 0, caches: 0 });

    await page.reload();
    expect(await page.evaluate(() => navigator.serviceWorker.controller)).toBeNull();
});
