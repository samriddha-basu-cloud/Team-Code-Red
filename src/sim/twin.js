import { derive } from '../model/engine.js';
import { mulberry32, expDraw, lognormalDraw } from '../model/rng.js';

// Real-time discrete-time digital twin of the primary machine → buffer → automated cell (or manual line).
export class Twin {
  constructor(params, { mode = 'auto', seed = 2026 } = {}) {
    this.mode = mode;
    this.seed = seed;
    this.listeners = new Set();
    this.setParams(params, true);
    this.reset();
  }

  setParams(p, silent = false) {
    this.p = p;
    this.d = derive(p);
    if (!silent && this.events) this.log('info', 'Parameters updated live');
  }

  reset(opts = {}) {
    if (opts.mode) this.mode = opts.mode;
    if (opts.seed !== undefined) this.seed = opts.seed;
    this.rng = mulberry32(this.seed);
    const p = this.p;
    this.t = 0;
    this.buffer = 0;
    this.collate = 0;
    this.turretAngle = 0;
    this.primary = { state: 'run', downUntil: 0, reason: '', nextStop: this.nextIn(p.primaryStopRate), acc: 0, soft: false, rate: 0 };
    this.cell = {
      state: 'run', downUntil: 0, downSince: 0, reason: '', acc: 0, rate: 0, hold: false, holdReason: '',
      nextMicro: this.nextIn(p.cellMicroRate), nextMinor: this.nextIn(p.cellMinorRate), nextExtra: this.nextIn(1),
    };
    this.gsmUntil = 0;
    this.burstLeft = 0;
    this.shiftIdx = -1;
    this.present = 1;
    this.rejectStreak = 0;
    this.lastStrips = [];
    this.m = {
      tTotal: 0, tRun: 0, tBlocked: 0, tPrimDown: 0, tPlanned: 0, tCellDown: 0, tStarved: 0, tSoft: 0,
      stripsMade: 0, stripsRejected: 0, stripsPacked: 0, cartonsGood: 0, cartonsRejected: 0,
      sachetsMade: 0, sachetsRejected: 0, cellStops: 0, primStops: 0, cellDownSum: 0, blockedEvents: 0,
    };
    this.cartonTimes = [];
    this.series = [];
    this.lastSample = -Infinity;
    this.sampleEvery = 5;
    this.events = [];
    this.tokens = { strips: [], cartons: [] };
    this.animate = true;
    this.log('info', `Twin reset · ${this.mode === 'auto' ? 'Automated cell' : 'Manual baseline'} mode · seed ${this.seed}`);
  }

  nextIn(ratePerHr) { return ratePerHr > 0 ? this.t + expDraw(this.rng, 3600 / ratePerHr) : Infinity; }
  log(sev, msg) {
    this.events.unshift({ t: this.t, sev, msg });
    if (this.events.length > 400) this.events.length = 400;
  }

  inject(kind) {
    const c = this.cell, pr = this.primary;
    switch (kind) {
      case 'cellJam': this.stopCell(45, 'Jam at S5 fold turret (injected)'); break;
      case 'blankShortage': this.stopCell(240, 'Carton blank shortage at S7 (injected)'); break;
      case 'visionFault': this.stopCell(120, 'Vision camera fault at S3 (injected)'); break;
      case 'primaryStop': pr.downUntil = this.t + 90; pr.reason = 'Reel splice on primary (injected)'; this.m.primStops++; this.log('warn', 'Primary stopped 90 s: reel splice (injected)'); break;
      case 'gsm': this.gsmUntil = this.t + 600; this.log('warn', 'Laminate GSM drift for 10 min: primary −15% speed, defects ×4 (injected)'); break;
      case 'sealBurst': this.burstLeft = 10; this.log('warn', 'Seal defect burst: next 10 strips faulty (injected)'); break;
      case 'clearAll': c.downUntil = this.t; c.hold = false; pr.downUntil = this.t; this.gsmUntil = 0; this.burstLeft = 0; this.log('info', 'All faults cleared'); break;
      default: break;
    }
  }

  setHold(on, reason = 'Maintenance hold') {
    this.cell.hold = on;
    this.cell.holdReason = reason;
    this.log(on ? 'warn' : 'info', on ? `Cell on hold: ${reason}` : 'Cell hold released');
  }

