import { mulberry32, triangularDraw } from './rng.js';

export const CR = 1e7;
export const LAKH = 1e5;

export const CAPEX_CELL_KEYS = ['cxTurret', 'cxErector', 'cxVision', 'cxCollate', 'cxTransfer', 'cxControls', 'cxCheckweigh'];
export const CAPEX_INTEG_KEYS = ['cxAccumulator', 'cxUtilities', 'cxEnclosure', 'cxCommission', 'cxInstall', 'cxData'];

// ------------------------------------------------------------------ physics, geometry, balance
export function derive(p) {
  const g = 9.81;
  const lineSpeed = p.primarySpeed * (1 - p.scnSpeedDrop / 100); // sachets/min actually running
  const stripsPerMin = lineSpeed / p.sachetsPerStrip;
  const cartonsPerMin = stripsPerMin / p.stripsPerCarton;
  const taktStrip = 60 / stripsPerMin;
  const taktCarton = 60 / cartonsPerMin;

  const stations = [
    { id: 'S2', name: 'S2 Flying transfer', unit: 'strips', cap: p.capTransfer, capStrips: p.capTransfer, key: 'capTransfer' },
    { id: 'S3', name: 'S3 Vision', unit: 'strips', cap: p.capVision, capStrips: p.capVision, key: 'capVision' },
    { id: 'S4', name: 'S4 Strip reject', unit: 'strips', cap: p.capReject, capStrips: p.capReject, key: 'capReject' },
    { id: 'S5', name: 'S5 Fold turret', unit: 'strips', cap: p.turretHeads * p.turretMaxRpm, capStrips: p.turretHeads * p.turretMaxRpm, key: null },
    { id: 'S6', name: 'S6 Collation', unit: 'cartons', cap: p.capCollation, capStrips: p.capCollation * p.stripsPerCarton, key: 'capCollation' },
    { id: 'S7', name: 'S7 Carton erector', unit: 'cartons', cap: p.capErector, capStrips: p.capErector * p.stripsPerCarton, key: 'capErector' },
    { id: 'S8', name: 'S8 Top-load', unit: 'cartons', cap: p.capTopload, capStrips: p.capTopload * p.stripsPerCarton, key: 'capTopload' },
    { id: 'S9', name: 'S9 Tuck-in closer', unit: 'cartons', cap: p.capCloser, capStrips: p.capCloser * p.stripsPerCarton, key: 'capCloser' },
    { id: 'S10', name: 'S10 Checkweigher', unit: 'cartons', cap: p.capCheckweigher, capStrips: p.capCheckweigher * p.stripsPerCarton, key: 'capCheckweigher' },
  ].map((s) => ({ ...s, load: (stripsPerMin / s.capStrips) * 100 }));
  const cellMax = Math.min(...stations.map((s) => s.capStrips));
  const bottleneck = stations.reduce((a, b) => (b.capStrips < a.capStrips ? b : a));
  const headroom = (cellMax / stripsPerMin - 1) * 100;

  // kinematics
  const vIn = (p.stripPitchPrimary / 1000) * (stripsPerMin / 60);
  const decel = (vIn * vIn) / (2 * (p.decelDistance / 1000));
  const decelTime = (2 * (p.decelDistance / 1000)) / vIn;
  const ratedWindow = 60 / cellMax;
  const pocketSpeed = (p.pocketPitch / 1000) * stripsPerMin; // m/min
  const pocketSpeedRated = (p.pocketPitch / 1000) * cellMax;
  const rpmNom = stripsPerMin / p.turretHeads;
  const rpmRated = cellMax / p.turretHeads;
  const folds = Math.max(0, Math.ceil(p.sachetsPerStrip / p.sachetsPerPanel) - 1);
  const layersPerStrip = folds + 1;
  const foldTimeNom = folds > 0 ? ((60 / rpmNom) * (p.foldWindow / 360)) / folds : 0;
  const foldTimeRated = folds > 0 ? ((60 / rpmRated) * (p.foldWindow / 360)) / folds : 0;
  const bladeAccNom = foldTimeNom > 0 ? (2 * Math.PI * (p.bladeTipPath / 1000)) / (foldTimeNom * foldTimeNom) : 0;
  const bladeAccRated = foldTimeRated > 0 ? (2 * Math.PI * (p.bladeTipPath / 1000)) / (foldTimeRated * foldTimeRated) : 0;
  const cartonChain = (p.cartonPitch / 1000) * cartonsPerMin;

  // geometry
  const inL = p.cartonL - 2 * p.boardThickness;
  const inW = p.cartonW - 2 * p.boardThickness;
  const inH = p.cartonH - 2 * p.boardThickness;
  const panelLen = p.sachetsPerPanel * p.sachetLength + p.loopAllowance;
  const totalLayers = layersPerStrip * p.stripsPerCarton;
  const stackH = totalLayers * p.sachetThickness;
  const maxThickness = inH / totalLayers;
  const stripLength = p.sachetsPerStrip * p.sachetLength;
  const lastPanel = p.sachetsPerStrip - folds * p.sachetsPerPanel;

  const checks = [
    { label: 'Strip deceleration on vacuum belt', value: decel / g, unit: 'g', limit: p.maxAccelG, ok: decel / g <= p.maxAccelG },
    { label: 'Deceleration time fits rated strip window', value: decelTime, unit: 's', limit: ratedWindow, ok: decelTime <= ratedWindow },
    { label: 'Fold blade acceleration (rated speed)', value: bladeAccRated / g, unit: 'g', limit: p.maxAccelG, ok: bladeAccRated / g <= p.maxAccelG },
    { label: 'Panel length fits carton inside length', value: panelLen, unit: 'mm', limit: inL, ok: panelLen <= inL },
    { label: 'Sachet width fits carton inside width', value: p.sachetWidth, unit: 'mm', limit: inW, ok: p.sachetWidth <= inW },
    { label: 'Stack height fits carton inside height', value: stackH, unit: 'mm', limit: inH, ok: stackH <= inH },
    { label: 'Cell headroom over demand', value: headroom, unit: '%', limit: 10, ok: headroom >= 10, invert: true },
  ];

  // manual baseline
  const manualCapCpm = (p.opsPerShift * 60) / p.manualCycle;
  const peopleNeeded = p.manualCycle / taktCarton;
  const rollCount = (p.opsPerShift * p.shifts * 7) / 6 / (1 - p.absenteeism / 100);

  // analytical OEE
  const meanStop = (median) => median * Math.exp((p.stopSigma * p.stopSigma) / 2);
  const plannedLoss = p.plannedStopMin / (p.shiftHours * 60);
  const primRandLoss = (p.primaryStopRate * meanStop(p.primaryStopMedian)) / 3600;
  const aPrimary = Math.max(0, 1 - plannedLoss - primRandLoss);
  const cellDownPct = ((p.cellMicroRate * meanStop(p.cellMicroMedian) + p.cellMinorRate * meanStop(p.cellMinorMedian)) / 3600) * 100;
  const oeeToday = {
    A: aPrimary,
    P: (p.perfManual / 100) * (p.throttledSpeed / p.primarySpeed),
    Q: 1 - p.copqBefore / 100,
  };
  oeeToday.OEE = oeeToday.A * oeeToday.P * oeeToday.Q;

  return {
    lineSpeed, stripsPerMin, cartonsPerMin, taktStrip, taktCarton, stations, cellMax, bottleneck, headroom,
    vIn, decel, decelTime, ratedWindow, pocketSpeed, pocketSpeedRated, rpmNom, rpmRated, folds, layersPerStrip,
    foldTimeNom, foldTimeRated, bladeAccNom, bladeAccRated, cartonChain, inL, inW, inH, panelLen, totalLayers,
    stackH, maxThickness, stripLength, lastPanel, checks, manualCapCpm, peopleNeeded, rollCount,
    aPrimary, plannedLoss, primRandLoss, cellDownPct, oeeToday,
  };
}

