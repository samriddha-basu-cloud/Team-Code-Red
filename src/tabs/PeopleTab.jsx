import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Users, GraduationCap, Wallet, Wrench, PackageSearch, HeartHandshake, Plus, Trash2, Check, RotateCcw } from 'lucide-react';
import { Card, Kpi, PageHead, tooltipStyle, C } from '../components/ui.jsx';
import { GLOSSARY } from '../components/Tip.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { useTwinCtl, useTick } from '../state/TwinContext.jsx';
import { MODULES } from '../state/workspace.js';

const PALETTE = [C.gd, C.g, '#5CC584', C.g3, '#C9D1CC', '#E2E7E3', C.gold, '#8FB7A0'];
const LADDER = [
  { lvl: 'L1', role: 'Cell operator', dur: '2 weeks', pay: '₹20–22k', h: 120, bg: '#7FCB98' },
  { lvl: 'L2', role: 'Cell technician', dur: '12 weeks · ITI + OEM at FAT + buddy', pay: '₹30–35k', h: 150, bg: '#3DB46B' },
  { lvl: 'L3', role: 'Automation specialist', dur: '6–12 months · apprenticeship', pay: '₹40–50k', h: 180, bg: '#14A651' },
  { lvl: 'L4', role: 'TPM champion / line lead', dur: '12–24 months', pay: '₹50k+', h: 210, bg: '#0B6B34' },
];

