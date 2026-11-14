import React, { useState } from 'react';
import { Play, Pause, RotateCcw, FastForward, Zap, Wrench, Factory, Bug, CircleSlash, Package, Camera, Eraser } from 'lucide-react';
import { useTwinCtl, SPEEDS, useTick } from '../state/TwinContext.jsx';
import { Seg } from './ui.jsx';
import { fmtClock } from '../util/format.js';

export const FAULTS = [
  { id: 'cellJam', label: 'Turret jam 45 s', icon: Wrench },
  { id: 'visionFault', label: 'Camera fault 2 min', icon: Camera },
  { id: 'blankShortage', label: 'Blank shortage 4 min', icon: Package },
  { id: 'primaryStop', label: 'Reel splice 90 s', icon: Factory },
  { id: 'gsm', label: 'GSM drift 10 min', icon: Zap },
  { id: 'sealBurst', label: 'Seal defect burst', icon: Bug },
  { id: 'clearAll', label: 'Clear faults', icon: Eraser },
];

export default function TwinControls({ showFaults = true }) {
  const { twin, running, setRunning, speed, setSpeed, mode, setMode, reset, inject, fastForward } = useTwinCtl();
  const [seed, setSeed] = useState(2026);
  useTick(4);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="row between">
        <div className="row">
          <button className={`btn ${running ? '' : 'primary'}`} onClick={() => setRunning(!running)}>{running ? <><Pause size={15} />Pause</> : <><Play size={15} />Run</>}</button>
          <button className="btn" onClick={() => reset(seed)} title="Restart the simulation"><RotateCcw size={15} />Reset</button>
          <span className="statuspill"><span className={`dot ${running ? 'run' : 'pause'}`} />{fmtClock(twin.t)}</span>
        </div>
        <Seg value={mode} onChange={setMode} options={[{ value: 'auto', label: 'Automated cell' }, { value: 'manual', label: 'Manual baseline' }]} />
      </div>
      <div className="row between">
        <div className="row small" style={{ gap: 8 }}>
          <span className="muted">Speed</span>
          <Seg value={speed} onChange={setSpeed} options={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} />
        </div>
        <div className="row small" style={{ gap: 6 }}>
          <span className="muted"><FastForward size={13} style={{ verticalAlign: -2 }} /> Jump</span>
          {[[3600, '1 h'], [28800, '1 shift'], [86400, '1 day'], [604800, '1 week']].map(([s, l]) => (
            <button key={l} className="btn sm" onClick={() => fastForward(s)}>{l}</button>
          ))}
          <span className="muted" style={{ marginLeft: 6 }}>Seed</span>
          <input className="num" style={{ width: 70 }} value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
        </div>
      </div>
      {showFaults && (
        <div className="row" style={{ gap: 6 }}>
          <span className="small muted" style={{ marginRight: 2 }}><CircleSlash size={13} style={{ verticalAlign: -2 }} /> Inject</span>
          {FAULTS.map((f) => (
            <button key={f.id} className={`btn sm ${f.id === 'clearAll' ? '' : 'danger'}`} onClick={() => inject(f.id)} disabled={mode === 'manual' && ['cellJam', 'visionFault', 'blankShortage'].includes(f.id)}>
              <f.icon size={13} />{f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
