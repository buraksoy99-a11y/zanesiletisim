import React from 'react';

const paths = {
  phone: <path d="m7 3 3 5-2.5 2a15 15 0 0 0 6.5 6.5l2-2.5 5 3v2a2 2 0 0 1-2.2 2A19.5 19.5 0 0 1 3 5.2 2 2 0 0 1 5 3Z" />,
  locate: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3" /></>,
  external: <path d="M14 5h5v5m0-5-8 8m7 1v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />,
  send: <><path d="M21 3 3 10.5l7.5 3L13.5 21 21 3Z" /><path d="m10.5 13.5 4-4" /></>,
  check: <path pathLength="1" d="m5 12.5 4.5 4.5L19 7.5" />,
  toggle: <><path className="i-plus" d="M12 5v14M5 12h14" /><path className="i-tick" pathLength="1" d="m5 12.5 4.5 4.5L19 7.5" /></>,
};

export default function Icon({name, className = ''}) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

// Company "rounded-z" geometry (AutomationLocal brand/zanes-v1) on a red tile, in 64-unit space.
export const Z_PATH = 'M11 16Q11 13 14 13L50 13Q53 13 53 16L53 19.6Q53 22 51.08 23.44L30.92 38.56Q29 40 31.4 40L50 40Q53 40 53 43L53 48Q53 51 50 51L14 51Q11 51 11 48L11 44.4Q11 42 12.92 40.56L33.08 25.44Q35 24 32.6 24L14 24Q11 24 11 21Z';

export function ZMark({className = ''}) {
  return <svg className={`zmark ${className}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect width="64" height="64" rx="15" fill="#e60000" />
    <path fill="#fff" d={Z_PATH} />
  </svg>;
}