  stopCell(sec, reason) {
    const c = this.cell;
    if (c.downUntil <= this.t) { c.downSince = this.t; this.m.cellStops++; }
    c.downUntil = Math.max(c.downUntil, this.t + sec);
    c.reason = reason;
    this.log(sec >= 120 ? 'crit' : 'warn', `Cell stopped ~${Math.round(sec)} s: ${reason}`);
  }

  step(dt) {
    const p = this.p, d = this.d, rng = this.rng;
    const auto = this.mode === 'auto';
    const shiftLen = p.shiftHours * 3600;
    const tin = this.t % shiftLen;
    const sIdx = Math.floor(this.t / shiftLen);
    if (sIdx !== this.shiftIdx) {
      this.shiftIdx = sIdx;
      this.present = auto ? 1 : 1 - (p.absenteeism / 100) * (0.2 + 0.6 * rng());
      this.log('info', `Shift ${(sIdx % 3) + 1} started${auto ? '' : ` · ${(p.opsPerShift * this.present).toFixed(1)} operators effective`}`);
    }
    const inPlanned = tin >= shiftLen - p.plannedStopMin * 60;

    // ---------- primary state
    const pr = this.primary;
    const prevPrim = pr.state;
    let primState;
    if (pr.downUntil > this.t) primState = 'down';
    else if (inPlanned) primState = 'planned';
    else if (this.t >= pr.nextStop) {
      const dur = lognormalDraw(rng, p.primaryStopMedian, p.stopSigma);
      pr.downUntil = this.t + dur; pr.reason = 'Primary machine stop'; this.m.primStops++;
      pr.nextStop = this.t + dur + expDraw(rng, 3600 / Math.max(1e-6, p.primaryStopRate));
      this.log('warn', `Primary stopped ${Math.round(dur)} s (own fault)`);
      primState = 'down';
    } else primState = 'run';
    if (primState === 'planned' && prevPrim !== 'planned') this.log('info', `Planned stop ${p.plannedStopMin} min (changeover / CIP)`);

    // soft slowdown with hysteresis
    const cap = auto ? p.bufferCapacity : p.pileupCapacity;
    const frac = cap > 0 ? this.buffer / cap : 0;
    if (auto && !pr.soft && cap > 0 && frac * 100 >= p.bandSoft) { pr.soft = true; this.log('warn', `Soft slowdown: primary to ${p.softSpeed}% (buffer ${Math.round(frac * 100)}%)`); }
    if (pr.soft && (frac * 100 < p.bandSoft - 10 || !auto)) { pr.soft = false; this.log('info', 'Soft slowdown released'); }
    const gsm = this.gsmUntil > this.t;
    const nameplateStripsS = p.primarySpeed / p.sachetsPerStrip / 60;
    const baseSpeed = auto ? 1 : p.throttledSpeed / p.primarySpeed;
    const perf = (auto ? p.perfCell : p.perfManual) / 100;
    pr.rate = nameplateStripsS * baseSpeed * perf * (1 - p.scnSpeedDrop / 100) * (pr.soft ? p.softSpeed / 100 : 1) * (gsm ? 0.85 : 1);

    // ---------- cell state
    const c = this.cell;
    let cellUp = true;
    if (auto) {
      if (c.hold) { cellUp = false; c.state = 'hold'; }
      else {
        if (c.downUntil <= this.t) {
          if (this.t >= c.nextMicro) { this.stopCell(lognormalDraw(rng, p.cellMicroMedian, p.stopSigma), 'Micro-stop (jam / misfeed)'); c.nextMicro = c.downUntil + expDraw(rng, 3600 / Math.max(1e-6, p.cellMicroRate)); }
          else if (this.t >= c.nextMinor) { this.stopCell(lognormalDraw(rng, p.cellMinorMedian, p.stopSigma), 'Longer stop (blank feed / glue)'); c.nextMinor = c.downUntil + expDraw(rng, 3600 / Math.max(1e-6, p.cellMinorRate)); }
          else if (p.scnExtraDowntime > 0 && this.t >= c.nextExtra) { this.stopCell((p.scnExtraDowntime / 100) * 3600, 'Unplanned breakdown (scenario C)'); c.nextExtra = c.downUntil + expDraw(rng, 3600); }
        }
        if (c.downUntil > this.t) { cellUp = false; c.state = 'down'; }
      }
      if (!cellUp && c.state === 'down' && c.downUntil - this.t <= dt) { this.m.cellDownSum += this.t + dt - c.downSince; this.log('ok', `Cell restarted after ${Math.round(this.t + dt - c.downSince)} s`); }
    }
    const demandS = d.stripsPerMin / 60;
    const cellMaxS = d.cellMax / 60;
    if (auto) {
      if (cap <= 0) c.rate = cellMaxS;
      else if (frac * 100 < p.bandLow) c.rate = Math.min(cellMaxS, Math.max(demandS, pr.rate));
      else if (frac * 100 < p.bandMid) c.rate = Math.min(cellMaxS, demandS + (cellMaxS - demandS) / 2);
      else c.rate = cellMaxS;
    } else {
      const fatigue = 1 - (p.fatigueDrop / 100) * (tin / shiftLen);
      c.rate = ((p.opsPerShift * this.present * 60) / p.manualCycle) * p.stripsPerCarton / 60 * fatigue;
    }

    // ---------- flow: cell pulls first, then primary pushes
    let pulled = 0;
    if (cellUp) {
      c.acc += c.rate * dt;
      while (c.acc >= 1 && this.buffer > 0) { this.buffer--; c.acc -= 1; pulled++; this.processStrip(); }
      if (this.buffer === 0 && c.acc > 1) c.acc = 1;
      if (pulled > 0) c.lastPull = this.t;
      c.state = this.buffer === 0 && pulled === 0 && this.t - (c.lastPull || 0) > 3 ? 'starved' : 'run';
    }
    let blocked = false;
    if (primState === 'run') {
      pr.acc += pr.rate * dt;
      const capEff = cap + 2;
      while (pr.acc >= 1) {
        if (this.buffer >= capEff) { blocked = true; pr.acc = Math.min(pr.acc, 1); break; }
        this.buffer++; pr.acc -= 1;
        this.m.stripsMade++; this.m.sachetsMade += p.sachetsPerStrip;
        if (this.animate) this.tokens.strips.push({ t0: this.t, dur: 1.6, stage: 1 });
      }
      if (blocked) primState = 'blocked';
    }
    if (primState === 'blocked' && prevPrim !== 'blocked') { this.m.blockedEvents++; this.log('crit', 'Primary blocked: buffer full'); }
    if (prevPrim === 'blocked' && primState !== 'blocked') this.log('ok', 'Primary unblocked');
    if (prevPrim === 'down' && primState !== 'down' && pr.downUntil <= this.t) this.log('ok', 'Primary restarted');
    pr.state = primState;
    this.turretAngle = (this.turretAngle + (pulled / Math.max(1, p.turretHeads)) * 360) % 360;

    // ---------- time accounting
    const m = this.m;
    m.tTotal += dt;
    if (primState === 'run') m.tRun += dt;
    else if (primState === 'blocked') m.tBlocked += dt;
    else if (primState === 'down') m.tPrimDown += dt;
    else m.tPlanned += dt;
    if (auto && !cellUp) m.tCellDown += dt;
    if (cellUp && c.state === 'starved') m.tStarved += dt;
    if (pr.soft) m.tSoft += dt;

    this.t += dt;
    while (this.cartonTimes.length && this.cartonTimes[0] < this.t - 60) this.cartonTimes.shift();
    if (this.animate) this.pruneTokens();
    if (this.t - this.lastSample >= this.sampleEvery) { this.sample(); this.lastSample = this.t; }
  }

