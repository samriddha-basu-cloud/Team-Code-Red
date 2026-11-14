import React, { useMemo, useState } from 'react';
import { X, Search, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { GROUPS, PARAMS, PRESETS } from '../model/params.js';
import { useParams } from '../state/ParamsContext.jsx';
import { ParamField, Switch } from './ui.jsx';

export default function ControlDrawer({ open, onClose }) {
  const { unlock, setUnlock, resetAll, resetGroup, changed, applyPreset, activePreset } = useParams();
  const [q, setQ] = useState('');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [openG, setOpenG] = useState({ scenario: true, line: true });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PARAMS.filter((p) => (!s || `${p.label} ${p.key} ${p.note} ${p.unit}`.toLowerCase().includes(s)) && (!onlyChanged || changed.includes(p.key)));
  }, [q, onlyChanged, changed]);

  if (!open) return null;
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Controls">
        <div className="drawer-h">
          <div className="row between">
            <div>
              <div className="kicker">Control panel</div>
              <h3 style={{ color: '#0b6b34', fontSize: 18 }}>All variables & constants</h3>
            </div>
            <button className="btn sm" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: '#5b6b61' }} />
              <input className="txt" style={{ width: '100%', paddingLeft: 28 }} placeholder={`Search ${PARAMS.length} parameters…`} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn sm danger" onClick={resetAll} title="Reset every parameter to case defaults"><RotateCcw size={13} />Reset all</button>
          </div>
          <div className="row between small">
            <label className="row" style={{ gap: 8 }}><Switch on={unlock} onChange={setUnlock} /> Unlock constants</label>
            <label className="row" style={{ gap: 8 }}><Switch on={onlyChanged} onChange={setOnlyChanged} /> Changed only ({changed.length})</label>
          </div>
          <div className="chips">
            {Object.entries(PRESETS).map(([id, p]) => (
              <button key={id} className={`btn sm ${activePreset === id ? 'on' : ''}`} onClick={() => applyPreset(id)}>{p.label}</button>
            ))}
          </div>
        </div>
        <div className="drawer-b">
          {GROUPS.map((g) => {
            const items = filtered.filter((p) => p.group === g.id);
            if (!items.length) return null;
            const isOpen = q || onlyChanged || openG[g.id];
            const nChanged = items.filter((p) => changed.includes(p.key)).length;
            return (
              <div className="acc" key={g.id}>
                <button className="acc-h" onClick={() => setOpenG((o) => ({ ...o, [g.id]: !o[g.id] }))}>
                  <span>{g.label}<span className="cnt">{items.length} params{nChanged ? ` · ${nChanged} changed` : ''}</span></span>
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {isOpen && (
                  <div style={{ paddingBottom: 10 }}>
                    {items.map((p) => <ParamField key={p.key} k={p.key} />)}
                    <button className="btn sm" style={{ marginTop: 8 }} onClick={() => resetGroup(g.id)}><RotateCcw size={12} /> Reset group</button>
                  </div>
                )}
              </div>
            );
          })}
          {!filtered.length && <div className="muted" style={{ padding: 20 }}>No parameters match.</div>}
        </div>
      </aside>
    </>
  );
}
