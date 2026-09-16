import {useEffect} from 'react';

export default function useMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    const elements = [...document.querySelectorAll('[data-reveal]')];
    const hero = document.querySelector('.hero-art');
    const about = document.querySelector('.about');
    let observer;
    let frame = 0;
    let disposed = false;
    let scrollBound = false;

    const update = () => {
      frame = 0;
      if (disposed) return;
      const max = root.scrollHeight - innerHeight;
      root.style.setProperty('--page-progress', max > 0 ? String(Math.min(1, scrollY / max)) : '0');
      root.classList.toggle('has-scrolled', scrollY > 24);
      if (!preference.matches && hero) {
        const box = hero.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (96 - box.top) / box.height));
        hero.style.setProperty('--phone-y', `${progress * -52}px`);
        hero.style.setProperty('--phone-turn', `${progress * 10}deg`);
        hero.style.setProperty('--orbit-turn', `${progress * 30}deg`);
      }
      if (!preference.matches && about) {
        const box = about.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, (innerHeight - box.top) / (innerHeight + box.height)));
        about.style.setProperty('--mark-turn', `${(progress - .5) * 75}deg`);
      }
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    const reveal = element => { element.classList.add('is-visible'); observer?.unobserve(element); };
    const configure = () => {
      observer?.disconnect();
      root.classList.toggle('motion-enabled', !preference.matches);
      if (preference.matches) {
        elements.forEach(reveal);
        hero?.style.removeProperty('--phone-y');
        hero?.style.removeProperty('--phone-turn');
        hero?.style.removeProperty('--orbit-turn');
        about?.style.removeProperty('--mark-turn');
      } else if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          entries.forEach(entry => { if (entry.isIntersecting) reveal(entry.target); });
        }, {threshold:.08, rootMargin:'0px 0px -24px 0px'});
        elements.forEach(element => { if (!element.classList.contains('is-visible')) observer.observe(element); });
      } else elements.forEach(reveal);
      queue();
    };
    // Keyboard and hash navigation must never land on visually hidden content.
    const onFocus = event => {
      let target = event.target.closest('[data-reveal]');
      while (target) { reveal(target); target = target.parentElement?.closest('[data-reveal]'); }
    };
    const onHash = () => {
      if (!location.hash) return;
      const section = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (section?.matches('[data-reveal]')) reveal(section);
      section?.querySelectorAll('[data-reveal]').forEach(reveal);
    };
    configure();
    onHash();
    window.addEventListener('scroll', queue, {passive:true});
    window.addEventListener('resize', queue);
    window.addEventListener('hashchange', onHash);
    document.addEventListener('focusin', onFocus);
    preference.addEventListener('change', configure);
    scrollBound = true;
    return () => {
      disposed = true;
      observer?.disconnect();
      cancelAnimationFrame(frame);
      if (scrollBound) window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      window.removeEventListener('hashchange', onHash);
      document.removeEventListener('focusin', onFocus);
      preference.removeEventListener('change', configure);
      root.classList.remove('motion-enabled');
    };
  }, []);
}
