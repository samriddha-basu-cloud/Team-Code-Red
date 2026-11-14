# Team Code Red · Control Tower & Digital Twin

An interactive control tower and live digital twin for the **TrenDSetter 5.0** case *Re-Engineering Secondary Packaging: End-to-End Automation of Strip Folding & Cartoning*.

Team Code Red · Symbiosis Institute of Operations Management · Harshul · Shalin Bhat · Kalhan Koul

## What it does

| Tab | What you can do |
| --- | --- |
| **Control Tower** | Live OEE, throughput, buffer and alarms from the twin, NPV/IRR/payback, a target tracker, and engineering checks on one screen. One-click stress presets. |
| **Digital Twin** | A real-time simulation of the primary machine, FIFO buffer and the 10-station cell, with an animated plant floor (rotating 12-head turret, moving strips and cartons). It supports 1×–1200× speed and jumps of an hour, shift, day or week. You can inject faults (turret jam, camera fault, blank shortage, reel splice, GSM drift, seal-defect burst), put any station on a maintenance hold, or switch to the **manual baseline** for a before/after comparison. Includes live charts, alarms, an event log, and a model-vs-twin check. |
| **Line & Kinematics** | Takt, strip deceleration, turret rpm, fold time and blade acceleration with pass/fail limits, plus a line-balance chart, a fold-geometry fit check (side view and cross-section) and the OEE bridge. |
| **Buffer Lab** | A second-by-second Monte Carlo of the accumulator across buffer sizes and replications, showing how blocking changes with and without catch-up headroom. It recommends a buffer size and lets you edit the control bands. |
| **Financials** | CapEx line items, running costs and savings, pre- and post-tax NPV, IRR, payback and ROI. Includes a cash-flow chart and table (CSV export), the value split, and cheaper alternatives costed on the same assumptions. You can also feed the twin's measured COPQ back into the model. |
| **Risk & Scenarios** | Scenarios A, B and C plus combinations, a tornado chart (adjustable ±%), the break-even COPQ, a Monte Carlo NPV distribution, and an editable risk register with a heat map. |
| **People & TPM** | Workforce transition planner (balanced against people on rolls), upskilling ladder, technician cohort tracker, people-programme budget, TPM schedule running on the twin's clock, and a critical spares inventory. |
| **All Parameters** | All 100 variables and constants in one table. You can search and filter them, unlock constants, apply presets, export or import JSON, and copy a share link. |

A **Controls** drawer (top right) is available on every tab and holds every variable and constant, grouped and searchable. Every change updates the model and the running twin live. Settings and planning data are saved in the browser.

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
