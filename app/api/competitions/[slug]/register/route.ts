import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeInitials, pickColor } from '@/lib/avatar';
import { savePlayerImage } from '@/lib/storage';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Public registration endpoint. No admin auth required.
 * Accepts multipart/form-data with `name` (required) and `photo` (optional file).
 * Only allowed while competition is in REGISTRATION status.
 */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({ where: { slug: params.slug } });
  if (!comp) return NextResponse.json({ error: 'compétition introuvable' }, { status: 404 });
  if (comp.status !== 'REGISTRATION') {
    return NextResponse.json({ error: 'inscriptions fermées' }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'formulaire invalide' }, { status: 400 });

  const name = String(form.get('name') ?? '').trim();
  if (!name || name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: 'nom requis (2 à 40 caractères)' }, { status: 400 });
  }

  // Prevent duplicate name in the same competition.
  // SQLite Prisma has no `mode: insensitive`, so we compare lowercased.
  const normalized = name.toLowerCase();
  const enrolled = await prisma.competitionPlayer.findMany({
    where: { competitionId: comp.id },
    include: { player: true },
  });
  const clash = enrolled.find(cp => cp.player.name.toLowerCase() === normalized);
  if (clash) {
    return NextResponse.json(
      { error: `"${clash.player.name}" est déjà inscrit. Utilise un autre nom (ou ajoute ton prénom).` },
      { status: 409 },
    );
  }

  // Photo is required for public registration
  const photo = form.get('photo');
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: 'photo de profil obligatoire' }, { status: 400 });
  }
  if (!ALLOWED.has(photo.type)) {
    return NextResponse.json({ error: 'format photo invalide' }, { status: 400 });
  }
  if (photo.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: 'photo > 3 Mo' }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: {
      name,
      initials: computeInitials(name),
      color: pickColor(name),
    },
  });

  const buf = Buffer.from(await photo.arrayBuffer());
  const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
  const url = await savePlayerImage(player.id, buf, ext);
  await prisma.player.update({ where: { id: player.id }, data: { imageUrl: url } });
  player.imageUrl = url;

  await prisma.competitionPlayer.create({
    data: { competitionId: comp.id, playerId: player.id },
  });

  bumpVersion();
  return NextResponse.json(player, { status: 201 });
}

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: { players: { include: { player: true }, orderBy: { id: 'asc' } } },
  });
  if (!comp) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({
    status: comp.status,
    name: comp.name,
    players: comp.players.map(cp => cp.player),
  });
}
