import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

function parseScore(v: unknown): number | null {
  if (v === null || v === '' || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 99) return NaN as any;
  return n;
}

export async function PUT(req: Request, { params }: { params: { slug: string; id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const homeScore = parseScore(body.homeScore);
  const awayScore = parseScore(body.awayScore);
  if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
    return NextResponse.json({ error: 'scores invalides (entiers ≥ 0)' }, { status: 400 });
  }

  // Validate match belongs to the competition
  const match = await prisma.match.findUnique({
    where: { id: params.id },
    include: { journee: { include: { competition: true } } },
  });
  if (!match || match.journee.competition.slug !== params.slug) {
    return NextResponse.json({ error: 'match introuvable' }, { status: 404 });
  }

  let status = 'PENDING';
  if (homeScore != null && awayScore != null) status = 'FINISHED';
  else if (homeScore != null || awayScore != null) status = 'LIVE';

  await prisma.match.update({
    where: { id: params.id },
    data: {
      homeScore, awayScore, status,
      playedAt: status === 'FINISHED' ? new Date() : null,
    },
  });

  bumpVersion();
  return NextResponse.json({ ok: true });
}