  processStrip() {
    const p = this.p, rng = this.rng, auto = this.mode === 'auto';
    const copq = (auto ? p.copqAfter : p.copqBefore) / 100;
    const split = auto ? p.rejectSplit / 100 : 0.5;
    let pStrip = copq * split * (this.gsmUntil > this.t ? 4 : 1);
    let defect = rng() < pStrip;
    if (this.burstLeft > 0) { defect = true; this.burstLeft--; }
    if (this.animate) this.tokens.strips.push({ t0: this.t, dur: 2.2, stage: 2, defect });
    if (defect) {
      this.m.stripsRejected++; this.m.sachetsRejected += p.sachetsPerStrip;
      this.rejectStreak++;
      if (this.rejectStreak === 3) this.log('warn', '3 strips rejected in a row: check primary sealing jaws');
      return;
    }
    this.rejectStreak = 0;
    this.m.stripsPacked++;
    this.collate++;
    if (this.collate >= p.stripsPerCarton) {
      this.collate = 0;
      const pCarton = copq * (1 - split);
      const rej = rng() < pCarton;
      if (rej) { this.m.cartonsRejected++; this.m.sachetsRejected += p.sachetsPerStrip * p.stripsPerCarton; }
      else { this.m.cartonsGood++; this.cartonTimes.push(this.t); }
      if (this.animate) this.tokens.cartons.push({ t0: this.t, dur: 4, reject: rej });
    }
  }

