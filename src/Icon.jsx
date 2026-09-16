import React from 'react';

const paths = {
  arrow: <><path d="M5 19 19 5M5 5h14v14" /></>,
  right: <path d="M4 12h16m-7-7 7 7-7 7" />,
  down: <path d="M12 4v16m-7-7 7 7 7-7" />,
  up: <path d="M12 20V4m-7 7 7-7 7 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  phone: <path d="m7 3 3 5-2.5 2a15 15 0 0 0 6.5 6.5l2-2.5 5 3v2a2 2 0 0 1-2.2 2A19.5 19.5 0 0 1 3 5.2 2 2 0 0 1 5 3Z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  signal: <><path d="M4 20v-3m5 3v-7m5 7V9m5 11V4" /></>,
  battery: <><rect x="2" y="7" width="17" height="10" rx="2" /><path d="M22 10v4M5 10v4m3-4v4m3-4v4m3-4v4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
};

export default function Icon({name = 'arrow', className = '', ...props}) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}

export function ConnectionMark({className = ''}) {
  return <svg className={`connection-mark ${className}`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <circle cx="50" cy="50" r="9" />
    <path d="M33 33a24 24 0 0 0 0 34m34-34a24 24 0 0 1 0 34" />
    <path d="M22 22a40 40 0 0 0 0 56m56-56a40 40 0 0 1 0 56" />
    <path d="M42 11a40 40 0 0 1 16 0m-16 78a40 40 0 0 0 16 0" />
  </svg>;
}
