'use client';
import { useEffect } from 'react';
import PlayerAvatar from './PlayerAvatar';
import clsx from 'clsx';

export type RecapPair = {
  key: string;
  label?: string;
  a: { id: string; name: string; initials: string; color: string; imageUrl: string | null };
  b: { id: string; name: string; initials: string; color: string; imageUrl: string | null };
  scoreA?: number | null;
  scoreB?: number | null;
  status?: string; // PENDING | LIVE | FINISHED
};

/**
 * Static "recap" overlay that mirrors the look of DrawAnimation — same backdrop,
 * same gradient title, same card style — but with no countdown, no roulette, and
 * the scores rendered next to each pair. Closable via ✕ / Escape / click outside.
 */
export default function DrawRecap({
  open, title, subtitle, pairs, onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  pairs: RecapPair[];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-bg-primary/95 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15),transparent_60%)]" />

      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="fixed top-4 right-4 z-20 rounded-full bg-bg-secondary/90 backdrop-blur border border-bdr w-9 h-9 flex items-center justify-center text-txt-secondary hover:text-txt-primary hover:border-status-loss/60 text-base"
      >
        ✕
      </button>

      <div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:py-14"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full max-w-3xl flex flex-col items-center">
          <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-txt-muted font-bold">
            {subtitle}
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-gold bg-clip-text text-transparent">
            {title}
          </h2>

          <div className="w-full space-y-2">
            {pairs.map(p => <RecapRow key={p.key} pair={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecapRow({ pair }: { pair: RecapPair }) {
  const finished = pair.status === 'FINISHED' && pair.scoreA != null && pair.scoreB != null;
  const live     = pair.status === 'LIVE';
  const hasScore = pair.scoreA != null || pair.scoreB != null;
  const aWins = finished && (pair.scoreA ?? 0) > (pair.scoreB ?? 0);
  const bWins = finished && (pair.scoreB ?? 0) > (pair.scoreA ?? 0);

  return (
    <div
      className={clsx(
        'rounded-2xl border bg-bg-secondary px-3 sm:px-5 py-2.5 transition-all',
        finished
          ? 'border-accent-gold/60 bg-gradient-to-r from-accent-gold/5 via-bg-secondary to-accent-gold/5'
          : 'border-bdr',
      )}
    >
      {pair.label && (
        <div className="text-center text-[9px] uppercase tracking-wider text-txt-muted font-bold mb-1 flex items-center justify-center gap-2">
          <span>{pair.label}</span>
          {live && (
            <span className="inline-flex items-center gap-1 text-status-loss">
              <span className="h-1.5 w-1.5 rounded-full bg-status-loss animate-livepulse" />
              LIVE
            </span>
          )}
          {finished && <span className="text-status-win">FT</span>}
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <Slot
          player={pair.a}
          highlight={aWins}
          side="left"
        />
        <div className={clsx(
          'font-black transition-all px-1 leading-none',
          hasScore
            ? 'text-3xl sm:text-4xl text-txt-primary tabular-nums'
            : 'text-2xl sm:text-3xl text-accent-gold',
        )}>
          {hasScore ? (
            <>
              <span className={clsx(aWins && 'text-status-win')}>{pair.scoreA ?? '-'}</span>
              <span className="text-txt-muted mx-1">–</span>
              <span className={clsx(bWins && 'text-status-win')}>{pair.scoreB ?? '-'}</span>
            </>
          ) : 'VS'}
        </div>
        <Slot
          player={pair.b}
          highlight={bWins}
          side="right"
        />
      </div>
    </div>
  );
}

function Slot({
  player, highlight, side,
}: {
  player: RecapPair['a'];
  highlight: boolean;
  side: 'left' | 'right';
}) {
  return (
    <div className={clsx(
      'flex items-center gap-2 sm:gap-3 min-w-0',
      side === 'right' ? 'flex-row-reverse text-right' : '',
    )}>
      <div className={clsx(
        'rounded-full transition-all shrink-0',
        highlight
          ? 'ring-2 ring-accent-gold/80 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
          : 'ring-2 ring-bdr',
      )}>
        <PlayerAvatar
          name={player.name}
          initials={player.initials}
          color={player.color}
          imageUrl={player.imageUrl}
          size={48}
        />
      </div>
      <div className="min-w-0">
        <div className={clsx(
          'font-bold truncate text-sm sm:text-base',
          highlight ? 'text-txt-primary' : 'text-txt-secondary',
        )}>
          {player.name}
        </div>
      </div>
    </div>
  );
}
