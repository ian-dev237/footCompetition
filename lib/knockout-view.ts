import type { BTie, BPlayer } from '@/components/KnockoutBracket';

type RawPlayer = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

export function buildPlayerMap(competitionPlayers: { playerId: string; player: RawPlayer }[]) {
  const map = new Map<string, BPlayer>();
  for (const cp of competitionPlayers) {
    map.set(cp.playerId, {
      id: cp.player.id,
      name: cp.player.name,
      initials: cp.player.initials,
      color: cp.player.color,
      imageUrl: cp.player.imageUrl,
    });
  }
  return map;
}

export function tieToView(
  t: {
    id: string; round: string; slot: number; twoLegged: boolean;
    playerAId: string | null; playerBId: string | null;
    leg1HomeScore: number | null; leg1AwayScore: number | null;
    leg2HomeScore: number | null; leg2AwayScore: number | null;
    etHomeScore: number | null;   etAwayScore: number | null;
    penA: number | null;          penB: number | null;
    status: string;
  },
  playerById: Map<string, BPlayer>,
): BTie {
  return {
    id: t.id,
    round: t.round as BTie['round'],
    slot: t.slot,
    twoLegged: t.twoLegged,
    playerA: t.playerAId ? playerById.get(t.playerAId) ?? null : null,
    playerB: t.playerBId ? playerById.get(t.playerBId) ?? null : null,
    leg1HomeScore: t.leg1HomeScore,
    leg1AwayScore: t.leg1AwayScore,
    leg2HomeScore: t.leg2HomeScore,
    leg2AwayScore: t.leg2AwayScore,
    etHomeScore: t.etHomeScore,
    etAwayScore: t.etAwayScore,
    penA: t.penA,
    penB: t.penB,
    status: t.status,
  };
}

export function winnerOfTie(t: BTie): BPlayer | null {
  if (t.status !== 'FINISHED') return null;
  const twoLegged = t.twoLegged;
  let aggA: number;
  let aggB: number;
  if (twoLegged) {
    if (t.leg1HomeScore == null || t.leg1AwayScore == null
      || t.leg2HomeScore == null || t.leg2AwayScore == null) return null;
    aggA = t.leg1HomeScore + t.leg2AwayScore;
    aggB = t.leg1AwayScore + t.leg2HomeScore;
  } else {
    if (t.leg1HomeScore == null || t.leg1AwayScore == null) return null;
    aggA = t.leg1HomeScore;
    aggB = t.leg1AwayScore;
  }
  if (aggA !== aggB) return aggA > aggB ? t.playerA : t.playerB;
  if (t.etHomeScore != null && t.etAwayScore != null && t.etHomeScore !== t.etAwayScore)
    return t.etHomeScore > t.etAwayScore ? t.playerA : t.playerB;
  if (t.penA != null && t.penB != null && t.penA !== t.penB)
    return t.penA > t.penB ? t.playerA : t.playerB;
  return null;
}

/** Players who participate in a given round (used to scope the draw roulette). */
export function poolForRound(ties: BTie[]): BPlayer[] {
  const seen = new Set<string>();
  const out: BPlayer[] = [];
  for (const t of ties) {
    for (const p of [t.playerA, t.playerB]) {
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}
