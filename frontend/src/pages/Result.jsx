import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotobooth } from '../context/PhotoboothContext.jsx';
import PhotoStrip from '../components/PhotoStrip.jsx';
import { getFilter } from '../lib/filters.js';
import '../styles/result.css';

const PANEL_W = 464;
const PANEL_H = 290;
const GAP = 14;
const PAD = 28;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export default function Result() {
  const navigate = useNavigate();
  const { shots, filterId, name, partnerName, reset } = usePhotobooth();
  const canvasRef = useRef(null);
  const [finalDataUrl, setFinalDataUrl] = useState(null);
  const [building, setBuilding] = useState(true);

  const filter = getFilter(filterId);
  const date = new Date();
  const dateLabel = date.toISOString().slice(0, 10).replace(/-/g, '.');
  const namesLabel = [name, partnerName].filter(Boolean).join(' & ') || 'You & them';

  useEffect(() => {
    if (!shots || shots.length === 0) {
      navigate('/');
      return;
    }

    let cancelled = false;

    async function build() {
      setBuilding(true);
      const images = await Promise.all(shots.map(loadImage));
      if (cancelled) return;

      const width = PANEL_W + PAD * 2;
      const photosHeight = images.length * PANEL_H + (images.length - 1) * GAP;
      const footerHeight = 86;
      const height = PAD + photosHeight + 22 + footerHeight;

      const canvas = canvasRef.current;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // background card
      roundRectPath(ctx, 0, 0, width, height, 24);
      ctx.fillStyle = '#ffd3de';
      ctx.fill();

      // perforation dots
      ctx.fillStyle = '#fbf4ed';
      const dotR = 2.4;
      for (let y = 18; y < height - 18; y += 16) {
        ctx.beginPath();
        ctx.arc(12, y, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(width - 12, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // photos
      images.forEach((img, i) => {
        const x = PAD;
        const y = PAD + i * (PANEL_H + GAP);
        roundRectPath(ctx, x, y, PANEL_W, PANEL_H, 6);
        ctx.save();
        ctx.clip();
        ctx.filter = filter.css;
        const ratio = Math.max(PANEL_W / img.width, PANEL_H / img.height);
        const dw = img.width * ratio;
        const dh = img.height * ratio;
        const dx = x + (PANEL_W - dw) / 2;
        const dy = y + (PANEL_H - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
      });

      // footer text
      ctx.filter = 'none';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#e8456a';
      ctx.font = "600 26px 'Fraunces', Georgia, serif";
      const footerTop = PAD + photosHeight + 22;
      ctx.fillText(namesLabel, width / 2, footerTop + 30);

      ctx.fillStyle = '#6b5c56';
      ctx.font = "500 13px 'JetBrains Mono', monospace";
      ctx.fillText(dateLabel, width / 2, footerTop + 54);

      if (!cancelled) {
        setFinalDataUrl(canvas.toDataURL('image/png'));
        setBuilding(false);
      }
    }

    // Wait for custom fonts so canvas text doesn't fall back ugly.
    const ready = document.fonts ? document.fonts.ready : Promise.resolve();
    ready.then(build);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shots, filterId]);

  function handleSave() {
    if (!finalDataUrl) return;
    const a = document.createElement('a');
    a.href = finalDataUrl;
    a.download = `angie-photobooth-${dateLabel}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleMakeAnother() {
    reset();
    navigate('/');
  }

  if (!shots || shots.length === 0) return null;

  return (
    <div className="page result-page">
      <div className="container result-layout">
        <p className="eyebrow">step 4 of 4</p>
        <h1 className="result-title">Your strip, made together</h1>

        <div className="result-strip-wrap">
          {finalDataUrl ? (
            <img src={finalDataUrl} alt="Your photobooth strip" className="result-final-image" />
          ) : (
            <PhotoStrip
              shots={shots}
              filterCss={filter.css}
              footer={{ names: namesLabel, date: dateLabel }}
            />
          )}
        </div>

        <canvas ref={canvasRef} className="visually-hidden" />

        <div className="result-actions">
          <button className="btn btn-pill-accent" onClick={handleSave} disabled={building}>
            {building ? 'Putting it together…' : 'Save PNG'}
          </button>
          <button className="btn btn-secondary" onClick={handleMakeAnother}>
            Make another
          </button>
        </div>
      </div>
    </div>
  );
}
