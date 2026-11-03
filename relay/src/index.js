const CODE_RE = /^[A-HJ-NP-Z]{5}$/;
const MAX_BYTES = 64 * 1024;
const IDLE_MS = 10 * 60 * 1000;

function log(code, text) {
  console.log(`[room ${code}] ${text}`);
}

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
      log(code, `bad request 400 role=${role}`);
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
    this.code = state.id.name || null;
    this.stats = new Map();
  }

  tally(ws, kind, type, bytes) {
    let st = this.stats.get(ws);
    if (!st) {
      st = { relayed: 0, dropped: 0, bytes: 0, types: {} };
      this.stats.set(ws, st);
    }
    st[kind]++;
    st.bytes += bytes;
    st.types[type] = (st.types[type] || 0) + 1;
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
    const url = new URL(request.url);
    const role = url.searchParams.get('role');
    this.code = url.pathname.split('/').pop();
    const seats = this.seats();
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (seats[role]) {
      log(this.code, `full role=${role} rejected`);
      server.accept();
      server.send(JSON.stringify({ type: 'peer', state: 'full' }));
      server.close(1008, 'seat taken');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.state.acceptWebSocket(server);
    server.serializeAttachment(role);
    await this.state.storage.deleteAlarm();
    const other = seats[role === 'host' ? 'guest' : 'host'];
    log(this.code, `join role=${role} peer=${other ? 'yes' : 'no'}`);
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
    const type = (message.slice(0, 80).match(/"type":"(\w+)"/) || [])[1] || '?';
    if (message.length > MAX_BYTES || new TextEncoder().encode(message).length > MAX_BYTES) {
      log(this.code, `too big role=${ws.deserializeAttachment()} type=${type} size=${message.length}`);
      ws.close(1009, 'too big');
      return;
    }
    const peer = this.peerOf(ws);
    if (peer) peer.send(message);
    this.tally(ws, peer ? 'relayed' : 'dropped', type, message.length);
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
    const st = this.stats.get(ws) || { relayed: 0, dropped: 0, bytes: 0, types: {} };
    this.stats.delete(ws);
    log(this.code, `leave role=${seat} peer=${remaining.some((s) => s.deserializeAttachment() !== seat) ? 'yes' : 'no'} relayed=${st.relayed} dropped=${st.dropped} bytes=${st.bytes} types=${JSON.stringify(st.types)}`);
    for (const s of remaining) {
      if (s.deserializeAttachment() !== seat) {
        try { s.send(JSON.stringify({ type: 'peer', state: 'left' })); } catch {}
      }
    }
    if (remaining.length === 0) await this.state.storage.setAlarm(Date.now() + IDLE_MS);
  }

  async alarm() {
    if (this.state.getWebSockets().length === 0) {
      log(this.code, 'idle cleanup');
      await this.state.storage.deleteAll();
    }
  }
}
