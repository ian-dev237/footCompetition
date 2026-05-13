import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { deletePlayerImage } from '@/lib/storage';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const c = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: {
      players: { include: { player: true } },
      journees: {
        orderBy: { number: 'asc' },
        include: { matches: { include: { homePlayer: true, awayPlayer: true } } },
      },
      knockoutTies: { orderBy: [{ round: 'asc' }, { slot: 'asc' }] },
    },
  });
  if (!c) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(c);
}

/**
 * Delete a competition and clean up players that were registered via its
 * inscription link (and aren't shared with another competition).
 */
export async function DELETE(_: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: { players: { include: { player: { include: { competitions: true } } } } },
  });
  if (!comp) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // Players whose ONLY competition is this one → safe to delete.
  const playersToDelete = comp.players
    .map(cp => cp.player)
    .filter(p => p.competitions.length === 1);

  // Best-effort photo cleanup (don't block delete on FS errors).
  await Promise.all(
    playersToDelete
      .filter(p => !!p.imageUrl)
      .map(p => deletePlayerImage(p.imageUrl!).catch(() => undefined))
  );

  await prisma.competition.delete({ where: { id: comp.id } });
  if (playersToDelete.length > 0) {
    await prisma.player.deleteMany({
      where: { id: { in: playersToDelete.map(p => p.id) } },
    });
  }

  bumpVersion();
  return NextResponse.json({ ok: true });
}
