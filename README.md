# Team Code Red · Control Tower & Digital Twin

An interactive control tower and live digital twin for the **TrenDSetter 5.0** case *Re-Engineering Secondary Packaging: End-to-End Automation of Strip Folding & Cartoning*.

Team Code Red · Symbiosis Institute of Operations Management · Harshul · Shalin Bhat · Kalhan Koul

## What it does

Ten tabs share one model and one running twin.

| Tab | What you can do |
| --- | --- |
| **Decision Studio** | The verdict: **GO, GO WITH CONDITIONS or NO-GO**, from 10 gates (7 must-pass, 3 conditions) with adjustable thresholds and one-click "Fix" links. Includes weighted multi-criteria ranking of turret, delta robots, semi-auto and doing nothing, with your weights and editable scores. A robustness table shows how far each weight can move before the winner changes. What-if levers show deltas against a pinned baseline. A decision log records snapshots, compares them side by side, restores them and exports to JSON. |
| **Control Tower** | Live OEE, throughput, buffer and alarms from the twin, NPV/IRR/payback, a target tracker, and engineering checks on one screen. One-click stress presets. |
| **Digital Twin** | A real-time simulation of the primary machine, FIFO buffer and the 10-station cell, with an animated plant floor (rotating 12-head turret, moving strips and cartons). It supports 1×–1200× speed and jumps of an hour, shift, day or week. You can inject faults (turret jam, camera fault, blank shortage, reel splice, GSM drift, seal-defect burst), put any station on a maintenance hold, or switch to the **manual baseline** for a before/after comparison. Includes live charts, alarms, an event log, and a model-vs-twin check. |
| **Line & Kinematics** | Takt, strip deceleration, turret rpm, fold time and blade acceleration with pass/fail limits, plus a line-balance chart, a fold-geometry fit check (side view and cross-section) and the OEE bridge. |
| **Buffer Lab** | A second-by-second Monte Carlo of the accumulator across buffer sizes and replications, showing how blocking changes with and without catch-up headroom. It recommends a buffer size and lets you edit the control bands. |
| **Financials** | CapEx line items, running costs and savings, pre- and post-tax NPV, IRR, payback and ROI. Includes a cash-flow chart and table (CSV export), the value split, and cheaper alternatives costed on the same assumptions. You can also feed the twin's measured COPQ back into the model. |
| **Risk & Scenarios** | Scenarios A, B and C plus combinations, a tornado chart (adjustable ±%), the break-even COPQ, a Monte Carlo NPV distribution, and an editable risk register with a heat map. |
| **People & TPM** | Workforce transition planner (balanced against people on rolls), upskilling ladder, technician cohort tracker, people-programme budget, TPM schedule running on the twin's clock, and a critical spares inventory. |
| **How to use** | An eight-step workflow with links to each tab, the two guided sample cases, tips, keyboard shortcuts, FAQ and glossary. |
| **All Parameters** | All 100 variables and constants in one table. You can search and filter them, unlock constants, apply presets, export or import JSON, and copy a share link. |

A **Controls** drawer (top right) is available on every tab and holds every variable and constant, grouped and searchable. Every change updates the model and the running twin live. Settings and planning data are saved in the browser.

## How to use it

1. **Set the scene:** open **Controls** (press `C`) or pick a stress preset.
2. **Watch the twin:** run it, jump a day, inject faults, compare against the manual baseline.
3. **Check the engineering:** every kinematics and fit check in Line & Kinematics should be green.
4. **Size the buffer:** run the Buffer Lab Monte Carlo and apply the recommended size.
5. **Test the money:** edit CapEx and running costs in Financials.
6. **Stress the plan:** scenarios, tornado and Monte Carlo in Risk & Scenarios.
7. **Plan the people:** transition plan, cohort tracker and TPM in People & TPM.
8. **Decide and record:** read the gates in Decision Studio and record a snapshot.

### Guided sample cases

A coach panel stays on screen across tabs. Each step has a "do it for me" button and ticks itself when the app reaches the right state.

- **Simple · 5 min · Base-case sanity check:** load the base case, run the twin a day, confirm OEE ≈ 82%, jam the turret and watch the buffer, check the money, record a decision.
- **Complex · 15 min · Monsoon stress test:** scenarios A+B+C, 70% COPQ realisation, 7 micro-stops an hour, a thicker 7.9 mm sachet and a 100-strip buffer. Find the failing carton-fit check, unlock a constant to fix it, re-size the buffer, run the Monte Carlo, weigh the options and record a verdict with conditions.

### Tooltips, alerts and shortcuts

- **Tooltips:** hover any ⓘ icon, KPI tile, tab or parameter name for a plain-language definition, the current value, the default and the range.
- **Alerts:** failing engineering checks, negative NPV, long payback, low headroom and twin alarms pop up as toasts with a fix button. The bell keeps the history, and you can mute pop-ups or show only critical ones.
- **Shortcuts:** `Space` runs or pauses the twin, `C` opens Controls, `G` opens How to use, `D` opens Decision Studio, `T` opens the Digital Twin, `?` lists the shortcuts, `Esc` closes panels.
- **First visit:** a welcome screen offers a 60-second spotlight tour or either sample case.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import this GitHub repo.
2. Vercel detects **Vite** on its own. The build command is `npm run build` and the output directory is `dist`; both are already set in `vercel.json`.
3. Click **Deploy**. No environment variables are needed: the app is fully client-side.

## Model notes

- The financial engine reproduces the submitted case numbers at default settings: NPV ₹14.94 Cr at 12%, IRR 148%, payback 9.2 months, post-tax NPV ₹10.89 Cr.
- Over a simulated week, the twin lands at about 82% OEE in automated mode and about 64% in manual mode, matching the analytical OEE bridge.
- Assumptions not given in the case are flagged in the parameter notes: operator cost, sachet thickness, strip pitch, stop profiles and the alternative-option costs.

> The case study materials are confidential under the TrenDSetter 5.0 rules. Keep this repository private unless the organisers allow otherwise.
