'use client';

import { useState } from 'react';
import { Ticket, X, Download } from 'lucide-react';
import { boardingPassCandidates } from '@/lib/boardingPass';

function usePassSlot(candidates: string[], initialSrc: string | null) {
  // initialSrc is the server-resolved verdict (existing file or null) — it is
  // authoritative. We do NOT fall back to candidates[0] here, or someone with
  // no pass would render the card (and flash a broken image) until onError.
  const [src, setSrc] = useState<string | null>(initialSrc);
  function onError() {
    if (!src) return;
    const i = candidates.indexOf(src);
    if (i >= 0 && i < candidates.length - 1) setSrc(candidates[i + 1]);
    else setSrc(null);
  }
  return { src, onError };
}

function PassImage({
  src,
  label,
  onOpen,
}: {
  src: string;
  label: string;
  onOpen: (src: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(src)}
      className="block w-full overflow-hidden rounded-xl border border-zinc-800 bg-white"
      aria-label={`Open ${label} boarding pass full screen`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="h-auto w-full object-contain" />
    </button>
  );
}

export default function BoardingPassCard({
  attendeeId,
  passes,
}: {
  attendeeId: string;
  passes: { outbound: string | null; return: string | null };
}) {
  const outbound = usePassSlot(boardingPassCandidates(attendeeId, 'outbound'), passes.outbound);
  const ret = usePassSlot(boardingPassCandidates(attendeeId, 'return'), passes.return);
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  const hasPass = Boolean(outbound.src || ret.src);
  if (!hasPass) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Ticket className="h-4 w-4 text-emerald-500" />
        <h2 className="text-sm font-semibold text-zinc-200">Boarding passes</h2>
      </div>

      <div className="grid grid-cols-2 items-start gap-3">
        {outbound.src && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Outbound
            </p>
            <PassImage src={outbound.src} label="Outbound boarding pass" onOpen={setFullscreen} />
          </div>
        )}
        {ret.src && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Return
            </p>
            <PassImage src={ret.src} label="Return boarding pass" onOpen={setFullscreen} />
          </div>
        )}
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
          onClick={() => setFullscreen(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullscreen}
            alt="Boarding pass"
            className="max-h-[85vh] max-w-full rounded-lg bg-white object-contain"
          />
          <div className="mt-4 flex gap-3">
            <a
              href={fullscreen}
              download
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-cream"
            >
              <Download className="h-4 w-4" /> Save
            </a>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFullscreen(null);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