// OEE with the cell, given residual blocking % from the buffer model
export function oeeCell(p, d, blockedPct) {
  const A = d.aPrimary * (1 - blockedPct / 100) * (1 - p.scnExtraDowntime / 100);
  const P = (p.perfCell / 100) * (1 - p.scnSpeedDrop / 100);
  const Q = 1 - p.copqAfter / 100;
  return { A, P, Q, OEE: A * P * Q };
}

export function oeeBridge(p, d, blockedPct) {
  const t = d.oeeToday;
  const s1 = t.A * (p.perfManual / 100) * t.Q;
  const s2 = t.A * (p.perfManual / 100) * (1 - p.copqAfter / 100);
  const s3 = s2 * (1 - blockedPct / 100);
  const c = oeeCell({ ...p, scnSpeedDrop: 0, scnExtraDowntime: 0 }, d, blockedPct);
  return [
    { step: 'Today (manual)', kind: 'total', v: t.OEE * 100 },
    { step: 'Throttle removed', kind: 'step', v: (s1 - t.OEE) * 100 },
    { step: `Scrap ${p.copqBefore}% → ${p.copqAfter}%`, kind: 'step', v: (s2 - s1) * 100 },
    { step: 'Residual cell blocking', kind: 'step', v: (s3 - s2) * 100 },
    { step: 'Fewer handling micro-stops', kind: 'step', v: (c.OEE - s3) * 100 },
    { step: 'With the cell', kind: 'end', v: c.OEE * 100 },
  ];
}

