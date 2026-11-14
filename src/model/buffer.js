import { mulberry32, expDraw, lognormalDraw } from './rng.js';

// Second-by-second Monte Carlo of the accumulator between primary and cell.
// Returns the % of run time the primary machine is blocked by a full buffer.
function stopMask(rng, T, ratePerHr, median, sigma) {
  const m = new Uint8Array(T);
  if (ratePerHr <= 0) return m;
  let t = 0;
  while (t < T) {
    t += expDraw(rng, 3600 / ratePerHr);
    const s = Math.floor(t);
    const d = Math.floor(lognormalDraw(rng, median, sigma));
    for (let i = s; i < Math.min(T, s + d); i++) m[i] = 1;
  }
  return m;
}

export function buildStopProfile(p, days = 7, seed = 7) {
  const T = Math.floor(days * 86400);
  const rng = mulberry32(seed);
  const micro = stopMask(rng, T, p.cellMicroRate, p.cellMicroMedian, p.stopSigma);
  const minor = stopMask(rng, T, p.cellMinorRate, p.cellMinorMedian, p.stopSigma);
  const prim = stopMask(rng, T, p.primaryStopRate, p.primaryStopMedian, p.stopSigma);
  const cell = new Uint8Array(T);
  let cellDown = 0, primDown = 0;
  for (let i = 0; i < T; i++) {
    cell[i] = micro[i] | minor[i];
    cellDown += cell[i];
    primDown += prim[i];
  }
  return { T, cell, prim, cellDownPct: (cellDown / T) * 100, primDownPct: (primDown / T) * 100 };
}

export function simulateBlocking(profile, B, inflowPerMin, cellRatePerMin) {
  const { T, cell, prim } = profile;
  const inflow = inflowPerMin / 60, out = cellRatePerMin / 60;
  let buf = 0, blocked = 0;
  for (let t = 0; t < T; t++) {
    const inn = prim[t] ? 0 : inflow;
    const o = cell[t] ? 0 : out;
    let nb = buf + inn - o;
    if (nb > B) { blocked += (nb - B) / inflow; nb = B; }
    buf = nb < 0 ? 0 : nb;
  }
  return (blocked / T) * 100;
}

export function bufferCurve(p, demandStripsPerMin, cellMaxStripsPerMin, sizes, days = 7, seed = 7) {
  const prof = buildStopProfile(p, days, seed);
  const rows = sizes.map((B) => ({
    buffer: B,
    withHeadroom: +simulateBlocking(prof, B, demandStripsPerMin, cellMaxStripsPerMin).toFixed(3),
    noHeadroom: +simulateBlocking(prof, B, demandStripsPerMin, demandStripsPerMin).toFixed(3),
  }));
  return { rows, cellDownPct: prof.cellDownPct, primDownPct: prof.primDownPct };
}

// Quick estimate for the live model (shorter horizon, cached by caller).
export function blockingAt(p, B, demand, cellMax, days = 3, seed = 11) {
  const prof = buildStopProfile(p, days, seed);
  return { blockedPct: simulateBlocking(prof, B, demand, cellMax), cellDownPct: prof.cellDownPct };
}
