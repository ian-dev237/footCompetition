import { prisma } from './prisma';
import { computeStandings } from './standings';
import { KnockoutRound } from './constants';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Seed the round of 16 (4 ties between the top 8 ranked players).
 * Drawing is fully random.
 */
export async function seedRoundOf16(competitionSlug: string) {
  const comp = await prisma.competition.findUnique({ where: { slug: competitionSlug } });
  if (!comp) throw new Error('Competition not found');

  const standings = await computeStandings(competitionSlug);
  if (standings.length < 8) throw new Error('Au moins 8 joueurs doivent avoir terminé la phase de poule');

  const top8 = standings.slice(0, 8).map(s => s.playerId);
  const drawn = shuffle(top8);
  const pairs: [string, string][] = [];
  for (let i = 0; i < 8; i += 2) pairs.push([drawn[i], drawn[i + 1]]);

  // Wipe any existing knockout state, then create fresh
  await prisma.knockoutTie.deleteMany({ where: { competitionId: comp.id } });

  const now = new Date();
  await prisma.$transaction([
    ...pairs.map((p, idx) =>
      prisma.knockoutTie.create({
        data: {
          competitionId: comp.id,
          round: KnockoutRound.ROUND_OF_16,
          slot: idx + 1,
          twoLegged: true,
          playerAId: p[0],
          playerBId: p[1],
          drawnAt: now,
        },
      })
    ),
    // Pre-create placeholder rows for SF (2) and FINAL (1), without players
    prisma.knockoutTie.create({ data: { competitionId: comp.id, round: KnockoutRound.SEMIFINAL, slot: 1, twoLegged: true } }),
    prisma.knockoutTie.create({ data: { competitionId: comp.id, round: KnockoutRound.SEMIFINAL, slot: 2, twoLegged: true } }),
    prisma.knockoutTie.create({ data: { competitionId: comp.id, round: KnockoutRound.FINAL,     slot: 1, twoLegged: false } }),
    prisma.competition.update({ where: { id: comp.id }, data: { status: 'KNOCKOUT' } }),
  ]);
}

/**
 * Draw the semifinals from the 4 winners of the round of 16. Random.
 */
export async function drawSemifinals(competitionId: string) {
  const r16 = await prisma.knockoutTie.findMany({
    where: { competitionId, round: KnockoutRound.ROUND_OF_16 },
    orderBy: { slot: 'asc' },
  });
  if (r16.length !== 4 || r16.some(t => t.status !== 'FINISHED')) {
    throw new Error('Toutes les confrontations des huitièmes doivent être terminées');
  }
  const winners = r16.map(t => tieWinnerId(t)).filter((x): x is string => !!x);
  if (winners.length !== 4) throw new Error('Impossible de déterminer les 4 vainqueurs');

  const drawn = shuffle(winners);
  const sf = await prisma.knockoutTie.findMany({
    where: { competitionId, round: KnockoutRound.SEMIFINAL },
    orderBy: { slot: 'asc' },
  });
  const now = new Date();
  await prisma.$transaction([
    prisma.knockoutTie.update({
      where: { id: sf[0].id },
      data: { playerAId: drawn[0], playerBId: drawn[1], drawnAt: now },
    }),
    prisma.knockoutTie.update({
      where: { id: sf[1].id },
      data: { playerAId: drawn[2], playerBId: drawn[3], drawnAt: now },
    }),
  ]);
}

/**
 * Set the final's two finalists. Deterministic: SF1 winner = A, SF2 winner = B.
 * No random shuffle — the user wants the final pairing to be a clean outcome
 * of the semifinals, not another draw.
 */
