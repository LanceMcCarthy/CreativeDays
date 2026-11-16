import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { createApp } from '../server.js';

let server;
let io;
let url;
const clients = [];

before(async () => {
  ({ server, io } = createApp({ allowedOrigins: ['https://creative-day.pages.dktapp.cloud'] }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  clients.forEach((client) => client.disconnect());
  await new Promise((resolve) => io.close(resolve));
});

async function client() {
  const socket = connect(url, { forceNew: true });
  clients.push(socket);
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
}
const join = (socket, code) => socket.timeout(2000).emitWithAck('join', code);
const event = (socket, name) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`Événement manquant : ${name}`)), 2000);
  socket.once(name, (value) => { clearTimeout(timer); resolve(value); });
});
const stroke = (id = 'stroke-1') => ({
  id, color: '#8061b3', size: 4, tool: 'pen', points: [[0.1, 0.2], [0.8, 0.9]],
});

test('sert le site, le client Socket.IO et la configuration CORS pour Pages', async () => {
  const home = await fetch(url);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Votre petit atelier/);
  const module = await fetch(`${url}/socket.io.esm.min.js`);
  assert.equal(module.status, 200);
  assert.match(module.headers.get('content-type'), /javascript/);
  const config = await fetch(`${url}/api/config`, {
    headers: { Origin: 'https://creative-day.pages.dktapp.cloud' },
  });
  assert.equal(config.headers.get('access-control-allow-origin'), 'https://creative-day.pages.dktapp.cloud');
  assert.ok(Array.isArray((await config.json()).iceServers));
});

test('limite les salons à deux personnes et refuse les codes invalides', async () => {
  const [a, b, c] = await Promise.all([client(), client(), client()]);
  assert.match((await join(c, '<script>')).error, /8 lettres/);
  const first = await join(a, 'ROOM0001');
  const arrived = event(a, 'peer:joined');
  const second = await join(b, 'ROOM0001');
  assert.equal(await arrived, second.id);
  assert.deepEqual(second.peers, [first.id]);
  assert.match((await join(c, 'ROOM0001')).error, /deux artistes/);
});

test('synchronise les traits, les snapshots, annuler et effacer par toile', async () => {
  const a = await client();
  const aState = await join(a, 'ROOM0002');
  a.emit('drawing:update', { target: aState.id, stroke: stroke() });
  const b = await client();
  const bState = await join(b, 'ROOM0002');
  assert.equal(bState.drawings[aState.id].length, 1);
  const updated = event(a, 'drawing:update');
  b.emit('drawing:update', { target: aState.id, stroke: stroke('stroke-2') });
  assert.equal((await updated).stroke.author, bState.id);
  const undone = event(a, 'drawing:state');
  b.emit('drawing:undo', aState.id);
  const afterUndo = await undone;
  assert.equal(afterUndo.strokes.length, 1);
  assert.equal(afterUndo.strokes[0].id, 'stroke-1');
  const cleared = event(a, 'drawing:state');
  a.emit('drawing:clear', aState.id);
  assert.deepEqual((await cleared).strokes, []);
});

test('refuse les traits invalides et les modifications des traits de l’autre artiste', async () => {
  const [a, b] = await Promise.all([client(), client()]);
  const { id } = await join(a, 'ROOM0003');
  await join(b, 'ROOM0003');
  let notice = event(a, 'notice');
  a.emit('drawing:update', { target: id, stroke: { ...stroke(), points: [[Infinity, 2]] } });
  assert.match(await notice, /invalide/);
  const update = event(b, 'drawing:update');
  a.emit('drawing:update', { target: id, stroke: stroke() });
  await update;
  notice = event(b, 'notice');
  b.emit('drawing:update', { target: id, stroke: stroke() });
  assert.match(await notice, /appartient/);
  notice = event(a, 'notice');
  a.emit('drawing:update', { target: 'outside-room', stroke: stroke() });
  assert.match(await notice, /disponible/);
});

test('transmet la signalisation et l’état des périphériques uniquement au partenaire', async () => {
  const [a, b, outsider] = await Promise.all([client(), client(), client()]);
  const { id: aId } = await join(a, 'ROOM0004');
  const { id: bId } = await join(b, 'ROOM0004');
  await join(outsider, 'ROOM0005');
  const received = event(b, 'signal');
  a.emit('signal', { to: bId, data: { description: { type: 'offer', sdp: 'test' } } });
  assert.equal((await received).from, aId);
  const media = event(a, 'media');
  b.emit('media', { camera: true, microphone: false });
  assert.deepEqual(await media, { camera: true, microphone: false });
  const unexpected = [];
  outsider.on('signal', (value) => unexpected.push(value));
  a.emit('signal', { to: outsider.id, data: { candidate: 'private' } });
  // An acknowledgement on the same connection fences earlier signal processing.
  await join(a, 'ROOM0004');
  assert.deepEqual(unexpected, []);
});

test('libère une place au départ et nettoie les dessins de la personne partie', async () => {
  const [a, b, c] = await Promise.all([client(), client(), client()]);
  const { id } = await join(a, 'ROOM0006');
  await join(b, 'ROOM0006');
  const updated = event(b, 'drawing:update');
  a.emit('drawing:update', { target: id, stroke: stroke() });
  await updated;
  const left = event(b, 'peer:left');
  a.disconnect();
  assert.equal(await left, id);
  const next = await join(c, 'ROOM0006');
  assert.equal(next.drawings[id], undefined);
  assert.equal(next.peers.length, 1);
});
