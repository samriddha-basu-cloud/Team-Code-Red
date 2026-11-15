import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import { CheckCircle2, XCircle, Clock, Gavel, Save, Pin, PinOff, RotateCcw, Trash2, Download, ArrowRight, Scale, Trophy, ShieldCheck, Undo2 } from 'lucide-react';
import { Card, PageHead, ParamField, tooltipStyle, C } from '../components/ui.jsx';
import { InfoTip, Tip, GLOSSARY } from '../components/Tip.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { useDecision } from '../state/useDecision.js';
import { useToast } from '../state/ToastContext.jsx';
import { OPTIONS, CRITERIA, DEFAULT_WEIGHTS, DEFAULT_SCORES, DEFAULT_GATES } from '../model/decision.js';
import { finance, derive, oeeCell } from '../model/engine.js';
import { fmtCr, fmtMonths, fmtPct } from '../util/format.js';

const CRIT_COL = { npv: '#0B6B34', payback: '#14A651', oee: '#3DB46B', gentle: '#7FCB98', health: '#C9962B', flex: '#E2C27A', maint: '#8FB7A0', footprint: '#B4BEB7', risk: '#D7DED9' };
const VCOL = { GO: { bg: '#0B6B34', fg: '#fff' }, 'GO WITH CONDITIONS': { bg: '#C9962B', fg: '#fff' }, 'NO-GO': { bg: '#D0574B', fg: '#fff' } };

export function VerdictBadge({ verdict, size = 'md' }) {
  const c = VCOL[verdict];
  return <span className={`verdict ${size}`} style={{ background: c.bg, color: c.fg }}>{verdict}</span>;
}

