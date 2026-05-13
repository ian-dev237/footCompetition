'use client';
import { useEffect, useRef, useState } from 'react';
import PlayerAvatar from './PlayerAvatar';
import clsx from 'clsx';

export type DrawPlayer = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

export type DrawPair = {
  key: string;
  label?: string;
  a: DrawPlayer;
  b: DrawPlayer;
};

type Props = {
  title: string;
  subtitle?: string;
  pairs: DrawPair[];
  poolForRoulette: DrawPlayer[];
  /** Session-scoped key used to suppress replays within the same browser tab. */
  storageKey: string;
  onDone?: () => void;
};

// Total budget ≈ 5s
const COUNTDOWN_MS = 600;            // each of 3, 2, 1, GO = 4 ticks → ~2.4s … reduced to ~2.0s
const COUNTDOWN_STEPS = ['3', '2', '1', 'GO'];
const SPIN_AFTER_COUNTDOWN_MS = 300; // breathing room before locking
const LOCK_STAGGER_MS = 380;         // delay between each pair locking
const HOLD_MS = 700;                 // hold final state before closing
const SPIN_TICK_MS = 90;             // avatar cycle speed during roll

export default function DrawAnimation({
  title, subtitle, pairs, poolForRoulette, storageKey, onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'countdown' | 'reveal' | 'done'>('countdown');
  const [step, setStep] = useState(0);                 // 0..3 (3,2,1,GO)
  const [tickN, setTickN] = useState(0);               // drives roulette frame
  const [lockedCount, setLockedCount] = useState(0);   // pairs that have locked

  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  };

  // Open once per session (per storageKey)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(storageKey)) { onDone?.(); return; }
    } catch { /* sessionStorage might be unavailable */ }
    setOpen(true);
    // mark immediately so a refresh during the animation doesn't re-trigger
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
  }, [storageKey, onDone]);

  // Countdown ticks
  useEffect(() => {
    if (!open || phase !== 'countdown') return;
    if (step < COUNTDOWN_STEPS.length - 1) {
      const t = window.setTimeout(() => setStep(s => s + 1), COUNTDOWN_MS) as unknown as number;
      timers.current.push(t);
      return () => clearTimeout(t);
    }
    // After GO, brief pause then start revealing
    const t = window.setTimeout(() => setPhase('reveal'), SPIN_AFTER_COUNTDOWN_MS) as unknown as number;
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [open, phase, step]);

  // Roulette cycle (only while pairs are still rolling)
  useEffect(() => {
    if (!open) return;
    if (phase !== 'reveal') return;
    if (lockedCount >= pairs.length) return;
    const id = window.setInterval(() => setTickN(n => n + 1), SPIN_TICK_MS) as unknown as number;
    return () => clearInterval(id);
  }, [open, phase, lockedCount, pairs.length]);

  // Schedule pair locks one by one
  useEffect(() => {
    if (phase !== 'reveal') return;
    clearTimers();
    for (let i = 0; i < pairs.length; i++) {
      const t = window.setTimeout(() => setLockedCount(c => Math.max(c, i + 1)), LOCK_STAGGER_MS * (i + 1)) as unknown as number;
      timers.current.push(t);
    }
    // After all are locked, hold then close
    const tEnd = window.setTimeout(() => {
      setPhase('done');
      window.setTimeout(() => { setOpen(false); onDone?.(); }, 200);
    }, LOCK_STAGGER_MS * pairs.length + HOLD_MS) as unknown as number;
    timers.current.push(tEnd);

    return () => clearTimers();
  }, [phase, pairs.length, onDone]);

  if (!open || pairs.length === 0) return null;

  const poolSafe = poolForRoulette.length > 0 ? poolForRoulette : pairs.flatMap(p => [p.a, p.b]);

  return (
    <div className="fixed inset-0 z-[100] bg-bg-primary/95 backdrop-blur-md overflow-y-auto">
      {/* Subtle gradient backdrop, fixed so it always covers the viewport */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15),transparent_60%)]" />

      <button
        onClick={() => {
          clearTimers();
          try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
          setOpen(false); onDone?.();
        }}
        className="fixed top-4 right-4 text-xs text-txt-secondary hover:text-txt-primary z-20"
      >
        Passer ✕
      </button>

      {/* Inner wrapper: min-height ensures vertical centering when content fits,
          but allows the page to grow & scroll when there are many pairs. */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-3xl flex flex-col items-center">
          <div className="mb-1 text-[10px] uppercase tracking-[0.3em] text-txt-muted font-bold">
            {subtitle}
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-6 text-center bg-gradient-to-r from-accent-blue via-accent-cyan to-accent-gold bg-clip-text text-transparent">
            {title}
          </h2>

          {phase === 'countdown' && (
            <div
              key={step}
              className="text-[110px] sm:text-[160px] font-black leading-none tabular-nums text-accent-blue drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]"
              style={{ animation: 'cdpop 0.6s ease-out forwards' }}
            >
              {COUNTDOWN_STEPS[step]}
            </div>
          )}

          {(phase === 'reveal' || phase === 'done') && (
            <div className="w-full space-y-2">
              {pairs.map((p, i) => (
                <PairRow
                  key={p.key}
                  pair={p}
                  locked={i < lockedCount}
                  pool={poolSafe}
                  tickN={tickN + i}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes cdpop {
          0%   { transform: scale(0.5); opacity: 0; }
          40%  { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes lockflash {
          0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.7); }
          50%  { box-shadow: 0 0 0 12px rgba(245, 158, 11, 0); }
          100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
        }
      `}</style>
    </div>
  );
}

function PairRow({
  pair, locked, pool, tickN,
}: { pair: DrawPair; locked: boolean; pool: DrawPlayer[]; tickN: number }) {
  // Pick "rolling" players from the pool — avoid showing the locked players during the roll
  const idxA = Math.abs(tickN * 7) % pool.length;
  const idxB = Math.abs(tickN * 11 + 3) % pool.length;
  const rollA = pool[idxA] ?? pair.a;
  const rollB = pool[idxB] ?? pair.b;

  const playerA = locked ? pair.a : rollA;
  const playerB = locked ? pair.b : rollB;

  return (
    <div
      className={clsx(
        'rounded-2xl border bg-bg-secondary px-3 sm:px-5 py-2.5 transition-all duration-300',
        locked
          ? 'border-accent-gold/60 bg-gradient-to-r from-accent-gold/5 via-bg-secondary to-accent-gold/5'
          : 'border-bdr',
      )}
      style={locked ? { animation: 'lockflash 0.7s ease-out' } : undefined}
    >
      {pair.label && (
        <div className="text-center text-[9px] uppercase tracking-wider text-txt-muted font-bold mb-1">
          {pair.label}
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        <Slot player={playerA} locked={locked} side="left" />
        <div className={clsx(
          'font-black transition-all px-1',
          locked ? 'text-accent-gold text-2xl sm:text-3xl' : 'text-txt-muted text-xl sm:text-2xl',
        )}>
          VS
        </div>
        <Slot player={playerB} locked={locked} side="right" />
      </div>
    </div>
  );
}

function Slot({
  player, locked, side,
}: { player: DrawPlayer; locked: boolean; side: 'left' | 'right' }) {
  return (
    <div className={clsx(
      'flex items-center gap-2 sm:gap-3 min-w-0',
      side === 'right' ? 'flex-row-reverse text-right' : '',
    )}>
      <div className={clsx(
        'rounded-full transition-all duration-300 shrink-0',
        locked
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
          'font-bold truncate transition text-sm sm:text-base',
          locked ? 'text-txt-primary' : 'text-txt-secondary blur-[1.5px]',
        )}>
          {player.name}
        </div>
      </div>
    </div>
  );
}
