import React, { useCallback, useEffect, useState } from 'react';
import { LayoutDashboard, Factory, Ruler, Layers, IndianRupee, ShieldAlert, Users, SlidersHorizontal, Settings2, Gavel, BookOpen, HelpCircle, X } from 'lucide-react';
import { ParamsProvider, useParams } from './state/ParamsContext.jsx';
import { TwinProvider, useTwinCtl, useTick } from './state/TwinContext.jsx';
import { ToastProvider } from './state/ToastContext.jsx';
import ControlDrawer from './components/ControlDrawer.jsx';
import Coach, { startCase } from './components/Coach.jsx';
import { Tour, Welcome } from './components/Tour.jsx';
import { AlertWatcher, AlertCenter } from './components/Alerts.jsx';
import { Tip } from './components/Tip.jsx';
import Overview from './tabs/Overview.jsx';
import DecisionTab from './tabs/DecisionTab.jsx';
import TwinTab from './tabs/TwinTab.jsx';
import LineTab from './tabs/LineTab.jsx';
import BufferTab from './tabs/BufferTab.jsx';
import FinanceTab from './tabs/FinanceTab.jsx';
import RiskTab from './tabs/RiskTab.jsx';
import PeopleTab from './tabs/PeopleTab.jsx';
import ParamsTab from './tabs/ParamsTab.jsx';
import GuideTab from './tabs/GuideTab.jsx';
import { PRESETS } from './model/params.js';
import { fmtClock } from './util/format.js';

const TABS = [
  { id: 'overview', label: 'Control Tower', icon: LayoutDashboard, C: Overview, tip: 'Live twin, verdict, money and targets on one screen' },
  { id: 'decision', label: 'Decision Studio', icon: Gavel, C: DecisionTab, tip: 'Gates, verdict, weighted options, what-ifs and the decision log (D)' },
  { id: 'twin', label: 'Digital Twin', icon: Factory, C: TwinTab, tip: 'Live simulation with fault injection and the manual baseline (T)' },
  { id: 'line', label: 'Line & Kinematics', icon: Ruler, C: LineTab, tip: 'Speeds, accelerations, line balance and carton fit' },
  { id: 'buffer', label: 'Buffer Lab', icon: Layers, C: BufferTab, tip: 'Monte Carlo sizing of the accumulator' },
  { id: 'finance', label: 'Financials', icon: IndianRupee, C: FinanceTab, tip: 'CapEx, cash flows, NPV, IRR, payback, alternatives' },
  { id: 'risk', label: 'Risk & Scenarios', icon: ShieldAlert, C: RiskTab, tip: 'Scenarios A, B, C, tornado, Monte Carlo, risk register' },
  { id: 'people', label: 'People & TPM', icon: Users, C: PeopleTab, tip: 'Transition plan, upskilling, maintenance and spares' },
  { id: 'params', label: 'All Parameters', icon: Settings2, C: ParamsTab, tip: 'Every variable and constant, import, export and share' },
  { id: 'guide', label: 'How to use', icon: BookOpen, C: GuideTab, tip: 'Steps, sample cases, shortcuts and glossary (G)' },
];
const WELCOME_KEY = 'codered.welcome.v2';
const fromHash = () => { const h = window.location.hash.replace('#/', ''); return TABS.some((t) => t.id === h) ? h : 'overview'; };
const SHORTCUTS = [['Space', 'Run / pause the twin'], ['C', 'Open Controls'], ['G', 'How to use'], ['D', 'Decision Studio'], ['T', 'Digital Twin'], ['?', 'This list'], ['Esc', 'Close panels']];

