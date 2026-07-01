import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Peer from 'peerjs';
import { usePhotobooth } from '../context/PhotoboothContext.jsx';
import { PEERJS_OPTIONS, createRoom, getHostPeerId, registerHost } from '../lib/api.js';
import '../styles/photobooth.css';

const TOTAL_SHOTS = 4;
const COUNT_FROM = 3;
const TICK_MS = 750;
const PAUSE_BETWEEN_MS = 1000;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Photobooth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    name,
    setName,
    partnerName,
    setPartnerName,
    roomId,
    setRoomId,
    isHost,
    setIsHost,
    setShots,
  } = usePhotobooth();

  const [stage, setStage] = useState('name'); // name | media | waiting | joining | live | countdown | done | error
  const [nameInput, setNameInput] = useState(name || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [countdownNumber, setCountdownNumber] = useState(null);
  const [shotIndex, setShotIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [connectedReady, setConnectedReady] = useState({ stream: false, data: false, name: false });

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const peerRef = useRef(null);
  const dataConnRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const isHostRef = useRef(false);
  const pollTimer = useRef(null);

  // Video elements get conditionally mounted/unmounted as the stage
  // changes (waiting screen -> live tiles, etc). Plain refs would lose the
  // stream on remount, so we re-attach whatever stream we have whenever a
  // video element actually mounts.
  const attachLocal = useCallback((el) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
  }, []);

  const attachRemote = useCallback((el) => {
    remoteVideoRef.current = el;
    if (el && remoteStreamRef.current) el.srcObject = remoteStreamRef.current;
  }, []);

  // Resolve / create the room id once, on mount.
  useEffect(() => {
    let cancelled = false;
    const urlRoom = params.get('room');

    async function ensureRoom() {
      if (urlRoom) {
        const host = sessionStorage.getItem(`host_${urlRoom}`) === '1';
        if (cancelled) return;
        setRoomId(urlRoom);
        setIsHost(host);
        isHostRef.current = host;
      } else {
        // Direct visit with no room param — create one and become host.
        try {
          const { roomId: newId } = await createRoom();
          if (cancelled) return;
          sessionStorage.setItem(`host_${newId}`, '1');
          setRoomId(newId);
          setIsHost(true);
          isHostRef.current = true;
          navigate(`/photobooth?room=${newId}`, { replace: true });
        } catch {
          setErrorMsg("Couldn't create a room — is the backend running?");
          setStage('error');
        }
      }
    }
    ensureRoom();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareUrl = roomId ? `${window.location.origin}/photobooth?room=${roomId}` : '';

  function handleNameSubmit(e) {
    e.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setName(trimmed);
    setStage('media');
  }

  // Once we have a name + room id, get the camera and connect.
  useEffect(() => {
    if (stage !== 'media' || !roomId) return;
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const peer = new Peer(undefined, PEERJS_OPTIONS);
        peerRef.current = peer;

        peer.on('error', (err) => {
          console.error('Peer error', err);
          if (!cancelled) {
            setErrorMsg('Connection hiccup: ' + (err?.type || err?.message || 'unknown error'));
          }
        });

        peer.on('call', (call) => {
          call.answer(localStreamRef.current);
          call.on('stream', (remoteStream) => attachRemoteStream(remoteStream));
        });

        peer.on('connection', (conn) => {
          setupDataConnection(conn);
        });

        peer.on('open', async (id) => {
          if (cancelled) return;
          if (isHostRef.current) {
            await registerHost(roomId, id);
            setStage('waiting');
          } else {
            setStage('joining');
            joinAsGuest(peer, id);
          }
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setErrorMsg('We need camera & microphone access to start the photobooth.');
          setStage('error');
        }
      }
    }

    start();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, roomId]);

  function attachRemoteStream(remoteStream) {
    remoteStreamRef.current = remoteStream;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    setConnectedReady((r) => ({ ...r, stream: true }));
  }

  const setupDataConnection = useCallback(
    (conn) => {
      dataConnRef.current = conn;
      const onOpen = () => {
        conn.send({ type: 'hello', name });
        setConnectedReady((r) => ({ ...r, data: true }));
      };
      if (conn.open) onOpen();
      else conn.on('open', onOpen);

      conn.on('data', (data) => {
        if (data?.type === 'hello') {
          setPartnerName(data.name);
          setConnectedReady((r) => ({ ...r, name: true }));
        } else if (data?.type === 'start-sequence') {
          beginCaptureSequence();
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name]
  );

  async function joinAsGuest(peer, myPeerId) {
    const maxAttempts = 40;
    for (let i = 0; i < maxAttempts; i += 1) {
      try {
        const hostId = await getHostPeerId(roomId);
        if (hostId) {
          const call = peer.call(hostId, localStreamRef.current);
          call.on('stream', (remoteStream) => attachRemoteStream(remoteStream));
          const conn = peer.connect(hostId, { reliable: true });
          setupDataConnection(conn);
          return;
        }
      } catch {
        // keep polling
      }
      await wait(1500);
    }
    setErrorMsg("Couldn't find that room. The link may have expired — ask for a fresh one.");
    setStage('error');
  }

  // Once stream + data + names are all in, we're live.
  useEffect(() => {
    if (connectedReady.stream && connectedReady.data && connectedReady.name) {
      setStage((s) => (s === 'countdown' || s === 'done' ? s : 'live'));
    }
  }, [connectedReady]);

  function handleStartSequence() {
    dataConnRef.current?.send({ type: 'start-sequence' });
    beginCaptureSequence();
  }

  function drawVideoCover(ctx, video, x, y, w, h) {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;
    const videoRatio = vw / vh;
    const boxRatio = w / h;
    let sx;
    let sy;
    let sw;
    let sh;
    if (videoRatio > boxRatio) {
      sh = vh;
      sw = vh * boxRatio;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      sw = vw;
      sh = vw / boxRatio;
      sx = 0;
      sy = (vh - sh) / 2;
    }
    ctx.drawImage(video, sx, sy, sw, sh, x, y, w, h);
  }

  function captureComposite() {
    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const panelW = canvas.width / 2;

    const leftVideo = isHostRef.current ? localVideoRef.current : remoteVideoRef.current;
    const rightVideo = isHostRef.current ? remoteVideoRef.current : localVideoRef.current;

    drawVideoCover(ctx, leftVideo, 0, 0, panelW, canvas.height);
    drawVideoCover(ctx, rightVideo, panelW, 0, panelW, canvas.height);

    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(panelW - 1, 0, 2, canvas.height);

    return canvas.toDataURL('image/png');
  }

  function runCountdown(n) {
    return new Promise((resolve) => {
      let count = n;
      setCountdownNumber(count);
      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          setCountdownNumber(null);
          resolve();
        } else {
          setCountdownNumber(count);
        }
      }, TICK_MS);
    });
  }

  async function beginCaptureSequence() {
    setStage('countdown');
    const collected = [];
    for (let i = 0; i < TOTAL_SHOTS; i += 1) {
      setShotIndex(i + 1);
      // eslint-disable-next-line no-await-in-loop
      await runCountdown(COUNT_FROM);
      const dataUrl = captureComposite();
      collected.push(dataUrl);
      setFlash(true);
      // eslint-disable-next-line no-await-in-loop
      await wait(180);
      setFlash(false);
      // eslint-disable-next-line no-await-in-loop
      await wait(PAUSE_BETWEEN_MS);
    }
    setShots(collected);
    setStage('done');
  }

  useEffect(() => {
    if (stage === 'done') {
      navigate('/filters');
    }
  }, [stage, navigate]);

  useEffect(
    () => () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      dataConnRef.current?.close();
      peerRef.current?.destroy();
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    []
  );

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setErrorMsg('Could not copy automatically — select and copy the link manually.');
    }
  }

  return (
    <div className="page booth">
      <canvas ref={canvasRef} className="visually-hidden" />

      {stage === 'name' && (
        <div className="booth-center container">
          <form className="name-card" onSubmit={handleNameSubmit}>
            <p className="eyebrow">before we start</p>
            <h1 className="name-card__title">What should we call you?</h1>
            <input
              autoFocus
              className="name-card__input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={24}
            />
            <button className="btn btn-primary" type="submit" disabled={!nameInput.trim()}>
              Continue →
            </button>
          </form>
        </div>
      )}

      {stage === 'media' && (
        <div className="booth-center container">
          <p className="muted">Asking your browser for camera access…</p>
        </div>
      )}

      {stage === 'error' && (
        <div className="booth-center container">
          <p className="booth-error">{errorMsg}</p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )}

      {(stage === 'waiting' || stage === 'joining') && (
        <div className="booth-center container">
          <div className="waiting-card">
            <video ref={attachLocal} autoPlay playsInline muted className="waiting-card__video" />
            {stage === 'waiting' ? (
              <>
                <p className="eyebrow">waiting for them to join</p>
                <h2 className="waiting-card__title">Send them this link</h2>
                <div className="waiting-card__link-row">
                  <code className="waiting-card__link">{shareUrl}</code>
                  <button className="btn btn-secondary" onClick={handleCopyLink}>
                    {shareCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </>
            ) : (
              <p className="eyebrow">connecting to your room…</p>
            )}
          </div>
        </div>
      )}

      {(stage === 'live' || stage === 'countdown') && (
        <div className="booth-live container">
          <div className="booth-live__videos">
            {isHostRef.current ? (
              <>
                <VideoTile videoRef={attachLocal} label={name} isLocal />
                <VideoTile videoRef={attachRemote} label={partnerName} isLocal={false} />
              </>
            ) : (
              <>
                <VideoTile videoRef={attachRemote} label={partnerName} isLocal={false} />
                <VideoTile videoRef={attachLocal} label={name} isLocal />
              </>
            )}
          </div>

          {stage === 'live' && (
            <div className="booth-live__controls">
              <p className="muted">Whenever you're ready — either of you can start it.</p>
              <button className="btn btn-pill-accent" onClick={handleStartSequence}>
                Start the photobooth
              </button>
            </div>
          )}

          {stage === 'countdown' && (
            <div className="booth-live__controls">
              <p className="eyebrow">
                shot {shotIndex} / {TOTAL_SHOTS}
              </p>
              {countdownNumber !== null && <div className="countdown-number">{countdownNumber}</div>}
            </div>
          )}

          {flash && <div className="booth-flash" />}
        </div>
      )}
    </div>
  );
}

function VideoTile({ videoRef, label, isLocal }) {
  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="video-tile__video"
        style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
      />
      <span className="video-tile__label">{label || '…'}</span>
    </div>
  );
}
