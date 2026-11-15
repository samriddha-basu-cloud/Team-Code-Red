import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell, LabelList } from 'recharts';
import { Timer, Boxes, Gauge, TrendingUp, Ruler, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, Kpi, PageHead, ParamField, tooltipStyle, C } from '../components/ui.jsx';
import { GLOSSARY } from '../components/Tip.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { oeeBridge } from '../model/engine.js';

function FoldGeometry({ d, p }) {
  const W = 720, scale = Math.min(1.5, 250 / Math.max(d.inL, d.panelLen));
  const inL = d.inL * scale, panel = d.panelLen * scale;
  const layersH = Math.min(150, d.totalLayers * 14);
  const lh = layersH / d.totalLayers;
  // cross-section scale
  const cs = Math.min(2, 150 / Math.max(d.inH, d.stackH, d.inW));
  const fits = d.stackH <= d.inH && d.panelLen <= d.inL && p.sachetWidth <= d.inW;
  return (
    <svg viewBox={`0 0 ${W} 250`} style={{ width: '100%' }}>
      <text x="10" y="18" fontSize="12.5" fontWeight="700" fill={C.gd}>Side view: fan-fold {Array.from({ length: d.folds + 1 }, (_, i) => (i < d.folds ? p.sachetsPerPanel : d.lastPanel)).join('-')} in the carton</text>
      <rect x="10" y="36" width={inL} height={layersH + 14} fill="none" stroke={C.ink} strokeWidth="2" rx="3" />
      {Array.from({ length: d.totalLayers }, (_, i) => {
        const y = 43 + i * lh;
        const strip = Math.floor(i / d.layersPerStrip);
        const isLastOfStrip = (i % d.layersPerStrip) === d.layersPerStrip - 1;
        const len = isLastOfStrip ? (d.lastPanel / p.sachetsPerPanel) * (panel - p.loopAllowance * scale) : panel - p.loopAllowance * scale;
        const fromRight = (i % 2) === 1;
        const x0 = fromRight ? 10 + 4 + (panel - len) : 14;
        return (
          <g key={i}>
            <rect x={x0} y={y} width={Math.max(4, len - 8)} height={Math.max(3, lh - 3)} rx="2" fill={strip === 0 ? C.g : C.g2} opacity={0.85} />
            {Array.from({ length: Math.round(len / (p.sachetLength * scale)) - 1 }, (_, j) => (
              <line key={j} x1={x0 + (j + 1) * p.sachetLength * scale} x2={x0 + (j + 1) * p.sachetLength * scale} y1={y} y2={y + lh - 3} stroke="#fff" strokeWidth="1" />
            ))}
          </g>
        );
      })}
      <text x={10 + inL / 2} y={layersH + 68} textAnchor="middle" fontSize="11.5" fill={C.muted}>inside length {d.inL.toFixed(0)} mm · panel {d.panelLen.toFixed(0)} mm</text>
      <g transform="translate(380,36)">
        <text x="0" y="-8" fontSize="12.5" fontWeight="700" fill={C.gd}>Cross-section</text>
        <rect x="0" y="0" width={d.inW * cs} height={d.inH * cs} fill="none" stroke={C.ink} strokeWidth="2" rx="3" />
        <rect x={(d.inW - p.sachetWidth) * cs / 2} y={(d.inH - Math.min(d.stackH, d.inH * 1.4)) * cs} width={p.sachetWidth * cs} height={Math.min(d.stackH, d.inH * 1.4) * cs} fill={fits ? C.g : C.red} opacity="0.35" stroke={fits ? C.g : C.red} />
        <text x={d.inW * cs + 8} y="14" fontSize="11.5" fill={C.muted}>{d.inW.toFixed(0)} × {d.inH.toFixed(0)} mm inside</text>
        <text x={d.inW * cs + 8} y="32" fontSize="11.5" fill={C.muted}>{d.totalLayers} layers × {p.sachetThickness} mm</text>
        <text x={d.inW * cs + 8} y="50" fontSize="11.5" fontWeight="700" fill={fits ? C.g : C.red}>stack {d.stackH.toFixed(1)} mm {fits ? 'fits' : 'does NOT fit'}</text>
        <text x={d.inW * cs + 8} y="68" fontSize="11.5" fill={C.muted}>max sachet {d.maxThickness.toFixed(2)} mm</text>
      </g>
    </svg>
  );
}

