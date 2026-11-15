import React, { useEffect, useLayoutEffect, useState } from 'react';
import { X, ChevronRight, ChevronLeft, Compass, GraduationCap, Rocket, MousePointerClick } from 'lucide-react';
import { TOUR } from '../guide/cases.js';

export function Tour({ open, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = TOUR[i];
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = document.querySelector(step.sel);
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ block: 'nearest' });
      const r = el.getBoundingClientRect();
      setRect({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 });
    };
    measure();
    const t = setTimeout(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [open, i, step]);
  useEffect(() => { if (open) setI(0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') setI((x) => Math.min(TOUR.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  const cardW = 340;
  const below = rect ? rect.y + rect.h + 190 < window.innerHeight : true;
  const cardStyle = rect
    ? { left: Math.min(window.innerWidth - cardW - 16, Math.max(16, rect.x + rect.w / 2 - cardW / 2)), top: below ? rect.y + rect.h + 12 : Math.max(16, rect.y - 200) }
    : { left: window.innerWidth / 2 - cardW / 2, top: window.innerHeight / 2 - 100 };
  return (
    <div className="tour">
      {rect ? <div className="tour-hole" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} /> : <div className="tour-dim" />}
      <div className="tour-card" style={{ ...cardStyle, width: cardW }}>
        <div className="row between"><span className="kicker">Tour · {i + 1} of {TOUR.length}</span><button className="iconbtn" onClick={onClose}><X size={15} /></button></div>
        <h3 style={{ color: '#0b6b34', fontSize: 17, margin: '4px 0 6px' }}>{step.title}</h3>
        <div style={{ lineHeight: 1.5 }}>{step.body}</div>
        <div className="row between" style={{ marginTop: 12 }}>
          <button className="btn sm" onClick={() => setI(i - 1)} disabled={i === 0}><ChevronLeft size={14} />Back</button>
          {i < TOUR.length - 1
            ? <button className="btn sm primary" onClick={() => setI(i + 1)}>Next<ChevronRight size={14} /></button>
            : <button className="btn sm primary" onClick={onClose}>Done</button>}
        </div>
      </div>
    </div>
  );
}

export function Welcome({ open, onClose, onTour, onCase }) {
  if (!open) return null;
  return (
    <div className="modal-bg">
      <div className="modal">
        <div className="row between">
          <span className="kicker">Welcome · Team Code Red</span>
          <button className="iconbtn" onClick={onClose}><X size={16} /></button>
        </div>
        <h2 style={{ color: '#0b6b34', fontSize: 26, margin: '6px 0 6px' }}>Control tower & digital twin</h2>
        <p className="muted" style={{ lineHeight: 1.55, marginTop: 0 }}>
          Test the automated strip-folding and cartoning cell before anyone buys it. Change any variable, watch a live simulation of the line, stress the business case, and reach a go / no-go decision.
        </p>
        <div className="welcome-grid">
          <button className="wcard" onClick={onTour}><Compass size={22} /><b>60-second tour</b><span>Where everything is</span></button>
          <button className="wcard" onClick={() => onCase('simple')}><GraduationCap size={22} /><b>Simple case · 5 min</b><span>Base-case sanity check, guided</span></button>
          <button className="wcard" onClick={() => onCase('complex')}><Rocket size={22} /><b>Complex case · 15 min</b><span>Monsoon stress test: go or no-go?</span></button>
          <button className="wcard" onClick={onClose}><MousePointerClick size={22} /><b>Just explore</b><span>Open “How to use” any time (G)</span></button>
        </div>
      </div>
    </div>
  );
}
