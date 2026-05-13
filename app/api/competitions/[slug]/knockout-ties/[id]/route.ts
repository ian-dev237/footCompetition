import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { computeTieStatus, maybePropagate } from '@/lib/knockout';
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
  const fields = ['leg1HomeScore','leg1AwayScore','leg2HomeScore','leg2AwayScore',
                  'etHomeScore','etAwayScore','penA','penB'] as const;
  const data: Record<string, number | null> = {};
  for (const f of fields) {
    const v = parseScore(body[f]);
    if (Number.isNaN(v)) return NextResponse.json({ error: `${f} invalide` }, { status: 400 });
    data[f] = v;
  }

  const tie = await prisma.knockoutTie.findUnique({
    where: { id: params.id },
    include: { competition: true },
  });
  if (!tie || tie.competition.slug !== params.slug) {
    return NextResponse.json({ error: 'tie introuvable' }, { status: 404 });
  }

  // Compute status from the merged record (existing values overridden by incoming)
  const merged = { ...tie, ...data };
  const status = computeTieStatus(merged as any);

  await prisma.knockoutTie.update({
    where: { id: params.id },
    data: { ...data, status },
  });

  await maybePropagate(tie.competitionId);
  bumpVersion();
  return NextResponse.json({ ok: true });
}
