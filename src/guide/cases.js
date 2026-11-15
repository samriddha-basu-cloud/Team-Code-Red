// Two guided sample cases. Each step can carry an action (a button that does it for you)
// and a check (ticks automatically when the app reaches that state).

const MONSOON = {
  scnSpeedDrop: 15, scnCapexOverrun: 25, scnExtraDowntime: 5, scnCopqRealisation: 70,
  cellMicroRate: 7, sachetThickness: 7.9, bufferCapacity: 100,
};

export const CASES = [
  {
    id: 'simple',
    level: 'Simple',
    minutes: 5,
    title: 'Base-case sanity check',
    story: 'You are presenting to the plant head tomorrow. Confirm the automated cell hits the 82% OEE target on the case numbers, see how the buffer handles a jam, and record a decision.',
    learn: ['Read the Control Tower', 'Run and fast-forward the digital twin', 'Inject a fault and read alarms', 'Check the money', 'Record a decision'],
    steps: [
      {
        title: 'Load the base case',
        body: 'Reset every variable to the case defaults and restart the twin in automated mode.',
        action: { label: 'Load base case', run: (a) => { a.resetAll(); a.twinReset('auto'); a.go('overview'); } },
        check: (c) => c.changed.length === 0 && c.twin.mode === 'auto',
      },
      {
        title: 'Run the twin for one simulated day',
        body: 'Open the Digital Twin and press "1 day" under Jump. The twin simulates 24 hours of stops, planned changeovers and rejects in a second.',
        action: { label: 'Open twin and run 1 day', run: (a) => { a.go('twin'); a.fastForward(86400); } },
        check: (c) => c.twin.mode === 'auto' && c.twin.t >= 86400,
      },
      {
        title: 'Is OEE close to 82%?',
        body: 'Look at the dark "Live OEE" tile. A day of simulation should land between 80% and 84%. The A · P · Q tile shows which factor holds it back.',
        check: (c) => { const k = c.twin.kpis(); return c.twin.t >= 86400 && k.OEE >= 0.8 && k.OEE <= 0.845; },
        hint: 'If it is outside the range, run another day: one day still has some randomness.',
      },
      {
        title: 'Jam the turret and watch the buffer',
        body: 'Set speed to 5× and press "Turret jam 45 s". The cell stops (red), the buffer fills, and an alert pops up. When the cell restarts at full speed, the buffer drains.',
        action: { label: 'Inject a turret jam', run: (a) => { a.go('twin'); a.setSpeed(5); a.inject('cellJam'); } },
        check: (c) => c.twin.events.some((e) => /injected/.test(e.msg) && /Jam/.test(e.msg)),
      },
      {
        title: 'Check the money',
        body: 'Open Financials. With base numbers you should see NPV ₹14.94 Cr, IRR 148% and payback about 9 months. Note that 87% of the value comes from quality.',
        action: { label: 'Open Financials', run: (a) => a.go('finance') },
        check: (c) => !!c.ws.visited.finance,
      },
      {
        title: 'Record your decision',
        body: 'Open Decision Studio, read the verdict and the gates, give the snapshot a name and press "Record decision".',
        action: { label: 'Open Decision Studio', run: (a) => a.go('decision') },
        check: (c) => c.ws.decisionLog.length > c.ws.coach.startLog,
      },
    ],
  },
  {
    id: 'complex',
    level: 'Complex',
    minutes: 15,
    title: 'Monsoon stress test: go, or no-go?',
    story: 'It is monsoon. Laminate GSM varies, so the primary runs 15% slower. The vendor quote came in 25% over budget, a new crew causes 7 micro-stops an hour, and the COPQ gain is uncertain (70%). Marketing also wants a thicker 7.9 mm sachet. Find what breaks, fix it, and decide.',
    learn: ['Spot failing engineering checks', 'Unlock and change a constant', 'Size the buffer with Monte Carlo', 'Stress the money', 'Weigh options and set conditions'],
    steps: [
      {
        title: 'Load the monsoon scenario',
        body: 'This applies scenarios A + B + C, 70% COPQ realisation, 7 micro-stops an hour, a 7.9 mm sachet and a smaller 100-strip buffer.',
        action: { label: 'Load monsoon scenario', run: (a) => { a.resetAll(); a.setMany(MONSOON); a.twinReset('auto'); a.go('overview'); } },
        check: (c) => c.p.sachetThickness === 7.9 && c.p.scnSpeedDrop === 15,
      },
      {
        title: 'Spot the red flags',
        body: 'On the Control Tower, read the verdict banner and the "Engineering checks" card. The 8 layers of 7.9 mm sachets no longer fit the 62 mm carton, and NPV has dropped.',
        action: { label: 'Show Control Tower', run: (a) => a.go('overview') },
        check: (c) => !!c.ws.visited.overview && c.d.stackH > c.d.inH,
        doneWhen: 'You have seen the failing stack-height check.',
      },
      {
        title: 'Fix the carton fit',
        body: 'Carton height is a constant, so unlock constants first. In Line & Kinematics → Geometry controls, raise "Carton outer height" until the stack fits (about 72 mm).',
        action: { label: 'Unlock and open geometry', run: (a) => { a.setUnlock(true); a.go('line'); } },
        check: (c) => c.d.stackH <= c.d.inH,
        hint: 'Alternative: talk marketing down to a 7.5 mm sachet. Both make the check go green.',
      },
      {
        title: 'Stress the line in the twin',
        body: 'Run the twin for a day with GSM drift injected. Watch the alarms and the blocked-time tile: the smaller buffer and extra micro-stops start blocking the primary.',
        action: { label: 'Inject GSM drift and run 1 day', run: (a) => { a.go('twin'); a.twinReset('auto'); a.inject('gsm'); a.fastForward(86400); } },
        check: (c) => c.twin.t >= 86400,
      },
      {
        title: 'Re-size the buffer',
        body: 'In Buffer Lab, press "Run simulation", then "Use recommended" (or set the buffer yourself) until model blocking is at or below 1.2%.',
        action: { label: 'Open Buffer Lab', run: (a) => a.go('buffer') },
        check: (c) => c.blocking.blockedPct <= 1.2,
        hint: 'With 7 micro-stops an hour you will likely need 200 strips or more.',
      },
      {
        title: 'Stress the money',
        body: 'In Risk & Scenarios, run the Monte Carlo and read P(NPV < 0) and P10. Then look at the tornado: which single driver moves NPV most?',
        action: { label: 'Open Risk & Scenarios', run: (a) => a.go('risk') },
        check: (c) => !!c.ws.lastMc,
      },
      {
        title: 'Weigh the options',
        body: 'In Decision Studio, drag the "Format flexibility" weight up. How high must it go before delta robots win? The robustness table shows it.',
        action: { label: 'Open Decision Studio', run: (a) => a.go('decision') },
        check: (c) => !!c.ws.visited.decision,
      },
      {
        title: 'Record a verdict with conditions',
        body: 'Read the gates. Name the snapshot (for example "Monsoon: go with conditions") and record it. Then compare it with your base-case snapshot.',
        check: (c) => c.ws.decisionLog.length > c.ws.coach.startLog,
      },
    ],
  },
];

export const TOUR = [
  { sel: '[data-tour="nav"]', title: 'Ten tabs, one model', body: 'Every tab reads from the same model and the same running twin. Start at Control Tower, decide in Decision Studio.' },
  { sel: '[data-tour="controls"]', title: 'Controls: every variable and constant', body: 'Open this drawer on any tab to change any of the 100 parameters. Constants are locked until you unlock them. Shortcut: C.' },
  { sel: '[data-tour="bell"]', title: 'Alerts', body: 'Engineering failures, negative NPV and twin alarms appear as pop-up alerts and are kept here. You can mute them or choose a severity.' },
  { sel: '[data-tour="status"]', title: 'Twin clock and scenario', body: 'The twin keeps running across tabs. Space pauses it. The pill shows which stress scenario is active.' },
  { sel: '[data-tour="verdict"]', title: 'The verdict', body: 'GO, GO WITH CONDITIONS or NO-GO, from ten decision gates. Click through to see why.' },
  { sel: '[data-tour="help"]', title: 'How to use & sample cases', body: 'Step-by-step workflow, a glossary, and two guided cases: a 5-minute simple one and a 15-minute complex one. Shortcut: G.' },
];
