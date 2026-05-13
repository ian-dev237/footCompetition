import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { generateRoundRobin } from '@/lib/round-robin';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

/**
 * Closes registration and generates the round-robin schedule.
 * The pairings inside each journée are also shuffled so the reveal feels random.
 */
export async function POST(_: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: { players: true },
  });
  if (!comp) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (comp.status !== 'REGISTRATION') {
    return NextResponse.json({ error: 'la compétition n’est plus en inscription' }, { status: 400 });
  }
  if (comp.players.length < 4) {
    return NextResponse.json({ error: 'au moins 4 joueurs sont requis' }, { status: 400 });
  }

  // Shuffle the player order so the round-robin schedule itself feels random
  const ids = [...comp.players.map(p => p.playerId)];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  const schedule = generateRoundRobin(ids);

  await prisma.$transaction([
    prisma.journee.deleteMany({ where: { competitionId: comp.id } }),
    ...schedule.map((round, idx) =>
      prisma.journee.create({
        data: {
          competitionId: comp.id,
          number: idx + 1,
          matches: {
            create: round.map(p => ({
              homePlayerId: p.homeId,
              awayPlayerId: p.awayId,
            })),
          },
        },
      })
    ),
    prisma.competition.update({
      where: { id: comp.id },
      data: { status: 'ONGOING' },
    }),
  ]);

  bumpVersion();
  return NextResponse.json({ ok: true });
}
