import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULTS, PARAMS, PARAM_MAP, PRESETS } from '../model/params.js';
import { derive, finance, oeeCell } from '../model/engine.js';
import { blockingAt } from '../model/buffer.js';
import { DEFAULT_WS } from './workspace.js';

const KEY = 'codered.params.v1';
const WS_KEY = 'codered.workspace.v1';
const Ctx = createContext(null);

function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }
function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const meta = PARAM_MAP[k];
    if (!meta) continue;
    if (meta.type === 'bool') out[k] = !!v;
    else if (typeof v === 'number' && isFinite(v)) out[k] = v;
  }
  return out;
}
function encodeShare(diff) { return btoa(unescape(encodeURIComponent(JSON.stringify(diff)))); }
function decodeShare(s) { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return null; } }

function loadInitial() {
  let stored = {};
  try { stored = clean(safeParse(localStorage.getItem(KEY))); } catch { /* storage blocked */ }
  const qs = new URLSearchParams(window.location.search).get('s');
  const shared = qs ? clean(decodeShare(qs)) : {};
  return { ...DEFAULTS, ...stored, ...shared };
}
function loadWs() {
  try { const w = safeParse(localStorage.getItem(WS_KEY)); if (w) return { ...DEFAULT_WS, ...w }; } catch { /* ignore */ }
  return DEFAULT_WS;
}

export function ParamsProvider({ children }) {
  const [params, setParams] = useState(loadInitial);
  const [unlock, setUnlock] = useState(false);
  const [ws, setWsState] = useState(loadWs);

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(params)); } catch { /* ignore */ } }, [params]);
  useEffect(() => { try { localStorage.setItem(WS_KEY, JSON.stringify(ws)); } catch { /* ignore */ } }, [ws]);

  const setParam = useCallback((k, v) => {
    const meta = PARAM_MAP[k];
    if (!meta) return;
    let val = v;
    if (meta.type !== 'bool') { val = Number(v); if (!isFinite(val)) return; }
    setParams((p) => ({ ...p, [k]: val }));
  }, []);
  const setMany = useCallback((obj) => setParams((p) => ({ ...p, ...clean(obj) })), []);
  const resetAll = useCallback(() => setParams({ ...DEFAULTS }), []);
  const resetGroup = useCallback((g) => setParams((p) => {
    const n = { ...p };
    PARAMS.filter((x) => x.group === g).forEach((x) => { n[x.key] = x.def; });
    return n;
  }), []);
  const applyPreset = useCallback((id) => { const pr = PRESETS[id]; if (pr) setParams((p) => ({ ...p, ...pr.values })); }, []);
  const setWs = useCallback((k, v) => setWsState((w) => ({ ...w, [k]: typeof v === 'function' ? v(w[k]) : v })), []);
  const resetWs = useCallback((k) => setWsState((w) => ({ ...w, [k]: DEFAULT_WS[k] })), []);

  const changed = useMemo(() => PARAMS.filter((m) => params[m.key] !== m.def).map((m) => m.key), [params]);
  const diff = useMemo(() => Object.fromEntries(changed.map((k) => [k, params[k]])), [changed, params]);
  const shareUrl = useCallback(() => {
    const u = new URL(window.location.href);
    u.search = changed.length ? `?s=${encodeShare(diff)}` : '';
    return u.toString();
  }, [changed, diff]);

  const activePreset = useMemo(() => {
    for (const [id, pr] of Object.entries(PRESETS)) {
      if (Object.entries(pr.values).every(([k, v]) => params[k] === v)) return id;
    }
    return null;
  }, [params]);

  // ---- live model (memoised)
  const d = useMemo(() => derive(params), [params]);
  const fin = useMemo(() => finance(params), [params]);
  const blockKey = [params.bufferCapacity, params.cellMicroRate, params.cellMicroMedian, params.cellMinorRate, params.cellMinorMedian,
    params.primaryStopRate, params.primaryStopMedian, params.stopSigma, d.stripsPerMin, d.cellMax].join('|');
  const blocking = useMemo(() => {
    const seeds = [11, 23, 37];
    const r = seeds.map((s) => blockingAt(params, params.bufferCapacity, d.stripsPerMin, d.cellMax, 3, s));
    return { blockedPct: r.reduce((a, b) => a + b.blockedPct, 0) / r.length, cellDownPct: r.reduce((a, b) => a + b.cellDownPct, 0) / r.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockKey]);
  const oee = useMemo(() => oeeCell(params, d, blocking.blockedPct), [params, d, blocking]);

  const value = {
    params, setParam, setMany, resetAll, resetGroup, applyPreset, activePreset, unlock, setUnlock,
    changed, diff, shareUrl, d, fin, blocking, oee, ws, setWs, resetWs,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useParams = () => useContext(Ctx);