export async function drawFinal(competitionId: string) {
  const sf = await prisma.knockoutTie.findMany({
    where: { competitionId, round: KnockoutRound.SEMIFINAL },
    orderBy: { slot: 'asc' },
  });
  if (sf.length !== 2 || sf.some(t => t.status !== 'FINISHED')) {
    throw new Error('Les deux demi-finales doivent être terminées');
  }
  const winners = sf.map(t => tieWinnerId(t)).filter((x): x is string => !!x);
  if (winners.length !== 2) throw new Error('Impossible de déterminer les 2 finalistes');

  const final = await prisma.knockoutTie.findFirst({
    where: { competitionId, round: KnockoutRound.FINAL },
  });
  if (!final) throw new Error('Finale introuvable');
  await prisma.knockoutTie.update({
    where: { id: final.id },
    data: { playerAId: winners[0], playerBId: winners[1], drawnAt: new Date() },
  });
}

/**
 * Aggregate winner of a tie. For two-legged: aggregate = legA(home)+legB(away)
 * for playerA vs legA(away)+legB(home) for playerB. If tied → extra time totals
 * (etHome/etAway), then penalties (penA/penB).
 * For single-leg: leg1HomeScore vs leg1AwayScore, then ET, then penalties.
 */
export function tieWinnerId(t: {
  twoLegged: boolean;
  playerAId: string | null; playerBId: string | null;
  leg1HomeScore: number | null; leg1AwayScore: number | null;
  leg2HomeScore: number | null; leg2AwayScore: number | null;
  etHomeScore: number | null;   etAwayScore: number | null;
  penA: number | null;          penB: number | null;
}): string | null {
  if (!t.playerAId || !t.playerBId) return null;

  let aggA = 0;
  let aggB = 0;

  if (t.twoLegged) {
    if (t.leg1HomeScore == null || t.leg1AwayScore == null
      || t.leg2HomeScore == null || t.leg2AwayScore == null) return null;
    // Leg 1: A is home, B is away
    aggA = t.leg1HomeScore + t.leg2AwayScore;
    aggB = t.leg1AwayScore + t.leg2HomeScore;
  } else {
    if (t.leg1HomeScore == null || t.leg1AwayScore == null) return null;
    aggA = t.leg1HomeScore;
    aggB = t.leg1AwayScore;
  }

  if (aggA !== aggB) return aggA > aggB ? t.playerAId : t.playerBId;

  // Tied on aggregate → extra time
  if (t.etHomeScore != null && t.etAwayScore != null && t.etHomeScore !== t.etAwayScore) {
    return t.etHomeScore > t.etAwayScore ? t.playerAId : t.playerBId;
  }

  // Still tied → penalties
  if (t.penA != null && t.penB != null && t.penA !== t.penB) {
    return t.penA > t.penB ? t.playerAId : t.playerBId;
  }

  return null;
}

/**
 * Compute the status of a tie based on its scores.
 */
export function computeTieStatus(t: Parameters<typeof tieWinnerId>[0]): string {
  if (!t.playerAId || !t.playerBId) return 'PENDING';

  if (t.twoLegged) {
    const leg1Done = t.leg1HomeScore != null && t.leg1AwayScore != null;
    const leg2Done = t.leg2HomeScore != null && t.leg2AwayScore != null;
    if (!leg1Done && !leg2Done) return 'PENDING';
    if (leg1Done && !leg2Done) return 'LEG1';
    if (leg1Done && leg2Done) {
      const aggA = (t.leg1HomeScore ?? 0) + (t.leg2AwayScore ?? 0);
      const aggB = (t.leg1AwayScore ?? 0) + (t.leg2HomeScore ?? 0);
      if (aggA !== aggB) return 'FINISHED';
      // Tied → look at ET
      if (t.etHomeScore != null && t.etAwayScore != null) {
        if (t.etHomeScore !== t.etAwayScore) return 'FINISHED';
        // ET tied → penalties
        if (t.penA != null && t.penB != null && t.penA !== t.penB) return 'FINISHED';
        return 'PENALTIES';
      }
      return 'ET';
    }
    return 'LEG2';
  }

  // Single leg
  const done = t.leg1HomeScore != null && t.leg1AwayScore != null;
  if (!done) return 'PENDING';
  if (t.leg1HomeScore !== t.leg1AwayScore) return 'FINISHED';
  if (t.etHomeScore != null && t.etAwayScore != null) {
    if (t.etHomeScore !== t.etAwayScore) return 'FINISHED';
    if (t.penA != null && t.penB != null && t.penA !== t.penB) return 'FINISHED';
    return 'PENALTIES';
  }
  return 'ET';
}

