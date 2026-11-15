import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, ChevronLeft, ChevronRight, X, CheckCircle2, Circle, Lightbulb, Minimize2, Maximize2, Wand2 } from 'lucide-react';
import { CASES } from '../guide/cases.js';
import { useParams } from '../state/ParamsContext.jsx';
import { useTwinCtl, useTick } from '../state/TwinContext.jsx';
import { useToast } from '../state/ToastContext.jsx';

export function startCase(setWs, ws, id) {
  setWs('coach', { caseId: id, step: 0, startLog: ws.decisionLog.length, done: [] });
  setWs('visited', {});
  setWs('lastMc', null);
}

export function useCaseApi(go) {
  const { resetAll, setMany, setUnlock, applyPreset } = useParams();
  const { setMode, fastForward, inject, setSpeed, setRunning } = useTwinCtl();
  return {
    resetAll, setMany, setUnlock, applyPreset, go,
    twinReset: (m) => setTimeout(() => { setMode(m); setRunning(true); }, 200),
    fastForward: (s) => setTimeout(() => fastForward(s), 300),
    inject: (k) => setTimeout(() => inject(k), 300),
    setSpeed,
  };
}

export default function Coach({ go, tab }) {
  const ctx = useParams();
  const { ws, setWs } = ctx;
  const { twin } = useTwinCtl();
  const { notify } = useToast();
  const api = useCaseApi(go);
  const [min, setMin] = useState(false);
  useTick(2);
  const coach = ws.coach || {};
  const cs = CASES.find((c) => c.id === coach.caseId);
  const lastOk = useRef(null);

  const step = cs ? cs.steps[Math.min(coach.step, cs.steps.length - 1)] : null;
  let ok = false;
  try { ok = step?.check ? !!step.check({ ...ctx, p: ctx.params, twin, tab }) : false; } catch { ok = false; }
  const done = new Set(coach.done || []);
  const isDone = ok || done.has(coach.step);

  useEffect(() => {
    if (!cs) return;
    const key = `${cs.id}:${coach.step}`;
    if (ok && lastOk.current !== key) {
      lastOk.current = key;
      if (!done.has(coach.step)) {
        setWs('coach', (c) => ({ ...c, done: [...(c.done || []), c.step] }));
        notify('ok', `Step ${coach.step + 1} done`, step.title, { source: 'coach', force: true, ttl: 3500 });
      }
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cs) return null;
  const n = cs.steps.length;
  const setStep = (i) => setWs('coach', (c) => ({ ...c, step: Math.max(0, Math.min(n - 1, i)) }));
  const exit = () => setWs('coach', { caseId: null, step: 0, startLog: 0, done: [] });
  const finished = coach.step === n - 1 && isDone;
  const progress = ((coach.done || []).length / n) * 100;

  if (min) {
    return (
      <button className="coach-pill" onClick={() => setMin(false)}>
        <GraduationCap size={16} /> {cs.level} case · step {coach.step + 1}/{n} {isDone ? '✓' : ''}<Maximize2 size={13} />
      </button>
    );
  }
  return (
    <div className="coach" role="dialog" aria-label="Case coach">
      <div className="coach-h">
        <div className="row" style={{ gap: 8 }}>
          <span className={`lvl ${cs.id}`}>{cs.level}</span>
          <b>{cs.title}</b>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <button className="iconbtn" onClick={() => setMin(true)} title="Minimise"><Minimize2 size={14} /></button>
          <button className="iconbtn" onClick={exit} title="Exit case"><X size={15} /></button>
        </div>
      </div>
      <div className="progress" style={{ margin: '8px 0 10px' }}><i style={{ width: `${progress}%` }} /></div>
      <div className="coach-steps">
        {cs.steps.map((s, i) => (
          <button key={i} className={`cstep ${i === coach.step ? 'cur' : ''} ${done.has(i) || (i === coach.step && ok) ? 'ok' : ''}`} onClick={() => setStep(i)} title={s.title}>{i + 1}</button>
        ))}
      </div>
      <div className="coach-title">Step {coach.step + 1} of {n} · {step.title}</div>
      <div className="coach-body">{step.body}</div>
      {step.hint && <div className="coach-hint"><Lightbulb size={14} />{step.hint}</div>}
      <div className={`coach-check ${isDone ? 'ok' : ''}`}>
        {isDone ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        {isDone ? 'Done. Move on when ready.' : step.check ? 'Waiting for you to do this… it ticks automatically.' : 'Read it, then press Next.'}
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm" onClick={() => setStep(coach.step - 1)} disabled={coach.step === 0}><ChevronLeft size={14} />Back</button>
          {step.action && <button className="btn sm dark" onClick={() => step.action.run(api)}><Wand2 size={13} />{step.action.label}</button>}
        </div>
        {finished
          ? <button className="btn sm primary" onClick={() => { notify('ok', 'Case complete', `You finished "${cs.title}".`, { force: true }); exit(); }}>Finish</button>
          : <button className={`btn sm ${isDone ? 'primary pulse' : ''}`} onClick={() => setStep(coach.step + 1)} disabled={coach.step === n - 1}>Next<ChevronRight size={14} /></button>}
      </div>
    </div>
  );
}
