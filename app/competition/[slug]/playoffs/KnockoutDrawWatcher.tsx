'use client';
import { useEffect } from 'react';
import DrawAnimation, { type DrawPair, type DrawPlayer } from '@/components/DrawAnimation';
import type { BTie, BPlayer } from '@/components/KnockoutBracket';
import { KNOCKOUT_LABEL } from '@/lib/constants';

type Round = 'ROUND_OF_16' | 'SEMIFINAL' | 'FINAL';

/**
 * Fires the random-draw animation for a specific knockout round, once per
 * (browser tab, round). Score updates do NOT re-trigger. The pool of avatars
 * shown during the roulette comes from `allPlayers` (which the caller
 * typically restricts to the players actually in this round).
 */
export default function KnockoutDrawWatcher({
  slug, ties, allPlayers, forceRound,
}: { slug: string; ties: BTie[]; allPlayers: BPlayer[]; forceRound?: Round }) {
  // One-shot migration: clear any leftover localStorage keys from previous builds
  useEffect(() => {
    try {
      for (const r of ['ROUND_OF_16', 'SEMIFINAL', 'FINAL']) {
        const k = `draw:${slug}:${r}`;
        if (localStorage.getItem(k)) localStorage.removeItem(k);
      }
    } catch { /* ignore */ }
  }, [slug]);

  const round: Round | undefined = forceRound ?? pickActiveRound(ties);
  if (!round) return null;
  // The final is deterministic (no random draw), so no animation for it.
  if (round === 'FINAL') return null;

  const rTies = ties.filter(t => t.round === round);
  if (rTies.length === 0) return null;

  const allSeeded = rTies.every(t => t.playerA && t.playerB);
  if (!allSeeded) return null;

  // Only animate if no scores entered yet for any tie of this round
  const anyScores = rTies.some(t =>
    t.leg1HomeScore != null || t.leg1AwayScore != null ||
    t.leg2HomeScore != null || t.leg2AwayScore != null
  );
  if (anyScores) return null;

  const pairs: DrawPair[] = rTies.map((t, i) => ({
    key: t.id,
    label: `${KNOCKOUT_LABEL[round]} · Match ${i + 1}`,
    a: t.playerA as DrawPlayer,
    b: t.playerB as DrawPlayer,
  }));

  // Include the draw timestamp in the storage key so a fresh draw replays
  // the animation even in the same browser tab.
  const drawStamp = rTies
    .map(t => t.drawnAt ?? '')
    .filter(Boolean)
    .sort()
    .join('|');

  return (
    <DrawAnimation
      key={`${round}:${drawStamp}`}
      title={`Tirage — ${KNOCKOUT_LABEL[round]}`}
      subtitle="Aller-retour"
      pairs={pairs}
      poolForRoulette={allPlayers}
      storageKey={`draw:${slug}:${round}:${drawStamp}`}
    />
  );
}

function pickActiveRound(ties: BTie[]): Round | undefined {
  // Latest round (by importance) that's seeded but has no scores yet
  for (const r of ['FINAL', 'SEMIFINAL', 'ROUND_OF_16'] as const) {
    const rTies = ties.filter(t => t.round === r);
    if (rTies.length === 0) continue;
    if (!rTies.every(t => t.playerA && t.playerB)) continue;
    const anyScores = rTies.some(t =>
      t.leg1HomeScore != null || t.leg1AwayScore != null ||
      t.leg2HomeScore != null || t.leg2AwayScore != null
    );
    if (anyScores) continue;
    return r;
  }
  return undefined;
}
