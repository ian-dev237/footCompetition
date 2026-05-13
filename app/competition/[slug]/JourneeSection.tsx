'use client';
import { useState } from 'react';
import clsx from 'clsx';
import MatchCard from '@/components/MatchCard';
import DrawAnimation, { type DrawPair, type DrawPlayer } from '@/components/DrawAnimation';
import DrawRecap, { type RecapPair } from '@/components/DrawRecap';

type Player = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

type Match = {
  id: string;
  homePlayer: Player;
  awayPlayer: Player;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

export type JourneeData = {
  number: number;
  matches: Match[];
  progress: 'done' | 'live' | 'pending';
};

/**
 * Client-side journée switcher. Switching is instant (no server round-trip);
 * the draw animation plays the first time a journée is opened in this tab
 * (sessionStorage), and can be replayed via the "Rejouer" button.
 */
export default function JourneeSection({
  slug, journees, initialJourneeNumber, allPlayers,
}: {
  slug: string;
  journees: JourneeData[];
  initialJourneeNumber: number;
  allPlayers: DrawPlayer[];
}) {
  const [current, setCurrent] = useState(initialJourneeNumber);
  const [replayNonce, setReplayNonce] = useState(0);
  const [recapOpen, setRecapOpen] = useState(false);

  const journee = journees.find(j => j.number === current) ?? journees[0];
  if (!journee) return null;

  const pairs: DrawPair[] = journee.matches.map((m, i) => ({
    key: m.id,
    label: `Match ${i + 1}`,
    a: m.homePlayer,
    b: m.awayPlayer,
  }));

  const recapPairs: RecapPair[] = journee.matches.map((m, i) => ({
    key: m.id,
    label: `Match ${i + 1}`,
    a: m.homePlayer,
    b: m.awayPlayer,
    scoreA: m.homeScore,
    scoreB: m.awayScore,
    status: m.status,
  }));

  const storageKey = `draw:${slug}:journee:${journee.number}`;

  // The draw animation only makes sense BEFORE any match of this journée is
  // played. Once a score exists, the matchups are public — re-animating would
  // be jarring (and the "Rejouer" button is hidden too).
  const journeeStarted = journee.matches.some(
    m => m.homeScore != null || m.awayScore != null || m.status !== 'PENDING',
  );

  function replay() {
    try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
    setReplayNonce(n => n + 1);
  }

  return (
    <div className="space-y-4">
      {!journeeStarted && (
        <DrawAnimation
          // key change forces a remount → useEffect re-checks sessionStorage
          key={`${current}-${replayNonce}`}
          title={`Tirage — Journée ${journee.number}`}
          subtitle="Phase de poule"
          pairs={pairs}
          poolForRoulette={allPlayers}
          storageKey={storageKey}
        />
      )}

      <DrawRecap
        open={recapOpen}
        title={`Affiches — Journée ${journee.number}`}
        subtitle="Phase de poule"
        pairs={recapPairs}
        onClose={() => setRecapOpen(false)}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-2">
          {journees.map(j => {
            const active = j.number === current;
            return (
              <button
                key={j.number}
                type="button"
                onClick={() => setCurrent(j.number)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-sm font-semibold border transition flex items-center gap-2',
                  active
                    ? 'bg-accent-blue text-white border-accent-blue'
                    : 'bg-bg-secondary text-txt-secondary border-bdr hover:bg-bg-tertiary',
                )}
              >
                <span>J{j.number}</span>
                <span className={clsx(
                  'inline-block h-1.5 w-1.5 rounded-full',
                  j.progress === 'done' && 'bg-status-win',
                  j.progress === 'live' && 'bg-accent-gold animate-livepulse',
                  j.progress === 'pending' && 'bg-txt-muted',
                )} />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRecapOpen(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-bdr bg-bg-secondary text-txt-secondary hover:text-txt-primary hover:border-accent-blue/60 flex items-center gap-1.5"
            title="Afficher la page des affiches (avec scores) sans animation"
          >
            <span aria-hidden>📋</span>
            <span>Voir les affiches</span>
          </button>
          {!journeeStarted && (
            <button
              type="button"
              onClick={replay}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold border border-bdr bg-bg-secondary text-txt-secondary hover:text-txt-primary hover:border-accent-gold/50 flex items-center gap-1.5"
              title="Rejouer l'animation du tirage"
            >
              <span aria-hidden>🎲</span>
              <span>Rejouer le tirage</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <div className="text-xs uppercase tracking-wider text-txt-muted font-semibold mb-1">
          Journée {journee.number} · {journee.matches.length} match{journee.matches.length > 1 ? 's' : ''}
        </div>
        {journee.matches.map(m => (
          <MatchCard
            key={m.id}
            homePlayer={m.homePlayer}
            awayPlayer={m.awayPlayer}
            homeScore={m.homeScore}
            awayScore={m.awayScore}
            status={m.status}
          />
        ))}
      </div>
    </div>
  );
}
