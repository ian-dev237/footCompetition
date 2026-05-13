import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { drawSemifinals } from '@/lib/knockout';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

/**
 * Trigger the random draw for the semi-finals. The round of 16 must be fully
 * finished. Idempotent guard: refuses if semi-finals are already seeded.
 */
export async function POST(_: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const comp = await prisma.competition.findUnique({ where: { slug: params.slug } });
    if (!comp) return NextResponse.json({ error: 'compétition introuvable' }, { status: 404 });

    const sf = await prisma.knockoutTie.findMany({
      where: { competitionId: comp.id, round: 'SEMIFINAL' },
    });
    if (sf.every(t => t.playerAId && t.playerBId)) {
      return NextResponse.json({ error: 'demi-finales déjà tirées' }, { status: 409 });
    }

    await drawSemifinals(comp.id);
    bumpVersion();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'erreur' }, { status: 400 });
  }
}
