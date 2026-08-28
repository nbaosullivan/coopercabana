'use client';

import { useEffect, useState } from 'react';

/**
 * Startup splash for the standalone (home-screen) app.
 *
 * It is part of the server-rendered HTML, so the browser paints the logo and
 * spinner on the very first paint - before the JS bundle has loaded and React
 * has hydrated. Without it a standalone launch just shows a plain dark screen
 * for the first few hundred ms. Once React has mounted and committed a frame
 * it fades out, revealing the app underneath.
 *
 * Only appears on full page loads (first launch, or a manual refresh) - not on
 * in-app tab navigation, which never reloads the layout.
 */
export default function AppSplash() {
  const [phase, setPhase] = useState<'show' | 'fade' | 'gone'>('show');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => {
      setPhase('fade');
      timer = setTimeout(() => setPhase('gone'), 350);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-zinc-950 transition-opacity duration-300 ${
        phase === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <img src="/coopercabana.png" alt="" className="h-20 w-20 rounded-full object-cover" />
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:300ms]" />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Coopercabana
      </p>
    </div>
  );
}
