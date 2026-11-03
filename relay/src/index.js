const CODE_RE = /^[A-HJ-NP-Z]{5}$/;
const MAX_BYTES = 64 * 1024;
const IDLE_MS = 10 * 60 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    const m = url.pathname.match(/^\/room\/([^/]+)$/);
    if (!m) return new Response('not found', { status: 404 });
    const code = m[1];
    const role = url.searchParams.get('role');
    if (!CODE_RE.test(code) || (role !== 'host' && role !== 'guest')) {
      return new Response('bad request', { status: 400 });
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('expected websocket', { status: 426 });
    }
    return env.ROOM.get(env.ROOM.idFromName(code)).fetch(request);
  },
};

export class Room {
  constructor(state) {
    this.state = state;
  }

  seats() {
    const seats = {};
    for (const ws of this.state.getWebSockets()) {
      const seat = ws.deserializeAttachment();
      if (seat) seats[seat] = ws;
    }
    return seats;
  }

  async fetch(request) {
    const role = new URL(request.url).searchParams.get('role');
    const seats = this.seats();
    if (seats[role]) return new Response('seat taken', { status: 409 });
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment(role);
    await this.state.storage.deleteAlarm();
    const other = seats[role === 'host' ? 'guest' : 'host'];
    if (other) {
      const joined = JSON.stringify({ type: 'peer', state: 'joined' });
      other.send(joined);
      server.send(joined);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  peerOf(ws) {
    const seat = ws.deserializeAttachment();
    const other = seat === 'host' ? 'guest' : 'host';
    return this.seats()[other];
  }

  webSocketMessage(ws, message) {
    if (typeof message !== 'string') return;
    if (message.length > MAX_BYTES || new TextEncoder().encode(message).length > MAX_BYTES) {
      ws.close(1009, 'too big');
      return;
    }
    const peer = this.peerOf(ws);
    if (peer) peer.send(message);
  }

  async webSocketClose(ws, code, reason) {
    await this.left(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch {}
  }

  async webSocketError(ws) {
    await this.left(ws);
  }

  async left(ws) {
    const seat = ws.deserializeAttachment();
    const remaining = this.state.getWebSockets().filter((s) => s !== ws && s.deserializeAttachment());
    for (const s of remaining) {
      if (s.deserializeAttachment() !== seat) {
        try { s.send(JSON.stringify({ type: 'peer', state: 'left' })); } catch {}
      }
    }
    if (remaining.length === 0) await this.state.storage.setAlarm(Date.now() + IDLE_MS);
  }

  async alarm() {
    if (this.state.getWebSockets().length === 0) await this.state.storage.deleteAll();
  }
}
