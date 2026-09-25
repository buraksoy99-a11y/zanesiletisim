import {useEffect, useState} from 'react';

export const prefersReducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// True once the element has been seen; drives the one-time draw-in of illustrations.
export function useRevealed(ref, threshold = .3) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) { setRevealed(true); return undefined; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setRevealed(true); observer.disconnect(); } }, {threshold});
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return revealed;
}

// False while the element is off screen, so its ambient loops can pause.
export function useOnScreen(ref) {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return onScreen;
}
