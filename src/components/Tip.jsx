import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

// Plain-language definitions used by tooltips across the app.
export const GLOSSARY = {
  OEE: 'Overall Equipment Effectiveness = Availability × Performance × Quality. 82% is the case target.',
  Availability: 'Share of planned time the primary machine is actually producing (not stopped, blocked or in a planned stop).',
  Performance: 'Actual output while running, as a share of nameplate speed (1,500 sachets/min). The manual throttle shows up here.',
  Quality: 'Good sachets as a share of all sachets made. 1 − COPQ.',
  COPQ: 'Cost of Poor Quality: value lost to scrap, punctures, torn perforations and destructive testing, as % of production value.',
  Takt: 'Time available per unit to keep up with demand. 60 ÷ units per minute.',
  MTTR: 'Mean Time To Repair: average length of a cell stop.',
  NPV: 'Net Present Value: all future cash flows discounted to today, minus the investment. Above zero creates value.',
  IRR: 'Internal Rate of Return: the discount rate at which NPV is exactly zero.',
  Payback: 'Months until cumulative cash flow turns positive. Discounted payback applies the discount rate first.',
  Headroom: 'How much faster the cell can run than the line feeds it. It is the catch-up speed that empties the buffer after a stop.',
  Blocking: 'Time the primary machine must stop because the buffer is full. This is lost production.',
  Buffer: 'FIFO accumulator between the primary machine and the cell. It absorbs short cell stops.',
  'Soft slowdown': 'When the buffer is almost full, the primary eases to a lower speed instead of stopping hard.',
  GSM: 'Grams per square metre of the laminate. Variation forces the primary to slow down (scenario A).',
  TPM: 'Total Productive Maintenance: routine cleaning, inspection and lubrication by operators, plus planned maintenance.',
  MCDA: 'Multi-criteria decision analysis: score each option on several criteria, weight them, and add up.',
};

export function Tip({ text, children, width = 280, block = false }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, r.left + r.width / 2 - width / 2));
    const below = r.top < 140;
    setPos({ left, top: below ? r.bottom + 8 : r.top - 8, below });
  };
  const hide = () => setPos(null);
  if (!text) return children;
  return (
    <span ref={ref} className={`tipwrap ${block ? 'block' : ''}`} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} tabIndex={0}>
      {children}
      {pos && createPortal(
        <div className={`tipbubble ${pos.below ? 'below' : ''}`} style={{ left: pos.left, top: pos.top, width }} role="tooltip">{text}</div>,
        document.body,
      )}
    </span>
  );
}

export function InfoTip({ text, size = 13 }) {
  if (!text) return null;
  return <Tip text={text}><Info size={size} className="infoicon" aria-label="More info" /></Tip>;
}

export const g = (term) => GLOSSARY[term];
