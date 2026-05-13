import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

/**
 * Admin enrolls an existing global player into this competition.
 * Body: { playerId: string }
 */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { playerId } = await req.json().catch(() => ({}));
  if (typeof playerId !== 'string' || !playerId) {
    return NextResponse.json({ error: 'playerId requis' }, { status: 400 });
  }

  const comp = await prisma.competition.findUnique({ where: { slug: params.slug } });
  if (!comp) return NextResponse.json({ error: 'compétition introuvable' }, { status: 404 });
  if (comp.status !== 'REGISTRATION') {
    return NextResponse.json({ error: 'inscriptions fermées' }, { status: 403 });
  }

  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) return NextResponse.json({ error: 'joueur introuvable' }, { status: 404 });

  // Already enrolled?
  const already = await prisma.competitionPlayer.findFirst({
    where: { competitionId: comp.id, playerId },
  });
  if (already) {
    return NextResponse.json({ error: 'joueur déjà inscrit' }, { status: 409 });
  }

  // Also reject if another inscribed player has the same name (case-insensitive)
  const normalized = player.name.toLowerCase();
  const enrolled = await prisma.competitionPlayer.findMany({
    where: { competitionId: comp.id },
    include: { player: true },
  });
  const nameClash = enrolled.find(cp => cp.player.name.toLowerCase() === normalized);
  if (nameClash) {
    return NextResponse.json(
      { error: `"${nameClash.player.name}" est déjà inscrit sous ce nom.` },
      { status: 409 },
    );
  }

  await prisma.competitionPlayer.create({
    data: { competitionId: comp.id, playerId },
  });

  bumpVersion();
  return NextResponse.json({ ok: true }, { status: 201 });
}
