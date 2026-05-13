'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import PlayerAvatar from '@/components/PlayerAvatar';
import clsx from 'clsx';

type Props = {
  slug: string;
  championName: string;
  championInitials: string;
  championColor: string;
  championImageUrl: string | null;
};

// Total ≈ 30 seconds. Each phase runs for its allotted duration.
const PHASES = [
  { key: 'buildup',    ms: 3000 }, // 0-3s   spotlight + trophy spin
  { key: 'reveal',     ms: 5000 }, // 3-8s   photo zoom + name burst
  { key: 'cert',       ms: 12000 },// 8-20s  certification text unfurls
  { key: 'prize',      ms: 8000 }, // 20-28s prize awarded, confetti peak
  { key: 'hold',       ms: 2000 }, // 28-30s final hold then close
] as const;
type PhaseKey = (typeof PHASES)[number]['key'];

const CONFETTI_COUNT = 80;
const CONFETTI_COLORS = ['#F59E0B', '#3B82F6', '#06B6D4', '#EC4899', '#10B981', '#F97316', '#A855F7'];

export default function ChampionCelebration({
  slug, championName, championInitials, championColor, championImageUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<PhaseKey>('buildup');
  const timersRef = useRef<number[]>([]);

  const storageKey = `champion-celebration:${slug}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem(storageKey)) return;
    } catch { /* ignore */ }
    setOpen(true);
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    let cumulative = 0;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    for (const p of PHASES) {
      cumulative += p.ms;
      const t = window.setTimeout(() => {
        const idx = PHASES.findIndex(x => x.key === p.key);
        const next = PHASES[idx + 1];
        if (next) setPhase(next.key);
        else setOpen(false);
      }, cumulative) as unknown as number;
      timersRef.current.push(t);
    }
    return () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };
  }, [open]);

  // Stable confetti pieces (memoized so they don't restart every render)
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

  const showPhoto = phase !== 'buildup';
  const showCert = phase === 'cert' || phase === 'prize' || phase === 'hold';
  const showPrize = phase === 'prize' || phase === 'hold';

  return (
    <div className="fixed inset-0 z-[110] overflow-hidden bg-bg-primary text-txt-primary">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.18),transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(59,130,246,0.12),transparent_55%)]" />

      {/* Confetti rain */}
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

      {/* Skip button */}
      <button
        onClick={() => setOpen(false)}
        className="absolute top-4 right-4 z-50 text-xs text-txt-secondary hover:text-txt-primary"
      >
        Passer ✕
      </button>

      <div className="relative z-10 h-full w-full flex flex-col items-center justify-center px-6 text-center">
        {/* Phase 1: buildup */}
        {phase === 'buildup' && (
          <>
            <div className="text-[150px] sm:text-[220px] leading-none animate-[trophySpin_2s_ease-in-out_infinite]">🏆</div>
            <div className="mt-4 text-2xl sm:text-4xl font-black uppercase tracking-[0.4em] text-accent-gold animate-[pulseGlow_1s_ease-in-out_infinite]">
              Champion 2026
            </div>
          </>
        )}

        {/* Phase 2+: photo reveal */}
        {showPhoto && (
          <div className="flex flex-col items-center animate-[photoZoom_0.9s_ease-out_forwards]">
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

        {/* Phase 3+: certification text */}
        {showCert && (
          <div className="mt-8 max-w-3xl space-y-3 animate-[fadeUp_1s_ease-out_forwards]">
            <div className="text-[10px] sm:text-xs uppercase tracking-[0.4em] text-txt-secondary font-bold">
              Certificat officiel
            </div>
            <p className="text-base sm:text-2xl leading-snug text-txt-primary">
              <span className="text-accent-gold font-bold">{championName}</span> est officiellement
              désigné <span className="text-accent-cyan font-bold">le meilleur joueur de jeux vidéo</span>
              <br className="hidden sm:block" />
              le plus fort du <span className="text-accent-blue font-bold">Centre de Recherche PKFokam</span>
              <br className="hidden sm:block" />
              pour l’année <span className="text-accent-gold font-black">2026</span>.
            </p>
          </div>
        )}

        {/* Phase 4+: prize */}
        {showPrize && (
          <div className="mt-6 flex items-center gap-3 rounded-full border border-accent-gold/40 bg-accent-gold/10 px-6 py-3 animate-[fadeUp_0.8s_ease-out_forwards]">
            <span className="text-2xl sm:text-3xl">🎁</span>
            <span className="text-base sm:text-xl font-extrabold tracking-wide">
              REMPORTE LE PRIX
            </span>
            <span className="text-2xl sm:text-3xl">🏅</span>
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
      `}</style>
    </div>
  );
}
