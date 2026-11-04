const CODE_RE = /^[A-HJ-NP-Z]{5}$/;
const MAX_BYTES = 64 * 1024;
const IDLE_MS = 10 * 60 * 1000;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOBBY_MAX_BYTES = 256;

function log(code, text) {
  console.log(`[room ${code}] ${text}`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname === '/lobby') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('expected websocket', { status: 426 });
      }
      return env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(request);
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
    this.lastAt = Date.now();
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
    await this.left(ws, `code=${code} reason=${reason || '-'}`);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch {}
  }

  async webSocketError(ws) {
    await this.left(ws, 'error');
  }

  async left(ws, how) {
    const seat = ws.deserializeAttachment();
    const remaining = this.state.getWebSockets().filter((s) => s !== ws && s.deserializeAttachment());
    const st = this.stats.get(ws) || { relayed: 0, dropped: 0, bytes: 0, types: {} };
    this.stats.delete(ws);
    const idle = this.lastAt ? `${((Date.now() - this.lastAt) / 1000).toFixed(1)}s` : '-';
    log(this.code, `leave role=${seat} ${how} idle=${idle} peer=${remaining.some((s) => s.deserializeAttachment() !== seat) ? 'yes' : 'no'} relayed=${st.relayed} dropped=${st.dropped} bytes=${st.bytes} types=${JSON.stringify(st.types)}`);
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

function makeCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

export class Lobby {
  constructor(state) {
    this.state = state;
  }

  async fetch() {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ queued: 0 });
    log('lobby', `join online=${this.sockets().length}`);
    this.broadcast();
    return new Response(null, { status: 101, webSocket: client });
  }

  sockets(except) {
    return this.state.getWebSockets().filter((ws) => ws !== except);
  }

  broadcast(except) {
    const all = this.sockets(except);
    const queued = all.filter((ws) => ws.deserializeAttachment().queued).length;
    const msg = JSON.stringify({ type: 'presence', online: all.length, queued });
    for (const ws of all) {
      try { ws.send(msg); } catch {}
    }
  }

  pair() {
    const queue = this.sockets()
      .filter((ws) => ws.deserializeAttachment().queued)
      .sort((a, b) => a.deserializeAttachment().queued - b.deserializeAttachment().queued);
    while (queue.length >= 2) {
      const host = queue.shift();
      const guest = queue.shift();
      const code = makeCode();
      host.serializeAttachment({ queued: 0 });
      guest.serializeAttachment({ queued: 0 });
      host.send(JSON.stringify({ type: 'match', code, role: 'host' }));
      guest.send(JSON.stringify({ type: 'match', code, role: 'guest' }));
      log('lobby', `match code=${code}`);
    }
  }

  webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > LOBBY_MAX_BYTES) return;
    let msg;
    try { msg = JSON.parse(message); } catch { return; }
    if (msg.type === 'queue') {
      if (!ws.deserializeAttachment().queued) ws.serializeAttachment({ queued: Date.now() });
      this.pair();
    } else if (msg.type === 'unqueue') {
      ws.serializeAttachment({ queued: 0 });
    } else {
      return;
    }
    this.broadcast();
  }

  webSocketClose(ws, code, reason) {
    log('lobby', `leave code=${code} reason=${reason || '-'} queued=${ws.deserializeAttachment().queued ? 'yes' : 'no'} online=${this.sockets(ws).length}`);
    this.broadcast(ws);
    try { ws.close(code === 1005 || code === 1006 ? 1000 : code, reason); } catch {}
  }

  webSocketError(ws) {
    log('lobby', `leave error online=${this.sockets(ws).length}`);
    this.broadcast(ws);
  }
}
