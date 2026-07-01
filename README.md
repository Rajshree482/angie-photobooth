# angie — an online photobooth for long distance couples

A working clone of the getangie.com concept: a landing page, a shareable
room link, real peer-to-peer video between two browsers (no video ever
touches the server), a synced 3‑2‑1 countdown that captures four
split-screen shots, a filter picker, and a downloadable photo strip.

This has been built and tested end-to-end (two simulated browsers,
real WebRTC connection, real countdown sync, real PNG export) — it
should work as-is, but read the "known limitations" section before you
show it to anyone.

## How it's built

- `frontend/` — React + Vite. Landing page, room UI, camera handling,
  canvas capture/compositing, filters, PNG export. Talks to the peer
  network directly via [PeerJS](https://peerjs.com/).
- `backend/` — a small Express server that does two things:
  1. Runs a PeerJS signaling server (just helps two browsers find each
     other and agree on a connection — no video/audio passes through it).
  2. Keeps an in-memory map of `roomId -> host's peer id`, so the second
     person to open a link knows who to call.

No database, no accounts, no video ever stored anywhere.

## Running it locally

You'll need Node.js 18+ installed.

**Terminal 1 — backend:**
```bash
cd backend
npm install
npm start
```
This starts the API + signaling server on `http://localhost:4000`.

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
npm run dev
```
This starts the app on `http://localhost:5173`.

Open `http://localhost:5173` in your browser, click "Open the
photobooth", and copy the link it gives you. To test solo before you
have a second person handy, paste that link into a **second, separate
browser tab** (not a duplicated tab) — it'll join as the guest and you
can see both video tiles from one machine.

To actually test with two devices on the same wifi, you'll need your
backend reachable from your phone too — either run
`VITE_BACKEND_URL=http://<your-laptop-ip>:4000 npm run dev` on the
frontend, or just deploy it (see below).

## Deploying it for real

Two pieces, deployed separately:

- **Backend** → any Node host that supports WebSockets (Render, Railway,
  Fly.io). Deploy the `backend/` folder, note its public URL.
- **Frontend** → Vercel, Netlify, or similar. Set the environment
  variable `VITE_BACKEND_URL` to your backend's public URL before
  building, so the app knows where to find the signaling server.

Once both are live, the room links will look like
`https://your-app.vercel.app/photobooth?room=abc123` — shareable with
anyone, anywhere.

## Known limitations / things to harden later

- **No TURN server.** The app uses public Google STUN servers for NAT
  traversal, which works for most home wifi and mobile connections, but
  very restrictive networks (corporate firewalls, some campus networks)
  may block the connection entirely. If that happens, a TURN server
  (e.g. via [metered.ca](https://www.metered.ca/) or Twilio's) fixes it
  — add it to `iceServers` in `frontend/src/lib/api.js`.
- **Rooms live in memory.** If the backend restarts, in-progress rooms
  are forgotten (an open link will just say "couldn't find that room").
  Fine for a personal project; for production you'd want Redis or similar.
- **No reconnect handling.** If either person's camera connection drops
  mid-session, the other side won't auto-recover — they'd need to
  refresh and re-share a fresh link.
- **Refreshing mid-flow resets you.** Captured shots live in memory
  (React context), not persisted, so a refresh between the countdown
  and the result page loses that session's photos.
- **Audio echo:** browsers' built-in echo cancellation is used (no extra
  tuning) — works fine with headphones, can echo without them, like any
  basic video call.

## Customizing

- Colors, fonts, and the perforated-strip look all live in
  `frontend/src/styles/global.css` as CSS variables — change `--coral`,
  `--blush`, `--dusk`, etc. to retheme everything at once.
- Filters are plain CSS filter strings in `frontend/src/lib/filters.js`
  — add or tweak them there; they're shared between live preview and
  the final exported PNG.
- Shot count, countdown length, and pacing are constants at the top of
  `frontend/src/pages/Photobooth.jsx` (`TOTAL_SHOTS`, `COUNT_FROM`, etc).
