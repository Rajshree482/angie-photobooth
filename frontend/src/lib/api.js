const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export async function createRoom() {
  const res = await fetch(`${BASE}/api/rooms`, { method: 'POST' });
  if (!res.ok) throw new Error('Could not create a room right now.');
  return res.json(); // { roomId }
}

export async function registerHost(roomId, peerId) {
  const res = await fetch(`${BASE}/api/rooms/${roomId}/host`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ peerId }),
  });
  if (!res.ok) throw new Error('Could not register this room.');
  return res.json();
}

// Returns the host's PeerJS id, or null if the host hasn't connected yet.
export async function getHostPeerId(roomId) {
  const res = await fetch(`${BASE}/api/rooms/${roomId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Could not look up this room.');
  const data = await res.json();
  return data.hostPeerId;
}

// PeerJS client config — points at the signaling server mounted on our
// own backend at /peerjs, with public Google STUN servers for NAT traversal.
export const PEERJS_OPTIONS = (() => {
  const url = new URL(BASE);
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
    path: '/peerjs',
    secure: url.protocol === 'https:',
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    },
  };
})();
