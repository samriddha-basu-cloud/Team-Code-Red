import React from 'react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from 'recharts';
import { Activity, Gauge, Boxes, Timer, ShieldCheck, Ban, Layers, Wrench } from 'lucide-react';
import { Card, Kpi, PageHead, Alarms, EventLog, tooltipStyle, C } from '../components/ui.jsx';
import TwinCanvas from '../components/TwinCanvas.jsx';
import TwinControls from '../components/TwinControls.jsx';
import { useTwinCtl, useTick } from '../state/TwinContext.jsx';
import { GLOSSARY } from '../components/Tip.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { fmtNum, fmtPct, fmtDur } from '../util/format.js';

const hhmm = (t) => { const h = Math.floor(t / 3600); const m = Math.floor((t % 3600) / 60); return h >= 24 ? `D${Math.floor(h / 24) + 1} ${String(h % 24).padStart(2, '0')}h` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };

export function LiveKpis() {
  const { twin } = useTwinCtl();
  const { params: p } = useParams();
  useTick(4);
  const k = twin.kpis();
  const m = twin.m;
  return (
    <div className="grid g6">
      <Kpi dark label="Live OEE" tip={GLOSSARY.OEE} icon={Activity} value={fmtPct(k.OEE * 100)} sub={`target ${p.oeeTarget}%`} pct={k.OEE * 100} target={p.oeeTarget} />
      <Kpi label="A · P · Q" tip={`A: ${GLOSSARY.Availability} P: ${GLOSSARY.Performance} Q: ${GLOSSARY.Quality}`} icon={Gauge} value={`${(k.A * 100).toFixed(1)} · ${(k.P * 100).toFixed(1)} · ${(k.Q * 100).toFixed(1)}`} sub="% since reset" />
      <Kpi label="Throughput" tip={'Good cartons per minute over the last 60 simulated seconds. Demand at full speed is 50 cartons/min × inherent performance.'} icon={Boxes} value={`${k.cpm.toFixed(1)}`} sub={`cartons/min · ${fmtNum(m.cartonsGood)} good`} tone={k.cpm >= 0.95 * (p.primarySpeed / p.sachetsPerStrip / p.stripsPerCarton) * (p.perfCell / 100) ? 'good' : ''} />
      <Kpi label="Buffer level" tip={GLOSSARY.Buffer} icon={Layers} value={fmtPct(k.bufferPct, 0)} sub={`${twin.buffer} strips`} pct={k.bufferPct} target={p.bandSoft} tone={k.bufferPct >= p.bandSoft ? 'bad' : k.bufferPct >= p.bandMid ? 'warn' : ''} />
      <Kpi label="Primary blocked" tip={GLOSSARY.Blocking} icon={Ban} value={fmtPct(k.blockedPct, 2)} sub={`${m.blockedEvents} events · soft-slow ${fmtDur(m.tSoft)}`} tone={k.blockedPct > 1 ? 'bad' : 'good'} />
      <Kpi label="Cell availability · MTTR" tip={`Share of time the cell is not stopped. ${GLOSSARY.MTTR}`} icon={Wrench} value={`${(k.cellAvail * 100).toFixed(1)}%`} sub={`${m.cellStops} stops · MTTR ${k.mttr.toFixed(1)} min`} tone={k.cellAvail * 100 >= p.availTarget ? 'good' : 'warn'} />
    </div>
  );
}

