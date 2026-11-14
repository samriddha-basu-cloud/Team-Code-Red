// Every variable and constant that drives the control tower and the digital twin.
// kind: 'const' = fixed by the case or physics (locked until "Unlock constants" is on)
//       'var'   = a decision or assumption you can tune freely
// type: 'num' (default) | 'bool'

export const GROUPS = [
  { id: 'line', label: 'Line & product', icon: 'Package' },
  { id: 'manual', label: 'Manual baseline', icon: 'Users' },
  { id: 'cell', label: 'Cell design & kinematics', icon: 'Cog' },
  { id: 'capacity', label: 'Station rated capacities', icon: 'Gauge' },
  { id: 'control', label: 'Buffer control bands', icon: 'SlidersHorizontal' },
  { id: 'reliability', label: 'Stops & reliability', icon: 'Activity' },
  { id: 'quality', label: 'Quality', icon: 'ShieldCheck' },
  { id: 'labour', label: 'People & wages', icon: 'HardHat' },
  { id: 'capex', label: 'CapEx breakdown (₹ lakh)', icon: 'Landmark' },
  { id: 'opex', label: 'Running costs', icon: 'Receipt' },
  { id: 'finance', label: 'Finance assumptions', icon: 'LineChart' },
  { id: 'scenario', label: 'Stress scenario modifiers', icon: 'TriangleAlert' },
];

const P = (group, key, label, unit, def, min, max, step, kind = 'var', note = '', type = 'num') =>
  ({ group, key, label, unit, def, min, max, step, kind, note, type });

