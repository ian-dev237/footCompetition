import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { savePlayerImage, deletePlayerImage } from '@/lib/storage';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const player = await prisma.player.findUnique({ where: { id: params.id } });
  if (!player) return NextResponse.json({ error: 'player not found' }, { status: 404 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file requis' }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'type invalide' }, { status: 400 });
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'fichier > 3 Mo' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';

  if (player.imageUrl) await deletePlayerImage(player.imageUrl);
  const url = await savePlayerImage(player.id, buffer, ext);

  await prisma.player.update({ where: { id: player.id }, data: { imageUrl: url } });
  bumpVersion();
  return NextResponse.json({ imageUrl: url });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const player = await prisma.player.findUnique({ where: { id: params.id } });
  if (!player) return NextResponse.json({ error: 'player not found' }, { status: 404 });
  if (player.imageUrl) await deletePlayerImage(player.imageUrl);
  await prisma.player.update({ where: { id: player.id }, data: { imageUrl: null } });
  bumpVersion();
  return NextResponse.json({ ok: true });
}