// ------------------------------------------------------------------ finance
export function capexOf(p) {
  const cell = CAPEX_CELL_KEYS.reduce((s, k) => s + p[k], 0);
  const integ = CAPEX_INTEG_KEYS.reduce((s, k) => s + p[k], 0);
  return { cellL: cell, integL: integ, totalL: cell + integ, total: (cell + integ) * LAKH * (1 + p.scnCapexOverrun / 100) };
}

export function cashflows(p) {
  const { total: capex } = capexOf(p);
  const training = p.trainingL * LAKH;
  const prodMonthly = p.prodValueCr * CR;
  const prodFactor = 1 - p.scnSpeedDrop / 100;
  const xdt = p.scnExtraDowntime / 100;
  const rows = [];
  const cfs = [-(capex + training)];
  for (let y = 1; y <= p.years; y++) {
    const esc = Math.pow(1 + p.wageEsc / 100, y - 1);
    const labour = p.opsPerShift * p.shifts * p.wageMonthly * 12 * esc;
    const copq = ((p.copqBefore - p.copqAfter) / 100) * prodMonthly * 12 * prodFactor * (p.scnCopqRealisation / 100) * (1 - xdt);
    let upside = 0;
    if (p.includeUpside) {
      const extraShare = Math.max(0, (p.primarySpeed * prodFactor * (1 - xdt)) / p.throttledSpeed - 1);
      upside = extraShare * prodMonthly * 12 * (p.contribMargin / 100);
    }
    const gross = labour + copq + upside;
    const maint = (p.maintPct / 100) * capex * Math.pow(1 + p.maintEsc / 100, y - 1) * (1 + 10 * xdt);
    const fallback = xdt * p.hoursPerYear * p.opsPerShift * p.overtimeRate * esc;
    const power = p.powerKw * p.hoursPerYear * p.tariff * (1 - xdt);
    const people = (p.techs * p.techWage + p.handlers * p.wageMonthly) * 12 * esc;
    const other = p.amcL * LAKH * esc + p.consumablesL * LAKH * esc + (p.insurancePct / 100) * capex + fallback;
    const opex = maint + power + people + other;
    let net = gross - opex;
    if (y === 1) net *= p.y1Realisation / 100;
    const salvage = y === p.years ? (p.salvagePct / 100) * capex : 0;
    net += salvage;
    cfs.push(net);
    rows.push({ year: y, labour, copq, upside, gross, maint, power, people, other, opex, salvage, net });
  }
  return { cfs, rows, capex, training };
}