export const PARAMS = [
  // ---------- Line & product
  P('line', 'primarySpeed', 'Primary machine nameplate speed', 'sachets/min', 1500, 600, 2400, 10, 'var', 'Case: 1,500 sachets/min'),
  P('line', 'sachetsPerStrip', 'Sachets per strip', 'sachets', 15, 5, 30, 1, 'const', 'Case: 15 sachets per 975 mm strip'),
  P('line', 'stripsPerCarton', 'Strips per carton', 'strips', 2, 1, 4, 1, 'const', 'Case nesting rule: 2 strips (30 sachets)'),
  P('line', 'sachetLength', 'Sachet length (along strip)', 'mm', 65, 30, 120, 1, 'const'),
  P('line', 'sachetWidth', 'Sachet width', 'mm', 63, 30, 120, 1, 'const'),
  P('line', 'sachetThickness', 'Filled sachet thickness', 'mm', 6.5, 2, 14, 0.1, 'var', 'Assumption: measure 500 samples before RFQ'),
  P('line', 'cartonL', 'Carton outer length', 'mm', 280, 150, 500, 1, 'const'),
  P('line', 'cartonW', 'Carton outer width', 'mm', 92, 50, 200, 1, 'const'),
  P('line', 'cartonH', 'Carton outer height', 'mm', 68, 40, 200, 1, 'const'),
  P('line', 'boardThickness', 'Corrugated board thickness', 'mm', 3, 1, 6, 0.5, 'const', '3-ply corrugated'),
  P('line', 'sachetsPerPanel', 'Sachets per fold panel', 'sachets', 4, 2, 8, 1, 'var', 'Fan-fold pattern 4-4-4-3'),
  P('line', 'loopAllowance', 'Soft-loop allowance per panel', 'mm', 10, 0, 30, 1, 'var'),
  P('line', 'hoursPerYear', 'Operating hours per year', 'h', 8640, 4000, 8760, 24, 'const', 'Case: 24/7/30 schedule'),
  P('line', 'shiftHours', 'Shift length', 'h', 8, 6, 12, 1, 'const'),
  P('line', 'prodValueCr', 'Monthly production value', '₹ Cr', 12, 2, 50, 0.5, 'const', 'Case: ₹12 Cr monthly base'),

  // ---------- Manual baseline
  P('manual', 'manualCycle', 'Manual cycle time per carton', 's', 9, 6, 14, 0.5, 'var', 'Case: 8–10 s'),
  P('manual', 'opsPerShift', 'Active operators per shift', 'people', 7.5, 2, 15, 0.5, 'const', 'Case: 7.5'),
  P('manual', 'shifts', 'Shifts per day', 'shifts', 3, 1, 3, 1, 'const'),
  P('manual', 'absenteeism', 'Absenteeism', '%', 14, 0, 40, 1, 'var', 'Case: ~14%'),
  P('manual', 'turnover', 'Annual workforce turnover', '%', 35, 0, 80, 1, 'var', 'Case: 35%'),
  P('manual', 'throttledSpeed', 'Throttled primary speed (manual)', 'sachets/min', 1200, 600, 2000, 10, 'var', 'Case: 1,200 sachets/min'),
  P('manual', 'fatigueDrop', 'Operator pace drop by end of shift', '%', 15, 0, 40, 1, 'var', 'Wrist fatigue'),
  P('manual', 'pileupCapacity', 'Belt pile-up capacity (manual)', 'strips', 60, 0, 300, 5, 'var'),
  P('manual', 'perfManual', 'Inherent performance, manual line', '%', 93.6, 70, 100, 0.1, 'var', 'Before the throttle'),

  // ---------- Cell design & kinematics
  P('cell', 'turretHeads', 'Fold turret heads', 'heads', 12, 4, 24, 1, 'var'),
  P('cell', 'turretMaxRpm', 'Turret max speed', 'rpm', 10, 4, 20, 0.5, 'var'),
  P('cell', 'foldWindow', 'Fold window per head', '°', 150, 60, 270, 5, 'var'),
  P('cell', 'bladeTipPath', 'Fold blade tip path', 'mm', 410, 100, 800, 10, 'var'),
  P('cell', 'stripPitchPrimary', 'Strip pitch on primary conveyor', 'mm', 1100, 980, 2000, 10, 'var', 'Assumption'),
  P('cell', 'decelDistance', 'Vacuum-belt deceleration distance', 'mm', 300, 100, 800, 10, 'var'),
  P('cell', 'pocketPitch', 'Pocket conveyor pitch', 'mm', 100, 70, 200, 5, 'var'),
  P('cell', 'cartonPitch', 'Carton chain pitch', 'mm', 150, 100, 300, 5, 'var'),
  P('cell', 'bufferCapacity', 'FIFO accumulator capacity', 'strips', 150, 0, 600, 5, 'var', 'Chosen from simulation'),
  P('cell', 'perfCell', 'Inherent performance, automated cell', '%', 94.4, 70, 100, 0.1, 'var'),
  P('cell', 'maxAccelG', 'Max safe acceleration on strip', 'g', 0.6, 0.1, 3, 0.05, 'var', 'Limit used for kinematics checks'),

  // ---------- Station capacities
  P('capacity', 'capTransfer', 'S2 Flying transfer', 'strips/min', 133, 60, 300, 1),
  P('capacity', 'capVision', 'S3 Vision inspection', 'strips/min', 240, 60, 400, 1),
  P('capacity', 'capReject', 'S4 Strip reject', 'strips/min', 200, 60, 400, 1),
  P('capacity', 'capCollation', 'S6 Collation', 'cartons/min', 60, 20, 150, 1),
  P('capacity', 'capErector', 'S7 Carton erector', 'cartons/min', 63, 20, 150, 1),
  P('capacity', 'capTopload', 'S8 Top-load', 'cartons/min', 67, 20, 150, 1),
  P('capacity', 'capCloser', 'S9 Tuck-in closer', 'cartons/min', 63, 20, 150, 1),
  P('capacity', 'capCheckweigher', 'S10 Checkweigher & coder', 'cartons/min', 100, 20, 200, 1),

  // ---------- Buffer control
  P('control', 'bandLow', 'Low band (cell matches line below)', '% full', 20, 0, 90, 1),
  P('control', 'bandMid', 'Mid band (cell at full speed above)', '% full', 70, 10, 100, 1),
  P('control', 'bandSoft', 'Soft-slowdown trigger', '% full', 95, 50, 100, 1),
  P('control', 'softSpeed', 'Primary speed during soft slowdown', '%', 90, 50, 100, 1),

  // ---------- Reliability
  P('reliability', 'cellMicroRate', 'Cell micro-stops', 'per hour', 4, 0, 30, 0.1),
  P('reliability', 'cellMicroMedian', 'Micro-stop median duration', 's', 25, 3, 300, 1),
  P('reliability', 'cellMinorRate', 'Cell longer stops', 'per hour', 0.3, 0, 5, 0.05),
  P('reliability', 'cellMinorMedian', 'Longer stop median duration', 's', 150, 30, 1800, 5),
  P('reliability', 'primaryStopRate', 'Primary machine own stops', 'per hour', 2, 0, 20, 0.1),
  P('reliability', 'primaryStopMedian', 'Primary stop median duration', 's', 60, 5, 900, 5),
  P('reliability', 'stopSigma', 'Stop-duration spread (lognormal σ)', '', 0.6, 0.1, 1.5, 0.05, 'const'),
  P('reliability', 'plannedStopMin', 'Planned stop per shift (changeover, CIP, reels)', 'min', 39, 0, 120, 1),
  P('reliability', 'mttrTarget', 'MTTR target', 'min', 10, 1, 60, 1),
  P('reliability', 'availTarget', 'Cell availability target', '%', 98, 80, 100, 0.5),

  // ---------- Quality
  P('quality', 'copqBefore', 'COPQ today (manual)', '%', 3.2, 0, 10, 0.1, 'const', 'Case: 3.2%'),
  P('quality', 'copqAfter', 'COPQ with automated cell', '%', 0.5, 0, 5, 0.05, 'var', 'Case target: 0.5%'),
  P('quality', 'rejectSplit', 'Share of defects caught at strip level', '%', 80, 0, 100, 5, 'var', 'Rest caught at carton checkweigher'),
  P('quality', 'oeeTarget', 'Target line OEE', '%', 82, 50, 100, 0.5, 'const', 'Case: 82%'),

  // ---------- People & wages
  P('labour', 'wageMonthly', 'Operator fully loaded cost', '₹/month', 20000, 10000, 60000, 500, 'var', 'UP semi-skilled minimum ₹15,059 + statutory'),
  P('labour', 'wageEsc', 'Wage escalation', '%/yr', 6, 0, 15, 0.5),
  P('labour', 'techs', 'Cell technicians (incl. relief)', 'people', 4, 0, 12, 1),
  P('labour', 'techWage', 'Technician cost', '₹/month', 35000, 15000, 100000, 500),
  P('labour', 'handlers', 'Blank feeders / material handlers', 'people', 4, 0, 12, 1),
  P('labour', 'trainingL', 'People programme (one-time)', '₹ lakh', 10, 0, 50, 0.5),
  P('labour', 'overtimeRate', 'Fallback overtime rate', '₹/h', 150, 50, 500, 10, 'const'),

  // ---------- CapEx breakdown
  P('capex', 'cxTurret', '12-head fold turret, servo, cams', '₹ L', 62, 0, 300, 1),
  P('capex', 'cxErector', 'Carton erector + magazine', '₹ L', 28, 0, 150, 1),
  P('capex', 'cxVision', 'Vision: 3D, thermal, line-scan', '₹ L', 22, 0, 150, 1),
  P('capex', 'cxCollate', 'Collation, top-load, closer', '₹ L', 22, 0, 150, 1),
  P('capex', 'cxTransfer', 'Transfer, pocket conveyor, reject', '₹ L', 18, 0, 150, 1),
  P('capex', 'cxControls', 'Controls, HMI, safety, guarding', '₹ L', 16, 0, 100, 1),
  P('capex', 'cxCheckweigh', 'Checkweigher, coder, OCR', '₹ L', 12, 0, 100, 1),
  P('capex', 'cxAccumulator', 'FIFO accumulator (integration)', '₹ L', 12, 0, 100, 1),
  P('capex', 'cxUtilities', 'Electrical & pneumatic hook-ups', '₹ L', 6, 0, 50, 1),
  P('capex', 'cxEnclosure', 'Dehumidified enclosure', '₹ L', 5, 0, 50, 1),
  P('capex', 'cxCommission', 'FAT, SAT, commissioning', '₹ L', 5, 0, 50, 1),
  P('capex', 'cxInstall', 'Mechanical install & tie-in', '₹ L', 4, 0, 50, 1),
  P('capex', 'cxData', 'OEE data link & first spares', '₹ L', 3, 0, 50, 1),

  // ---------- Running costs
  P('opex', 'maintPct', 'Maintenance & spares', '% of CapEx', 4, 0, 15, 0.5),
  P('opex', 'maintEsc', 'Maintenance escalation', '%/yr', 10, 0, 30, 1),
  P('opex', 'powerKw', 'Average power draw', 'kW', 12, 1, 60, 0.5),
  P('opex', 'tariff', 'Power tariff', '₹/kWh', 9, 3, 20, 0.25),
  P('opex', 'amcL', 'Vision & software support', '₹ L/yr', 3, 0, 20, 0.5),
  P('opex', 'consumablesL', 'Hot-melt & consumables', '₹ L/yr', 2, 0, 20, 0.5),
  P('opex', 'insurancePct', 'Insurance', '% of CapEx', 0.5, 0, 3, 0.1),

  // ---------- Finance
  P('finance', 'discountRate', 'Discount rate', '%', 12, 4, 25, 0.5, 'const', 'Case: 12%'),
  P('finance', 'years', 'Project life', 'years', 7, 3, 15, 1),
  P('finance', 'salvagePct', 'Salvage value', '% of CapEx', 10, 0, 40, 1),
  P('finance', 'y1Realisation', 'Year-1 savings realised (ramp-up)', '%', 75, 20, 100, 5),
  P('finance', 'taxRate', 'Corporate tax rate', '%', 25.17, 0, 40, 0.01),
  P('finance', 'wdvRate', 'Tax depreciation (WDV)', '%', 15, 0, 40, 1),
  P('finance', 'contribMargin', 'Contribution margin on extra volume', '%', 20, 0, 60, 1, 'var', 'Upside only'),
  P('finance', 'includeUpside', 'Include throughput upside in NPV', '', false, 0, 1, 1, 'var', 'Demand-dependent', 'bool'),

  // ---------- Scenario modifiers
  P('scenario', 'scnSpeedDrop', 'A · Primary speed drop (GSM variation)', '%', 0, 0, 50, 1, 'var', 'Case scenario A = 15%'),
  P('scenario', 'scnCapexOverrun', 'B · CapEx overrun', '%', 0, 0, 100, 1, 'var', 'Case scenario B = 25%'),
  P('scenario', 'scnExtraDowntime', 'C · Extra unplanned downtime', '%', 0, 0, 30, 0.5, 'var', 'Case scenario C = 5%'),
  P('scenario', 'scnCopqRealisation', 'COPQ gain realised', '%', 100, 0, 150, 5, 'var'),
];

