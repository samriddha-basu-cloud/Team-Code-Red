import React, { useEffect, useState } from 'react';
import { Lock, Unlock, RotateCcw } from 'lucide-react';
import { PARAM_MAP } from '../model/params.js';
import { useParams } from '../state/ParamsContext.jsx';
import { fmtClock } from '../util/format.js';
import { Tip, InfoTip } from './Tip.jsx';

export function Card({ title, sub, tag, right, children, className = '', style, tip }) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || right) && (
        <div className="card-h">
          <div>
            {title && <h3>{tag && <span className="tag">{tag}</span>}{title}{tip && <InfoTip text={tip} />}</h3>}
            {sub && <div className="sub" style={{ marginTop: 3 }}>{sub}</div>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub, dark, icon: Icon, tone, target, pct, tip }) {
  return (
    <div className={`kpi ${dark ? 'dark' : ''}`}>
      <div className="l">{Icon && <Icon size={14} />}{label}{tip && <span style={{ marginLeft: 'auto' }}><InfoTip text={tip} /></span>}</div>
      <div className={`v ${tone || ''}`}>{value}</div>
      {sub && <div className="s">{sub}</div>}
      {pct !== undefined && (
        <div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />{target !== undefined && <b style={{ left: `${Math.max(0, Math.min(100, target))}%` }} />}</div>
      )}
    </div>
  );
}

export function PageHead({ kicker, title, sub, right }) {
  return (
    <div className="page-head">
      <div>
        <div className="kicker">{kicker}</div>
        <h1 className="page-title">{title}</h1>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Switch({ on, onChange, disabled }) {
  return <button type="button" className={`switch ${on ? 'on' : ''}`} disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on} />;
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={String(o.value)} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

function NumInput({ value, onCommit, disabled, step, min, max }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(+Number(value).toFixed(4))), [value]);
  const commit = () => {
    const v = Number(txt);
    if (!isFinite(v)) { setTxt(String(value)); return; }
    onCommit(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, v)));
  };
  return (
    <input className="num" value={txt} disabled={disabled} inputMode="decimal" step={step}
      onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
  );
}

function ParamTipBody({ m, v }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.label}</div>
      {m.note && <div style={{ marginBottom: 4 }}>{m.note}</div>}
      <div style={{ opacity: 0.85 }}>
        {m.kind === 'const' ? 'Constant: fixed by the case or physics. Unlock constants to change it.' : 'Variable: a decision or assumption you can tune.'}
      </div>
      <div style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>Now <b>{String(v)}</b> {m.unit} · default {String(m.def)} · range {m.min}–{m.max}</div>
      <div style={{ opacity: 0.7, marginTop: 2, fontFamily: 'monospace', fontSize: 11 }}>{m.key}</div>
    </div>
  );
}

export function ParamField({ k, compact = false }) {
  const { params, setParam, unlock } = useParams();
  const m = PARAM_MAP[k];
  if (!m) return null;
  const v = params[k];
  const locked = m.kind === 'const' && !unlock;
  const changed = v !== m.def;
  if (m.type === 'bool') {
    return (
      <div className={`field ${changed ? 'changed' : ''}`}>
        <div className="lbl"><Tip text={<ParamTipBody m={m} v={v} />} width={300}><span className="plabel">{m.label}</span></Tip>{m.note && <small>{m.note}</small>}</div>
        <div className="ctl"><Switch on={!!v} onChange={(x) => setParam(k, x)} disabled={locked} /></div>
      </div>
    );
  }
  return (
    <div className={`field ${changed ? 'changed' : ''}`}>
      <div className="lbl">
        <Tip text={<ParamTipBody m={m} v={v} />} width={300}><span className="plabel">{m.label}</span></Tip>
        {!compact && (
          <small>
            <span className={`lock ${m.kind === 'var' ? 'var' : ''}`}>{m.kind === 'const' ? 'CONST' : 'VAR'}</span>
            {m.note ? ` ${m.note}` : ''}{changed ? ` · default ${m.def}` : ''}
          </small>
        )}
      </div>
      <div className="ctl">
        {changed && <button className="btn sm" title="Reset to default" onClick={() => setParam(k, m.def)} disabled={locked}><RotateCcw size={12} /></button>}
        {m.kind === 'const' && (locked ? <Lock size={13} color="#8a968e" /> : <Unlock size={13} color="#c9962b" />)}
        <NumInput value={v} onCommit={(x) => setParam(k, x)} disabled={locked} step={m.step} min={m.min} max={m.max} />
        <span className="unit">{m.unit}</span>
      </div>
      <input type="range" min={m.min} max={m.max} step={m.step} value={Math.max(m.min, Math.min(m.max, v))} disabled={locked}
        onChange={(e) => setParam(k, Number(e.target.value))} />
    </div>
  );
}

export function Alarms({ items }) {
  if (!items.length) return <div className="alarm ok">All clear: no active alarms</div>;
  return (
    <div className="stack" style={{ gap: 6 }}>
      {items.map((a, i) => <div key={i} className={`alarm ${a.sev}`}><span className={`sv ${a.sev}`} style={{ width: 8, height: 8, borderRadius: 4, marginTop: 5, flex: 'none' }} />{a.msg}</div>)}
    </div>
  );
}

export function EventLog({ events, max = 80, height = 320 }) {
  return (
    <div className="log" style={{ maxHeight: height }}>
      {events.slice(0, max).map((e, i) => (
        <div className="e" key={i}><span className="ts">{fmtClock(e.t).slice(3)}</span><span className={`sv ${e.sev}`} /><span>{e.msg}</span></div>
      ))}
      {!events.length && <div className="muted small">No events yet.</div>}
    </div>
  );
}

export const tooltipStyle = {
  contentStyle: { borderRadius: 10, border: '1px solid #cfe3d4', boxShadow: '0 8px 24px rgba(11,107,52,.12)', fontSize: 12.5 },
  labelStyle: { color: '#0b6b34', fontWeight: 700 },
};

export const C = { g: '#14A651', gd: '#0B6B34', g2: '#3DB46B', g3: '#9ED9B1', grey: '#B4BEB7', grid: '#DCE7DE', red: '#D0574B', gold: '#C9962B', amber: '#E2A23B', ink: '#1B2A21', muted: '#5B6B61' };
