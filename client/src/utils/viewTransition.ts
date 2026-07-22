import { flushSync } from 'react-dom';

// Progressive enhancement: falls back to a plain synchronous update
// on browsers without the View Transitions API.
export function withViewTransition(update: () => void): void {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => void;
  };

  if (typeof doc.startViewTransition === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    doc.startViewTransition(() => {
      flushSync(update);
    });
  } else {
    update();
  }
}
