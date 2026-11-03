import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';

const cwd = fileURLToPath(new URL('..', import.meta.url));
let child;
let port;
const sockets = [];

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, () => {
      const p = s.address().port;
      s.close(() => resolve(p));
    });
  });
}

async function waitReady() {
  for (let i = 0; i < 240; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('wrangler dev did not start');
}

before(async () => {
  port = await freePort();
  child = spawn('npx', ['wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1'], { cwd, stdio: 'ignore' });
  await waitReady();
});

after(() => {
  for (const s of sockets) s.terminate();
  child?.kill('SIGKILL');
});

function connect(code, role) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/room/${code}?role=${role}`);
  ws.queue = [];
  ws.waiters = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString());
    const w = ws.waiters.shift();
    if (w) w(m); else ws.queue.push(m);
  });
  ws.next = () => new Promise((res, rej) => {
    if (ws.queue.length) return res(ws.queue.shift());
    const t = setTimeout(() => rej(new Error('timeout')), 5000);
    ws.waiters.push((m) => { clearTimeout(t); res(m); });
  });
  sockets.push(ws);
  return new Promise((res, rej) => {
    ws.on('open', () => res(ws));
    ws.on('unexpected-response', (_, r) => rej(Object.assign(new Error('http'), { status: r.statusCode })));
    ws.on('error', () => {});
  });
}

test('방 코드로 만나 메시지 교환, 거절, 퇴장 알림', async () => {
  const host = await connect('ABCD', 'host');
  const guest = await connect('ABCD', 'guest');
  assert.deepEqual(await host.next(), { type: 'peer', state: 'joined' });
  assert.deepEqual(await guest.next(), { type: 'peer', state: 'joined' });

  const a = { type: 'act', seat: 0, seq: 1, v: [1, 2] };
  host.send(JSON.stringify(a));
  assert.deepEqual(await guest.next(), a);
  const b = { type: 'act', seat: 1, seq: 2 };
  guest.send(JSON.stringify(b));
  assert.deepEqual(await host.next(), b);

  await assert.rejects(connect('ABCD', 'guest'), { status: 409 });
  await assert.rejects(connect('ABCD', 'host'), { status: 409 });

  guest.close();
  assert.deepEqual(await host.next(), { type: 'peer', state: 'left' });
});

test('잘못된 코드는 400', async () => {
  await assert.rejects(connect('ABIO', 'host'), { status: 400 });
  await assert.rejects(connect('abcd', 'host'), { status: 400 });
  await assert.rejects(connect('ABC', 'host'), { status: 400 });
});

test('호스트 없이 게스트가 먼저 와도 입장', async () => {
  const guest = await connect('WXYZ', 'guest');
  const host = await connect('WXYZ', 'host');
  assert.deepEqual(await guest.next(), { type: 'peer', state: 'joined' });
  assert.deepEqual(await host.next(), { type: 'peer', state: 'joined' });
});
