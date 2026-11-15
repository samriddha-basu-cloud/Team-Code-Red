import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, Trash2 } from 'lucide-react';
import { useParams } from '../state/ParamsContext.jsx';
import { useTwinCtl } from '../state/TwinContext.jsx';
import { useToast } from '../state/ToastContext.jsx';
import { Seg, Switch } from './ui.jsx';

// Watches the model and the twin and raises alerts when something crosses a line.
export function AlertWatcher({ go }) {
  const { d, fin, oee, params: p } = useParams();
  const { twin } = useTwinCtl();
  const { notify } = useToast();
  const prev = useRef(null);
  const seen = useRef(new Map());
  const prevKeys = useRef(new Set());

  useEffect(() => {
    const now = {
      failed: new Set(d.checks.filter((c) => !c.ok).map((c) => c.label)),
      npvNeg: fin.npv < 0,
      pbLong: fin.pb == null || fin.pb * 12 > 24,
      headLow: d.headroom < 10,
      oeeLow: oee.OEE * 100 < p.oeeTarget - 0.5,
    };
    const was = prev.current;
    prev.current = now;
    if (!was) return;
    now.failed.forEach((l) => { if (!was.failed.has(l)) notify('warn', 'Engineering check failed', l, { source: 'model', action: { label: 'Fix in Line & Kinematics', run: () => go('line') } }); });
    was.failed.forEach((l) => { if (!now.failed.has(l)) notify('ok', 'Check passing again', l, { source: 'model' }); });
    if (now.npvNeg && !was.npvNeg) notify('crit', 'NPV is negative', `₹${(fin.npv / 1e7).toFixed(2)} Cr at current settings`, { source: 'model', action: { label: 'Open Financials', run: () => go('finance') } });
    if (!now.npvNeg && was.npvNeg) notify('ok', 'NPV positive again', `₹${(fin.npv / 1e7).toFixed(2)} Cr`, { source: 'model' });
    if (now.pbLong && !was.pbLong) notify('warn', 'Payback beyond 24 months', fin.pb == null ? 'The project never pays back' : `${(fin.pb * 12).toFixed(1)} months`, { source: 'model' });
    if (now.headLow && !was.headLow) notify('warn', 'Low catch-up headroom', `Cell is only ${d.headroom.toFixed(0)}% faster than the line, so the buffer cannot recover`, { source: 'model', action: { label: 'Open Line & Kinematics', run: () => go('line') } });
    if (now.oeeLow && !was.oeeLow) notify('warn', 'Model OEE below target', `${(oee.OEE * 100).toFixed(1)}% vs ${p.oeeTarget}%`, { source: 'model' });
    if (!now.oeeLow && was.oeeLow) notify('ok', 'Model OEE back on target', `${(oee.OEE * 100).toFixed(1)}%`, { source: 'model' });
  }, [d, fin, oee, p.oeeTarget, notify, go]);

  useEffect(() => {
    const id = setInterval(() => {
      const al = twin.alarms().filter((a) => a.sev === 'crit' || a.sev === 'warn');
      const keys = new Set();
      const t = Date.now();
      al.forEach((a) => {
        const key = `${a.sev}:${a.msg.replace(/[\d.]+/g, '#')}`;
        keys.add(key);
        if (!prevKeys.current.has(key) && t - (seen.current.get(key) || 0) > 45000) {
          seen.current.set(key, t);
          notify(a.sev, a.sev === 'crit' ? 'Twin alarm' : 'Twin warning', a.msg, { source: 'twin', action: { label: 'Open twin', run: () => go('twin') } });
        }
      });
      prevKeys.current = keys;
    }, 1000);
    return () => clearInterval(id);
  }, [twin, notify, go]);
  return null;
}

export function AlertCenter() {
  const { history, clearHistory, prefs, setPrefs, unread, markRead } = useToast();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div style={{ position: 'relative' }} ref={ref} data-tour="bell">
      <button className="statuspill bellbtn" onClick={() => { setOpen(!open); markRead(); }} title="Alerts" aria-label="Alerts">
        {prefs.muted ? <BellOff size={14} /> : <Bell size={14} />}
        {unread > 0 && <span className="bubble">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="alertpanel">
          <div className="row between" style={{ marginBottom: 8 }}>
            <b style={{ color: '#0b6b34', fontFamily: 'Poppins' }}>Alerts</b>
            <button className="btn sm" onClick={clearHistory}><Trash2 size={12} />Clear</button>
          </div>
          <div className="row between small" style={{ marginBottom: 8 }}>
            <label className="row" style={{ gap: 6 }}><Switch on={!prefs.muted} onChange={(v) => setPrefs((s) => ({ ...s, muted: !v }))} />Pop-ups</label>
            <Seg value={prefs.minSev} onChange={(v) => setPrefs((s) => ({ ...s, minSev: v }))} options={[{ value: 'all', label: 'All' }, { value: 'warn', label: 'Warnings+' }, { value: 'crit', label: 'Critical' }]} />
          </div>
          <div className="log" style={{ maxHeight: 360 }}>
            {history.map((h) => (
              <div key={h.id} className="e" style={{ gridTemplateColumns: '58px 10px 1fr' }}>
                <span className="ts">{h.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className={`sv ${h.sev}`} />
                <span><b style={{ fontWeight: 600 }}>{h.title}</b>{h.msg ? ` · ${h.msg}` : ''}<span className="muted"> · {h.source}</span></span>
              </div>
            ))}
            {!history.length && <div className="muted small" style={{ padding: 10 }}>No alerts yet. Try injecting a fault in the twin.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
