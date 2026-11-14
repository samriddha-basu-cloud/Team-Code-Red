import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, Cell, BarChart, LabelList, PieChart, Pie } from 'recharts';
import { IndianRupee, Percent, Hourglass, TrendingUp, Landmark, PiggyBank, Download, FlaskConical } from 'lucide-react';
import { Card, Kpi, PageHead, ParamField, tooltipStyle, C } from '../components/ui.jsx';
import { useParams } from '../state/ParamsContext.jsx';
import { useTwinCtl } from '../state/TwinContext.jsx';
import { alternatives, capexOf, CAPEX_CELL_KEYS, CAPEX_INTEG_KEYS } from '../model/engine.js';
import { PARAM_MAP } from '../model/params.js';
import { fmtCr, fmtL, fmtMonths, fmtPct } from '../util/format.js';

const L = (v) => (v / 1e5).toFixed(1);

function downloadCsv(name, rows) {
  const csv = rows.map((r) => r.map((c) => (typeof c === 'string' && c.includes(',') ? `"${c}"` : c)).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name;
  a.click();
}

export default function FinanceTab() {
  const { params: p, fin, setParam } = useParams();
  const { twin } = useTwinCtl();
  const alts = useMemo(() => alternatives(p), [p]);
  const cx = capexOf(p);
  const r = p.discountRate / 100;
  const chart = fin.table.map((t, i) => ({ ...t, netCr: t.net / 1e7, cumCr: t.cum / 1e7 }));
  const capexRows = [...CAPEX_CELL_KEYS, ...CAPEX_INTEG_KEYS].map((k) => ({ name: PARAM_MAP[k].label, v: p[k], integ: CAPEX_INTEG_KEYS.includes(k) })).sort((a, b) => b.v - a.v);
  const s = fin.steady;
  const split = [
    { name: 'COPQ reduction', value: s.copq, fill: C.g },
    { name: 'Labour', value: s.labour, fill: C.gold },
    ...(s.upside > 0 ? [{ name: 'Throughput upside', value: s.upside, fill: C.g3 }] : []),
  ];
  const qualityShare = s.gross > 0 ? (s.copq / s.gross) * 100 : 0;
  const tk = twin.kpis();
  const canApply = twin.mode === 'auto' && twin.m.tTotal >= 86400;

  const exportRows = () => {
    const head = ['Line (₹ lakh)', ...fin.table.map((t) => t.year)];
    const row = (label, f) => [label, '', ...fin.rows.map(f)];
    downloadCsv('code-red-cashflow.csv', [
      head,
      row('Labour saving', (x) => L(x.labour)), row('COPQ saving', (x) => L(x.copq)), row('Throughput upside', (x) => L(x.upside)),
      row('People (techs + feeders)', (x) => L(-x.people)), row('Maintenance', (x) => L(-x.maint)), row('Power', (x) => L(-x.power)), row('Other running', (x) => L(-x.other)),
      row('Salvage', (x) => L(x.salvage)), ['Net cash flow', ...fin.cfs.map(L)], ['Cumulative', ...fin.table.map((t) => L(t.cum))],
    ]);
  };

  return (
    <div className="page">
      <PageHead kicker="Module 3 · TCO & financial evaluation" title="Investment case, cash flows and cheaper alternatives"
        sub="All figures pre-tax unless stated. Year 1 is scaled by the ramp-up factor; the last year includes salvage. Edit any line item and the case recalculates."
        right={<div className="row"><button className="btn" onClick={exportRows}><Download size={15} />Cash flow CSV</button>
          <button className="btn" disabled={!canApply} title={canApply ? '' : 'Run the twin in automated mode for at least 1 simulated day'} onClick={() => setParam('copqAfter', +tk.copq.toFixed(2))}><FlaskConical size={15} />Use twin COPQ ({tk.copq.toFixed(2)}%)</button></div>} />
      <div className="stack" style={{ gap: 14 }}>
        <div className="grid g6">
          <Kpi dark label="NPV" icon={IndianRupee} value={fmtCr(fin.npv)} sub={`@ ${p.discountRate}%, ${p.years} years`} />
          <Kpi label="IRR" icon={Percent} value={fin.irr == null ? 'n/a' : fmtPct(fin.irr * 100, 0)} sub="pre-tax" />
          <Kpi label="Payback" icon={Hourglass} value={fmtMonths(fin.pb)} sub={`discounted ${fmtMonths(fin.dpb)}`} />
          <Kpi label="ROI" icon={TrendingUp} value={fmtPct(fin.roiAnnual * 100, 0)} sub={`annual · ${fmtPct(fin.roi7 * 100, 0)} over ${p.years} yrs`} />
          <Kpi label="Post-tax" icon={Landmark} value={fmtCr(fin.postNpv)} sub={`IRR ${fin.postIrr == null ? 'n/a' : fmtPct(fin.postIrr * 100, 0)} · payback ${fmtMonths(fin.postPb)}`} />
          <Kpi label="Value from quality" icon={PiggyBank} value={fmtPct(qualityShare, 0)} sub="share of gross savings from COPQ" />
        </div>
        <div className="grid g3">
          <Card className="span2" title="Cash flow" sub="Net cash per year (bars) and cumulative position (line), ₹ Cr">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chart} margin={{ left: -10, right: 10, top: 10 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip {...tooltipStyle} formatter={(v) => `₹${Number(v).toFixed(2)} Cr`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={0} stroke={C.muted} />
                <Bar dataKey="netCr" name="Net cash flow" fill={C.g3} isAnimationActive={false} radius={[3, 3, 0, 0]}>
                  {chart.map((c, i) => <Cell key={i} fill={c.netCr < 0 ? C.red : C.g3} />)}
                </Bar>
                <Line dataKey="cumCr" name="Cumulative" stroke={C.gd} strokeWidth={3} dot={{ r: 3.5 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Where the value comes from" sub="Steady-state year gross savings">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={split} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2} isAnimationActive={false}>
                  {split.map((x, i) => <Cell key={i} fill={x.fill} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v) => fmtCr(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="callout" style={{ marginTop: 6 }}><b>{qualityShare.toFixed(0)}% of the value is quality.</b> Labour savings ({fmtCr(s.labour)}) barely cover the new running costs ({fmtCr(s.opex)}), so position the cell as a quality and worker-health investment.</div>
          </Card>
        </div>
        <Card title="Cash flow table" sub="₹ lakh" right={<span className="chip">Discounted at {p.discountRate}%</span>}>
          <div className="tablewrap"><table className="t">
            <thead><tr><th>Line</th>{fin.table.map((t) => <th key={t.year} className="n">{t.year}</th>)}</tr></thead>
            <tbody>
              {[
                ['Labour saving', (x) => x.labour],
                ['COPQ saving', (x) => x.copq],
                ...(p.includeUpside ? [['Throughput upside', (x) => x.upside]] : []),
                ['People (techs + feeders)', (x) => -x.people],
                ['Maintenance & spares', (x) => -x.maint],
                ['Power', (x) => -x.power],
                ['AMC, consumables, insurance, fallback', (x) => -x.other],
                ['Salvage', (x) => x.salvage],
              ].map(([lab, f]) => (
                <tr key={lab}><td>{lab}</td><td className="n muted">—</td>{fin.rows.map((x) => <td key={x.year} className={`n ${f(x) < 0 ? 'bad' : ''}`}>{L(f(x))}</td>)}</tr>
              ))}
              <tr><td>Investment</td><td className="n bad">{L(fin.cfs[0])}</td>{fin.rows.map((x) => <td key={x.year} className="n muted">—</td>)}</tr>
              <tr className="hl"><td>Net cash flow{p.y1Realisation < 100 ? ` (Y1 × ${p.y1Realisation}%)` : ''}</td>{fin.cfs.map((v, i) => <td key={i} className="n">{L(v)}</td>)}</tr>
              <tr><td>Discounted</td>{fin.cfs.map((v, i) => <td key={i} className="n">{L(v / Math.pow(1 + r, i))}</td>)}</tr>
              <tr><td>Cumulative</td>{fin.table.map((t, i) => <td key={i} className={`n ${t.cum < 0 ? 'bad' : 'good'}`}>{L(t.cum)}</td>)}</tr>
              <tr><td>Post-tax cash flow</td>{fin.post.map((v, i) => <td key={i} className="n">{L(v)}</td>)}</tr>
            </tbody>
          </table></div>
        </Card>
        <div className="grid g3">
          <Card title="CapEx breakdown" sub={`Cell ${fmtL(cx.cellL * 1e5, 0)} + integration ${fmtL(cx.integL * 1e5, 0)} = ${fmtCr(cx.totalL * 1e5)}${p.scnCapexOverrun ? ` · +${p.scnCapexOverrun}% overrun → ${fmtCr(cx.total)}` : ''}`}>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={capexRows} layout="vertical" margin={{ left: 10, right: 34 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                <Tooltip {...tooltipStyle} formatter={(v) => `₹${v} L`} />
                <Bar dataKey="v" isAnimationActive={false} radius={[0, 4, 4, 0]}>
                  {capexRows.map((c, i) => <Cell key={i} fill={c.integ ? C.g3 : C.g} />)}
                  <LabelList dataKey="v" position="right" style={{ fontSize: 11, fill: C.ink }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card title="CapEx line items (₹ lakh)" style={{ maxHeight: 470, overflowY: 'auto' }}>
            {[...CAPEX_CELL_KEYS, ...CAPEX_INTEG_KEYS].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
          <Card title="Savings & running-cost drivers" style={{ maxHeight: 470, overflowY: 'auto' }}>
            {['copqBefore', 'copqAfter', 'prodValueCr', 'wageMonthly', 'wageEsc', 'techs', 'techWage', 'handlers', 'trainingL', 'maintPct', 'maintEsc', 'powerKw', 'tariff', 'amcL', 'consumablesL', 'insurancePct', 'discountRate', 'years', 'salvagePct', 'y1Realisation', 'taxRate', 'wdvRate', 'includeUpside', 'contribMargin'].map((k) => <ParamField key={k} k={k} compact />)}
          </Card>
        </div>
        <Card title="Cheaper alternatives, compared on the same assumptions" tag="M3">
          <div className="tablewrap"><table className="t">
            <thead><tr><th>Option</th><th className="n">CapEx</th><th className="n">COPQ after</th><th className="n">People folding / shift</th><th className="n">NPV</th><th className="n">IRR</th><th className="n">Payback</th></tr></thead>
            <tbody>{alts.map((a) => (
              <tr key={a.id} className={a.id === 'turret' ? 'hl' : ''}><td>{a.label}</td><td className="n">{fmtCr(a.capex)}</td><td className="n">{a.copqAfter}%</td><td className="n">{a.folding}</td><td className="n">{fmtCr(a.npv)}</td><td className="n">{a.irr == null ? 'n/a' : fmtPct(a.irr * 100, 0)}</td><td className="n">{fmtMonths(a.pb)}</td></tr>
            ))}</tbody>
          </table></div>
          <div className="small muted" style={{ marginTop: 8 }}>Semi-automatic and delta-robot costs are indicative estimates; they follow every other assumption you set (wages, COPQ base, discount rate).</div>
        </Card>
      </div>
    </div>
  );
}