export default function PeopleTab() {
  const { params: p, d, ws, setWs, resetWs, setParam } = useParams();
  const { twin } = useTwinCtl();
  useTick(1);
  const nowH = twin.t / 3600;
  const total = ws.transition.reduce((a, r) => a + (Number(r.people) || 0), 0);
  const gap = Math.round(d.rollCount) - total;
  const stack = [Object.fromEntries([['name', 'People'], ...ws.transition.map((r, i) => [`k${i}`, Number(r.people) || 0])])];
  const progress = (t) => MODULES.filter((m) => t.done[m.id]).length / MODULES.length;
  const l2done = ws.cohort.filter((t) => MODULES.filter((m) => m.level <= 'L2').every((m) => t.done[m.id])).length;
  const budget = ws.budget.reduce((a, b) => a + (Number(b.l) || 0), 0);
  const tpm = ws.tpm.map((t) => {
    const last = t.lastDoneH > nowH ? 0 : t.lastDoneH;
    const dueIn = t.freqH - (nowH - last);
    return { ...t, dueIn, status: dueIn < 0 ? 'Overdue' : dueIn < t.freqH * 0.15 ? 'Due soon' : 'OK' };
  });
  const overdue = tpm.filter((t) => t.status === 'Overdue').length;
  const pmHours = ws.tpm.reduce((a, t) => a + (p.hoursPerYear / t.freqH) * (t.mins / 60), 0);
  const low = ws.spares.filter((s) => s.qty < s.min).length;
  const stockVal = ws.spares.reduce((a, s) => a + s.qty * s.costL, 0);
  const updT = (i, k, v) => setWs('transition', (rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const updS = (i, k, v) => setWs('spares', (rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  return (
    <div className="page">
      <PageHead kicker="Module 4 · Change management" title="People transition, upskilling and preventive maintenance"
        sub="Automation with compassion: a written no-forced-exit pledge. Plan where each person goes, track the technician cohort, and run the TPM rhythm against the twin's running hours." />
      <div className="stack" style={{ gap: 14 }}>
        <div className="grid g6">
          <Kpi dark label="People on rolls" tip={'Active operators per shift × shifts × 7/6 for weekly offs ÷ (1 − absenteeism).'} icon={Users} value={Math.round(d.rollCount)} sub={`${p.opsPerShift}/shift × ${p.shifts} · ${p.absenteeism}% absent`} />
          <Kpi label="Transition plan" icon={HeartHandshake} value={`${total} placed`} sub={gap === 0 ? 'everyone has a path' : gap > 0 ? `${gap} still without a path` : `${-gap} more paths than people`} tone={gap === 0 ? 'good' : 'warn'} />
          <Kpi label="Technicians at L2" icon={GraduationCap} value={`${l2done} / ${ws.cohort.length}`} sub={`need ${p.techs} on roster`} tone={l2done >= p.techs ? 'good' : 'warn'} />
          <Kpi label="People programme" icon={Wallet} value={`₹${budget.toFixed(1)} L`} sub={`model uses ₹${p.trainingL} L`} tone={Math.abs(budget - p.trainingL) < 0.05 ? 'good' : 'warn'} />
          <Kpi label="TPM status" tip={'Due dates run on the twin clock. Fast-forward the twin to see tasks fall due.'} icon={Wrench} value={overdue ? `${overdue} overdue` : 'On track'} sub={`${pmHours.toFixed(0)} planned h/yr · twin at ${nowH.toFixed(1)} h`} tone={overdue ? 'bad' : 'good'} />
          <Kpi label="Critical spares" icon={PackageSearch} value={low ? `${low} below min` : 'Stocked'} sub={`inventory ₹${stockVal.toFixed(1)} L`} tone={low ? 'bad' : 'good'} />
        </div>
        <div className="grid g3">
          <Card className="span2" title="Where every operator goes" sub="Edit the paths; the bar must add up to the people on rolls"
            right={<div className="row"><button className="btn sm" onClick={() => setWs('transition', (rs) => [...rs, { path: 'New path', people: 0, when: '' }])}><Plus size={13} />Add path</button><button className="btn sm" onClick={() => resetWs('transition')}>Reset</button></div>}>
            <ResponsiveContainer width="100%" height={86}>
              <BarChart data={stack} layout="vertical" margin={{ left: 0, right: 0 }}>
                <XAxis type="number" hide domain={[0, Math.max(total, Math.round(d.rollCount))]} />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [`${v} people`, ws.transition[Number(n.slice(1))]?.path]} />
                {ws.transition.map((r, i) => <Bar key={i} dataKey={`k${i}`} stackId="a" fill={PALETTE[i % PALETTE.length]} isAnimationActive={false} />)}
              </BarChart>
            </ResponsiveContainer>
            <table className="t">
              <thead><tr><th /><th>Path</th><th className="n">People</th><th>When</th><th /></tr></thead>
              <tbody>
                {ws.transition.map((r, i) => (
                  <tr key={i}>
                    <td><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} /></td>
                    <td><input className="txt" style={{ width: '100%' }} value={r.path} onChange={(e) => updT(i, 'path', e.target.value)} /></td>
                    <td className="n"><input className="num" style={{ width: 70 }} value={r.people} onChange={(e) => updT(i, 'people', Number(e.target.value) || 0)} /></td>
                    <td><input className="txt" value={r.when} onChange={(e) => updT(i, 'when', e.target.value)} /></td>
                    <td><button className="btn sm danger" onClick={() => setWs('transition', (rs) => rs.filter((_, j) => j !== i))}><Trash2 size={13} /></button></td>
                  </tr>
                ))}
                <tr className="hl"><td /><td>Total vs people on rolls</td><td className="n">{total} / {Math.round(d.rollCount)}</td><td colSpan={2} className={gap === 0 ? 'good' : 'warn'}>{gap === 0 ? 'Balanced' : gap > 0 ? `${gap} unplaced` : `${-gap} over`}</td></tr>
              </tbody>
            </table>
          </Card>
          <Card title="The pledge">
            <div className="callout green" style={{ fontSize: 14 }}><b>The machine takes the wrist-breaking job, not anyone's livelihood.</b></div>
            <ol style={{ paddingLeft: 18, lineHeight: 1.6, marginTop: 10 }}>
              <li>No forced exits, in writing, before the PO is signed.</li>
              <li>Town hall the week the board approves.</li>
              <li>Four operators join the FAT team as co-designers.</li>
              <li>Training is paid time; new skills earn new pay.</li>
              <li>Selection by aptitude, open to all; women operators encouraged.</li>
            </ol>
            <div className="small muted">Natural attrition at {p.turnover}% a year ≈ {(d.rollCount * p.turnover / 100 * 8 / 12).toFixed(0)} people over an 8-month build.</div>
          </Card>
        </div>
        <Card title="Upskilling ladder" sub="New skills earn new pay">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, alignItems: 'end' }}>
            {LADDER.map((l) => (
              <div key={l.lvl} className="stepbox" style={{ background: l.bg, height: l.h }}>
                <b>{l.lvl} · {l.role}</b><span>{l.dur}</span><span style={{ fontWeight: 700, marginTop: 4 }}>{l.pay} / month</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="grid g3">
          <Card className="span2" title="Technician cohort tracker" sub="Tick modules as each trainee completes them"
            right={<div className="row"><button className="btn sm" onClick={() => setWs('cohort', (c) => [...c, { name: `Trainee ${c.length + 1}`, done: {} }])}><Plus size={13} />Add trainee</button><button className="btn sm" onClick={() => resetWs('cohort')}>Reset</button></div>}>
            <div className="tablewrap"><table className="t">
              <thead><tr><th>Trainee</th>{MODULES.map((m) => <th key={m.id} title={m.label} style={{ textAlign: 'center' }}>{m.level}<div style={{ fontWeight: 500, textTransform: 'none', fontSize: 10.5, color: '#5b6b61', maxWidth: 90, whiteSpace: 'normal' }}>{m.label.split(',')[0]}</div></th>)}<th>Progress</th><th /></tr></thead>
              <tbody>{ws.cohort.map((t, i) => (
                <tr key={i}>
                  <td><input className="txt" style={{ width: 120 }} value={t.name} onChange={(e) => setWs('cohort', (c) => c.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></td>
                  {MODULES.map((m) => (
                    <td key={m.id} style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!t.done[m.id]} style={{ accentColor: '#14a651', width: 16, height: 16 }}
                        onChange={(e) => setWs('cohort', (c) => c.map((x, j) => (j === i ? { ...x, done: { ...x.done, [m.id]: e.target.checked } } : x)))} />
                    </td>
                  ))}
                  <td style={{ minWidth: 110 }}><div className="progress"><i style={{ width: `${progress(t) * 100}%` }} /></div><span className="small muted">{Math.round(progress(t) * 100)}%</span></td>
                  <td><button className="btn sm danger" onClick={() => setWs('cohort', (c) => c.filter((_, j) => j !== i))}><Trash2 size={13} /></button></td>
                </tr>
              ))}</tbody>
            </table></div>
          </Card>
          <Card title="People programme budget (₹ lakh)" right={<button className="btn sm" onClick={() => setParam('trainingL', +budget.toFixed(2))}>Sync to model</button>}>
            <table className="t"><tbody>
              {ws.budget.map((b, i) => (
                <tr key={i}><td><input className="txt" style={{ width: '100%' }} value={b.item} onChange={(e) => setWs('budget', (bs) => bs.map((x, j) => (j === i ? { ...x, item: e.target.value } : x)))} /></td>
                  <td className="n"><input className="num" style={{ width: 64 }} value={b.l} onChange={(e) => setWs('budget', (bs) => bs.map((x, j) => (j === i ? { ...x, l: Number(e.target.value) || 0 } : x)))} /></td></tr>
              ))}
              <tr className="hl"><td>Total</td><td className="n">₹{budget.toFixed(1)} L</td></tr>
            </tbody></table>
          </Card>
        </div>
        <div className="grid g2">
          <Card title="Preventive maintenance (TPM)" sub={`Due dates run on the twin's clock (${nowH.toFixed(1)} running hours)`}
            right={<button className="btn sm" onClick={() => setWs('tpm', (ts) => ts.map((t) => ({ ...t, lastDoneH: nowH })))}><RotateCcw size={13} />All done now</button>}>
            <table className="t">
              <thead><tr><th>Task</th><th>Every</th><th>Who</th><th className="n">Due in</th><th>Status</th><th /></tr></thead>
              <tbody>{tpm.map((t, i) => (
                <tr key={t.id}><td>{t.task}</td><td>{t.freqH >= 8640 ? 'year' : t.freqH >= 2160 ? 'quarter' : t.freqH >= 720 ? 'month' : t.freqH >= 168 ? 'week' : t.freqH >= 24 ? 'day' : 'shift'}</td><td className="muted">{t.who}</td>
                  <td className="n">{t.dueIn < 0 ? `${(-t.dueIn).toFixed(1)} h late` : `${t.dueIn.toFixed(1)} h`}</td>
                  <td><span className={`chip ${t.status === 'Overdue' ? 'red' : t.status === 'Due soon' ? 'gold' : ''}`}>{t.status}</span></td>
                  <td><button className="btn sm" onClick={() => setWs('tpm', (ts) => ts.map((x, j) => (j === i ? { ...x, lastDoneH: nowH } : x)))}><Check size={13} />Done</button></td></tr>
              ))}</tbody>
            </table>
            <div className="small muted" style={{ marginTop: 8 }}>Targets: cell availability ≥ {p.availTarget}% · MTTR ≤ {p.mttrTarget} min. Fast-forward the twin to see tasks fall due.</div>
          </Card>
          <Card title="Critical spares on site" right={<div className="row"><button className="btn sm" onClick={() => setWs('spares', (s) => [...s, { part: 'New part', qty: 1, min: 1, lead: 14, costL: 0.5 }])}><Plus size={13} />Add</button><button className="btn sm" onClick={() => resetWs('spares')}>Reset</button></div>}>
            <table className="t">
              <thead><tr><th>Part</th><th className="n">Qty</th><th className="n">Min</th><th className="n">Lead (d)</th><th className="n">₹ L each</th><th /></tr></thead>
              <tbody>{ws.spares.map((s, i) => (
                <tr key={i}>
                  <td><input className="txt" style={{ width: '100%' }} value={s.part} onChange={(e) => updS(i, 'part', e.target.value)} /></td>
                  {['qty', 'min', 'lead', 'costL'].map((k) => <td key={k} className="n"><input className="num" style={{ width: 58, color: k === 'qty' && s.qty < s.min ? '#d0574b' : undefined }} value={s[k]} onChange={(e) => updS(i, k, Number(e.target.value) || 0)} /></td>)}
                  <td><button className="btn sm danger" onClick={() => setWs('spares', (r) => r.filter((_, j) => j !== i))}><Trash2 size={13} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  );
}
