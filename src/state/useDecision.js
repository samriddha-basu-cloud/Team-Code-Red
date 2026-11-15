import { useMemo } from 'react';
import { useParams } from './ParamsContext.jsx';
import { useTwinCtl } from './TwinContext.jsx';
import { gateHeavy, evaluateGates, optionFacts, scoreMatrix, rank, flipAnalysis, DEFAULT_GATES, DEFAULT_WEIGHTS, DEFAULT_SCORES } from '../model/decision.js';

export function useDecision() {
  const { params: p, d, fin, oee, blocking, ws } = useParams();
  const { twin } = useTwinCtl();
  const heavy = useMemo(() => gateHeavy(p), [p]);
  const gates = { ...DEFAULT_GATES, ...(ws.gates || {}) };
  const weights = { ...DEFAULT_WEIGHTS, ...(ws.weights || {}) };
  const scores = useMemo(() => {
    const s = {};
    for (const k of Object.keys(DEFAULT_SCORES)) s[k] = { ...DEFAULT_SCORES[k], ...((ws.scores || {})[k] || {}) };
    return s;
  }, [ws.scores]);
  const facts = useMemo(() => optionFacts(p, d, blocking.blockedPct), [p, d, blocking]);
  const matrix = useMemo(() => scoreMatrix(facts, scores), [facts, scores]);
  const ranking = useMemo(() => rank(matrix, weights), [matrix, ws.weights]); // eslint-disable-line react-hooks/exhaustive-deps
  const flips = useMemo(() => flipAnalysis(matrix, weights), [matrix, ws.weights]); // eslint-disable-line react-hooks/exhaustive-deps
  const gate = evaluateGates({ p, d, fin, oee, blocking, twin, ws, gates, heavy });
  return { gate, gates, weights, scores, facts, matrix, ranking, flips, heavy };
}
