import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { IndianRupee, Percent, Hourglass, PiggyBank, Landmark, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, Kpi, PageHead, Alarms, EventLog, tooltipStyle, C } from '../components/ui.jsx';
import TwinCanvas from '../components/TwinCanvas.jsx';
import TwinControls from '../components/TwinControls.jsx';
import { LiveKpis } from './TwinTab.jsx';
import { GLOSSARY } from '../components/Tip.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { useTwinCtl, useTick } from '../state/TwinContext.jsx';
import { PRESETS } from '../model/params.js';
import { fmtCr, fmtMonths, fmtPct, fmtNum } from '../util/format.js';
import { useDecision } from '../state/useDecision.js';
import { VerdictBadge } from './DecisionTab.jsx';
import { Gavel, BookOpen } from 'lucide-react';

export default function Overview({ go }) {
  const { params: p, d, fin, oee, applyPreset, activePreset, blocking } = useParams();
  const { twin, mode } = useTwinCtl();
  const { gate, ranking } = useDecision();
  useTick(2);
  const k = twin.kpis();
  const m = twin.m;
  const liveSpeed = m.tRun > 0 ? m.sachetsMade / (m.tRun / 60) : 0;
  const oeeRows = [
    { f: 'Availability', today: d.oeeToday.A * 100, cell: oee.A * 100, live: k.A * 100 },
    { f: 'Performance', today: d.oeeToday.P * 100, cell: oee.P * 100, live: k.P * 100 },
    { f: 'Quality', today: d.oeeToday.Q * 100, cell: oee.Q * 100, live: k.Q * 100 },
    { f: 'OEE', today: d.oeeToday.OEE * 100, cell: oee.OEE * 100, live: k.OEE * 100 },
  ];
  const tracker = [
    { kpi: 'Primary speed (sachets/min)', today: p.throttledSpeed, target: p.primarySpeed * (p.perfCell / 100), live: liveSpeed, good: liveSpeed >= 0.97 * p.primarySpeed * (p.perfCell / 100) * (1 - p.scnSpeedDrop / 100), d: 0 },
    { kpi: 'Line OEE (%)', today: d.oeeToday.OEE * 100, target: p.oeeTarget, live: k.OEE * 100, good: k.OEE * 100 >= p.oeeTarget - 0.5, d: 1 },
    { kpi: 'COPQ (%)', today: p.copqBefore, target: p.copqAfter, live: k.copq, good: k.copq <= p.copqAfter * 1.2, d: 2 },
    { kpi: 'Primary blocked (%)', today: null, target: 1, live: k.blockedPct, good: k.blockedPct <= 1, d: 2 },
    { kpi: 'Cell availability (%)', today: null, target: p.availTarget, live: k.cellAvail * 100, good: k.cellAvail * 100 >= p.availTarget, d: 1 },
    { kpi: 'MTTR (min)', today: null, target: p.mttrTarget, live: k.mttr, good: k.mttr <= p.mttrTarget, d: 1 },
    { kpi: 'People in folding loop / shift', today: p.opsPerShift, target: 0, live: mode === 'auto' ? 0 : p.opsPerShift, good: mode === 'auto', d: 1 },
  ];
  const passed = d.checks.filter((c) => c.ok).length;
  return (
    <div className="page">
      <PageHead kicker="Control tower" title="One view of the line: live twin, targets, money and risk"
        sub="Case: re-engineering secondary packaging at the mouth freshener division. Pick a stress scenario or open Controls to change any variable or constant."
        right={<div className="chips" style={{ maxWidth: 640, justifyContent: 'flex-end' }}>{Object.entries(PRESETS).map(([id, s]) => <button key={id} className={`btn sm ${activePreset === id ? 'on' : ''}`} onClick={() => applyPreset(id)}>{s.label}</button>)}</div>} />
      <div className="stack" style={{ gap: 14 }}>
        <div className="verdict-banner" data-tour="verdict">
          <div className="row" style={{ gap: 14, flexWrap: 'nowrap', minWidth: 0 }}>
            <VerdictBadge verdict={gate.verdict} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>
                {gate.verdict === 'GO' ? 'All ten gates pass.' : gate.verdict === 'NO-GO' ? `${gate.mustFail.length} must-pass gate${gate.mustFail.length > 1 ? 's' : ''} failing` : `Must-pass gates met · ${gate.condOpen.length} condition${gate.condOpen.length > 1 ? 's' : ''} open`}
                <span className="muted" style={{ fontWeight: 500 }}> · top option on your weights: {ranking[0].label}</span>
              </div>
              <div className="small muted" style={{ marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {(gate.mustFail.length ? gate.mustFail : gate.condOpen).map((x) => `${x.label}: ${x.detail}`).join(' · ') || 'NPV, payback, worst case, engineering, OEE, blocking, risk, twin evidence, people and skills all clear.'}
              </div>
            </div>
          </div>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <button className="btn dark" onClick={() => go('decision')}><Gavel size={15} />Decision Studio</button>
            <button className="btn" onClick={() => go('guide')}><BookOpen size={15} />How to use</button>
          </div>
        </div>
        <LiveKpis />
        <div className="grid g3">
          <Card className="span2" title="Digital twin" tag="LIVE" right={<button className="btn sm" onClick={() => go('twin')}>Open full twin →</button>} style={{ padding: 12 }}>
            <TwinControls showFaults={false} />
            <div style={{ marginTop: 10 }}><TwinCanvas compact /></div>
          </Card>
          <div className="stack" style={{ gap: 14 }}>
            <Card title="Alarms" tag="ALARM"><Alarms items={twin.alarms()} /></Card>
            <Card title="Latest events"><EventLog events={twin.events} max={30} height={250} /></Card>
          </div>
        </div>
        <div className="grid g6">
          <Kpi dark label="NPV @ discount rate" tip={GLOSSARY.NPV} icon={IndianRupee} value={fmtCr(fin.npv)} sub={`${p.years}-yr, ${p.discountRate}% · post-tax ${fmtCr(fin.postNpv)}`} />
          <Kpi label="IRR" tip={GLOSSARY.IRR} icon={Percent} value={fin.irr == null ? 'n/a' : fmtPct(fin.irr * 100, 0)} sub={`post-tax ${fin.postIrr == null ? 'n/a' : fmtPct(fin.postIrr * 100, 0)}`} />
          <Kpi label="Payback" tip={GLOSSARY.Payback} icon={Hourglass} value={fmtMonths(fin.pb)} sub={`discounted ${fmtMonths(fin.dpb)}`} />
          <Kpi label="Net saving (steady year)" tip={'Year-2 savings (COPQ + labour) minus new running costs.'} icon={PiggyBank} value={fmtCr(fin.steady.net)} sub={`COPQ ${fmtCr(fin.steady.copq)} · labour ${fmtCr(fin.steady.labour)}`} />
          <Kpi label="Total investment" icon={Landmark} value={fmtCr(fin.inv)} sub={`CapEx ${fmtCr(fin.capex)} + people ${fmtCr(fin.training)}`} />
          <Kpi label="People on rolls today" tip={'Active operators per shift × shifts × 7/6 for weekly offs ÷ (1 − absenteeism).'} icon={Users} value={fmtNum(d.rollCount, 0)} sub={`${p.opsPerShift}/shift × ${p.shifts}, ${p.absenteeism}% absenteeism`} />
        </div>
        <div className="grid g3">
          <Card title="OEE: today vs cell model vs live twin" sub={`Residual blocking from buffer model ${blocking.blockedPct.toFixed(2)}%`}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={oeeRows} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="f" />
                <YAxis domain={[0, 100]} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={p.oeeTarget} stroke={C.red} strokeDasharray="4 4" />
                <Bar dataKey="today" name="Today (manual)" fill={C.grey} radius={[4, 4, 0, 0]} />
                <Bar dataKey="cell" name="Cell (model)" fill={C.g} radius={[4, 4, 0, 0]} />
                <Bar dataKey="live" name={`Twin (${mode})`} fill={C.gd} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Target tracker" sub="Live twin against the case targets">
            <table className="t">
              <thead><tr><th>KPI</th><th className="n">Today</th><th className="n">Target</th><th className="n">Live</th></tr></thead>
              <tbody>
                {tracker.map((r) => (
                  <tr key={r.kpi}><td>{r.kpi}</td><td className="n">{r.today == null ? '—' : r.today.toFixed(r.d)}</td><td className="n">{r.target.toFixed(r.d)}</td><td className={`n ${r.good ? 'good' : 'warn'}`} style={{ fontWeight: 700 }}>{r.live.toFixed(r.d)}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Engineering checks" sub={`${passed} of ${d.checks.length} pass at current settings`} right={<button className="btn sm" onClick={() => go('line')}>Details →</button>}>
            <div className="stack" style={{ gap: 7 }}>
              {d.checks.map((c) => (
                <div key={c.label} className="row between" style={{ gap: 8 }}>
                  <span className="row" style={{ gap: 7 }}>{c.ok ? <CheckCircle2 size={16} color={C.g} /> : <AlertTriangle size={16} color={C.red} />}<span>{c.label}</span></span>
                  <b className={c.ok ? 'good' : 'bad'} style={{ whiteSpace: 'nowrap' }}>{c.value.toFixed(c.unit === 'mm' ? 0 : 2)} {c.unit}</b>
                </div>
              ))}
            </div>
            <div className="sep" />
            <div className="small muted">Takt {d.taktStrip.toFixed(2)} s/strip · {d.taktCarton.toFixed(2)} s/carton · bottleneck {d.bottleneck.name} · headroom {d.headroom.toFixed(0)}%</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
