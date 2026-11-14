import React, { useMemo, useState } from 'react';
import { useTwinCtl, useTick } from '../state/TwinContext.jsx';
import { useParams } from '../state/ParamsContext.jsx';

const COL = {
  run: { fill: '#E9F6EE', stroke: '#14A651', text: '#0B6B34', label: 'Running' },
  starved: { fill: '#FFF6E3', stroke: '#E2A23B', text: '#7D5810', label: 'Starved' },
  down: { fill: '#FDEEEC', stroke: '#D0574B', text: '#8F2C22', label: 'Stopped' },
  hold: { fill: '#FDEEEC', stroke: '#D0574B', text: '#8F2C22', label: 'On hold' },
  blocked: { fill: '#FDEEEC', stroke: '#D0574B', text: '#8F2C22', label: 'Blocked' },
  planned: { fill: '#EEF2EF', stroke: '#9AA59E', text: '#5B6B61', label: 'Planned stop' },
  slow: { fill: '#FFF6E3', stroke: '#E2A23B', text: '#7D5810', label: 'Soft slowdown' },
};

function along(pts, f) {
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push(l); total += l; }
  let dd = Math.max(0, Math.min(1, f)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (dd <= segs[i]) { const r = segs[i] ? dd / segs[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r]; }
    dd -= segs[i];
  }
  return pts[pts.length - 1];
}
const pathD = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('');

const P_IN = [[170, 300], [212, 300], [212, 92], [316, 92], [316, 118]];
const P_CELL = [[382, 322], [708, 322]];
const P_REJ = [[382, 322], [652, 322], [652, 402]];
const P_CART = [[572, 502], [1192, 502]];
const P_CART_REJ = [[572, 502], [1076, 502], [1076, 538]];

const STATIONS = [
  { id: 'S2', name: 'Flying transfer', x: 400, y: 252, w: 82, h: 96, capKey: 'capTransfer' },
  { id: 'S3', name: 'Vision', x: 496, y: 252, w: 104, h: 96, capKey: 'capVision' },
  { id: 'S4', name: 'Reject', x: 614, y: 252, w: 76, h: 96, capKey: 'capReject' },
  { id: 'S7', name: 'Carton erector', x: 430, y: 446, w: 142, h: 72, capKey: 'capErector' },
  { id: 'S9', name: 'Tuck-in closer', x: 930, y: 446, w: 84, h: 72, capKey: 'capCloser' },
  { id: 'S10', name: 'Checkweigh / code', x: 1028, y: 446, w: 96, h: 72, capKey: 'capCheckweigher' },
];

function stationOf(reason = '') {
  const m = reason.match(/S(\d+)/);
  if (m) return `S${m[1]}`;
  if (/blank|glue/i.test(reason)) return 'S7';
  return 'S5';
}

