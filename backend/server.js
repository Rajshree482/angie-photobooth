import express from 'express';
import cors from 'cors';
import http from 'http';
import { ExpressPeerServer } from 'peer';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// PeerJS signaling server, mounted at /peerjs
const peerServer = ExpressPeerServer(server, { path: '/' });
app.use('/peerjs', peerServer);

// --- Simple in-memory room directory -------------------------------------
// A "room" just maps a short id to the host's current PeerJS id, so the
// second person to open the link knows who to call. No video/photo data
// ever touches this server — that all flows peer-to-peer once connected.
const rooms = new Map(); // roomId -> { hostPeerId, createdAt }
const ROOM_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

function cleanupRooms() {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.createdAt > ROOM_TTL_MS) rooms.delete(id);
  }
}
setInterval(cleanupRooms, 1000 * 60 * 30);

app.post('/api/rooms', (req, res) => {
  const roomId = nanoid(8);
  rooms.set(roomId, { hostPeerId: null, createdAt: Date.now() });
  res.json({ roomId });
});

app.post('/api/rooms/:id/host', (req, res) => {
  const { id } = req.params;
  const { peerId } = req.body || {};
  if (!peerId) return res.status(400).json({ error: 'peerId required' });

  const existing = rooms.get(id);
  if (existing) {
    existing.hostPeerId = peerId;
  } else {
    // Room expired or server restarted — recreate it so the link still works.
    rooms.set(id, { hostPeerId: peerId, createdAt: Date.now() });
  }
  res.json({ ok: true });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = rooms.get(req.params.id);
  if (!room || !room.hostPeerId) {
    return res.status(404).json({ error: 'not_ready' });
  }
  res.json({ hostPeerId: room.hostPeerId });
});

app.get('/health', (req, res) => res.json({ ok: true, rooms: rooms.size }));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Angie backend listening on http://localhost:${PORT}`);
  console.log(`PeerJS signaling at http://localhost:${PORT}/peerjs`);
});
