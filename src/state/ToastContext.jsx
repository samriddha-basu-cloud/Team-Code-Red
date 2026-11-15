import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, AlertTriangle, AlertOctagon, CheckCircle2, Info } from 'lucide-react';

const Ctx = createContext(null);
const ICON = { crit: AlertOctagon, warn: AlertTriangle, ok: CheckCircle2, info: Info };
const PREF_KEY = 'codered.alertprefs.v1';

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [prefs, setPrefs] = useState(() => {
    try { return { muted: false, minSev: 'warn', ...(JSON.parse(localStorage.getItem(PREF_KEY)) || {}) }; } catch { return { muted: false, minSev: 'warn' }; }
  });
  const [unread, setUnread] = useState(0);
  const idRef = useRef(1);
  useEffect(() => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch { /* ignore */ } }, [prefs]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback((sev, title, msg, opts = {}) => {
    const id = idRef.current++;
    const item = { id, sev, title, msg, at: new Date(), source: opts.source || 'app', action: opts.action };
    setHistory((h) => [item, ...h].slice(0, 120));
    setUnread((u) => u + 1);
    const rank = { info: 0, ok: 0, warn: 1, crit: 2 };
    const pass = opts.force || (!prefs.muted && rank[sev] >= rank[prefs.minSev === 'all' ? 'info' : prefs.minSev]);
    if (pass) {
      setToasts((t) => [...t.slice(-3), item]);
      setTimeout(() => dismiss(id), opts.ttl || (sev === 'crit' ? 9000 : 6000));
    }
    return id;
  }, [prefs, dismiss]);

  const value = { notify, dismiss, history, clearHistory: () => setHistory([]), prefs, setPrefs, unread, markRead: () => setUnread(0) };
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const I = ICON[t.sev] || Info;
          return (
            <div key={t.id} className={`toast ${t.sev}`}>
              <I size={18} className="ti" />
              <div style={{ flex: 1 }}>
                <div className="tt">{t.title}</div>
                {t.msg && <div className="tm">{t.msg}</div>}
                {t.action && <button className="btn sm" style={{ marginTop: 6 }} onClick={() => { t.action.run(); dismiss(t.id); }}>{t.action.label}</button>}
              </div>
              <button className="tx" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
