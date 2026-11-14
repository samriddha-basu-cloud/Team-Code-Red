import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, LabelList } from 'recharts';
import { Dice5, Plus, Trash2, Scale, ShieldAlert } from 'lucide-react';
import { Card, Kpi, PageHead, ParamField, tooltipStyle, C } from '../components/ui.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { PRESETS } from '../model/params.js';
import { scenarioTable, tornado, breakEvenCopqRealisation, monteCarloNpv, finance } from '../model/engine.js';
import { fmtCr, fmtMonths, fmtPct } from '../util/format.js';

const SEV = ['', 'Low', 'Medium', 'High'];

export default function RiskTab() {
  const { params: p, applyPreset, activePreset, ws, setWs, resetWs } = useParams();
  const [pct, setPct] = useState(20);
  const [n, setN] = useState(2000);
  const [spread, setSpread] = useState({ copqLo: 50, copqMode: 100, copqHi: 110, capexHi: 30, speedHi: 15, dtHi: 5, wage: 10 });
  const [mc, setMc] = useState(null);

  const base = useMemo(() => ({ ...p, scnSpeedDrop: 0, scnCapexOverrun: 0, scnExtraDowntime: 0, scnCopqRealisation: 100 }), [p]);
  const scen = useMemo(() => scenarioTable(base, PRESETS), [base]);
  const current = useMemo(() => finance(p), [p]);
  const tor = useMemo(() => tornado(p, pct), [p, pct]);
  const be = useMemo(() => breakEvenCopqRealisation(p), [p]);
  const torData = tor.rows.map((r) => ({ label: r.label, range: [Math.min(r.lo, r.hi) / 1e7, Math.max(r.lo, r.hi) / 1e7], lo: r.lo / 1e7, hi: r.hi / 1e7 }));
  const scenData = scen.map((s) => ({ ...s, npvCr: s.npv / 1e7 }));
  const runMc = () => setMc(monteCarloNpv(base, n, 42, spread));

  const risks = ws.risks;
  const upd = (i, k, v) => setWs('risks', (rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div className="page">
      <PageHead kicker="Module 4 · Risk & sensitivity" title="Stress scenarios, sensitivity and the risk register"
        sub="Scenarios are computed from your current assumptions. The scenario modifiers on the right also drive the twin and every other tab when you apply a preset." />
      <div className="stack" style={{ gap: 14 }}>
        <div className="grid g4">
          <Kpi dark label="Current setting NPV" icon={Scale} value={fmtCr(current.npv)} sub={activePreset ? PRESETS[activePreset].label : 'Custom scenario'} />
          <Kpi label="Break-even COPQ gain" value={`${(be * 100).toFixed(1)}%`} sub={`of planned: COPQ ${p.copqBefore}% → ${(p.copqBefore - be * (p.copqBefore - p.copqAfter)).toFixed(2)}%`} />
          <Kpi label="Worst preset NPV" icon={ShieldAlert} value={fmtCr(Math.min(...scen.map((s) => s.npv)))} sub={`payback ${fmtMonths(scen.reduce((a, b) => (b.npv < a.npv ? b : a)).pb)}`} tone={Math.min(...scen.map((s) => s.npv)) > 0 ? 'good' : 'bad'} />
          <Kpi label="Monte Carlo P(NPV < 0)" icon={Dice5} value={mc ? fmtPct(mc.pLoss * 100, 1) : '—'} sub={mc ? `P10 ₹${mc.p10.toFixed(2)} · P50 ₹${mc.p50.toFixed(2)} · P90 ₹${mc.p90.toFixed(2)} Cr` : 'run below'} />
        </div>
        <div className="grid g3">
          <Card className="span2" title="Scenario stress tests" tag="M4" sub="A: speed −15% · B: CapEx +25% · C: +5% downtime, and combinations">
            <div className="grid g2">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scenData} layout="vertical" margin={{ left: 20, right: 50 }}>
                  <CartesianGrid stroke={C.grid} horizontal={false} />
                  <XAxis type="number" unit=" Cr" />
                  <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 11.5 }} />
                  <Tooltip {...tooltipStyle} formatter={(v) => `₹${Number(v).toFixed(2)} Cr`} />
                  <ReferenceLine x={0} stroke={C.muted} />
                  <Bar dataKey="npvCr" isAnimationActive={false} radius={[0, 4, 4, 0]}>
                    {scenData.map((s, i) => <Cell key={i} fill={s.npv < 0 ? C.red : s.id === 'base' ? C.gd : s.id === 'ABC' ? C.g : s.id === 'worst' || s.id === 'halfCopq' ? C.gold : C.g2} />)}
                    <LabelList dataKey="npvCr" position="right" formatter={(v) => `₹${v.toFixed(2)}`} style={{ fontSize: 11.5, fill: C.ink }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <table className="t">
                <thead><tr><th>Scenario</th><th className="n">IRR</th><th className="n">Payback</th><th className="n">Disc. PB</th><th /></tr></thead>
                <tbody>{scen.map((s) => (
                  <tr key={s.id} className={activePreset === s.id ? 'hl' : ''}><td>{s.label}</td><td className="n">{s.irr == null ? 'n/a' : fmtPct(s.irr * 100, 0)}</td><td className="n">{fmtMonths(s.pb)}</td><td className="n">{fmtMonths(s.dpb)}</td>
                    <td><button className="btn sm" onClick={() => applyPreset(s.id)}>Apply</button></td></tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
          <Card title="Scenario modifiers" sub="Live: drive the model and the twin">
            {['scnSpeedDrop', 'scnCapexOverrun', 'scnExtraDowntime', 'scnCopqRealisation'].map((k) => <ParamField key={k} k={k} compact />)}
            <div className="callout green" style={{ marginTop: 10 }}>The FAT acceptance test (≤ 0.1% fold damage on 5,000 strips at 90 and 100 GSM) protects the one driver that matters most: the COPQ gain.</div>
          </Card>
        </div>
        <div className="grid g2">
          <Card title="Sensitivity tornado" sub={`NPV when each driver alone moves ±${pct}% (₹ Cr) · base ₹${(tor.base / 1e7).toFixed(2)} Cr`}
            right={<div className="row small">±<input className="num" style={{ width: 60 }} value={pct} onChange={(e) => setPct(Math.max(1, Math.min(80, Number(e.target.value) || 20)))} />%</div>}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={torData} layout="vertical" margin={{ left: 20, right: 40 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(1)} />
                <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 11.5 }} />
                <Tooltip {...tooltipStyle} formatter={(v, nme, it) => `−${pct}%: ₹${it.payload.lo.toFixed(2)} Cr · +${pct}%: ₹${it.payload.hi.toFixed(2)} Cr`} />
                <ReferenceLine x={tor.base / 1e7} stroke={C.ink} strokeWidth={1.5} />
                <Bar dataKey="range" isAnimationActive={false} radius={3}>
                  {torData.map((t, i) => <Cell key={i} fill={i === 0 ? C.g : C.grey} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Monte Carlo NPV" sub="Drivers drawn at random from triangular ranges" right={<button className="btn primary sm" onClick={runMc}><Dice5 size={14} />Run {n.toLocaleString()} trials</button>}>
            <div className="grid g4" style={{ gap: 8, marginBottom: 8 }}>
              {[['copqLo', 'COPQ gain low %'], ['copqHi', 'COPQ gain high %'], ['capexHi', 'CapEx overrun max %'], ['speedHi', 'Speed drop max %'], ['dtHi', 'Extra downtime max %'], ['wage', 'Wage ± %']].map(([k, l]) => (
                <label key={k} className="small"><div className="muted">{l}</div><input className="num" style={{ width: '100%' }} value={spread[k]} onChange={(e) => setSpread((s) => ({ ...s, [k]: Number(e.target.value) || 0 }))} /></label>
              ))}
              <label className="small"><div className="muted">Trials</div><input className="num" style={{ width: '100%' }} value={n} onChange={(e) => setN(Math.max(100, Math.min(20000, Number(e.target.value) || 1000)))} /></label>
            </div>
            {mc ? (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={mc.hist} margin={{ left: -16, right: 8 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="x" tickFormatter={(v) => v.toFixed(1)} minTickGap={20} />
                  <YAxis />
                  <Tooltip {...tooltipStyle} labelFormatter={(v) => `NPV ≈ ₹${Number(v).toFixed(2)} Cr`} />
                  <ReferenceLine x={mc.hist.reduce((a, b) => (Math.abs(b.x - mc.p50) < Math.abs(a.x - mc.p50) ? b : a)).x} stroke={C.gd} strokeDasharray="4 4" label={{ value: 'P50', fill: C.gd, fontSize: 11 }} />
                  <Bar dataKey="count" isAnimationActive={false}>{mc.hist.map((h, i) => <Cell key={i} fill={h.x < 0 ? C.red : C.g} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="muted" style={{ padding: 30, textAlign: 'center' }}>Run the simulation to see the NPV distribution.</div>}
          </Card>
        </div>
        <div className="grid g3">
          <Card className="span2" title="Risk register" right={<div className="row"><button className="btn sm" onClick={() => setWs('risks', (rs) => [...rs, { risk: 'New risk', L: 2, I: 2, status: 'Open', owner: '', mitigation: '' }])}><Plus size={13} />Add</button><button className="btn sm" onClick={() => resetWs('risks')}>Reset</button></div>}>
            <div className="tablewrap"><table className="t">
              <thead><tr><th>Risk</th><th>L</th><th>I</th><th>Status</th><th>Owner</th><th>Mitigation</th><th /></tr></thead>
              <tbody>{risks.map((r, i) => (
                <tr key={i}>
                  <td><input className="txt" style={{ width: 220 }} value={r.risk} onChange={(e) => upd(i, 'risk', e.target.value)} /></td>
                  <td><select className="txt" value={r.L} onChange={(e) => upd(i, 'L', +e.target.value)}>{[1, 2, 3].map((x) => <option key={x} value={x}>{SEV[x]}</option>)}</select></td>
                  <td><select className="txt" value={r.I} onChange={(e) => upd(i, 'I', +e.target.value)}>{[1, 2, 3].map((x) => <option key={x} value={x}>{SEV[x]}</option>)}</select></td>
                  <td><select className="txt" value={r.status} onChange={(e) => upd(i, 'status', e.target.value)}>{['Open', 'Mitigating', 'Closed'].map((x) => <option key={x}>{x}</option>)}</select></td>
                  <td><input className="txt" style={{ width: 120 }} value={r.owner} onChange={(e) => upd(i, 'owner', e.target.value)} /></td>
                  <td><input className="txt" style={{ width: 300 }} value={r.mitigation} onChange={(e) => upd(i, 'mitigation', e.target.value)} /></td>
                  <td><button className="btn sm danger" onClick={() => setWs('risks', (rs) => rs.filter((_, j) => j !== i))}><Trash2 size={13} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
          <Card title="Risk heat map" sub="Likelihood × impact; numbers are register rows">
            <div className="heat">
              <div />{[1, 2, 3].map((x) => <div key={x} className="hd">Impact {SEV[x]}</div>)}
              {[3, 2, 1].map((l) => (
                <React.Fragment key={l}>
                  <div className="hd">Likelihood {SEV[l]}</div>
                  {[1, 2, 3].map((imp) => {
                    const score = l * imp;
                    const bg = score >= 6 ? '#F6C9C3' : score >= 3 ? '#FBE6BE' : '#D6EEDD';
                    return <div key={imp} className="cell" style={{ background: bg }}>{risks.map((r, i) => (r.L === l && r.I === imp ? <span key={i} className="badge" title={r.risk} style={{ opacity: r.status === 'Closed' ? 0.4 : 1 }}>{i + 1}</span> : null))}</div>;
                  })}
                </React.Fragment>
              ))}
            </div>
            <div className="small muted" style={{ marginTop: 10 }}>{risks.filter((r) => r.status !== 'Closed' && r.L * r.I >= 6).length} high risks open · {risks.filter((r) => r.status === 'Closed').length} closed</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
