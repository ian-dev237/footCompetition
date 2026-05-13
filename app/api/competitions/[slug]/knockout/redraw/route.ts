import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { redrawRound } from '@/lib/knockout';
import { bumpVersion } from '@/lib/realtime-bus';

export const runtime = 'nodejs';

/**
 * Redo a knockout round (and clear everything downstream).
 * Body: { from: 'ROUND_OF_16' | 'SEMIFINAL' }
 */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { from } = await req.json().catch(() => ({}));
  if (from !== 'ROUND_OF_16' && from !== 'SEMIFINAL') {
    return NextResponse.json({ error: 'param `from` invalide' }, { status: 400 });
  }

  try {
    await redrawRound(params.slug, from);
    bumpVersion();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'erreur' }, { status: 400 });
  }
}