function StatusBar({ onControls, onHelp }) {
  const { twin, running } = useTwinCtl();
  const { activePreset, changed } = useParams();
  useTick(2);
  const al = twin.alarms();
  const crit = al.filter((a) => a.sev === 'crit').length;
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <Tip text={`Digital twin clock (day, time). ${running ? 'Running' : 'Paused'}; press Space to toggle. ${al.length} active twin alarm${al.length === 1 ? '' : 's'}.`}>
        <span className="statuspill" data-tour="status"><span className={`dot ${crit ? 'crit' : running ? 'run' : 'pause'}`} />{fmtClock(twin.t)} · {twin.mode === 'auto' ? 'Cell' : 'Manual'}{al.length ? ` · ${al.length}⚠` : ''}</span>
      </Tip>
      <Tip text="Active stress scenario and how many parameters differ from the case defaults."><span className="statuspill hide-sm">{activePreset ? PRESETS[activePreset].label : 'Custom'}{changed.length ? ` · ${changed.length} edits` : ''}</span></Tip>
      <AlertCenter />
      <Tip text="How to use, tour and sample cases (G)"><button className="statuspill" onClick={onHelp} data-tour="help" aria-label="Help"><HelpCircle size={15} /></button></Tip>
      <button className="btn primary" onClick={onControls} data-tour="controls"><SlidersHorizontal size={15} />Controls</button>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState(fromHash);
  const [drawer, setDrawer] = useState(false);
  const [tour, setTour] = useState(false);
  const [keys, setKeys] = useState(false);
  const [welcome, setWelcome] = useState(() => { try { return !localStorage.getItem(WELCOME_KEY); } catch { return false; } });
  const { ws, setWs } = useParams();
  const { setRunning, running } = useTwinCtl();

  useEffect(() => { const f = () => setTab(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  useEffect(() => { setWs('visited', (v) => ({ ...(v || {}), [tab]: true })); }, [tab, setWs]);
  const go = useCallback((id) => { window.location.hash = `/${id}`; setTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);
  const closeWelcome = () => { setWelcome(false); try { localStorage.setItem(WELCOME_KEY, '1'); } catch { /* ignore */ } };

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === ' ') { e.preventDefault(); setRunning((r) => !r); }
      else if (e.key === 'c' || e.key === 'C') setDrawer(true);
      else if (e.key === 'g' || e.key === 'G') go('guide');
      else if (e.key === 'd' || e.key === 'D') go('decision');
      else if (e.key === 't' || e.key === 'T') go('twin');
      else if (e.key === '?') setKeys(true);
      else if (e.key === 'Escape') { setDrawer(false); setKeys(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, setRunning, running]);

  const Active = TABS.find((t) => t.id === tab).C;
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="wordmark">
            <span className="w1">TRENDSETTER<sup>™</sup><span className="v">5.0</span></span>
            <span className="w2">Team Code Red · Control Tower & Digital Twin</span>
          </div>
          <div className="tagline">Create what is Worth Creating<small>Symbiosis Institute of Operations Management</small></div>
          <StatusBar onControls={() => setDrawer(true)} onHelp={() => go('guide')} />
        </div>
        <nav className="navrow" data-tour="nav">
          {TABS.map((t) => (
            <Tip key={t.id} text={t.tip} width={240}>
              <button className={`tab ${tab === t.id ? 'active' : ''} ${t.id === 'guide' ? 'guide' : ''}`} onClick={() => go(t.id)}><t.icon size={15} />{t.label}</button>
            </Tip>
          ))}
        </nav>
      </header>
      <main><Active go={go} openControls={() => setDrawer(true)} openTour={() => { go('overview'); setTimeout(() => setTour(true), 300); }} /></main>
      <ControlDrawer open={drawer} onClose={() => setDrawer(false)} />
      <AlertWatcher go={go} />
      <Coach go={go} tab={tab} />
      <Tour open={tour} onClose={() => setTour(false)} />
      <Welcome open={welcome && !tour} onClose={closeWelcome}
        onTour={() => { closeWelcome(); go('overview'); setTimeout(() => setTour(true), 300); }}
        onCase={(id) => { closeWelcome(); startCase(setWs, ws, id); go('guide'); }} />
      {keys && (
        <div className="modal-bg" onClick={() => setKeys(false)}>
          <div className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="row between"><b style={{ fontFamily: 'Poppins', color: '#0b6b34', fontSize: 18 }}>Keyboard shortcuts</b><button className="iconbtn" onClick={() => setKeys(false)}><X size={16} /></button></div>
            <table className="t" style={{ marginTop: 10 }}><tbody>{SHORTCUTS.map(([k, v]) => <tr key={k}><td style={{ width: 80 }}><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody></table>
          </div>
        </div>
      )}
      <footer className="footer">
        <div className="txt-row"><span>Re-Engineering Secondary Packaging · automated strip folding & cartoning cell · press ? for shortcuts</span><span>Team Code Red · Harshul · Shalin Bhat · Kalhan Koul</span></div>
        <div className="bar" />
      </footer>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ParamsProvider>
        <TwinProvider>
          <Shell />
        </TwinProvider>
      </ParamsProvider>
    </ToastProvider>
  );
}