export default function TwinTab() {
  const { twin } = useTwinCtl();
  const { params: p, oee, blocking } = useParams();
  useTick(2);
  const k = twin.kpis();
  const series = twin.series.slice();
  const m = twin.m;
  const compare = [
    ['OEE', oee.OEE * 100, k.OEE * 100, '%'],
    ['Availability', oee.A * 100, k.A * 100, '%'],
    ['Performance', oee.P * 100, k.P * 100, '%'],
    ['Quality', oee.Q * 100, k.Q * 100, '%'],
    ['Primary blocked', blocking.blockedPct, k.blockedPct, '%'],
  ];
  return (
    <div className="page">
      <PageHead kicker="Digital twin" title="Live simulation of the primary machine, buffer and automated cell"
        sub="Every parameter in the control panel feeds this simulation live. Inject faults, change speeds, or switch to the manual baseline to compare the line before and after automation." />
      <div className="stack" style={{ gap: 14 }}>
        <Card><TwinControls /></Card>
        <Card title="Plant floor" tag="LIVE" sub="Click any station for details or to put it on a maintenance hold" style={{ padding: 12 }}>
          <TwinCanvas />
        </Card>
        <LiveKpis />
        <div className="grid g3">
          <Card title="Buffer level" sub="% full, sampled from the twin">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={series} margin={{ left: -18, right: 8, top: 6 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={hhmm} minTickGap={40} />
                <YAxis domain={[0, 100]} />
                <Tooltip {...tooltipStyle} labelFormatter={hhmm} />
                <ReferenceLine y={p.bandSoft} stroke={C.red} strokeDasharray="4 4" />
                <ReferenceLine y={p.bandMid} stroke={C.amber} strokeDasharray="4 4" />
                <Area type="monotone" dataKey="buffer" name="Buffer %" stroke={C.g} fill={C.g} fillOpacity={0.2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Throughput & speed" sub="Cartons/min (rolling 60 s) and primary speed">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series} margin={{ left: -18, right: 8, top: 6 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={hhmm} minTickGap={40} />
                <YAxis yAxisId="a" domain={[0, 'auto']} />
                <YAxis yAxisId="b" orientation="right" hide domain={[0, p.primarySpeed * 1.1]} />
                <Tooltip {...tooltipStyle} labelFormatter={hhmm} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="a" type="monotone" dataKey="cpm" name="Cartons/min" stroke={C.gd} dot={false} strokeWidth={2} isAnimationActive={false} />
                <Line yAxisId="b" type="stepAfter" dataKey="speed" name="Primary sachets/min" stroke={C.grey} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
          <Card title="OEE build-up" sub="Cumulative since reset">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={series} margin={{ left: -18, right: 8, top: 6 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="t" tickFormatter={hhmm} minTickGap={40} />
                <YAxis domain={[50, 100]} />
                <Tooltip {...tooltipStyle} labelFormatter={hhmm} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={p.oeeTarget} stroke={C.red} strokeDasharray="4 4" />
                <Line type="monotone" dataKey="oee" name="OEE" stroke={C.gd} strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="A" name="A" stroke={C.g2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="P" name="P" stroke={C.gold} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Q" name="Q" stroke={C.grey} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <div className="grid g3">
          <Card title="Active alarms" tag="ALARM"><Alarms items={twin.alarms()} /></Card>
          <Card title="Event log" sub={`${twin.events.length} events`}><EventLog events={twin.events} height={260} /></Card>
          <Card title="Model vs twin" sub="Analytical model against the running simulation">
            <table className="t">
              <thead><tr><th>Metric</th><th className="n">Model</th><th className="n">Twin</th><th className="n">Gap</th></tr></thead>
              <tbody>
                {compare.map(([l, a, b]) => (
                  <tr key={l}><td>{l}</td><td className="n">{a.toFixed(2)}%</td><td className="n">{b.toFixed(2)}%</td><td className={`n ${Math.abs(b - a) > 1.5 ? 'warn' : 'good'}`}>{(b - a >= 0 ? '+' : '') + (b - a).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="small muted" style={{ marginTop: 10 }}>
              Simulated {fmtDur(m.tTotal)} · {fmtNum(m.stripsMade)} strips · {fmtNum(m.cartonsGood)} good cartons · {fmtNum(m.stripsRejected)} strip and {fmtNum(m.cartonsRejected)} carton rejects. Run at least a day (use Jump) for stable numbers.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