export default function LineTab() {
  const { params: p, d, blocking } = useParams();
  const g = 9.81;
  const bridge = oeeBridge(p, d, blocking.blockedPct);
  let run = 0;
  const wf = bridge.map((b) => {
    if (b.kind === 'total') { run = b.v; return { ...b, base: 0, val: b.v, color: C.grey }; }
    if (b.kind === 'step') { const base = b.v >= 0 ? run : run + b.v; run += b.v; return { ...b, base, val: Math.abs(b.v), color: b.v >= 0 ? C.g : C.red }; }
    return { ...b, base: 0, val: run, color: C.gd };
  });
  const kin = [
    ['Strip takt', '60 ÷ strips/min', `${d.taktStrip.toFixed(2)} s`, `${(60 / d.cellMax).toFixed(2)} s`, '—', true],
    ['Carton takt', '60 ÷ cartons/min', `${d.taktCarton.toFixed(2)} s`, `${(60 / (d.cellMax / p.stripsPerCarton)).toFixed(2)} s`, '—', true],
    ['Incoming strip speed', 'pitch × strips/s', `${d.vIn.toFixed(2)} m/s`, '—', '—', true],
    ['Strip deceleration (vacuum belt)', 'v² ÷ 2d', `${(d.decel / g).toFixed(2)} g`, `${d.decelTime.toFixed(2)} s`, `${p.maxAccelG} g · ${d.ratedWindow.toFixed(2)} s`, d.decel / g <= p.maxAccelG && d.decelTime <= d.ratedWindow],
    ['Pocket conveyor speed', 'pitch × strips/min', `${d.pocketSpeed.toFixed(1)} m/min`, `${d.pocketSpeedRated.toFixed(1)} m/min`, '—', true],
    ['Turret speed', 'strips/min ÷ heads', `${d.rpmNom.toFixed(2)} rpm`, `${d.rpmRated.toFixed(2)} rpm`, `${p.turretMaxRpm} rpm`, d.rpmRated <= p.turretMaxRpm + 1e-9],
    ['Time per fold', 'turn × window ÷ folds', `${d.foldTimeNom.toFixed(2)} s`, `${d.foldTimeRated.toFixed(2)} s`, '—', true],
    ['Fold blade peak acceleration', '2π × path ÷ t²', `${(d.bladeAccNom / g).toFixed(2)} g`, `${(d.bladeAccRated / g).toFixed(2)} g`, `${p.maxAccelG} g`, d.bladeAccRated / g <= p.maxAccelG],
    ['Carton chain speed', 'pitch × cartons/min', `${d.cartonChain.toFixed(1)} m/min`, '—', '—', true],
  ];
  const balance = d.stations.map((s) => ({ name: s.name, load: +s.load.toFixed(1), bottleneck: s.id === d.bottleneck.id }));
  return (
    <div className="page">
      <PageHead kicker="Module 1 & 2 · Process engineering" title="Kinematics, line balance and fold geometry"
        sub="Change speeds, pitches, turret heads or station capacities and every check below updates. Red means a design limit is broken." />
      <div className="stack" style={{ gap: 14 }}>
        <div className="grid g6">
          <Kpi dark label="Line speed" icon={TrendingUp} value={`${d.lineSpeed.toFixed(0)}`} sub="sachets/min running" />
          <Kpi label="Strips · cartons" icon={Boxes} value={`${d.stripsPerMin.toFixed(1)} · ${d.cartonsPerMin.toFixed(1)}`} sub="per minute demand" />
          <Kpi label="Takt" tip={GLOSSARY.Takt} icon={Timer} value={`${d.taktCarton.toFixed(2)} s`} sub={`per carton · ${d.taktStrip.toFixed(2)} s per strip`} />
          <Kpi label="Cell max rate" tip={'The slowest station sets the cell maximum (the bottleneck), in strips per minute.'} icon={Gauge} value={`${d.cellMax.toFixed(0)}`} sub={`strips/min · bottleneck ${d.bottleneck.id}`} />
          <Kpi label="Headroom" tip={GLOSSARY.Headroom} icon={TrendingUp} value={`${d.headroom.toFixed(1)}%`} sub="catch-up speed after stops" tone={d.headroom >= 10 ? 'good' : 'bad'} />
          <Kpi label="Manual: people needed" tip={'Manual cycle time ÷ carton takt at full speed: how many operators the old way needs with zero breaks.'} icon={Ruler} value={d.peopleNeeded.toFixed(1)} sub={`vs ${p.opsPerShift} deployed (${p.manualCycle}s/carton)`} tone={d.peopleNeeded > p.opsPerShift ? 'bad' : 'warn'} />
        </div>
        <div className="grid g3">
          <Card className="span2" title="Kinematics" tag="M1" sub="Nominal at demand, rated at the cell's maximum rate">
            <div className="tablewrap"><table className="t">
              <thead><tr><th>Motion</th><th>Formula</th><th className="n">Nominal</th><th className="n">Rated / time</th><th className="n">Limit</th><th>Status</th></tr></thead>
              <tbody>{kin.map((r) => (
                <tr key={r[0]}><td>{r[0]}</td><td className="muted">{r[1]}</td><td className="n">{r[2]}</td><td className="n">{r[3]}</td><td className="n">{r[4]}</td>
                  <td>{r[5] ? <span className="row good" style={{ gap: 4 }}><CheckCircle2 size={15} />OK</span> : <span className="row bad" style={{ gap: 4 }}><AlertTriangle size={15} />Over limit</span>}</td></tr>
              ))}</tbody>
            </table></div>
          </Card>
          <Card title="Cell design controls">
            {['primarySpeed', 'turretHeads', 'turretMaxRpm', 'foldWindow', 'bladeTipPath', 'stripPitchPrimary', 'decelDistance', 'pocketPitch', 'maxAccelG'].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
        </div>
        <div className="grid g3">
          <Card className="span2" title="Line balance" tag="M2" sub={`Station load at ${d.stripsPerMin.toFixed(0)} strips/min against rated capacity · bottleneck ${d.bottleneck.name}`}>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={balance} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" domain={[0, Math.max(120, Math.ceil(Math.max(...balance.map((b) => b.load)) / 20) * 20)]} ticks={Array.from({ length: Math.max(120, Math.ceil(Math.max(...balance.map((b) => b.load)) / 20) * 20) / 20 + 1 }, (_, i) => i * 20)} unit="%" />
                <YAxis type="category" dataKey="name" width={130} />
                <Tooltip {...tooltipStyle} formatter={(v) => `${v}% load`} />
                <ReferenceLine x={100} stroke={C.red} strokeDasharray="5 4" label={{ value: 'Rated capacity', position: 'top', fill: C.red, fontSize: 11.5 }} />
                <Bar dataKey="load" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {balance.map((b, i) => <Cell key={i} fill={b.load > 100 ? C.red : b.bottleneck ? C.g : C.grey} />)}
                  <LabelList dataKey="load" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11.5, fill: C.ink }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Station rated capacities">
            {['capTransfer', 'capVision', 'capReject', 'capCollation', 'capErector', 'capTopload', 'capCloser', 'capCheckweigher'].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
        </div>
        <div className="grid g3">
          <Card className="span2" title="Fold geometry" sub="Does the folded nest fit the carton?">
            <FoldGeometry d={d} p={p} />
          </Card>
          <Card title="Geometry controls">
            {['sachetThickness', 'sachetsPerPanel', 'loopAllowance', 'sachetsPerStrip', 'stripsPerCarton', 'cartonH', 'boardThickness'].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
        </div>
        <Card title="OEE bridge" tag="M2" sub="From today's manual line to the automated cell (analytical model)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wf} margin={{ left: -10, right: 10, top: 24 }}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="step" interval={0} tick={{ fontSize: 11.5 }} />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip {...tooltipStyle} formatter={(v, n, it) => (n === 'val' ? `${it.payload.kind === 'step' ? (it.payload.v >= 0 ? '+' : '−') : ''}${Math.abs(it.payload.v).toFixed(2)}${it.payload.kind === 'step' ? ' pts' : '%'}` : null)} />
              <ReferenceLine y={p.oeeTarget} stroke={C.red} strokeDasharray="4 4" label={{ value: `${p.oeeTarget}% target`, position: 'insideTopLeft', fill: C.red, fontSize: 11.5 }} />
              <Bar dataKey="base" stackId="a" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="val" stackId="a" isAnimationActive={false} radius={[3, 3, 0, 0]}>
                {wf.map((b, i) => <Cell key={i} fill={b.color} />)}
                <LabelList dataKey="v" position="top" formatter={(v) => (Math.abs(v) < 30 ? `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}` : `${v.toFixed(1)}%`)} style={{ fontSize: 12, fontWeight: 700, fill: C.ink }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
