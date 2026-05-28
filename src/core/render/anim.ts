/*
 * Shared animation loop. Wraps requestAnimationFrame with two manners every
 * animated module should observe but rarely re-implement:
 *   - pause when the tab is hidden (document.hidden) to save battery;
 *   - honour prefers-reduced-motion by drawing a single static frame.
 *
 * draw receives elapsed time in seconds. The returned controller's stop()
 * cancels the loop and detaches listeners.
 */

export interface AnimController {
  stop(): void;
}

export function startAnimation(draw: (tSeconds: number) => void): AnimController {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const start = performance.now();
  let raf = 0;
  let stopped = false;

  const frame = () => {
    if (stopped) return;
    draw((performance.now() - start) / 1000);
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => {
    if (stopped) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (raf === 0 && !reduced) {
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener('visibilitychange', onVisibility);

  if (reduced) draw(0);
  else raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
