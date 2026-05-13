'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import PlayerAvatar from '@/components/PlayerAvatar';

type Loser = {
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

type Props = {
  slug: string;
  celebrationAt: string;
  championName: string;
  championInitials: string;
  championColor: string;
  championImageUrl: string | null;
  losers: Loser[];
  totalPlayers: number;
};

const PRIZE_PER_PLAYER = 2000; // FCFA per player in the prize pool
const PER_LOSER_MS = 2000;     // each losing player stays on screen for 2s

type PhaseKey = 'buildup' | 'reveal' | 'losers' | 'prize' | 'hold';

const CONFETTI_COUNT = 80;
const CONFETTI_COLORS = ['#F59E0B', '#3B82F6', '#06B6D4', '#EC4899', '#10B981', '#F97316', '#A855F7'];

function formatCFA(n: number): string {
  return n.toLocaleString('fr-FR').replace(/ /g, ' ');
}

export default function ChampionCelebration({
  slug, celebrationAt, championName, championInitials, championColor, championImageUrl,
  losers, totalPlayers,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<PhaseKey>('buildup');
  const [loserIdx, setLoserIdx] = useState(0);
  const timersRef = useRef<number[]>([]);

  // Include the trigger timestamp so a relaunch replays the animation even in
  // a tab that already saw the previous one.
  const storageKey = `champion-celebration:${slug}:${celebrationAt}`;
  const totalPrize = totalPlayers * PRIZE_PER_PLAYER;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch { /* ignore */ }
    setOpen(true);
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
  }, [storageKey]);

  // Phase durations depend on the number of losers (each gets PER_LOSER_MS).
  const phases = useMemo(() => ([
    { key: 'buildup' as PhaseKey, ms: 2000 },
    { key: 'reveal'  as PhaseKey, ms: 10000 },
    { key: 'losers'  as PhaseKey, ms: Math.max(PER_LOSER_MS, losers.length * PER_LOSER_MS) },
    { key: 'prize'   as PhaseKey, ms: 8000 },
    { key: 'hold'    as PhaseKey, ms: 2000 },
  ]), [losers.length]);

  // Phase scheduler
  useEffect(() => {
    if (!open) return;
    let cumulative = 0;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    for (const p of phases) {
      cumulative += p.ms;
      const t = window.setTimeout(() => {
        const idx = phases.findIndex(x => x.key === p.key);
        const next = phases[idx + 1];
        if (next) setPhase(next.key);
        else setOpen(false);
      }, cumulative) as unknown as number;
      timersRef.current.push(t);
    }
    return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  }, [open, phases]);

  // Losers carousel: each player stays on screen for PER_LOSER_MS.
  useEffect(() => {
    if (phase !== 'losers' || losers.length === 0) return;
    setLoserIdx(0);
    const id = window.setInterval(() => {
      setLoserIdx(i => Math.min(losers.length - 1, i + 1));
    }, PER_LOSER_MS);
    return () => clearInterval(id);
  }, [phase, losers.length]);

  // Prize count-up during the 'prize' phase
  const [displayedPrize, setDisplayedPrize] = useState(0);
  useEffect(() => {
    if (phase !== 'prize') { setDisplayedPrize(totalPrize); return; }
    const DURATION = 2200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayedPrize(Math.round(totalPrize * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, totalPrize]);

  const confetti = useMemo(() => Array.from({ length: CONFETTI_COUNT }, (_, i) => {
    const seed = i * 9301 + 49297;
    const r = (n: number) => ((Math.sin(seed * n) + 1) / 2);
    return {
      left: r(1) * 100,
      delay: r(2) * 6,
      duration: 4 + r(3) * 4,
      drift: -20 + r(4) * 40,
      rotateStart: r(5) * 360,
      rotateEnd: r(6) * 720 + 360,
      size: 8 + r(7) * 8,
      color: CONFETTI_COLORS[Math.floor(r(8) * CONFETTI_COLORS.length)],
      shape: i % 3,
    };
  }), []);

  if (!open) return null;

  const showTrophy = phase === 'buildup';
  const showChampion = phase === 'reveal' || phase === 'prize' || phase === 'hold';
  const showCert = phase === 'reveal';
  const showLosers = phase === 'losers';
  const showPrize = phase === 'prize' || phase === 'hold';
  const currentLoser = losers[Math.min(loserIdx, losers.length - 1)];

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-bg-primary text-txt-primary">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(59,130,246,0.12),transparent_55%)]" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confetti.map((c, i) => (
          <span
            key={i}
            className="absolute top-[-10%] block"
            style={{
              left: `${c.left}%`,
              width: c.size,
              height: c.size * (c.shape === 0 ? 1 : 0.4),
              backgroundColor: c.color,
              borderRadius: c.shape === 2 ? '50%' : c.shape === 1 ? '2px' : '1px',
              animation: `confettiFall ${c.duration}s linear ${c.delay}s infinite`,
              ['--drift' as any]: `${c.drift}vw`,
              ['--rotStart' as any]: `${c.rotateStart}deg`,
              ['--rotEnd' as any]: `${c.rotateEnd}deg`,
            }}
          />
        ))}
      </div>

      <button
        onClick={() => setOpen(false)}
        className="absolute top-4 right-4 z-50 text-xs text-txt-secondary hover:text-txt-primary"
      >
        Passer ✕
      </button>

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 text-center">
        {showTrophy && (
          <>
            <div className="text-[150px] sm:text-[220px] leading-none animate-[trophySpin_2s_ease-in-out_infinite]">🏆</div>
            <div className="mt-4 text-2xl sm:text-4xl font-black uppercase tracking-[0.4em] text-accent-gold animate-[pulseGlow_1s_ease-in-out_infinite]">
              Champion 2026
            </div>
          </>
        )}

        {showChampion && (
          <div key="champion" className="flex flex-col items-center animate-[photoZoom_0.9s_ease-out_forwards]">
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-accent-gold/30 blur-3xl animate-[glow_3s_ease-in-out_infinite]" />
              <div className="relative rounded-full ring-8 ring-accent-gold shadow-[0_0_80px_rgba(245,158,11,0.7)]">
                <PlayerAvatar
                  name={championName}
                  initials={championInitials}
                  color={championColor}
                  imageUrl={championImageUrl}
                  size={260}
                />
              </div>
              <div className="absolute -top-4 -right-4 text-6xl sm:text-7xl animate-[bobby_2s_ease-in-out_infinite]">🏆</div>
            </div>

            <div className="mt-6 text-[10px] sm:text-xs uppercase tracking-[0.5em] text-accent-gold font-black">
              Le Champion
            </div>
            <div className="mt-2 text-5xl sm:text-7xl font-black bg-gradient-to-r from-accent-gold via-amber-300 to-accent-gold bg-clip-text text-transparent animate-[shimmer_3s_linear_infinite] bg-[length:200%_100%]">
              {championName}
            </div>
          </div>
        )}

        {showCert && (
          <div className="mt-8 max-w-3xl space-y-3 animate-[fadeUp_1s_ease-out_forwards]">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-txt-secondary font-bold">
              Certificat officiel
            </div>
            <p className="text-base sm:text-2xl leading-snug text-txt-primary">
              <span className="text-accent-gold font-bold">{championName}</span> est officiellement
              désigné comme <span className="text-accent-cyan font-bold">le joueur de jeux vidéo le plus fort</span>
              <br className="hidden sm:block" />
              du <span className="text-accent-blue font-bold">Centre de Recherche PKFokam</span>
              <br className="hidden sm:block" />
              pour l’année <span className="text-accent-gold font-black">2026</span>.
            </p>
          </div>
        )}

        {showLosers && (
          <div className="flex flex-col items-center">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-txt-secondary font-bold">
              Mention spéciale
            </div>
            <div className="mt-2 text-xl sm:text-3xl font-extrabold text-accent-cyan">
              Ils ont tout donné
            </div>

            {currentLoser ? (
              <div
                key={loserIdx}
                className="mt-8 flex flex-col items-center animate-[slideIn_0.7s_cubic-bezier(0.22,1,0.36,1)_forwards]"
              >
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-accent-cyan/15 blur-2xl" />
                  <div className="relative rounded-full ring-4 ring-accent-cyan/60 shadow-[0_0_40px_rgba(6,182,212,0.35)]">
                    <PlayerAvatar
                      name={currentLoser.name}
                      initials={currentLoser.initials}
                      color={currentLoser.color}
                      imageUrl={currentLoser.imageUrl}
                      size={180}
                    />
                  </div>
                </div>
                <div className="mt-4 text-2xl sm:text-4xl font-extrabold text-txt-primary">
                  {currentLoser.name}
                </div>
              </div>
            ) : (
              <div className="mt-8 text-txt-muted text-sm italic">Aucun autre participant</div>
            )}

            <div className="mt-6 flex items-center gap-1.5">
              {losers.map((_, i) => (
                <span
                  key={i}
                  className={
                    i === loserIdx
                      ? 'h-1.5 w-6 rounded-full bg-accent-cyan transition-all'
                      : i < loserIdx
                      ? 'h-1.5 w-1.5 rounded-full bg-accent-cyan/70 transition-all'
                      : 'h-1.5 w-1.5 rounded-full bg-txt-muted/40 transition-all'
                  }
                />
              ))}
            </div>
          </div>
        )}

        {showPrize && (
          <div className="mt-6 flex flex-col items-center gap-3 animate-[fadeUp_0.8s_ease-out_forwards]">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.5em] text-txt-secondary font-bold">
              La cagnotte
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 px-6 sm:px-10 py-4">
              <span className="text-3xl sm:text-5xl">💰</span>
              <div className="flex flex-col items-start">
                <div className="text-4xl sm:text-6xl font-black tabular-nums bg-gradient-to-r from-accent-gold via-amber-300 to-accent-gold bg-clip-text text-transparent">
                  {formatCFA(displayedPrize)} FCFA
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-[0.3em] text-txt-secondary mt-1">
                  {formatCFA(PRIZE_PER_PLAYER)} FCFA × {totalPlayers} joueurs
                </div>
              </div>
              <span className="text-3xl sm:text-5xl">🏅</span>
            </div>
            <div className="text-sm sm:text-base text-txt-secondary mt-1">
              <span className="text-accent-gold font-bold">{championName}</span> repart avec la totalité de la cagnotte.
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes confettiFall {
          0%   { transform: translate3d(0, -10vh, 0) rotate(var(--rotStart)); opacity: 1; }
          100% { transform: translate3d(var(--drift), 110vh, 0) rotate(var(--rotEnd)); opacity: 0.9; }
        }
        @keyframes trophySpin {
          0%, 100% { transform: rotate(-8deg) scale(1); }
          50%      { transform: rotate(8deg) scale(1.06); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.85; text-shadow: 0 0 30px rgba(245,158,11,0.5); }
          50%      { opacity: 1;    text-shadow: 0 0 60px rgba(245,158,11,1); }
        }
        @keyframes photoZoom {
          0%   { transform: scale(0.3); opacity: 0; }
          70%  { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.15); }
        }
        @keyframes shimmer {
          0%   { background-position: 0% 0%; }
          100% { background-position: 200% 0%; }
        }
        @keyframes bobby {
          0%, 100% { transform: translateY(0) rotate(-8deg); }
          50%      { transform: translateY(-10px) rotate(8deg); }
        }
        @keyframes fadeUp {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          0%   { opacity: 0; transform: translateX(60px) scale(0.92); }
          60%  { opacity: 1; transform: translateX(-6px) scale(1.02); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
