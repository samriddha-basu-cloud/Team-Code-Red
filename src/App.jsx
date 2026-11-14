import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Factory, Ruler, Layers, IndianRupee, ShieldAlert, Users, SlidersHorizontal, Settings2, BellRing } from 'lucide-react';
import { ParamsProvider, useParams } from './state/ParamsContext.jsx';
import { TwinProvider, useTwinCtl, useTick } from './state/TwinContext.jsx';
import ControlDrawer from './components/ControlDrawer.jsx';
import Overview from './tabs/Overview.jsx';
import TwinTab from './tabs/TwinTab.jsx';
import LineTab from './tabs/LineTab.jsx';
import BufferTab from './tabs/BufferTab.jsx';
import FinanceTab from './tabs/FinanceTab.jsx';
import RiskTab from './tabs/RiskTab.jsx';
import PeopleTab from './tabs/PeopleTab.jsx';
import ParamsTab from './tabs/ParamsTab.jsx';
import { PRESETS } from './model/params.js';
import { fmtClock } from './util/format.js';

const TABS = [
  { id: 'overview', label: 'Control Tower', icon: LayoutDashboard, C: Overview },
  { id: 'twin', label: 'Digital Twin', icon: Factory, C: TwinTab },
  { id: 'line', label: 'Line & Kinematics', icon: Ruler, C: LineTab },
  { id: 'buffer', label: 'Buffer Lab', icon: Layers, C: BufferTab },
  { id: 'finance', label: 'Financials', icon: IndianRupee, C: FinanceTab },
  { id: 'risk', label: 'Risk & Scenarios', icon: ShieldAlert, C: RiskTab },
  { id: 'people', label: 'People & TPM', icon: Users, C: PeopleTab },
  { id: 'params', label: 'All Parameters', icon: Settings2, C: ParamsTab },
];

const fromHash = () => { const h = window.location.hash.replace('#/', ''); return TABS.some((t) => t.id === h) ? h : 'overview'; };

function StatusBar({ onControls }) {
  const { twin, running } = useTwinCtl();
  const { activePreset, changed } = useParams();
  useTick(2);
  const al = twin.alarms();
  const crit = al.filter((a) => a.sev === 'crit').length;
  return (
    <div className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
      <span className="statuspill" title="Digital twin clock"><span className={`dot ${crit ? 'crit' : running ? 'run' : 'pause'}`} />{fmtClock(twin.t)} · {twin.mode === 'auto' ? 'Cell' : 'Manual'}</span>
      <span className="statuspill" title="Active alarms" style={crit ? { background: '#fdeeec', color: '#8f2c22', borderColor: '#f2c7c1' } : undefined}><BellRing size={13} />{al.length}</span>
      <span className="statuspill" title="Scenario">{activePreset ? PRESETS[activePreset].label : 'Custom'}{changed.length ? ` · ${changed.length} edits` : ''}</span>
      <button className="btn primary" onClick={onControls}><SlidersHorizontal size={15} />Controls</button>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState(fromHash);
  const [drawer, setDrawer] = useState(false);
  useEffect(() => { const f = () => setTab(fromHash()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  const go = (id) => { window.location.hash = `/${id}`; setTab(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
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
          <StatusBar onControls={() => setDrawer(true)} />
        </div>
        <nav className="navrow">
          {TABS.map((t) => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => go(t.id)}><t.icon size={15} />{t.label}</button>
          ))}
        </nav>
      </header>
      <main><Active go={go} /></main>
      <ControlDrawer open={drawer} onClose={() => setDrawer(false)} />
      <footer className="footer">
        <div className="txt-row"><span>Re-Engineering Secondary Packaging · automated strip folding & cartoning cell</span><span>Team Code Red · Harshul · Shalin Bhat · Kalhan Koul</span></div>
        <div className="bar" />
      </footer>
    </>
  );
}

export default function App() {
  return (
    <ParamsProvider>
      <TwinProvider>
        <Shell />
      </TwinProvider>
    </ParamsProvider>
  );
}