export default function DecisionTab({ go }) {
  const { params: p, setMany, fin, oee, blocking, d, ws, setWs, activePreset, diff } = useParams();
  const { gate, gates, weights, scores, facts, matrix, ranking, flips } = useDecision();
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [cmp, setCmp] = useState([]);
  const winner = ranking[0];

  const setW = (k, v) => setWs('weights', (w) => ({ ...(w || {}), [k]: v }));
  const setScore = (o, k, v) => setWs('scores', (s) => ({ ...(s || {}), [o]: { ...((s || {})[o] || {}), [k]: v } }));
  const setGate = (k, v) => setWs('gates', (g) => ({ ...(g || {}), [k]: v }));

  const chart = ranking.map((r) => ({ name: r.short, total: +r.total.toFixed(2), ...Object.fromEntries(r.parts.map((x) => [x.id, +x.v.toFixed(3)])) }));

  // what-if vs pinned baseline
  const base = ws.baseline;
  const baseCalc = useMemo(() => {
    if (!base) return null;
    const bp = { ...p, ...base };
    const bd = derive(bp);
    return { fin: finance(bp), oee: oeeCell(bp, bd, blocking.blockedPct) };
  }, [base, p, blocking.blockedPct]);
  const delta = (a, b) => (a - b >= 0 ? '+' : '−') + Math.abs(a - b);

  const record = () => {
    const snap = {
      id: Date.now(), name: name.trim() || `Decision ${ws.decisionLog.length + 1}`, at: new Date().toISOString(), notes,
      verdict: gate.verdict, winner: winner.label, npv: fin.npv, irr: fin.irr, pb: fin.pb, oee: oee.OEE, blocking: blocking.blockedPct,
      preset: activePreset, worstNpv: gate.worst.npv, pLoss: gate.mc.pLoss, params: { ...diff },
      failed: gate.list.filter((x) => !x.pass).map((x) => x.label),
    };
    setWs('decisionLog', (l) => [snap, ...(l || [])]);
    setName(''); setNotes('');
    notify('ok', 'Decision recorded', `${snap.name}: ${snap.verdict}`, { force: true });
  };
  const exportLog = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(ws.decisionLog, null, 2)], { type: 'application/json' }));
    a.download = 'code-red-decision-log.json';
    a.click();
  };
  const compared = ws.decisionLog.filter((x) => cmp.includes(x.id));

  return (
    <div className="page">
      <PageHead kicker="Decision Studio" title="Should we build the cell, and on what conditions?"
        sub="Ten gates turn the model, the twin and the people plan into a verdict. Weigh the options your way, test what-ifs against a pinned baseline, and record each decision so you can compare them." />
      <div className="stack" style={{ gap: 14 }}>
        <div className="verdict-hero" style={{ borderColor: VCOL[gate.verdict].bg }}>
          <div>
            <div className="kicker">Verdict at current settings</div>
            <div className="row" style={{ gap: 12, marginTop: 6 }}><VerdictBadge verdict={gate.verdict} size="lg" /><span className="muted">{activePreset ? `Scenario: ${activePreset}` : 'Custom scenario'}</span></div>
            <div style={{ marginTop: 10, lineHeight: 1.5, maxWidth: 760 }}>
              {gate.verdict === 'GO' && <>Every gate passes. The <b>{winner.label}</b> ranks first on your weights ({winner.total.toFixed(2)} / 5).</>}
              {gate.verdict === 'GO WITH CONDITIONS' && <>All must-pass gates are met. Close <b>{gate.condOpen.length}</b> condition{gate.condOpen.length > 1 ? 's' : ''} before go-live: {gate.condOpen.map((x) => x.label.toLowerCase()).join('; ')}.</>}
              {gate.verdict === 'NO-GO' && <><b>{gate.mustFail.length}</b> must-pass gate{gate.mustFail.length > 1 ? 's fail' : ' fails'}: {gate.mustFail.map((x) => x.label.toLowerCase()).join('; ')}. Fix these before committing capital.</>}
            </div>
            <div className="chips" style={{ marginTop: 10 }}>
              <span className="chip">NPV {fmtCr(fin.npv)}</span><span className="chip">Payback {fmtMonths(fin.pb)}</span>
              <span className="chip">OEE {fmtPct(oee.OEE * 100)}</span><span className="chip">Worst preset {fmtCr(gate.worst.npv)}</span>
              <span className={`chip ${gate.mc.pLoss > 0.05 ? 'red' : ''}`}>P(loss) {fmtPct(gate.mc.pLoss * 100)}</span>
            </div>
          </div>
          <div className="record">
            <div className="kicker" style={{ marginBottom: 6 }}>Record this decision</div>
            <input className="txt" style={{ width: '100%' }} placeholder="Name, e.g. Base case: GO" value={name} onChange={(e) => setName(e.target.value)} />
            <textarea className="txt" style={{ width: '100%', marginTop: 6, minHeight: 58, resize: 'vertical' }} placeholder="Notes or conditions (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <button className="btn primary" style={{ width: '100%', marginTop: 6 }} onClick={record}><Save size={15} />Record decision</button>
          </div>
        </div>

        <div className="grid g3">
          <Card className="span2" title="Decision gates" tag="GATES" sub="MUST gates decide GO / NO-GO; CONDITION gates must close before go-live">
            <div className="stack" style={{ gap: 6 }}>
              {gate.list.map((g) => (
                <div key={g.id} className={`gaterow ${g.pass ? 'pass' : g.pending ? 'pending' : 'fail'}`}>
                  {g.pass ? <CheckCircle2 size={18} /> : g.pending ? <Clock size={18} /> : <XCircle size={18} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}><b>{g.label}</b><span className={`gtype ${g.type}`}>{g.type === 'must' ? 'MUST' : 'CONDITION'}</span></div>
                    <div className="small muted">{g.detail}{!g.pass && g.fix ? ` · ${g.fix}` : ''}</div>
                  </div>
                  {!g.pass && g.goto && <button className="btn sm" onClick={() => go(g.goto)}>Fix<ArrowRight size={13} /></button>}
                </div>
              ))}
            </div>
          </Card>
          <Card title="Gate thresholds" tip="Set how strict each gate is. Changes apply instantly.">
            {[['maxPaybackMo', 'Max payback', 'months', 1], ['maxBlockingPct', 'Max primary blocking', '%', 0.1], ['maxLossProb', 'Max probability of loss', '%', 1]].map(([k, l, u, st]) => (
              <div className="field" key={k}><div className="lbl">{l}</div><div className="ctl"><input className="num" type="number" step={st} value={gates[k]} onChange={(e) => setGate(k, Number(e.target.value))} /><span className="unit">{u}</span></div></div>
            ))}
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setWs('gates', {})}><RotateCcw size={12} />Reset thresholds</button>
            <div className="callout green" style={{ marginTop: 12 }}>The Monte Carlo behind "probability of loss" draws 500 random futures for COPQ gain, CapEx overrun, speed drop, downtime and wages.</div>
          </Card>
        </div>

        <div className="grid g3">
          <Card title="Your weights" tag="MCDA" tip={GLOSSARY.MCDA} right={<button className="btn sm" onClick={() => setWs('weights', {})}><RotateCcw size={12} />Reset</button>}>
            {CRITERIA.map((c) => (
              <div className="field" key={c.id}>
                <div className="lbl"><span className="row" style={{ gap: 6 }}><i className="swatch" style={{ background: CRIT_COL[c.id] }} />{c.label}<InfoTip text={c.tip} /></span></div>
                <div className="ctl"><b className="mono" style={{ width: 34, textAlign: 'right' }}>{weights[c.id]}</b><span className="unit" style={{ minWidth: 24 }}>pts</span></div>
                <input type="range" min={0} max={50} step={1} value={weights[c.id]} onChange={(e) => setW(c.id, Number(e.target.value))} />
              </div>
            ))}
          </Card>
          <Card className="span2" title="Options ranked on your weights" sub="Weighted score out of 5; each colour is one criterion's contribution"
            right={<span className="chip"><Trophy size={12} style={{ verticalAlign: -2 }} /> {winner.label}</span>}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 50 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [Number(v).toFixed(2), CRITERIA.find((c) => c.id === n)?.label || n]} />
                {CRITERIA.map((c, i) => (
                  <Bar key={c.id} dataKey={c.id} stackId="s" fill={CRIT_COL[c.id]} isAnimationActive={false}>
                    {i === CRITERIA.length - 1 && <LabelList dataKey="total" position="right" style={{ fontWeight: 700, fontSize: 12.5, fill: C.ink }} />}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
            <div className="tablewrap"><table className="t">
              <thead><tr><th>Criterion</th>{OPTIONS.map((o) => <th key={o.id} className="n">{o.short}</th>)}</tr></thead>
              <tbody>
                <tr><td className="muted">NPV (live)</td>{OPTIONS.map((o) => <td key={o.id} className="n">{fmtCr(facts[o.id].npv)}</td>)}</tr>
                <tr><td className="muted">Payback (live)</td>{OPTIONS.map((o) => <td key={o.id} className="n">{facts[o.id].pb == null ? '—' : fmtMonths(facts[o.id].pb)}</td>)}</tr>
                <tr><td className="muted">OEE (live)</td>{OPTIONS.map((o) => <td key={o.id} className="n">{fmtPct(facts[o.id].oee * 100)}</td>)}</tr>
                {CRITERIA.filter((c) => !c.live).map((c) => (
                  <tr key={c.id}><td><Tip text={c.tip}><span>{c.label}</span></Tip></td>
                    {OPTIONS.map((o) => (
                      <td key={o.id} className="n">
                        <select className={`txt scoresel ${scores[o.id][c.id] !== DEFAULT_SCORES[o.id][c.id] ? 'edited' : ''}`} value={scores[o.id][c.id]} onChange={(e) => setScore(o.id, c.id, Number(e.target.value))}>
                          {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table></div>
            <div className="row between small" style={{ marginTop: 8 }}>
              <span className="muted">Qualitative scores 1–5 (5 = best). Live criteria are rescaled 1–5 across the options.</span>
              <button className="btn sm" onClick={() => setWs('scores', {})}><RotateCcw size={12} />Reset scores</button>
            </div>
          </Card>
        </div>

        <div className="grid g2">
          <Card title="How robust is the winner?" tip="For each criterion, the weight range (0–50+) over which the current winner stays on top, holding all other weights fixed.">
            <table className="t">
              <thead><tr><th>Criterion</th><th className="n">Your weight</th><th>{winner.short} stays first while weight is…</th><th>Else</th></tr></thead>
              <tbody>{flips.map((f) => (
                <tr key={f.id}><td>{f.label}</td><td className="n">{f.current}</td>
                  <td>{f.robust ? <span className="chip">any value 0–100</span> : f.lo === null ? <span className="chip red">never</span> : <span className="chip gold">{f.lo}–{f.hi}</span>}</td>
                  <td className="muted">{f.robust ? '—' : f.flipTo ? OPTIONS.find((o) => o.id === f.flipTo)?.short : '—'}</td></tr>
              ))}</tbody>
            </table>
          </Card>
          <Card title="What-if levers" tip="Pin the current settings as a baseline, then move the levers. Deltas show how far you moved from the pinned baseline."
            right={base
              ? <div className="row"><button className="btn sm" onClick={() => setMany(base)}><Undo2 size={12} />Back to baseline</button><button className="btn sm" onClick={() => setWs('baseline', null)}><PinOff size={12} />Unpin</button></div>
              : <button className="btn sm dark" onClick={() => { setWs('baseline', { ...p }); notify('info', 'Baseline pinned', 'Move the levers to see the deltas', { force: true, ttl: 3000 }); }}><Pin size={12} />Pin baseline</button>}>
            {baseCalc ? (
              <div className="chips" style={{ marginBottom: 8 }}>
                <span className={`chip ${fin.npv < baseCalc.fin.npv ? 'red' : ''}`}>ΔNPV {delta(+(fin.npv / 1e7).toFixed(2), +(baseCalc.fin.npv / 1e7).toFixed(2))} Cr</span>
                <span className="chip">ΔPayback {fin.pb != null && baseCalc.fin.pb != null ? `${delta(+(fin.pb * 12).toFixed(1), +(baseCalc.fin.pb * 12).toFixed(1))} mo` : 'n/a'}</span>
                <span className={`chip ${oee.OEE < baseCalc.oee.OEE ? 'red' : ''}`}>ΔOEE {delta(+(oee.OEE * 100).toFixed(1), +(baseCalc.oee.OEE * 100).toFixed(1))} pts</span>
              </div>
            ) : <div className="small muted" style={{ marginBottom: 8 }}>Pin a baseline to see deltas as you move the levers.</div>}
            {['scnCopqRealisation', 'scnCapexOverrun', 'scnSpeedDrop', 'bufferCapacity', 'wageMonthly', 'copqAfter'].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
        </div>

        <Card title="Decision log" sub={`${ws.decisionLog.length} recorded · tick up to 3 to compare`}
          right={<div className="row"><button className="btn sm" onClick={exportLog} disabled={!ws.decisionLog.length}><Download size={12} />Export</button></div>}>
          {ws.decisionLog.length ? (
            <div className="tablewrap"><table className="t">
              <thead><tr><th /><th>Name</th><th>When</th><th>Verdict</th><th className="n">NPV</th><th className="n">Payback</th><th className="n">OEE</th><th className="n">P(loss)</th><th>Edits</th><th /></tr></thead>
              <tbody>{ws.decisionLog.map((x) => (
                <tr key={x.id}>
                  <td><input type="checkbox" style={{ accentColor: '#14a651' }} checked={cmp.includes(x.id)} onChange={(e) => setCmp((c) => (e.target.checked ? [...c, x.id].slice(-3) : c.filter((i) => i !== x.id)))} /></td>
                  <td><b style={{ fontWeight: 600 }}>{x.name}</b>{x.notes && <div className="small muted">{x.notes}</div>}</td>
                  <td className="small muted">{new Date(x.at).toLocaleString()}</td>
                  <td><VerdictBadge verdict={x.verdict} size="sm" /></td>
                  <td className="n">{fmtCr(x.npv)}</td><td className="n">{fmtMonths(x.pb)}</td><td className="n">{fmtPct(x.oee * 100)}</td><td className="n">{fmtPct(x.pLoss * 100)}</td>
                  <td className="small muted">{Object.keys(x.params).length} params</td>
                  <td className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    <Tip text="Restore this snapshot's parameters"><button className="btn sm" onClick={() => { setMany(x.params); notify('info', 'Snapshot restored', x.name, { force: true, ttl: 3000 }); }}><RotateCcw size={12} /></button></Tip>
                    <button className="btn sm danger" onClick={() => setWs('decisionLog', (l) => l.filter((y) => y.id !== x.id))}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          ) : <div className="empty"><Gavel size={26} /><div>No decisions recorded yet. Use “Record this decision” at the top.</div></div>}
          {compared.length >= 2 && (
            <>
              <div className="sep" />
              <div className="kicker" style={{ marginBottom: 6 }}>Side-by-side</div>
              <div className="tablewrap"><table className="t">
                <thead><tr><th>Metric</th>{compared.map((x) => <th key={x.id} className="n">{x.name}</th>)}</tr></thead>
                <tbody>
                  <tr><td>Verdict</td>{compared.map((x) => <td key={x.id} className="n"><VerdictBadge verdict={x.verdict} size="sm" /></td>)}</tr>
                  <tr><td>Top option</td>{compared.map((x) => <td key={x.id} className="n">{x.winner}</td>)}</tr>
                  <tr><td>NPV</td>{compared.map((x) => <td key={x.id} className="n">{fmtCr(x.npv)}</td>)}</tr>
                  <tr><td>IRR</td>{compared.map((x) => <td key={x.id} className="n">{x.irr == null ? 'n/a' : fmtPct(x.irr * 100, 0)}</td>)}</tr>
                  <tr><td>Payback</td>{compared.map((x) => <td key={x.id} className="n">{fmtMonths(x.pb)}</td>)}</tr>
                  <tr><td>Model OEE</td>{compared.map((x) => <td key={x.id} className="n">{fmtPct(x.oee * 100)}</td>)}</tr>
                  <tr><td>Primary blocking</td>{compared.map((x) => <td key={x.id} className="n">{fmtPct(x.blocking, 2)}</td>)}</tr>
                  <tr><td>Worst preset NPV</td>{compared.map((x) => <td key={x.id} className="n">{fmtCr(x.worstNpv)}</td>)}</tr>
                  <tr><td>Open gates</td>{compared.map((x) => <td key={x.id} className="n small">{x.failed.length ? x.failed.join('; ') : 'none'}</td>)}</tr>
                  <tr><td>Changed parameters</td>{compared.map((x) => <td key={x.id} className="n small mono">{Object.entries(x.params).map(([k, v]) => `${k}=${v}`).join(', ') || 'defaults'}</td>)}</tr>
                </tbody>
              </table></div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