  pruneTokens() {
    for (const k of ['strips', 'cartons']) {
      const arr = this.tokens[k];
      while (arr.length && this.t - arr[0].t0 > arr[0].dur + 0.2) arr.shift();
      if (arr.length > 90) arr.splice(0, arr.length - 90);
    }
  }

  kpis() {
    const m = this.m, p = this.p;
    const A = m.tTotal > 0 ? m.tRun / m.tTotal : 0;
    const P = m.tRun > 0 ? m.sachetsMade / ((m.tRun * p.primarySpeed) / 60) : 0;
    const Q = m.sachetsMade > 0 ? 1 - m.sachetsRejected / m.sachetsMade : 1;
    const cap = this.mode === 'auto' ? p.bufferCapacity : p.pileupCapacity;
    return {
      A, P, Q, OEE: A * P * Q,
      cpm: this.cartonTimes.length * (this.t >= 60 ? 1 : 60 / Math.max(1, this.t)),
      bufferPct: cap > 0 ? Math.min(100, (this.buffer / cap) * 100) : 0,
      blockedPct: m.tTotal > 0 ? (m.tBlocked / m.tTotal) * 100 : 0,
      cellAvail: m.tTotal > 0 ? 1 - m.tCellDown / m.tTotal : 1,
      copq: (1 - Q) * 100,
      mttr: m.cellStops > 0 ? m.cellDownSum / Math.max(1, m.cellStops) / 60 : 0,
      primaryRpm: this.primary.rate * p.sachetsPerStrip * 60,
    };
  }

  sample() {
    const k = this.kpis();
    this.series.push({ t: this.t, buffer: +k.bufferPct.toFixed(1), cpm: +k.cpm.toFixed(1), oee: +(k.OEE * 100).toFixed(2), A: +(k.A * 100).toFixed(2), P: +(k.P * 100).toFixed(2), Q: +(k.Q * 100).toFixed(2), speed: Math.round(k.primaryRpm) });
    if (this.series.length > 360) this.series.shift();
  }

  alarms() {
    const out = [];
    const c = this.cell, pr = this.primary, k = this.kpis(), p = this.p;
    if (this.mode === 'auto') {
      if (c.state === 'hold') out.push({ sev: 'warn', msg: `Cell on hold: ${c.holdReason}` });
      if (c.state === 'down') { const s = this.t - c.downSince; out.push({ sev: s > 60 ? 'crit' : 'warn', msg: `Cell stopped ${Math.round(s)} s: ${c.reason}` }); }
    }
    if (pr.state === 'blocked') out.push({ sev: 'crit', msg: 'Primary blocked: buffer full' });
    if (pr.state === 'down') out.push({ sev: 'warn', msg: `Primary down: ${pr.reason}` });
    if (pr.state === 'planned') out.push({ sev: 'info', msg: 'Planned stop in progress' });
    if (k.bufferPct >= 90 && pr.state !== 'blocked') out.push({ sev: 'warn', msg: `Buffer ${Math.round(k.bufferPct)}% full` });
    if (pr.soft) out.push({ sev: 'warn', msg: `Soft slowdown active (${p.softSpeed}%)` });
    if (this.gsmUntil > this.t) out.push({ sev: 'warn', msg: 'Laminate GSM drift: speed −15%, defects ×4' });
    if (this.rejectStreak >= 3) out.push({ sev: 'warn', msg: `${this.rejectStreak} consecutive strip rejects` });
    if (this.t > 3600 && k.OEE * 100 < p.oeeTarget) out.push({ sev: 'info', msg: `OEE ${(k.OEE * 100).toFixed(1)}% below ${p.oeeTarget}% target` });
    return out;
  }

  runFor(seconds, dt = 0.5) {
    const anim = this.animate;
    this.animate = false;
    this.tokens.strips = []; this.tokens.cartons = [];
    const prevSample = this.sampleEvery;
    this.sampleEvery = Math.max(prevSample, seconds / 300);
    const end = this.t + seconds;
    while (this.t < end) this.step(dt);
    this.sampleEvery = prevSample;
    this.animate = anim;
    this.log('info', `Fast-forwarded ${seconds >= 3600 ? (seconds / 3600).toFixed(0) + ' h' : seconds + ' s'}`);
  }
}
