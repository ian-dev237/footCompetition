'use client';
import { useEffect } from 'react';
import DrawAnimation, { type DrawPair, type DrawPlayer } from '@/components/DrawAnimation';

/**
 * Triggers the random-draw animation for a journée's matchups on first visit
 * within this browser tab (sessionStorage, so it replays on a fresh tab).
 */
export default function JourneeDrawWatcher({
  slug, journeeNumber, pairs, allPlayers,
}: {
  slug: string;
  journeeNumber: number;
  pairs: { key: string; a: DrawPlayer; b: DrawPlayer }[];
  allPlayers: DrawPlayer[];
}) {
  // One-shot cleanup of the *old* localStorage keys from the previous build,
  // so users don't have to clear their browser to see the new animation.
  useEffect(() => {
    try {
      const k = `draw:${slug}:journee:${journeeNumber}`;
      if (localStorage.getItem(k)) localStorage.removeItem(k);
    } catch { /* ignore */ }
  }, [slug, journeeNumber]);

  if (pairs.length === 0) return null;

  const drawPairs: DrawPair[] = pairs.map((p, i) => ({
    key: p.key,
    label: `Match ${i + 1}`,
    a: p.a,
    b: p.b,
  }));

  return (
    <DrawAnimation
      title={`Tirage — Journée ${journeeNumber}`}
      subtitle="Phase de poule"
      pairs={drawPairs}
      poolForRoulette={allPlayers}
      storageKey={`draw:${slug}:journee:${journeeNumber}`}
    />
  );
}
