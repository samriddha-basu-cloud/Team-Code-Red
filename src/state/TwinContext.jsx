import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Twin } from '../sim/twin.js';
import { useParams } from './ParamsContext.jsx';

const Ctx = createContext(null);
export const SPEEDS = [1, 5, 20, 60, 300, 1200];

export function TwinProvider({ children }) {
  const { params } = useParams();
  const twinRef = useRef(null);
  if (!twinRef.current) twinRef.current = new Twin(params, { mode: 'auto' });
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(5);
  const [mode, setModeState] = useState('auto');
  const runRef = useRef(running);
  const speedRef = useRef(speed);
  runRef.current = running;
  speedRef.current = speed;

  // keep the twin on the latest parameters without resetting it
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => twinRef.current.setParams(params), 120);
    return () => clearTimeout(t);
  }, [params]);

  useEffect(() => {
    let raf, last = performance.now();
    const loop = (now) => {
      const realDt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const tw = twinRef.current;
      if (runRef.current) {
        const sp = speedRef.current;
        tw.animate = sp <= 20;
        tw.sampleEvery = sp <= 5 ? 5 : sp <= 60 ? 30 : 120;
        const stepDt = sp <= 20 ? 0.05 : sp <= 300 ? 0.25 : 0.5;
        let simDt = realDt * sp;
        let n = 0;
        while (simDt > 1e-9 && n < 6000) { const h = Math.min(stepDt, simDt); tw.step(h); simDt -= h; n++; }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const setMode = useCallback((m) => { setModeState(m); twinRef.current.reset({ mode: m }); }, []);
  const reset = useCallback((seed) => twinRef.current.reset(seed !== undefined ? { seed } : {}), []);
  const inject = useCallback((k) => twinRef.current.inject(k), []);
  const fastForward = useCallback((sec) => twinRef.current.runFor(sec), []);
  const setHold = useCallback((on, reason) => twinRef.current.setHold(on, reason), []);

  const value = { twin: twinRef.current, running, setRunning, speed, setSpeed, mode, setMode, reset, inject, fastForward, setHold };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTwinCtl = () => useContext(Ctx);

// Re-render the caller at a fixed rate while mounted.
export function useTick(hz = 4) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1000 / hz);
    return () => clearInterval(id);
  }, [hz]);
}
