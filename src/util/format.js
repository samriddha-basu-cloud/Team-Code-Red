export const CR = 1e7;
export const LAKH = 1e5;

export const fmtCr = (v, d = 2) => (v == null || !isFinite(v) ? '—' : `₹${(v / CR).toFixed(d)} Cr`);
export const fmtL = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `₹${(v / LAKH).toFixed(d)} L`);
export const fmtPct = (v, d = 1) => (v == null || !isFinite(v) ? '—' : `${v.toFixed(d)}%`);
export const fmtNum = (v, d = 0) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }));
export const fmtMonths = (years) => (years == null || !isFinite(years) ? 'n/a' : `${(years * 12).toFixed(1)} mo`);

export function fmtClock(t) {
  const day = Math.floor(t / 86400);
  const s = Math.floor(t % 86400);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `D${day + 1} ${hh}:${mm}:${ss}`;
}

export function fmtDur(sec) {
  if (sec < 60) return `${Math.round(sec)} s`;
  if (sec < 3600) return `${(sec / 60).toFixed(1)} min`;
  if (sec < 86400) return `${(sec / 3600).toFixed(1)} h`;
  return `${(sec / 86400).toFixed(1)} d`;
}
