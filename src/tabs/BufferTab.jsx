import React, { useCallback, useEffect, useState } from 'react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceDot } from 'recharts';
import { Play, Loader2, Layers, Timer, RefreshCw, Target } from 'lucide-react';
import { Card, Kpi, PageHead, ParamField, tooltipStyle, C } from '../components/ui.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { bufferCurve } from '../model/buffer.js';

export default function BufferTab() {
  const { params: p, d, setParam } = useParams();
  const [sizesTxt, setSizesTxt] = useState('0, 25, 50, 100, 150, 200, 300, 400');
  const [days, setDays] = useState(7);
  const [reps, setReps] = useState(3);
  const [seed, setSeed] = useState(7);
  const [target, setTarget] = useState(1);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const run = useCallback(() => {
    setBusy(true);
    setTimeout(() => {
      const sizes = Array.from(new Set(sizesTxt.split(/[,\s]+/).map(Number).filter((x) => isFinite(x) && x >= 0).concat([p.bufferCapacity]))).sort((a, b) => a - b);
      const runs = Array.from({ length: Math.max(1, reps) }, (_, i) => bufferCurve(p, d.stripsPerMin, d.cellMax, sizes, days, seed + i * 13));
      const rows = sizes.map((B, j) => {
        const w = runs.map((r) => r.rows[j].withHeadroom), n = runs.map((r) => r.rows[j].noHeadroom);
        const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
        return { buffer: B, withHeadroom: +mean(w).toFixed(3), band: [Math.min(...w), Math.max(...w)], noHeadroom: +mean(n).toFixed(3) };
      });
      const cellDown = runs.reduce((a, r) => a + r.cellDownPct, 0) / runs.length;
      const primDown = runs.reduce((a, r) => a + r.primDownPct, 0) / runs.length;
      setRes({ rows, cellDown, primDown, at: Date.now() });
      setBusy(false);
    }, 30);
  }, [sizesTxt, days, reps, seed, p, d.stripsPerMin, d.cellMax]);

  useEffect(() => { run(); /* first run */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = res?.rows.find((r) => r.buffer === p.bufferCapacity);
  const rec = res?.rows.find((r) => r.withHeadroom <= target);
  const absorb = (p.bufferCapacity / Math.max(1e-6, d.stripsPerMin)) * 60;
  const refill = d.cellMax > d.stripsPerMin ? p.bufferCapacity / (d.cellMax - d.stripsPerMin) : Infinity;

  return (
    <div className="page">
      <PageHead kicker="Module 2 · Buffer dynamics" title="Size the accumulator against real stop patterns"
        sub="Monte Carlo of the buffer, second by second, using the stop profile below. The green band shows the spread across replications; the grey line is the same buffer with no catch-up headroom."
        right={<button className="btn primary" onClick={run} disabled={busy}>{busy ? <Loader2 size={15} className="spin" /> : <Play size={15} />}{busy ? 'Simulating…' : 'Run simulation'}</button>} />
      <div className="stack" style={{ gap: 14 }}>
        <div className="grid g6">
          <Kpi dark label="Chosen buffer" icon={Layers} value={`${p.bufferCapacity} strips`} sub={cur ? `${cur.withHeadroom.toFixed(2)}% primary blocked` : 'run to evaluate'} />
          <Kpi label="Absorbs a stop of" icon={Timer} value={`${absorb.toFixed(0)} s`} sub="at line demand" />
          <Kpi label="Refill time" icon={RefreshCw} value={isFinite(refill) ? `${refill.toFixed(1)} min` : 'never'} sub={`cell ${d.cellMax.toFixed(0)} vs demand ${d.stripsPerMin.toFixed(0)} strips/min`} tone={isFinite(refill) ? '' : 'bad'} />
          <Kpi label="Recommended (≤ target)" icon={Target} value={rec ? `${rec.buffer} strips` : 'none tested'} sub={`target ${target}% blocked`} />
          <Kpi label="Simulated cell downtime" value={res ? `${res.cellDown.toFixed(2)}%` : '—'} sub="micro + longer stops" />
          <Kpi label="Primary own downtime" value={res ? `${res.primDown.toFixed(2)}%` : '—'} sub="random stops" />
        </div>
        <div className="grid g3">
          <Card className="span2" title="Primary blocking vs buffer size" sub={`${days}-day horizon × ${reps} replications · headroom ${d.headroom.toFixed(0)}%`}>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={res?.rows || []} margin={{ left: -6, right: 16, top: 10 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="buffer" type="number" domain={['dataMin', 'dataMax']} label={{ value: 'Buffer capacity (strips)', position: 'insideBottom', offset: -2, fontSize: 12, fill: C.muted }} height={40} />
                <YAxis unit="%" />
                <Tooltip {...tooltipStyle} formatter={(v, n) => (Array.isArray(v) ? `${v[0].toFixed(2)}–${v[1].toFixed(2)}%` : `${Number(v).toFixed(2)}%`)} labelFormatter={(l) => `${l} strips`} />
                <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={target} stroke={C.red} strokeDasharray="5 4" label={{ value: `${target}% target`, position: 'insideTopRight', fill: C.red, fontSize: 11.5 }} />
                <Area dataKey="band" name="Replication range" stroke="none" fill={C.g} fillOpacity={0.15} isAnimationActive={false} />
                <Line dataKey="noHeadroom" name="No headroom" stroke={C.grey} strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
                <Line dataKey="withHeadroom" name={`With ${d.headroom.toFixed(0)}% headroom`} stroke={C.g} strokeWidth={3} dot={{ r: 3.5 }} isAnimationActive={false} />
                {cur && <ReferenceDot x={cur.buffer} y={cur.withHeadroom} r={8} fill="none" stroke={C.gd} strokeWidth={2.5} label={{ value: `Chosen ${cur.buffer}: ${cur.withHeadroom.toFixed(2)}%`, position: 'top', fill: C.gd, fontSize: 12, fontWeight: 700 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Simulation settings">
            <div className="field"><div className="lbl">Buffer sizes to test<small>comma separated (strips)</small></div><div /><input className="txt" style={{ gridColumn: '1 / -1' }} value={sizesTxt} onChange={(e) => setSizesTxt(e.target.value)} /></div>
            <div className="field"><div className="lbl">Horizon</div><div className="ctl"><input className="num" value={days} onChange={(e) => setDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} /><span className="unit">days</span></div></div>
            <div className="field"><div className="lbl">Replications</div><div className="ctl"><input className="num" value={reps} onChange={(e) => setReps(Math.max(1, Math.min(10, Number(e.target.value) || 1)))} /><span className="unit">runs</span></div></div>
            <div className="field"><div className="lbl">Seed</div><div className="ctl"><input className="num" value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} /><span className="unit" /></div></div>
            <div className="field"><div className="lbl">Blocking target</div><div className="ctl"><input className="num" value={target} onChange={(e) => setTarget(Math.max(0.01, Number(e.target.value) || 1))} /><span className="unit">%</span></div></div>
            <ParamField k="bufferCapacity" compact />
            {rec && rec.buffer !== p.bufferCapacity && <button className="btn sm primary" style={{ marginTop: 10 }} onClick={() => setParam('bufferCapacity', rec.buffer)}>Use recommended {rec.buffer} strips</button>}
          </Card>
        </div>
        <div className="grid g3">
          <Card title="Buffer control bands" sub="How the cell and primary react to buffer level">
            <svg viewBox="0 0 400 60" style={{ width: '100%', marginBottom: 6 }}>
              <rect x="0" y="14" width={4 * p.bandLow} height="22" fill={C.g3} />
              <rect x={4 * p.bandLow} y="14" width={4 * (p.bandMid - p.bandLow)} height="22" fill={C.g2} />
              <rect x={4 * p.bandMid} y="14" width={4 * (p.bandSoft - p.bandMid)} height="22" fill={C.gd} />
              <rect x={4 * p.bandSoft} y="14" width={4 * (100 - p.bandSoft)} height="22" fill={C.red} />
              <text x="2" y="52" fontSize="10" fill={C.muted}>match line</text>
              <text x={4 * p.bandLow + 2} y="52" fontSize="10" fill={C.muted}>+half headroom</text>
              <text x={4 * p.bandMid + 2} y="52" fontSize="10" fill={C.muted}>full speed</text>
              <text x={398} y="10" textAnchor="end" fontSize="10" fill={C.red}>soft slow</text>
            </svg>
            {['bandLow', 'bandMid', 'bandSoft', 'softSpeed'].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
          <Card title="Cell stop profile">
            {['cellMicroRate', 'cellMicroMedian', 'cellMinorRate', 'cellMinorMedian', 'stopSigma'].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
          <Card title="Primary stop profile & capacity">
            {['primaryStopRate', 'primaryStopMedian', 'turretMaxRpm', 'capCollation'].map((k) => <ParamField key={k} k={k} compact />)}
            <div className="callout green" style={{ marginTop: 10 }}>Headroom matters more than buffer size: without catch-up speed the buffer never empties, so even a large one keeps blocking the primary.</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
