import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { slugify } from '@/lib/slug';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

export async function GET() {
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: 'desc' },
    include: { players: true, journees: { include: { matches: true } } },
  });
  return NextResponse.json(competitions);
}

/**
 * Create a competition in REGISTRATION mode. The round-robin schedule
 * is generated later when the admin closes registration and starts the tournament.
 */
export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name requis' }, { status: 400 });
  }

  const base = slugify(name);
  let slug = base;
  let i = 2;
  while (await prisma.competition.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }

  const competition = await prisma.competition.create({
    data: { name: name.trim(), slug, status: 'REGISTRATION' },
  });

  bumpVersion();
  return NextResponse.json(competition, { status: 201 });
}
