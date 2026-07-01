import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePhotobooth } from '../context/PhotoboothContext.jsx';
import PhotoStrip from '../components/PhotoStrip.jsx';
import { FILTERS, getFilter } from '../lib/filters.js';
import '../styles/filters.css';

export default function Filters() {
  const navigate = useNavigate();
  const { shots, filterId, setFilterId } = usePhotobooth();

  useEffect(() => {
    if (!shots || shots.length === 0) navigate('/');
  }, [shots, navigate]);

  if (!shots || shots.length === 0) return null;

  const activeFilter = getFilter(filterId);

  return (
    <div className="page filters-page">
      <div className="container filters-layout">
        <div className="filters-preview">
          <p className="eyebrow">step 3 of 4</p>
          <h1 className="filters-title">Pick a filter</h1>
          <PhotoStrip shots={shots} filterCss={activeFilter.css} />
        </div>

        <div className="filters-picker">
          <p className="muted filters-picker__label">Tap to preview, then continue when it feels right.</p>
          <div className="filters-swatches">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`filter-swatch ${filterId === f.id ? 'filter-swatch--active' : ''}`}
                onClick={() => setFilterId(f.id)}
              >
                <span className="filter-swatch__thumb">
                  <img src={shots[0]} alt="" style={{ filter: f.css }} />
                </span>
                <span className="filter-swatch__label">{f.label}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-pill-accent filters-continue" onClick={() => navigate('/result')}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
