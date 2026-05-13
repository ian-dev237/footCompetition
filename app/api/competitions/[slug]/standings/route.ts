import { NextResponse } from 'next/server';
import { computeStandings } from '@/lib/standings';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const rows = await computeStandings(params.slug);
  return NextResponse.json(rows);
}
