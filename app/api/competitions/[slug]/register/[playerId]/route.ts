import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { deletePlayerImage } from '@/lib/storage';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

/** Admin removes a registered participant before the tournament starts. */
export async function DELETE(_: Request, { params }: { params: { slug: string; playerId: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const comp = await prisma.competition.findUnique({ where: { slug: params.slug } });
  if (!comp) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (comp.status !== 'REGISTRATION') {
    return NextResponse.json({ error: 'modifications fermées' }, { status: 400 });
  }

  const cp = await prisma.competitionPlayer.findFirst({
    where: { competitionId: comp.id, playerId: params.playerId },
    include: { player: true },
  });
  if (!cp) return NextResponse.json({ error: 'inscrit introuvable' }, { status: 404 });

  if (cp.player.imageUrl) await deletePlayerImage(cp.player.imageUrl);
  await prisma.player.delete({ where: { id: cp.playerId } });
  bumpVersion();
  return NextResponse.json({ ok: true });
}
