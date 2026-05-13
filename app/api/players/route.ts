import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { computeInitials, pickColor } from '@/lib/avatar';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

export async function GET() {
  const players = await prisma.player.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'nom requis' }, { status: 400 });
  }
  const cleanName = name.trim();
  if (cleanName.length < 2 || cleanName.length > 40) {
    return NextResponse.json({ error: 'le nom doit faire entre 2 et 40 caractères' }, { status: 400 });
  }

  // SQLite Prisma has no case-insensitive mode → compare lowercased in JS
  const normalized = cleanName.toLowerCase();
  const existing = await prisma.player.findMany({ select: { name: true } });
  const clash = existing.find(p => p.name.toLowerCase() === normalized);
  if (clash) {
    return NextResponse.json(
      { error: `"${clash.name}" existe déjà. Choisis un autre nom.` },
      { status: 409 },
    );
  }

  const player = await prisma.player.create({
    data: {
      name: cleanName,
      initials: computeInitials(cleanName),
      color: pickColor(cleanName),
    },
  });
  bumpVersion();
  return NextResponse.json(player, { status: 201 });
}
