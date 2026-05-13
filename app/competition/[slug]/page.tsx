import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import JourneeSection, { type JourneeData } from './JourneeSection';

export const dynamic = 'force-dynamic';

export default async function JourneesPage({
  params, searchParams,
}: { params: { slug: string }; searchParams: { j?: string } }) {
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: {
      players: { include: { player: true } },
      journees: {
        orderBy: { number: 'asc' },
        include: {
          matches: {
            include: { homePlayer: true, awayPlayer: true },
          },
        },
      },
    },
  });
  if (!comp) notFound();

  if (comp.status === 'REGISTRATION') {
    return (
      <div className="rounded-xl border border-bdr bg-bg-secondary p-8 text-center space-y-3">
        <div className="text-[10px] uppercase tracking-[0.3em] text-accent-cyan font-bold">Inscriptions ouvertes</div>
        <p className="text-txt-secondary">
          La compétition n’a pas encore commencé. {comp.players.length} joueur{comp.players.length > 1 ? 's' : ''} déjà inscrit{comp.players.length > 1 ? 's' : ''}.
        </p>
        <Link
          href={`/inscription/${comp.slug}`}
          className="inline-block rounded-lg bg-accent-blue text-white px-4 py-2 text-sm font-semibold hover:bg-blue-600"
        >
          Page d’inscription →
        </Link>
      </div>
    );
  }

  if (comp.journees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-bdr p-12 text-center text-txt-muted">
        Aucune journée. Le calendrier sera généré au lancement du tournoi.
      </div>
    );
  }

  const requested = Number(searchParams.j ?? '1');
  const initialJourneeNumber = Math.max(1, Math.min(comp.journees.length, isNaN(requested) ? 1 : requested));

  const journeesData: JourneeData[] = comp.journees.map(j => {
    const total = j.matches.length;
    const finished = j.matches.filter(m => m.status === 'FINISHED').length;
    const live = j.matches.some(m => m.status === 'LIVE');
    let progress: 'done' | 'live' | 'pending' = 'pending';
    if (finished === total && total > 0) progress = 'done';
    else if (live || finished > 0) progress = 'live';
    return {
      number: j.number,
      progress,
      matches: j.matches.map(m => ({
        id: m.id,
        homePlayer: {
          id: m.homePlayer.id, name: m.homePlayer.name, initials: m.homePlayer.initials,
          color: m.homePlayer.color, imageUrl: m.homePlayer.imageUrl,
        },
        awayPlayer: {
          id: m.awayPlayer.id, name: m.awayPlayer.name, initials: m.awayPlayer.initials,
          color: m.awayPlayer.color, imageUrl: m.awayPlayer.imageUrl,
        },
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
      })),
    };
  });

  const allPlayers = comp.players.map(cp => ({
    id: cp.player.id, name: cp.player.name, initials: cp.player.initials,
    color: cp.player.color, imageUrl: cp.player.imageUrl,
  }));

  return (
    <JourneeSection
      slug={comp.slug}
      journees={journeesData}
      initialJourneeNumber={initialJourneeNumber}
      allPlayers={allPlayers}
    />
  );
}