export const npv = (r, cfs) => cfs.reduce((s, cf, t) => s + cf / Math.pow(1 + r, t), 0);

export function irr(cfs) {
  if (npv(-0.99 + 1e-9, cfs) * npv(50, cfs) > 0) return null;
  let lo = -0.99, hi = 50;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid, cfs) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

export function payback(cfs, r = null) {
  let cum = 0;
  for (let t = 0; t < cfs.length; t++) {
    const d = r ? cfs[t] / Math.pow(1 + r, t) : cfs[t];
    if (t > 0 && cum + d >= 0) return t - 1 + -cum / d;
    cum += d;
  }
  return null;
}

export function finance(p) {
  const cf = cashflows(p);
  const r = p.discountRate / 100;
  const inv = -cf.cfs[0];
  const sumAfter = cf.cfs.slice(1).reduce((a, b) => a + b, 0);
  // post-tax
  const t = p.taxRate / 100;
  let wdv = cf.capex;
  const post = [cf.cfs[0] + cf.training * t];
  cf.rows.forEach((row, i) => {
    const dep = wdv * (p.wdvRate / 100);
    wdv -= dep;
    const pre = cf.cfs[i + 1];
    post.push(pre - t * (pre - dep));
  });
  let cum = 0;
  const table = cf.cfs.map((v, i) => { cum += v; return { year: `Y${i}`, net: v, cum }; });
  return {
    ...cf, inv,
    npv: npv(r, cf.cfs), irr: irr(cf.cfs), pb: payback(cf.cfs), dpb: payback(cf.cfs, r),
    roi7: (sumAfter - inv) / inv, roiAnnual: cf.rows.length > 1 ? cf.rows[1].net / inv : cf.rows[0].net / inv,
    postNpv: npv(r, post), postIrr: irr(post), postPb: payback(post), postDpb: payback(post, r), post, table,
    steady: cf.rows.length > 1 ? cf.rows[1] : cf.rows[0],
  };
}

export const quickNpv = (p) => npv(p.discountRate / 100, cashflows(p).cfs);

export function scenarioTable(p, presets) {
  return Object.entries(presets).map(([id, s]) => {
    const f = finance({ ...p, ...s.values });
    return { id, label: s.label, npv: f.npv, irr: f.irr, pb: f.pb, dpb: f.dpb, roi7: f.roi7 };
  });
}

export function tornado(p, pct = 20) {
  const base = quickNpv(p);
  const f = pct / 100;
  const drivers = [
    { label: 'COPQ gain realised', apply: (q, m) => ({ ...q, scnCopqRealisation: q.scnCopqRealisation * m }) },
    { label: 'Operator wage', apply: (q, m) => ({ ...q, wageMonthly: q.wageMonthly * m }) },
    { label: 'CapEx', apply: (q, m) => ({ ...q, scnCapexOverrun: ((1 + q.scnCapexOverrun / 100) * m - 1) * 100 }) },
    { label: 'Maintenance % of CapEx', apply: (q, m) => ({ ...q, maintPct: q.maintPct * m }) },
    { label: 'Technician headcount', apply: (q, m) => ({ ...q, techs: q.techs * m }) },
    { label: 'Year-1 ramp-up', apply: (q, m) => ({ ...q, y1Realisation: Math.min(100, q.y1Realisation * m) }) },
    { label: 'Production value', apply: (q, m) => ({ ...q, prodValueCr: q.prodValueCr * m }) },
    { label: 'Power tariff', apply: (q, m) => ({ ...q, tariff: q.tariff * m }) },
  ];
  return {
    base,
    rows: drivers
      .map((dr) => {
        const lo = quickNpv(dr.apply(p, 1 - f));
        const hi = quickNpv(dr.apply(p, 1 + f));
        return { label: dr.label, lo, hi, spread: Math.abs(hi - lo) };
      })
      .sort((a, b) => b.spread - a.spread),
  };
}

