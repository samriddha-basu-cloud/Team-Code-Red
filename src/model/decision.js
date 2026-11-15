import { alternatives, finance, scenarioTable, monteCarloNpv } from './engine.js';
import { PRESETS } from './params.js';

export const OPTIONS = [
  { id: 'turret', label: 'Cam-turret cell', short: 'Turret' },
  { id: 'delta', label: 'Delta-robot cell', short: 'Delta' },
  { id: 'semi', label: 'Semi-automatic', short: 'Semi-auto' },
  { id: 'manual', label: 'Do nothing (manual)', short: 'Manual' },
];

export const CRITERIA = [
  { id: 'npv', label: 'NPV', live: true, tip: 'Live from the financial model for each option. Scaled 1–5 across the options.' },
  { id: 'payback', label: 'Payback speed', live: true, tip: 'Live payback; shorter scores higher. Doing nothing earns no return, so it scores lowest.' },
  { id: 'oee', label: 'OEE reached', live: true, tip: 'Estimated line OEE each option reaches with your current assumptions.' },
  { id: 'gentle', label: 'Gentleness on product', tip: 'Peak acceleration on the strip and grip on the sharp laminate. Drives COPQ.' },
  { id: 'health', label: 'Worker health & ergonomics', tip: 'How much repetitive wrist work remains for operators.' },
  { id: 'flex', label: 'Format flexibility', tip: 'How easily the option handles new strip lengths or SKUs.' },
  { id: 'maint', label: 'Local maintainability', tip: 'Can a trained ITI fitter keep it running? Spares in rupees, service in hours.' },
  { id: 'footprint', label: 'Footprint fit (4.0 × 1.5 m)', tip: 'How comfortably it fits the cell boundary.' },
  { id: 'risk', label: 'Execution risk (5 = low)', tip: 'Delivery, integration and ramp-up risk. Higher score means lower risk.' },
];

export const DEFAULT_WEIGHTS = { npv: 25, payback: 10, oee: 15, gentle: 15, health: 10, flex: 5, maint: 10, footprint: 5, risk: 5 };
export const DEFAULT_SCORES = {
  turret: { gentle: 5, health: 5, flex: 2, maint: 4, footprint: 4, risk: 4 },
  delta: { gentle: 2, health: 5, flex: 5, maint: 2, footprint: 3, risk: 3 },
  semi: { gentle: 3, health: 2, flex: 3, maint: 5, footprint: 5, risk: 5 },
  manual: { gentle: 2, health: 1, flex: 5, maint: 5, footprint: 5, risk: 5 },
};

export const DEFAULT_GATES = { maxPaybackMo: 18, maxBlockingPct: 1.5, maxLossProb: 10, oeeSlack: 0 };

// Live facts per option (NPV, payback, OEE)
export function optionFacts(p, d, blockedPct) {
  const alts = Object.fromEntries(alternatives(p).map((a) => [a.id, a]));
  const A = d.aPrimary * (1 - blockedPct / 100) * (1 - p.scnExtraDowntime / 100);
  const speed = 1 - p.scnSpeedDrop / 100;
  const semiPerf = (p.perfManual / 100) * ((p.throttledSpeed + (p.primarySpeed - p.throttledSpeed) * 0.5) / p.primarySpeed);
  const oee = {
    turret: A * (p.perfCell / 100) * speed * (1 - p.copqAfter / 100),
    delta: A * (p.perfCell / 100) * 0.97 * speed * (1 - (alts.delta?.copqAfter ?? 0.8) / 100),
    semi: d.aPrimary * semiPerf * speed * (1 - (alts.semi?.copqAfter ?? 1.6) / 100),
    manual: d.oeeToday.OEE,
  };
  return {
    turret: { npv: alts.turret.npv, pb: alts.turret.pb, capex: alts.turret.capex, oee: oee.turret },
    delta: { npv: alts.delta.npv, pb: alts.delta.pb, capex: alts.delta.capex, oee: oee.delta },
    semi: { npv: alts.semi.npv, pb: alts.semi.pb, capex: alts.semi.capex, oee: oee.semi },
    manual: { npv: 0, pb: null, capex: 0, oee: oee.manual },
  };
}

const scale = (vals, higherBetter = true) => {
  const xs = Object.values(vals).filter((v) => v != null && isFinite(v));
  const lo = Math.min(...xs), hi = Math.max(...xs);
  return Object.fromEntries(Object.entries(vals).map(([k, v]) => {
    if (v == null || !isFinite(v)) return [k, 1];
    if (hi === lo) return [k, 3];
    const t = (v - lo) / (hi - lo);
    return [k, 1 + 4 * (higherBetter ? t : 1 - t)];
  }));
};

export function scoreMatrix(facts, scores) {
  const npv = scale(Object.fromEntries(OPTIONS.map((o) => [o.id, facts[o.id].npv])));
  const pb = scale(Object.fromEntries(OPTIONS.map((o) => [o.id, facts[o.id].pb])), false);
  const oee = scale(Object.fromEntries(OPTIONS.map((o) => [o.id, facts[o.id].oee])));
  return Object.fromEntries(OPTIONS.map((o) => [o.id, { npv: npv[o.id], payback: pb[o.id], oee: oee[o.id], ...scores[o.id] }]));
}

export function rank(matrix, weights) {
  const wsum = CRITERIA.reduce((a, c) => a + (weights[c.id] || 0), 0) || 1;
  return OPTIONS.map((o) => {
    const parts = CRITERIA.map((c) => ({ id: c.id, v: ((weights[c.id] || 0) * matrix[o.id][c.id]) / wsum }));
    return { id: o.id, label: o.label, short: o.short, total: parts.reduce((a, b) => a + b.v, 0), parts };
  }).sort((a, b) => b.total - a.total);
}