export default function TwinCanvas({ compact = false }) {
  const { twin, running, speed, setHold } = useTwinCtl();
  const { params: p, d } = useParams();
  useTick(twin.animate && running ? 30 : 8);
  const [sel, setSel] = useState(null);
  const auto = twin.mode === 'auto';
  const k = twin.kpis();
  const cs = twin.cell.state;
  const faultSt = cs === 'down' || cs === 'hold' ? (cs === 'hold' ? stationOf(twin.cell.holdReason) : stationOf(twin.cell.reason)) : null;
  const stState = (id) => {
    if (!auto) return 'run';
    if (cs === 'down' || cs === 'hold') return id === faultSt ? cs : 'starved';
    if (cs === 'starved') return 'starved';
    return 'run';
  };
  const prim = twin.primary.state === 'run' && twin.primary.soft ? 'slow' : twin.primary.state;
  const now = performance.now() / 1000;
  const flowing = running && !twin.animate;
  const dash = (on, rate = 40) => (on && flowing ? { strokeDasharray: '10 8', strokeDashoffset: -((now * rate) % 18) } : { strokeDasharray: '10 8' });
  const bufCap = auto ? p.bufferCapacity : p.pileupCapacity;
  const bufPct = k.bufferPct;
  const bufColor = bufPct >= p.bandSoft ? '#D0574B' : bufPct >= p.bandMid ? '#E2A23B' : '#14A651';
  const T = twin.t;

  const strips = useMemo(() => [], []);
  strips.length = 0;
  if (twin.animate) {
    for (const s of twin.tokens.strips) {
      const f = (T - s.t0) / s.dur;
      if (f < 0 || f > 1) continue;
      const pts = s.stage === 1 ? P_IN : s.defect ? P_REJ : P_CELL;
      const [x, y] = along(pts, f);
      strips.push({ x, y, defect: s.defect, vertical: s.stage === 1 && f > 0.15 && f < 0.7 });
    }
  }
  const cartons = [];
  if (twin.animate) {
    for (const c of twin.tokens.cartons) {
      const f = (T - c.t0) / c.dur;
      if (f < 0 || f > 1) continue;
      const [x, y] = along(c.reject ? P_CART_REJ : P_CART, f);
      cartons.push({ x, y, reject: c.reject });
    }
  }

  const st = (id) => COL[stState(id)];
  const cx = 800, cy = 300, R = 95;
  const heads = Array.from({ length: p.turretHeads }, (_, i) => i);
  const turretCol = COL[stState('S5')];
  const selSt = sel && STATIONS.find((s) => s.id === sel.id);

  return (
    <div className="twin-wrap">
      <svg viewBox="0 0 1210 570" role="img" aria-label="Digital twin plant floor">
        <defs>
          <marker id="tw-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6E7D73" /></marker>
          <marker id="tw-ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#14A651" /></marker>
          <pattern id="grid500" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#E4EEE6" strokeWidth="1" /></pattern>
        </defs>
        <rect x="0" y="0" width="1210" height="570" fill="url(#grid500)" rx="14" />
        <rect x="196" y="40" width="1004" height="520" rx="10" fill="none" stroke="#1B2A21" strokeWidth="2" strokeDasharray="2 0" opacity="0.55" />
        <text x="206" y="32" fontSize="12.5" fontWeight="700" fill="#0B6B34">AUTOMATED CELL BOUNDARY · 4.0 m × 1.5 m (not to scale here)</text>

        {/* primary machine */}
        <g className="station" onClick={() => setSel({ id: 'PRIMARY' })}>
          <rect x="18" y="196" width="152" height="170" rx="12" fill={COL[prim].fill} stroke={COL[prim].stroke} strokeWidth="2" />
          <text x="94" y="222" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1B2A21">Primary FFS</text>
          <text x="94" y="240" textAnchor="middle" fontSize="11.5" fill="#5B6B61">sachet form-fill-seal</text>
          <text x="94" y="282" textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="Poppins" fill={COL[prim].text}>{Math.round(twin.primary.state === 'run' ? k.primaryRpm : 0)}</text>
          <text x="94" y="300" textAnchor="middle" fontSize="11.5" fill="#5B6B61">sachets / min</text>
          <rect x="40" y="320" width="108" height="26" rx="13" fill={COL[prim].stroke} />
          <text x="94" y="337" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{COL[prim].label.toUpperCase()}</text>
        </g>

        {/* conveyors */}
        <path d={pathD(P_IN)} fill="none" stroke="#6E7D73" strokeWidth="3" style={dash(twin.primary.state === 'run')} markerEnd="url(#tw-a)" />
        <path d={pathD(P_CELL)} fill="none" stroke="#6E7D73" strokeWidth="3" style={dash(auto && cs === 'run')} markerEnd="url(#tw-a)" />
        <path d={pathD(P_CART)} fill="none" stroke="#14A651" strokeWidth="3" style={dash(auto && cs === 'run', 30)} markerEnd="url(#tw-ag)" />
        <path d={`M652 348V398`} fill="none" stroke="#D0574B" strokeWidth="2" strokeDasharray="4 4" />
        <path d={`M1076 518V536`} fill="none" stroke="#D0574B" strokeWidth="2" strokeDasharray="4 4" />

        {/* buffer */}
        <g className="station" onClick={() => setSel({ id: 'S1' })}>
          <rect x="250" y="110" width="132" height="272" rx="12" fill="#F7FBF8" stroke="#6E7D73" strokeWidth="1.6" strokeDasharray="6 4" />
          <rect x="262" y={370 - (bufPct / 100) * 236} width="108" height={(bufPct / 100) * 236} rx="6" fill={bufColor} opacity="0.85" />
          {[p.bandLow, p.bandMid, p.bandSoft].map((b, i) => (
            <g key={i}><line x1="258" x2="374" y1={370 - (b / 100) * 236} y2={370 - (b / 100) * 236} stroke="#1B2A21" strokeDasharray="3 3" opacity="0.45" /><text x="377" y={373 - (b / 100) * 236} fontSize="9.5" fill="#5B6B61">{b}%</text></g>
          ))}
          <text x="316" y="140" textAnchor="middle" fontSize="13.5" fontWeight="700" fill="#1B2A21">S1 {auto ? 'FIFO buffer' : 'Belt pile-up'}</text>
          <text x="316" y="262" textAnchor="middle" fontSize="26" fontWeight="700" fontFamily="Poppins" fill="#1B2A21">{twin.buffer}</text>
          <text x="316" y="280" textAnchor="middle" fontSize="11.5" fill="#1B2A21">of {bufCap} strips · {bufPct.toFixed(0)}%</text>
        </g>

        {auto ? (
          <>
            {STATIONS.filter((s) => ['S2', 'S3', 'S4'].includes(s.id)).map((s) => (
              <g key={s.id} className="station" onClick={() => setSel({ id: s.id })}>
                <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="10" fill={st(s.id).fill} stroke={st(s.id).stroke} strokeWidth="2" />
                <text x={s.x + s.w / 2} y={s.y + 22} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1B2A21">{s.id}</text>
                <text x={s.x + s.w / 2} y={s.y + 38} textAnchor="middle" fontSize="11" fill="#5B6B61">{s.name}</text>
              </g>
            ))}
            {/* vision beam */}
            <path d="M548 222 L528 296 L568 296 Z" fill={twin.rejectStreak > 0 ? '#D0574B' : '#14A651'} opacity="0.13" />
            <rect x="534" y="210" width="28" height="14" rx="3" fill="#1B2A21" />
            {/* reject bin */}
            <g className="station" onClick={() => setSel({ id: 'S4' })}>
              <rect x="618" y="400" width="70" height="38" rx="6" fill="#FDEEEC" stroke="#D0574B" strokeWidth="1.5" />
              <text x="653" y="417" textAnchor="middle" fontSize="11" fontWeight="700" fill="#8F2C22">Locked bin</text>
              <text x="653" y="432" textAnchor="middle" fontSize="11.5" fill="#8F2C22">{twin.m.stripsRejected} strips</text>
            </g>

            {/* turret */}
            <g className="station" onClick={() => setSel({ id: 'S5' })}>
              <circle cx={cx} cy={cy} r={R} fill={turretCol.fill} stroke={turretCol.stroke} strokeWidth="3" />
              <g transform={`rotate(${twin.turretAngle} ${cx} ${cy})`}>
                {heads.map((i) => {
                  const a = (i / heads.length) * Math.PI * 2;
                  const hx = cx + Math.cos(a) * (R - 16), hy = cy + Math.sin(a) * (R - 16);
                  const loaded = cs === 'run' && i % heads.length !== 0;
                  return <g key={i}><line x1={cx} y1={cy} x2={hx} y2={hy} stroke={turretCol.stroke} strokeWidth="1" opacity="0.35" /><circle cx={hx} cy={hy} r="9" fill={loaded ? '#14A651' : '#fff'} stroke={turretCol.stroke} strokeWidth="1.5" /></g>;
                })}
              </g>
              <circle cx={cx} cy={cy} r="38" fill="#fff" stroke={turretCol.stroke} strokeWidth="1.5" />
              <text x={cx} y={cy - 6} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0B6B34">S5 Turret</text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="#1B2A21">{(cs === 'run' ? twin.cell.rate * 60 / p.turretHeads : 0).toFixed(1)} rpm</text>
              <text x={cx} y={cy + 24} textAnchor="middle" fontSize="10" fill="#5B6B61">{p.turretHeads} heads</text>
            </g>
            <g className="station" onClick={() => setSel({ id: 'S6' })}>
              <rect x="760" y="404" width="80" height="42" rx="8" fill={st('S6').fill} stroke={st('S6').stroke} strokeWidth="1.5" />
              <text x="800" y="421" textAnchor="middle" fontSize="11.5" fontWeight="700" fill="#1B2A21">S6 · S8</text>
              <text x="800" y="436" textAnchor="middle" fontSize="10" fill="#5B6B61">collate {twin.collate}/{p.stripsPerCarton} · load</text>
            </g>
            {STATIONS.filter((s) => ['S7', 'S9', 'S10'].includes(s.id)).map((s) => (
              <g key={s.id} className="station" onClick={() => setSel({ id: s.id })}>
                <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="10" fill={st(s.id).fill} stroke={st(s.id).stroke} strokeWidth="2" />
                <text x={s.x + s.w / 2} y={s.y + 22} textAnchor="middle" fontSize="14" fontWeight="700" fill="#1B2A21">{s.id}</text>
                <text x={s.x + s.w / 2} y={s.y + 38} textAnchor="middle" fontSize="11" fill="#5B6B61">{s.name}</text>
              </g>
            ))}
            <rect x="1042" y="536" width="68" height="20" rx="5" fill="#FDEEEC" stroke="#D0574B" />
            <text x="1076" y="550" textAnchor="middle" fontSize="10.5" fill="#8F2C22">{twin.m.cartonsRejected} cartons</text>
          </>
        ) : (
          <g>
            <rect x="400" y="200" width="790" height="330" rx="14" fill="#FFF8EC" stroke="#E2A23B" strokeWidth="2" />
            <text x="795" y="236" textAnchor="middle" fontSize="17" fontWeight="700" fill="#7D5810">Manual secondary packing (baseline)</text>
            <text x="795" y="258" textAnchor="middle" fontSize="12.5" fill="#7D5810">
              {(p.opsPerShift * twin.present).toFixed(1)} operators effective · {p.manualCycle}s per carton · pace {(100 - p.fatigueDrop * ((twin.t % (p.shiftHours * 3600)) / (p.shiftHours * 3600))).toFixed(0)}% (fatigue)
            </text>
            {Array.from({ length: Math.round(p.opsPerShift) }, (_, i) => {
              const ox = 460 + i * (680 / Math.max(1, Math.round(p.opsPerShift) - 1 || 1));
              const absent = i >= Math.round(p.opsPerShift * twin.present);
              const bob = absent ? 0 : Math.sin(now * 4 + i) * 3;
              return (
                <g key={i} opacity={absent ? 0.3 : 1}>
                  <circle cx={ox} cy={330 + bob} r="13" fill={absent ? '#B4BEB7' : '#E2A23B'} />
                  <rect x={ox - 16} y={348 + bob} width="32" height="42" rx="10" fill={absent ? '#B4BEB7' : '#C9962B'} />
                  <text x={ox} y="420" textAnchor="middle" fontSize="10.5" fill="#7D5810">{absent ? 'absent' : `Op ${i + 1}`}</text>
                </g>
              );
            })}
            <text x="795" y="470" textAnchor="middle" fontSize="12.5" fill="#7D5810">Pick 2 strips → align → fold into a nested coil by hand → insert into carton</text>
            <text x="795" y="492" textAnchor="middle" fontSize="12.5" fill="#7D5810">Primary throttled to {p.throttledSpeed} sachets/min · COPQ {p.copqBefore}%</text>
            <text x="795" y="516" textAnchor="middle" fontSize="13" fontWeight="700" fill="#7D5810">Out {k.cpm.toFixed(1)} cartons/min · pile-up {twin.buffer}/{p.pileupCapacity} strips</text>
          </g>
        )}

        {strips.map((s, i) => (
          <rect key={`s${i}`} x={s.x - (s.vertical ? 4 : 14)} y={s.y - (s.vertical ? 14 : 4)} width={s.vertical ? 8 : 28} height={s.vertical ? 28 : 8} rx="2" fill={s.defect ? '#D0574B' : '#14A651'} stroke="#fff" strokeWidth="1" />
        ))}
        {cartons.map((c, i) => (
          <rect key={`c${i}`} x={c.x - 11} y={c.y - 9} width="22" height="18" rx="2" fill="#C9A26B" stroke={c.reject ? '#D0574B' : '#8A6A3C'} strokeWidth={c.reject ? 2.5 : 1} />
        ))}

        {/* live flow readouts */}
        {!compact && auto && (
          <g fontSize="11.5" fill="#5B6B61">
            <text x="430" y="378">Cell rate <tspan fontWeight="700" fill="#1B2A21">{auto && cs !== 'down' && cs !== 'hold' ? (twin.cell.rate * 60).toFixed(0) : 0} strips/min</tspan> · demand {d.stripsPerMin.toFixed(0)} · max {d.cellMax.toFixed(0)}</text>
            <text x="1124" y="436" textAnchor="end">Out <tspan fontWeight="700" fill="#1B2A21">{k.cpm.toFixed(1)} cartons/min</tspan></text>
          </g>
        )}
        <text x="1196" y="32" textAnchor="end" fontSize="11.5" fill="#5B6B61">{speed}× · {twin.animate ? 'item view' : 'flow view'}</text>
      </svg>

      {sel && (
        <div className="pop" style={{ right: 12, top: 12 }}>
          <div className="row between"><b style={{ color: '#0b6b34' }}>{sel.id === 'PRIMARY' ? 'Primary FFS machine' : sel.id === 'S1' ? 'S1 FIFO accumulator' : sel.id === 'S5' ? 'S5 Fold turret' : sel.id === 'S6' ? 'S6 Collation / S8 Top-load' : `${selSt?.id} ${selSt?.name}`}</b><button className="btn sm" onClick={() => setSel(null)}>✕</button></div>
          <div className="sep" style={{ margin: '8px 0' }} />
          {sel.id === 'PRIMARY' && (<div className="stack" style={{ gap: 4 }}>
            <div>State: <b>{COL[prim].label}</b></div>
            <div>Speed now: <b>{Math.round(k.primaryRpm)}</b> sachets/min (nameplate {p.primarySpeed})</div>
            <div>Own stops: <b>{twin.m.primStops}</b> · blocked events: <b>{twin.m.blockedEvents}</b></div>
            <div>Blocked time: <b>{k.blockedPct.toFixed(2)}%</b></div>
          </div>)}
          {sel.id === 'S1' && (<div className="stack" style={{ gap: 4 }}>
            <div>Level: <b>{twin.buffer}</b> / {bufCap} strips ({bufPct.toFixed(0)}%)</div>
            <div>Absorbs a stop of <b>{(bufCap / Math.max(1, d.stripsPerMin) * 60).toFixed(0)} s</b></div>
            <div>Refills headroom in <b>{d.cellMax > d.stripsPerMin ? (bufCap / (d.cellMax - d.stripsPerMin)).toFixed(1) : '∞'} min</b></div>
          </div>)}
          {['S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S9', 'S10'].includes(sel.id) && (() => {
            const ds = d.stations.find((x) => x.id === sel.id) || d.stations.find((x) => x.id === 'S6');
            const state = stState(sel.id);
            return (<div className="stack" style={{ gap: 4 }}>
              <div>State: <b style={{ color: COL[state].text }}>{COL[state].label}</b></div>
              <div>Rated: <b>{ds.cap.toFixed(0)}</b> {ds.unit}/min · load <b>{ds.load.toFixed(0)}%</b></div>
              {sel.id === 'S4' && <div>Rejected strips: <b>{twin.m.stripsRejected}</b></div>}
              {sel.id === 'S10' && <div>Rejected cartons: <b>{twin.m.cartonsRejected}</b> · good <b>{twin.m.cartonsGood}</b></div>}
              {auto && (twin.cell.hold
                ? <button className="btn sm primary" onClick={() => setHold(false)}>Release hold</button>
                : <button className="btn sm danger" onClick={() => setHold(true, `${sel.id} maintenance hold`)}>Hold {sel.id} for maintenance</button>)}
            </div>);
          })()}
        </div>
      )}
    </div>
  );
}
