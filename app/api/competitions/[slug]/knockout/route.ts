import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/auth';
import { seedRoundOf16 } from '@/lib/knockout';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

/**
 * Trigger the random draw for the Round of 16.
 * Idempotent only insofar as: re-calling deletes existing knockout ties first.
 */
export async function POST(_: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    await seedRoundOf16(params.slug);
    bumpVersion();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'erreur' }, { status: 400 });
  }
}

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: { knockoutTies: { orderBy: [{ round: 'asc' }, { slot: 'asc' }] } },
  });
  if (!comp) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(comp.knockoutTies);
}
