import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { computeInitials, pickColor } from '@/lib/avatar';
import { deletePlayerImage } from '@/lib/storage';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const player = await prisma.player.findUnique({ where: { id: params.id } });
  if (!player) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(player);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'nom requis' }, { status: 400 });
  }
  const clean = name.trim();
  if (clean.length < 2 || clean.length > 40) {
    return NextResponse.json({ error: 'le nom doit faire entre 2 et 40 caractères' }, { status: 400 });
  }

  // Reject if another player already uses this name (case-insensitive)
  const normalized = clean.toLowerCase();
  const others = await prisma.player.findMany({
    where: { NOT: { id: params.id } },
    select: { name: true },
  });
  const clash = others.find(p => p.name.toLowerCase() === normalized);
  if (clash) {
    return NextResponse.json(
      { error: `"${clash.name}" existe déjà. Choisis un autre nom.` },
      { status: 409 },
    );
  }

  const player = await prisma.player.update({
    where: { id: params.id },
    data: { name: clean, initials: computeInitials(clean), color: pickColor(clean) },
  });
  bumpVersion();
  return NextResponse.json(player);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const existing = await prisma.player.findUnique({ where: { id: params.id } });
  if (existing?.imageUrl) await deletePlayerImage(existing.imageUrl);
  await prisma.player.delete({ where: { id: params.id } });
  bumpVersion();
  return NextResponse.json({ ok: true });
}