export const PARAM_MAP = Object.fromEntries(PARAMS.map((p) => [p.key, p]));
export const DEFAULTS = Object.fromEntries(PARAMS.map((p) => [p.key, p.def]));

export const PRESETS = {
  base: { label: 'Base case', values: { scnSpeedDrop: 0, scnCapexOverrun: 0, scnExtraDowntime: 0, scnCopqRealisation: 100 } },
  A: { label: 'A · Speed −15%', values: { scnSpeedDrop: 15, scnCapexOverrun: 0, scnExtraDowntime: 0, scnCopqRealisation: 100 } },
  B: { label: 'B · CapEx +25%', values: { scnSpeedDrop: 0, scnCapexOverrun: 25, scnExtraDowntime: 0, scnCopqRealisation: 100 } },
  C: { label: 'C · +5% downtime', values: { scnSpeedDrop: 0, scnCapexOverrun: 0, scnExtraDowntime: 5, scnCopqRealisation: 100 } },
  ABC: { label: 'A + B + C', values: { scnSpeedDrop: 15, scnCapexOverrun: 25, scnExtraDowntime: 5, scnCopqRealisation: 100 } },
  halfCopq: { label: 'COPQ gain 50%', values: { scnSpeedDrop: 0, scnCapexOverrun: 0, scnExtraDowntime: 0, scnCopqRealisation: 50 } },
  worst: { label: 'Worst: ABC + 50% COPQ', values: { scnSpeedDrop: 15, scnCapexOverrun: 25, scnExtraDowntime: 5, scnCopqRealisation: 50 } },
};
