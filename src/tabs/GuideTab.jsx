import React from 'react';
import { Compass, GraduationCap, Rocket, SlidersHorizontal, Factory, Ruler, Layers, IndianRupee, ShieldAlert, Gavel, Users, ArrowRight, Keyboard, Info, Bell, Share2, Play, CheckCircle2 } from 'lucide-react';
import { Card, PageHead } from '../components/ui.jsx';
import { GLOSSARY } from '../components/Tip.jsx';
import { CASES } from '../guide/cases.js';
import { useParams } from '../state/ParamsContext.jsx';
import { startCase } from '../components/Coach.jsx';

const STEPS = [
  { icon: SlidersHorizontal, title: 'Set the scene', tab: null, body: 'Open Controls (C) or pick a stress preset. Every variable and constant lives there; constants need “Unlock constants”.', cta: 'Open Controls', action: 'controls' },
  { icon: Factory, title: 'Watch the twin', tab: 'twin', body: 'Run the simulation, jump a day or a week, inject faults, and switch to the manual baseline to see the before and after.' },
  { icon: Ruler, title: 'Check the engineering', tab: 'line', body: 'Make sure every kinematics and fit check is green: accelerations, deceleration window, stack height and headroom.' },
  { icon: Layers, title: 'Size the buffer', tab: 'buffer', body: 'Run the Monte Carlo, find the smallest buffer that keeps primary blocking under target, and apply it.' },
  { icon: IndianRupee, title: 'Test the money', tab: 'finance', body: 'Edit CapEx line items and running costs. Read NPV, IRR, payback and where the value comes from.' },
  { icon: ShieldAlert, title: 'Stress the plan', tab: 'risk', body: 'Apply scenarios A, B and C, read the tornado, and run the Monte Carlo for the chance of loss.' },
  { icon: Users, title: 'Plan the people', tab: 'people', body: 'Give every operator a path, track the technician cohort, and keep the TPM schedule on time.' },
  { icon: Gavel, title: 'Decide and record', tab: 'decision', body: 'Read the gates and verdict, weigh the options your way, and record a snapshot to compare later.' },
];

const SHORTCUTS = [['Space', 'Run / pause the twin'], ['C', 'Open Controls'], ['G', 'How to use (this page)'], ['D', 'Decision Studio'], ['T', 'Digital Twin'], ['?', 'Show shortcuts'], ['Esc', 'Close drawer, tour or dialog']];

const FAQ = [
  ['Why does OEE start high and then settle?', 'In the first minutes there have been no planned stops yet. Jump a day so changeovers and random stops are counted.'],
  ['What is the difference between a variable and a constant?', 'Variables are decisions or assumptions you can tune. Constants come from the case or physics (sachets per strip, COPQ today). Unlock them only to test “what if the case changed”.'],
  ['Why does the twin differ a little from the model?', 'The twin draws random stops, so each run differs. Run longer (a week) or change the seed; the gap should shrink to about a point.'],
  ['Where is my work saved?', 'In this browser. Use All Parameters → Export JSON to keep a file, or Copy share link to send a scenario to a teammate.'],
  ['Can I trust the alternative options?', 'Semi-automatic and delta-robot costs are indicative estimates. Edit their scores in Decision Studio if you have better data.'],
];