// For each criterion: the weight range (0–100) over which the current winner stays on top.
export function flipAnalysis(matrix, weights) {
  const winner = rank(matrix, weights)[0].id;
  return CRITERIA.map((c) => {
    let lo = null, hi = null, flipTo = null;
    for (let w = 0; w <= 100; w++) {
      const r = rank(matrix, { ...weights, [c.id]: w });
      if (r[0].id === winner) { if (lo === null) lo = w; hi = w; }
      else if (flipTo === null && (lo === null || w > (weights[c.id] || 0))) flipTo = r[0].id;
    }
    return { id: c.id, label: c.label, current: weights[c.id] || 0, lo, hi, robust: lo === 0 && hi === 100, flipTo };
  });
}

// Heavier calculations, memoised by the caller on parameters only.
export function gateHeavy(p) {
  const base = { ...p, scnSpeedDrop: 0, scnCapexOverrun: 0, scnExtraDowntime: 0, scnCopqRealisation: 100 };
  const scen = scenarioTable(base, PRESETS);
  const worst = scen.reduce((a, b) => (b.npv < a.npv ? b : a));
  const mc = monteCarloNpv(base, 500, 42);
  return { worst, mc };
}

export function evaluateGates({ p, d, fin, oee, blocking, twin, ws, gates, heavy }) {
  const { worst, mc } = heavy;
  const k = twin.kpis();
  const twinRan = twin.mode === 'auto' && twin.m.tTotal >= 86400;
  const people = ws.transition.reduce((a, r) => a + (Number(r.people) || 0), 0);
  const roll = Math.round(d.rollCount);
  const failedChecks = d.checks.filter((c) => !c.ok);
  const trained = ws.cohort.filter((t) => ['l1a', 'l1b', 'l2a', 'l2b', 'l2c', 'l2d'].every((m) => t.done[m])).length;
  const list = [
    { id: 'npv', type: 'must', label: 'Value at current settings', detail: `NPV ₹${(fin.npv / 1e7).toFixed(2)} Cr`, pass: fin.npv > 0, fix: 'Revisit CapEx or COPQ assumptions in Financials.' },
    { id: 'worst', type: 'must', label: 'Survives the worst stress preset', detail: `${worst.label}: ₹${(worst.npv / 1e7).toFixed(2)} Cr`, pass: worst.npv > 0, fix: 'Reduce CapEx exposure or protect the COPQ gain with FAT acceptance criteria.' },
    { id: 'pb', type: 'must', label: `Payback within ${gates.maxPaybackMo} months`, detail: fin.pb == null ? 'never pays back' : `${(fin.pb * 12).toFixed(1)} months`, pass: fin.pb != null && fin.pb * 12 <= gates.maxPaybackMo, fix: 'Check ramp-up, running costs and CapEx.' },
    { id: 'eng', type: 'must', label: 'All engineering checks pass', detail: failedChecks.length ? `Failing: ${failedChecks.map((c) => c.label).join('; ')}` : `${d.checks.length} of ${d.checks.length} pass`, pass: !failedChecks.length, fix: 'Open Line & Kinematics and fix the red checks.', goto: 'line' },
    { id: 'oee', type: 'must', label: `Model OEE ≥ ${p.oeeTarget}%`, detail: `${(oee.OEE * 100).toFixed(1)}%`, pass: oee.OEE * 100 >= p.oeeTarget - gates.oeeSlack - 0.5, fix: 'Improve availability (buffer, stops) or performance.', goto: 'line' },
    { id: 'block', type: 'must', label: `Primary blocking ≤ ${gates.maxBlockingPct}%`, detail: `${blocking.blockedPct.toFixed(2)}% (buffer ${p.bufferCapacity} strips)`, pass: blocking.blockedPct <= gates.maxBlockingPct, fix: 'Size the buffer in Buffer Lab or add headroom.', goto: 'buffer' },
    { id: 'mc', type: 'must', label: `Probability of loss ≤ ${gates.maxLossProb}%`, detail: `P(NPV<0) ${(mc.pLoss * 100).toFixed(1)}% · P10 ₹${mc.p10.toFixed(2)} Cr`, pass: mc.pLoss * 100 <= gates.maxLossProb, fix: 'Narrow the risk ranges with supplier and FAT commitments.', goto: 'risk' },
    { id: 'twin', type: 'condition', label: 'Digital twin evidence (≥ 1 day, automated)', detail: twinRan ? `Twin OEE ${(k.OEE * 100).toFixed(1)}% over ${(twin.m.tTotal / 86400).toFixed(1)} days` : 'Not yet run for a full day', pass: twinRan && k.OEE * 100 >= p.oeeTarget - 1.5, pending: !twinRan, fix: 'Run the twin for at least a day in automated mode.', goto: 'twin' },
    { id: 'people', type: 'condition', label: 'Every operator has a path', detail: `${people} of ${roll} placed`, pass: people === roll, fix: 'Balance the transition plan in People & TPM.', goto: 'people' },
    { id: 'skills', type: 'condition', label: `${p.techs} technicians certified to L2 before go-live`, detail: `${trained} of ${p.techs} so far`, pass: trained >= p.techs, pending: trained < p.techs, fix: 'Track the cohort in People & TPM.', goto: 'people' },
  ];
  const mustFail = list.filter((g) => g.type === 'must' && !g.pass);
  const condOpen = list.filter((g) => g.type === 'condition' && !g.pass);
  const verdict = mustFail.length ? 'NO-GO' : condOpen.length ? 'GO WITH CONDITIONS' : 'GO';
  return { list, verdict, mustFail, condOpen, worst, mc };
}
