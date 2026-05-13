import { prisma } from './prisma';

export type StandingsRow = {
  playerId: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
  mj: number;   // matchs joués
  v: number;    // victoires
  n: number;    // nuls
  d: number;    // défaites
  bp: number;   // buts pour
  bc: number;   // buts contre
  diff: number;
  points: number;
  bestWinDiff: number;
  rank: number;
};

export async function computeStandings(competitionSlug: string): Promise<StandingsRow[]> {
  const comp = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
    include: {
      players: { include: { player: true } },
      journees: {
        include: {
          matches: {
            include: { homePlayer: true, awayPlayer: true },
          },
        },
      },
    },
  });
  if (!comp) return [];

  const rowsById = new Map<string, StandingsRow>();
  for (const cp of comp.players) {
    rowsById.set(cp.playerId, {
      playerId: cp.playerId,
      name: cp.player.name,
      initials: cp.player.initials,
      color: cp.player.color,
      imageUrl: cp.player.imageUrl,
      mj: 0, v: 0, n: 0, d: 0, bp: 0, bc: 0, diff: 0, points: 0, bestWinDiff: 0,
      rank: 0,
    });
  }

  // Head-to-head accumulator: h2h[a][b] = points a took from b
  const h2h: Record<string, Record<string, number>> = {};
  const ensureH2H = (a: string, b: string) => {
    h2h[a] ??= {};
    h2h[a][b] ??= 0;
  };

  for (const j of comp.journees) {
    for (const m of j.matches) {
      if (m.homeScore == null || m.awayScore == null || m.status !== 'FINISHED') continue;
      const home = rowsById.get(m.homePlayerId);
      const away = rowsById.get(m.awayPlayerId);
      if (!home || !away) continue;

      home.mj += 1; away.mj += 1;
      home.bp += m.homeScore; home.bc += m.awayScore;
      away.bp += m.awayScore; away.bc += m.homeScore;

      ensureH2H(home.playerId, away.playerId);
      ensureH2H(away.playerId, home.playerId);

      if (m.homeScore > m.awayScore) {
        home.v += 1; away.d += 1;
        home.points += 3;
        h2h[home.playerId][away.playerId] += 3;
        const diff = m.homeScore - m.awayScore;
        if (diff > home.bestWinDiff) home.bestWinDiff = diff;
      } else if (m.homeScore < m.awayScore) {
        away.v += 1; home.d += 1;
        away.points += 3;
        h2h[away.playerId][home.playerId] += 3;
        const diff = m.awayScore - m.homeScore;
        if (diff > away.bestWinDiff) away.bestWinDiff = diff;
      } else {
        home.n += 1; away.n += 1;
        home.points += 1; away.points += 1;
        h2h[home.playerId][away.playerId] += 1;
        h2h[away.playerId][home.playerId] += 1;
      }
    }
  }

  for (const row of rowsById.values()) row.diff = row.bp - row.bc;

  const rows = Array.from(rowsById.values());
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.bp !== a.bp) return b.bp - a.bp;
    const ha = h2h[a.playerId]?.[b.playerId] ?? 0;
    const hb = h2h[b.playerId]?.[a.playerId] ?? 0;
    if (hb !== ha) return hb - ha;
    return a.name.localeCompare(b.name);
  });

  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}

export async function getTopScorerAndStats(competitionSlug: string) {
  const comp = await prisma.competition.findUnique({
    where: { slug: competitionSlug },
    include: {
      journees: { include: { matches: { include: { homePlayer: true, awayPlayer: true } } } },
      players: { include: { player: true } },
    },
  });
  if (!comp) return null;

  const goalsFor: Record<string, number> = {};
  const goalsAgainst: Record<string, number> = {};
  let biggestMatch: { total: number; matchId: string } | null = null;
  let biggestWin: { diff: number; matchId: string } | null = null;

  for (const cp of comp.players) {
    goalsFor[cp.playerId] = 0;
    goalsAgainst[cp.playerId] = 0;
  }

  for (const j of comp.journees) {
    for (const m of j.matches) {
      if (m.homeScore == null || m.awayScore == null) continue;
      goalsFor[m.homePlayerId] += m.homeScore;
      goalsFor[m.awayPlayerId] += m.awayScore;
      goalsAgainst[m.homePlayerId] += m.awayScore;
      goalsAgainst[m.awayPlayerId] += m.homeScore;

      const total = m.homeScore + m.awayScore;
      if (!biggestMatch || total > biggestMatch.total) biggestMatch = { total, matchId: m.id };
      const diff = Math.abs(m.homeScore - m.awayScore);
      if (diff > 0 && (!biggestWin || diff > biggestWin.diff)) biggestWin = { diff, matchId: m.id };
    }
  }

  const playerById = new Map(comp.players.map(cp => [cp.playerId, cp.player]));

  let topScorerId: string | null = null;
  for (const id of Object.keys(goalsFor)) {
    if (topScorerId === null || goalsFor[id] > goalsFor[topScorerId]) topScorerId = id;
  }
  let bestDefenseId: string | null = null;
  for (const id of Object.keys(goalsAgainst)) {
    if (bestDefenseId === null || goalsAgainst[id] < goalsAgainst[bestDefenseId]) bestDefenseId = id;
  }

  return {
    topScorer: topScorerId ? { player: playerById.get(topScorerId), goals: goalsFor[topScorerId] } : null,
    bestDefense: bestDefenseId ? { player: playerById.get(bestDefenseId), conceded: goalsAgainst[bestDefenseId] } : null,
    biggestMatch,
    biggestWin,
  };
}
