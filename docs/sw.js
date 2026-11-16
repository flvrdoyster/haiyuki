const ENABLED = true;

importScripts('sw-files.js');

const PREFIX = 'haiyuki-';
const CACHE = PREFIX + self.SW_FILES.digest;
const SCOPE = self.registration.scope;

function cacheKey(url) {
    const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    return url.origin + path;
}

function sliceRange(response, range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (m[1] === '' && m[2] === '')) return response;
    return response.arrayBuffer().then((buf) => {
        const size = buf.byteLength;
        let start;
        let end;
        if (m[1] === '') {
            start = Math.max(size - Number(m[2]), 0);
            end = size - 1;
        } else {
            start = Number(m[1]);
            end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
        }
        if (start >= size || start > end) {
            return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
        }
        const headers = new Headers(response.headers);
        headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
        headers.set('Content-Length', String(end - start + 1));
        headers.set('Accept-Ranges', 'bytes');
        return new Response(buf.slice(start, end + 1), { status: 206, statusText: 'Partial Content', headers });
    });
}

async function respond(event) {
    const request = event.request;
    const key = cacheKey(new URL(request.url));
    try {
        const response = await fetch(request);
        if (response.status === 200 && response.type === 'basic' && !response.redirected) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE).then((cache) => cache.put(key, copy)));
        }
        return response;
    } catch (err) {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(key);
        if (!cached) throw err;
        const range = request.headers.get('range');
        return range ? sliceRange(cached, range) : cached;
    }
}

self.addEventListener('install', (event) => {
    self.skipWaiting();
    if (!ENABLED) return;
    event.waitUntil(
        caches.open(CACHE).then((cache) =>
            cache.addAll(self.SW_FILES.files.map((file) => new Request(file, { cache: 'no-cache' })))
        )
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((name) => name.startsWith(PREFIX) && (!ENABLED || name !== CACHE))
                .map((name) => caches.delete(name))
        );
        if (ENABLED) await self.clients.claim();
        else await self.registration.unregister();
    })());
});

self.addEventListener('fetch', (event) => {
    if (!ENABLED) return;
    const request = event.request;
    if (request.method !== 'GET') return;
    if (!request.url.startsWith(SCOPE)) return;
    event.respondWith(respond(event));
});
