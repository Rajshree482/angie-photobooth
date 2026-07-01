import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhotoStrip from '../components/PhotoStrip.jsx';
import { createRoom } from '../lib/api.js';
import '../styles/landing.css';

const PLACEHOLDER_SHOTS = [0, 1, 2, 3].map((i) => (
  <div className="hero-placeholder" key={i}>
    <span className="hero-placeholder__half hero-placeholder__half--a" />
    <span className="hero-placeholder__half hero-placeholder__half--b" />
  </div>
));

export default function Landing() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleOpenPhotobooth() {
    setError('');
    setLoading(true);
    try {
      const { roomId } = await createRoom();
      sessionStorage.setItem(`host_${roomId}`, '1');
      navigate(`/photobooth?room=${roomId}`);
    } catch (e) {
      setError("Couldn't start a session — check that the backend is running.");
      setLoading(false);
    }
  }

  return (
    <div className="page landing">
      <header className="landing__nav container">
        <div className="brand">
          angie<span className="brand__dots">••</span>
        </div>
        <a className="muted landing__nav-link" href="#how-it-works">
          how it works
        </a>
      </header>

      <main className="landing__hero container">
        <div className="landing__copy">
          <p className="eyebrow">a little hub of dates, for two cities</p>
          <h1 className="landing__headline">
            Fun dates for <span className="landing__gradient">long distance</span> relationships
          </h1>
          <p className="landing__sub">
            Angie is a little hub of dates you can go on together when you're apart — starting
            with a realtime online photobooth that puts both of you in one frame.
          </p>
          <div className="landing__actions">
            <button className="btn btn-primary" onClick={handleOpenPhotobooth} disabled={loading}>
              {loading ? 'Setting up…' : 'Open the photobooth →'}
            </button>
            <a className="btn btn-secondary" href="#how-it-works">
              See how it works
            </a>
          </div>
          {error && <p className="landing__error">{error}</p>}
        </div>

        <div className="landing__visual">
          <PhotoStrip
            placeholder={PLACEHOLDER_SHOTS}
            footer={{ names: 'You & them', date: 'today, wherever you both are' }}
          />
        </div>
      </main>

      <section id="how-it-works" className="landing__how container">
        <h2 className="landing__how-title">One link. One frame. Two cities.</h2>
        <div className="landing__steps">
          <Step n="1" title="Open the photobooth" text="We spin up a private room and a link, instantly — no account needed." />
          <Step n="2" title="Send the link" text="Text it to them. The moment they open it, your cameras connect, peer to peer." />
          <Step n="3" title="Strike a pose" text="A synced 3-2-1 countdown captures four shots, split right down the middle." />
          <Step n="4" title="Keep the strip" text="Pick a filter, add your names, and save the strip as a keepsake — together." />
        </div>
      </section>

      <footer className="landing__footer container muted">
        Built with a webcam, a countdown, and the distance between two people.
      </footer>
    </div>
  );
}

function Step({ n, title, text }) {
  return (
    <div className="step">
      <div className="step__n">{n}</div>
      <div>
        <div className="step__title">{title}</div>
        <div className="step__text muted">{text}</div>
      </div>
    </div>
  );
}
