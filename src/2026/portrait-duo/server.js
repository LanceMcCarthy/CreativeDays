import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const roomPattern = /^[A-Z0-9]{8}$/;
const idPattern = /^[a-zA-Z0-9_-]{1,64}$/;
const maxStrokes = 300;
const maxPoints = 3000;

export function createApp({
  iceServers = [{ urls: 'stun:stun.l.google.com:19302' }],
  allowedOrigins = [],
} = {}) {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 250_000,
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      callback(null, !origin || origin === `https://${req.headers.host}`
        || origin === `http://${req.headers.host}` || allowedOrigins.includes(origin));
    },
  });
  const rooms = new Map();

  app.disable('x-powered-by');
  app.get('/api/config', (req, res) => {
    if (allowedOrigins.includes(req.headers.origin)) {
      res.set('Access-Control-Allow-Origin', req.headers.origin);
      res.vary('Origin');
    }
    res.json({ iceServers });
  });
  app.get('/socket.io.esm.min.js', (_req, res) => {
    res.sendFile(fileURLToPath(new URL('./node_modules/socket.io/client-dist/socket.io.esm.min.js', import.meta.url)));
  });
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));

  io.on('connection', (socket) => {
    let roomCode;
    let updates = 0;
    let windowStart = Date.now();
    const fail = (message) => socket.emit('notice', message);
    const currentRoom = () => rooms.get(roomCode);
    const snapshot = (target) => {
      io.to(roomCode).emit('drawing:state', { target, strokes: currentRoom().drawings[target] });
    };

    socket.on('join', (code, acknowledge) => {
      const reply = typeof acknowledge === 'function' ? acknowledge : () => {};
      if (roomCode) return reply({ error: 'Vous êtes déjà dans un salon.' });
      if (typeof code !== 'string' || !roomPattern.test(code)) {
        return reply({ error: 'Le code du salon doit contenir 8 lettres ou chiffres.' });
      }
      const room = rooms.get(code) ?? { members: new Set(), drawings: {} };
      if (room.members.size >= 2) return reply({ error: 'Ce salon accueille déjà deux artistes.' });
      roomCode = code;
      const peers = [...room.members];
      room.members.add(socket.id);
      room.drawings[socket.id] = [];
      rooms.set(code, room);
      socket.join(code);
      reply({ id: socket.id, peers, drawings: room.drawings });
      socket.to(code).emit('peer:joined', socket.id);
    });

    socket.on('signal', ({ to, data } = {}) => {
      const room = currentRoom();
      if (!room?.members.has(to) || to === socket.id || !data || typeof data !== 'object') return;
      io.to(to).emit('signal', { from: socket.id, data });
    });

    socket.on('media', (state) => {
      if (!currentRoom() || typeof state?.camera !== 'boolean' || typeof state?.microphone !== 'boolean') return;
      socket.to(roomCode).emit('media', { camera: state.camera, microphone: state.microphone });
    });

    socket.on('drawing:update', ({ target, stroke } = {}) => {
      const room = currentRoom();
      if (!room?.members.has(target)) return fail('Cette toile n’est plus disponible.');
      if (Date.now() - windowStart >= 1000) {
        updates = 0;
        windowStart = Date.now();
      }
      if (++updates > 100) return fail('Vous dessinez trop vite. Réessayez dans un instant.');
      const valid = stroke && typeof stroke.id === 'string' && idPattern.test(stroke.id)
        && /^#[0-9a-f]{6}$/i.test(stroke.color)
        && Number.isFinite(stroke.size) && stroke.size >= 1 && stroke.size <= 32
        && ['pen', 'eraser'].includes(stroke.tool)
        && Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.length <= maxPoints
        && stroke.points.every((p) => Array.isArray(p) && p.length === 2
          && p.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
      if (!valid) return fail('Ce trait est invalide ou trop long.');
      const strokes = room.drawings[target];
      const index = strokes.findIndex((entry) => entry.id === stroke.id);
      if (index >= 0 && strokes[index].author !== socket.id) return fail('Ce trait appartient à l’autre artiste.');
      if (index < 0 && strokes.length >= maxStrokes) return fail('La toile est pleine. Effacez-la pour continuer.');
      const saved = {
        id: stroke.id, color: stroke.color, size: stroke.size,
        tool: stroke.tool, points: stroke.points, author: socket.id,
      };
      if (index < 0) strokes.push(saved);
      else strokes[index] = saved;
      socket.to(roomCode).emit('drawing:update', { target, stroke: saved });
    });

    socket.on('drawing:undo', (target) => {
      const room = currentRoom();
      if (!room?.members.has(target)) return;
      const strokes = room.drawings[target];
      const index = strokes.findLastIndex((stroke) => stroke.author === socket.id);
      if (index >= 0) strokes.splice(index, 1);
      snapshot(target);
    });

    socket.on('drawing:clear', (target) => {
      const room = currentRoom();
      if (!room?.members.has(target)) return;
      room.drawings[target] = [];
      snapshot(target);
    });

    socket.on('disconnect', () => {
      const room = currentRoom();
      if (!room) return;
      room.members.delete(socket.id);
      delete room.drawings[socket.id];
      if (room.members.size === 0) rooms.delete(roomCode);
      else socket.to(roomCode).emit('peer:left', socket.id);
    });
  });
  return { app, server, io };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let iceServers;
  if (process.env.ICE_SERVERS) {
    iceServers = JSON.parse(process.env.ICE_SERVERS);
    if (!Array.isArray(iceServers) || iceServers.length === 0
      || iceServers.some((entry) => !entry || !entry.urls)) {
      throw new Error('ICE_SERVERS doit être une liste non vide de serveurs STUN/TURN.');
    }
  }
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const { server } = createApp({ iceServers, allowedOrigins });
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, '0.0.0.0', () => console.log(`Portrait Duo : http://localhost:${port}`));
}