export function breakEvenCopqRealisation(p) {
  let lo = 0, hi = 3;
  if (quickNpv({ ...p, scnCopqRealisation: 0 }) > 0) return 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (quickNpv({ ...p, scnCopqRealisation: mid * 100 }) > 0) hi = mid; else lo = mid;
  }
  return hi;
}

export function alternatives(p) {
  const opts = [
    { id: 'semi', label: 'Semi-automatic (erector + vision + jigs)', o: { cxTurret: 0, cxErector: 28, cxVision: 22, cxCollate: 0, cxTransfer: 5, cxControls: 0, cxCheckweigh: 0, cxAccumulator: 0, cxUtilities: 6, cxEnclosure: 5, cxCommission: 2, cxInstall: 2, cxData: 0, opsDisplaced: 3.0, copqAfter: 1.6, techs: 0, handlers: 0, powerKw: 5, trainingL: 4, amcL: 1 }, folding: 4.5 },
    { id: 'delta', label: 'Delta-robot cell', o: { cxTurret: 160, cxErector: 28, cxVision: 30, cxCollate: 22, cxTransfer: 18, cxControls: 20, cxCheckweigh: 12, cxAccumulator: 12, cxUtilities: 8, cxEnclosure: 5, cxCommission: 8, cxInstall: 5, cxData: 2, maintPct: 6, powerKw: 20, copqAfter: 0.8, amcL: 6 }, folding: 0 },
    { id: 'turret', label: 'Cam-turret cell (recommended)', o: {}, folding: 0 },
  ];
  return opts.map((opt) => {
    const q = { ...p, ...opt.o };
    if (opt.o.opsDisplaced !== undefined) q.opsPerShift = opt.o.opsDisplaced;
    const f = finance(q);
    return { id: opt.id, label: opt.label, capex: capexOf(q).total, copqAfter: q.copqAfter, npv: f.npv, pb: f.pb, irr: f.irr, folding: opt.folding };
  });
}

export function monteCarloNpv(p, n = 2000, seed = 42, spread = {}) {
  const rng = mulberry32(seed);
  const s = { copqLo: 50, copqMode: 100, copqHi: 110, capexHi: 30, speedHi: 15, dtHi: 5, wage: 10, ...spread };
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const q = {
      ...p,
      scnCopqRealisation: triangularDraw(rng, s.copqLo, s.copqMode, s.copqHi),
      scnCapexOverrun: triangularDraw(rng, 0, 5, s.capexHi),
      scnSpeedDrop: triangularDraw(rng, 0, 2, s.speedHi),
      scnExtraDowntime: triangularDraw(rng, 0, 1, s.dtHi),
      wageMonthly: p.wageMonthly * (1 + (rng() * 2 - 1) * (s.wage / 100)),
    };
    out[i] = quickNpv(q) / CR;
  }
  const sorted = Array.from(out).sort((a, b) => a - b);
  const q = (x) => sorted[Math.min(n - 1, Math.floor(x * n))];
  const min = sorted[0], max = sorted[n - 1];
  const bins = 30, w = (max - min) / bins || 1;
  const hist = Array.from({ length: bins }, (_, i) => ({ x: min + (i + 0.5) * w, lo: min + i * w, count: 0 }));
  sorted.forEach((v) => { hist[Math.min(bins - 1, Math.floor((v - min) / w))].count++; });
  return { p10: q(0.1), p50: q(0.5), p90: q(0.9), mean: sorted.reduce((a, b) => a + b, 0) / n, pLoss: sorted.filter((v) => v < 0).length / n, min, max, hist, n };
}
