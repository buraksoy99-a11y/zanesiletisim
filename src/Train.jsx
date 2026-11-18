import React from 'react';

// Shared train symbol; the feedback "sent" animation carries the note on it.
export function TrainSprite() {
  return <svg width="0" height="0" className="sprite" aria-hidden="true" focusable="false">
    <symbol id="train-sym" viewBox="-38 -9 76 18">
      <path d="M-35 -7.5H25Q36-7.5 36 0Q36 7.5 25 7.5H-35Q-37 7.5-37 5.5V-5.5Q-37-7.5-35-7.5Z" fill="#fff" stroke="#000" strokeWidth="2" />
      {[-31, -19, -7, 5].map(x => <rect key={x} x={x} y="-4.5" width="9" height="4.5" rx="1" fill="#000" />)}
      <path d="M18-4.5H27Q31-4.5 32.5-1V0H18Z" fill="#000" />
      <rect x="-35" y="2.5" width="62" height="2" fill="#e60000" />
    </symbol>
  </svg>;
}
