/* MARK online server (version 1.0.2) - no dependencies. Run:  node server.js [port]
   It serves the game files from this folder AND the online lobby (WebSocket at /ws).
   Everyone opens  http://<this-computer-ip>:<port>/game.html  (same Wi-Fi, or a public address / port-forward for the Internet). */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const PORT = +process.argv[2] || +process.env.PORT || 8080, ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.normalize(path.join(ROOT, p)), b = path.basename(f);
  if (!f.startsWith(ROOT) || b.startsWith('.') || b === 'server.js' || b.endsWith('.bat')) { res.writeHead(404); return res.end('not found') }
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('not found') } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(d) });
});
/* ---- minimal WebSocket (RFC 6455) ---- */
const clients = new Set();
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if ((req.url || '').split('?')[0] !== '/ws' || !key) return socket.destroy();
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64') + '\r\n\r\n');
  const c = { socket, buf: Buffer.alloc(0), id: null, name: '', av: '', room: null };
  clients.add(c);
  socket.on('data', d => { c.buf = Buffer.concat([c.buf, d]); parse(c) });
  socket.on('close', () => drop(c)); socket.on('error', () => drop(c));
});
function parse(c) {
  for (;;) {
    const b = c.buf; if (b.length < 2) return;
    const op = b[0] & 15; let len = b[1] & 127, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4 } else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10 }
    const masked = (b[1] & 128) !== 0; if (masked) off += 4;
    if (len > 2e6) return c.socket.destroy(); if (b.length < off + len) return;
    let pl = b.subarray(off, off + len);
    if (masked) { const m = b.subarray(off - 4, off); pl = Buffer.from(pl); for (let i = 0; i < pl.length; i++) pl[i] ^= m[i & 3] }
    c.buf = b.subarray(off + len);
    if (op === 8) { c.socket.end(); return }
    if (op === 9) { frame(c, pl, 10); continue }
    if (op === 1) { try { onMsg(c, JSON.parse(pl.toString('utf8'))) } catch (e) { } }
  }
}
function frame(c, pl, op) {
  if (c.socket.destroyed) return; const n = pl.length; let h;
  if (n < 126) h = Buffer.from([0x80 | op, n]); else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x80 | op; h[1] = 126; h.writeUInt16BE(n, 2) } else { h = Buffer.alloc(10); h[0] = 0x80 | op; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2) }
  try { c.socket.write(Buffer.concat([h, pl])) } catch (e) { }
}
const send = (c, o) => frame(c, Buffer.from(JSON.stringify(o)), 1);
/* ---- lobby, invitations, rooms ---- */
const rooms = new Map(), inv = new Set();
const byId = id => { for (const c of clients) if (c.id === id) return c; return null };
const users = () => [...clients].filter(c => c.id).map(c => ({ id: c.id, name: c.name, av: c.av, room: !!c.room }));
const bcUsers = () => { const l = users(); clients.forEach(c => c.id && send(c, { t: 'users', list: l })) };
const info = r => ({ id: r.id, host: r.host, started: r.started, members: r.members.map(i => { const c = byId(i); return { id: i, name: c ? c.name : '?', av: c ? c.av : '' } }) });
const pushRoom = r => { const o = info(r); r.members.forEach(i => { const c = byId(i); c && send(c, { t: 'room', room: o }) }) };
function leave(c) {
  const r = c.room && rooms.get(c.room); c.room = null; if (!r) return;
  if (r.host === c.id) { rooms.delete(r.id); r.members.forEach(i => { const m = byId(i); if (m && m !== c) { m.room = null; send(m, { t: 'room', room: null }) } }) }
  else { r.members = r.members.filter(i => i !== c.id); if (r.members.length < 2 && !r.started) { /* host stays alone in the room */ } pushRoom(r) }
}
function drop(c) { if (!clients.has(c)) return; clients.delete(c); leave(c); for (const k of [...inv]) if (k.startsWith(c.id + '>') || k.endsWith('>' + c.id)) inv.delete(k); bcUsers() }
function onMsg(c, m) {
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  if (m.t === 'hello') {
    c.id = str(m.id, 40); c.name = str(m.name, 16) || 'بازیکن'; c.av = str(m.av, 8);
    for (const o of [...clients]) if (o !== c && o.id === c.id) { leave(o); clients.delete(o); try { o.socket.destroy() } catch (e) { } }
    bcUsers(); const r = c.room && rooms.get(c.room); if (r) pushRoom(r); return;
  }
  if (!c.id) return;
  if (m.t === 'invite') {
    const t = byId(m.to), mr = c.room && rooms.get(c.room), tr = t && t.room && rooms.get(t.room);
    if (!t || t === c || (tr && tr.started) || (mr && (mr.host !== c.id || mr.started))) return send(c, { t: 'busy', to: m.to });
    if (mr && mr.members.length >= 4) return send(c, { t: 'full' });
    inv.add(c.id + '>' + t.id); send(t, { t: 'invited', from: { id: c.id, name: c.name, av: c.av } });
  } else if (m.t === 'reply') {
    const h = byId(m.to); if (!h || !inv.has(h.id + '>' + c.id)) return; inv.delete(h.id + '>' + c.id);
    if (!m.ok) return send(h, { t: 'declined', from: c.name });
    let r = h.room && rooms.get(h.room);
    if (!r) { r = { id: crypto.randomBytes(4).toString('hex'), host: h.id, members: [h.id], started: false }; rooms.set(r.id, r); h.room = r.id }
    if (r.started || r.members.length >= 4) return send(c, { t: 'full' });
    if (c.room && c.room !== r.id) leave(c);
    if (!r.members.includes(c.id)) { r.members.push(c.id); c.room = r.id }
    pushRoom(r); bcUsers();
  } else if (m.t === 'start' || m.t === 'stop') {
    const r = c.room && rooms.get(c.room); if (!r || r.host !== c.id) return; r.started = m.t === 'start'; pushRoom(r); bcUsers();
  } else if (m.t === 'leave') { leave(c); send(c, { t: 'room', room: null }); bcUsers() }
  else if (m.t === 'fwd' || m.t === 'bc') {
    const r = c.room && rooms.get(c.room); if (!r) return;
    const to = m.t === 'bc' ? r.members.filter(i => i !== c.id) : (r.members.includes(m.to) ? [m.to] : []);
    to.forEach(i => { const o = byId(i); o && send(o, { t: 'msg', from: c.id, d: m.d }) });
  }
}
setInterval(() => clients.forEach(c => frame(c, Buffer.alloc(0), 9)), 25000);
server.listen(PORT, '0.0.0.0', () => {
  console.log('MARK online server ' + 'v1.0.2 - port ' + PORT + '\nOpen on this computer:  http://localhost:' + PORT + '/game.html');
  for (const l of Object.values(os.networkInterfaces())) for (const a of l) if (a.family === 'IPv4' && !a.internal) console.log('Friends on the same Wi-Fi:  http://' + a.address + ':' + PORT + '/game.html');
});
