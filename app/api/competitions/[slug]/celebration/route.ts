import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

/**
 * Trigger the champion celebration on the public side. The competition must
 * be FINISHED (final played). Each call bumps `celebrationAt` so admins can
 * replay the ceremony if they want.
 */
export async function POST(_: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const comp = await prisma.competition.findUnique({ where: { slug: params.slug } });
  if (!comp) return NextResponse.json({ error: 'compétition introuvable' }, { status: 404 });
  if (comp.status !== 'FINISHED') {
    return NextResponse.json({ error: 'la finale doit être terminée' }, { status: 409 });
  }

  await prisma.competition.update({
    where: { id: comp.id },
    data: { celebrationAt: new Date() },
  });
  bumpVersion();
  return NextResponse.json({ ok: true });
}