export default function GuideTab({ go, openControls, openTour }) {
  const { ws, setWs } = useParams();
  const active = ws.coach?.caseId;
  const begin = (id) => { startCase(setWs, ws, id); };
  return (
    <div className="page">
      <PageHead kicker="How to use" title="Work the case in eight steps, or follow a guided sample"
        sub="New here? Take the tour, then try the simple case. The coach panel stays on screen across tabs and ticks each step automatically when you do it." />
      <div className="stack" style={{ gap: 14 }}>
        <div className="guide-hero">
          <button className="wcard big" onClick={openTour}><Compass size={26} /><b>Take the 60-second tour</b><span>Where the controls, alerts and verdict live</span></button>
          {CASES.map((c) => (
            <button key={c.id} className={`wcard big ${active === c.id ? 'activecase' : ''}`} onClick={() => begin(c.id)}>
              {c.id === 'simple' ? <GraduationCap size={26} /> : <Rocket size={26} />}
              <b>{c.level} case · {c.minutes} min</b><span>{c.title}</span>
              {active === c.id && <em className="small">In progress: see the coach panel</em>}
            </button>
          ))}
        </div>

        <Card title="The workflow" tag="STEPS" sub="Go left to right; each step links to the tab that does it">
          <div className="steps-grid">
            {STEPS.map((s, i) => (
              <div key={s.title} className="stepcard">
                <div className="row between"><span className="stepnum">{i + 1}</span><s.icon size={20} color="#14a651" /></div>
                <b>{s.title}</b>
                <p>{s.body}</p>
                <button className="btn sm" onClick={() => (s.action === 'controls' ? openControls() : go(s.tab))}>{s.cta || 'Open'}<ArrowRight size={13} /></button>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid g2">
          {CASES.map((c) => (
            <Card key={c.id} title={`${c.level} sample case: ${c.title}`} tag={c.level.toUpperCase()} sub={`About ${c.minutes} minutes · ${c.steps.length} steps`}
              right={<button className="btn primary sm" onClick={() => begin(c.id)}><Play size={13} />{active === c.id ? 'Restart' : 'Start'}</button>}>
              <div className="callout green" style={{ marginBottom: 10 }}>{c.story}</div>
              <div className="small" style={{ marginBottom: 8 }}><b>You will learn to:</b> {c.learn.join(' · ')}</div>
              <ol className="caselist">
                {c.steps.map((s, i) => (
                  <li key={i} className={active === c.id && (ws.coach.done || []).includes(i) ? 'done' : ''}>
                    {active === c.id && (ws.coach.done || []).includes(i) && <CheckCircle2 size={14} color="#14a651" />} <b>{s.title}.</b> <span className="muted">{s.body}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ))}
        </div>

        <div className="grid g3">
          <Card title="Getting more out of it" tag="TIPS">
            <div className="stack" style={{ gap: 10 }}>
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}><Info size={18} color="#14a651" style={{ flex: 'none' }} /><span><b>Tooltips:</b> hover any ⓘ icon, KPI tile or parameter name for a plain-language explanation, its range and default.</span></div>
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}><Bell size={18} color="#14a651" style={{ flex: 'none' }} /><span><b>Alerts:</b> failing checks, negative NPV and twin alarms pop up with a button to fix them. The bell keeps the history and lets you mute pop-ups or show only critical ones.</span></div>
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}><Share2 size={18} color="#14a651" style={{ flex: 'none' }} /><span><b>Share:</b> All Parameters → Copy share link encodes your changes in the URL. Export JSON keeps parameters and planning data.</span></div>
              <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}><Gavel size={18} color="#14a651" style={{ flex: 'none' }} /><span><b>Compare decisions:</b> record a snapshot per scenario, then tick two or three in the decision log for a side-by-side view.</span></div>
            </div>
          </Card>
          <Card title="Keyboard shortcuts" tag="KEYS">
            <table className="t"><tbody>{SHORTCUTS.map(([k, v]) => <tr key={k}><td style={{ width: 80 }}><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody></table>
          </Card>
          <Card title="FAQ">
            <div className="stack" style={{ gap: 10 }}>
              {FAQ.map(([q, a]) => <details key={q} className="faq"><summary>{q}</summary><p>{a}</p></details>)}
            </div>
          </Card>
        </div>

        <Card title="Glossary" sub="The same definitions appear in tooltips">
          <div className="glossary">
            {Object.entries(GLOSSARY).map(([k, v]) => <div key={k}><b>{k}</b><span>{v}</span></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
