import React, { useMemo, useRef, useState } from 'react';
import { Download, Upload, Link2, RotateCcw, Search, Check } from 'lucide-react';
import { Card, PageHead, Switch, Seg } from '../components/ui.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { GROUPS, PARAMS, PRESETS } from '../model/params.js';

export default function ParamsTab() {
  const { params, setParam, setMany, resetAll, unlock, setUnlock, changed, shareUrl, applyPreset, activePreset, ws } = useParams();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('all');
  const [kind, setKind] = useState('all');
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PARAMS.filter((p) => (group === 'all' || p.group === group) && (kind === 'all' || p.kind === kind)
      && (!onlyChanged || changed.includes(p.key)) && (!s || `${p.label} ${p.key} ${p.note}`.toLowerCase().includes(s)));
  }, [q, group, kind, onlyChanged, changed]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: 'code-red-control-tower', version: 1, exported: new Date().toISOString(), params, workspace: ws }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'code-red-scenario.json';
    a.click();
  };
  const importJson = (file) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const j = JSON.parse(r.result);
        setMany(j.params || j);
        setMsg(`Imported ${Object.keys(j.params || j).length} values`);
      } catch { setMsg('That file is not a valid scenario JSON'); }
      setTimeout(() => setMsg(''), 3000);
    };
    r.readAsText(file);
  };
  const copy = async () => {
    const url = shareUrl();
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt('Copy this link', url); }
  };
  const nConst = PARAMS.filter((p) => p.kind === 'const').length;

  return (
    <div className="page">
      <PageHead kicker="Configuration" title={`All ${PARAMS.length} variables and constants`}
        sub={`${PARAMS.length - nConst} variables you can tune freely and ${nConst} constants fixed by the case or physics. Constants are locked until you unlock them. Everything saves in this browser; export or share a link to hand a scenario to someone else.`}
        right={<div className="row">
          <button className="btn" onClick={exportJson}><Download size={15} />Export JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} />Import</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files[0] && importJson(e.target.files[0])} />
          <button className="btn primary" onClick={copy}>{copied ? <Check size={15} /> : <Link2 size={15} />}{copied ? 'Link copied' : 'Copy share link'}</button>
          <button className="btn danger" onClick={resetAll}><RotateCcw size={15} />Reset all</button>
        </div>} />
      {msg && <div className="callout green" style={{ marginBottom: 12 }}>{msg}</div>}
      <Card>
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="row">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 9, top: 9, color: '#5b6b61' }} />
              <input className="txt" style={{ paddingLeft: 28, width: 260 }} placeholder="Search parameters…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="txt" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="all">All groups</option>
              {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
            <Seg value={kind} onChange={setKind} options={[{ value: 'all', label: 'All' }, { value: 'var', label: 'Variables' }, { value: 'const', label: 'Constants' }]} />
          </div>
          <div className="row small">
            <label className="row" style={{ gap: 6 }}><Switch on={unlock} onChange={setUnlock} />Unlock constants</label>
            <label className="row" style={{ gap: 6 }}><Switch on={onlyChanged} onChange={setOnlyChanged} />Changed only ({changed.length})</label>
          </div>
        </div>
        <div className="chips" style={{ marginBottom: 12 }}>
          <span className="small muted" style={{ alignSelf: 'center' }}>Presets:</span>
          {Object.entries(PRESETS).map(([id, s]) => <button key={id} className={`btn sm ${activePreset === id ? 'on' : ''}`} onClick={() => applyPreset(id)}>{s.label}</button>)}
        </div>
        <div className="tablewrap">
          <table className="t">
            <thead><tr><th>Group</th><th>Parameter</th><th>Kind</th><th className="n">Value</th><th>Unit</th><th className="n">Default</th><th className="n">Range</th><th>Note</th><th /></tr></thead>
            <tbody>
              {rows.map((m) => {
                const locked = m.kind === 'const' && !unlock;
                const v = params[m.key];
                const ch = v !== m.def;
                return (
                  <tr key={m.key} style={ch ? { background: '#fffaf0' } : undefined}>
                    <td className="muted small">{GROUPS.find((g) => g.id === m.group)?.label}</td>
                    <td><b style={{ fontWeight: 600 }}>{m.label}</b><div className="small muted mono">{m.key}</div></td>
                    <td><span className={`lock ${m.kind === 'var' ? 'var' : ''}`}>{m.kind === 'const' ? 'CONST' : 'VAR'}</span></td>
                    <td className="n">
                      {m.type === 'bool'
                        ? <Switch on={!!v} onChange={(x) => setParam(m.key, x)} disabled={locked} />
                        : <input className="num" type="number" step={m.step} min={m.min} max={m.max} value={v} disabled={locked} onChange={(e) => e.target.value !== '' && setParam(m.key, Number(e.target.value))} />}
                    </td>
                    <td className="small muted">{m.unit}</td>
                    <td className="n muted">{String(m.def)}</td>
                    <td className="n small muted">{m.type === 'bool' ? 'on/off' : `${m.min}–${m.max}`}</td>
                    <td className="small muted" style={{ maxWidth: 260 }}>{m.note}</td>
                    <td>{ch && <button className="btn sm" disabled={locked} onClick={() => setParam(m.key, m.def)} title="Reset"><RotateCcw size={12} /></button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="muted" style={{ padding: 20 }}>No parameters match these filters.</div>}
      </Card>
    </div>
  );
}