/**
 * Reset a round's ties (and all downstream rounds) and redraw it.
 * - 'SEMIFINAL' → resets SF + FINAL, then redraws SF from R16 winners.
 * - 'ROUND_OF_16' → wipes everything and reseeds R16 from current standings.
 *
 * Used when the admin wants to redo a draw (and accepts losing the scores
 * that were entered for that round and onwards).
 */
export async function redrawRound(
  competitionSlug: string,
  from: 'ROUND_OF_16' | 'SEMIFINAL',
) {
  const comp = await prisma.competition.findUnique({ where: { slug: competitionSlug } });
  if (!comp) throw new Error('Competition not found');

  if (from === 'ROUND_OF_16') {
    // Re-seed everything from scratch (same as initial knockout seed)
    await seedRoundOf16(competitionSlug);
    return;
  }

  // SEMIFINAL: keep R16 results, reset SF + FINAL
  const r16 = await prisma.knockoutTie.findMany({
    where: { competitionId: comp.id, round: KnockoutRound.ROUND_OF_16 },
    orderBy: { slot: 'asc' },
  });
  if (r16.length !== 4 || r16.some(t => t.status !== 'FINISHED')) {
    throw new Error('Les huitièmes doivent être terminés pour refaire les demi-finales');
  }

  await prisma.$transaction([
    // Clear SF + FINAL: players null, scores null, status PENDING
    prisma.knockoutTie.updateMany({
      where: {
        competitionId: comp.id,
        round: { in: [KnockoutRound.SEMIFINAL, KnockoutRound.FINAL] },
      },
      data: {
        playerAId: null,
        playerBId: null,
        leg1HomeScore: null, leg1AwayScore: null,
        leg2HomeScore: null, leg2AwayScore: null,
        etHomeScore: null,   etAwayScore: null,
        penA: null,          penB: null,
        status: 'PENDING',
        drawnAt: null,
      },
    }),
    // If competition was FINISHED, bring it back to KNOCKOUT
    prisma.competition.update({
      where: { id: comp.id },
      data: { status: 'KNOCKOUT' },
    }),
  ]);

  await drawSemifinals(comp.id);
}

/**
 * After a tie is updated, if a round just completed, draw the next round.
 * Also marks competition FINISHED when the final is decided.
 */
export async function maybePropagate(competitionId: string) {
  const all = await prisma.knockoutTie.findMany({
    where: { competitionId },
    orderBy: [{ round: 'asc' }, { slot: 'asc' }],
  });

  const r16 = all.filter(t => t.round === 'ROUND_OF_16');
  const sf  = all.filter(t => t.round === 'SEMIFINAL');
  const f   = all.find(t => t.round === 'FINAL');

  const r16Done = r16.length === 4 && r16.every(t => t.status === 'FINISHED');
  const sfSeeded = sf.every(t => t.playerAId && t.playerBId);
  if (r16Done && !sfSeeded) {
    await drawSemifinals(competitionId);
  }

  const sfDone = sf.length === 2 && sf.every(t => t.status === 'FINISHED');
  const finalSeeded = !!f?.playerAId && !!f?.playerBId;
  if (sfDone && !finalSeeded) {
    await drawFinal(competitionId);
  }

  if (f?.status === 'FINISHED') {
    await prisma.competition.update({
      where: { id: competitionId },
      data: { status: 'FINISHED' },
    });
  }
}
