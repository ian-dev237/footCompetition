import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import AdminNav from '@/components/AdminNav';
import ScoreEditor from './ScoreEditor';
import RegistrationManager from './RegistrationManager';
import DeleteCompetitionButton from './DeleteCompetitionButton';
import { COMPETITION_STATUS_LABEL } from '@/lib/constants';
import KnockoutDrawWatcher from '@/app/competition/[slug]/playoffs/KnockoutDrawWatcher';
import type { BTie, BPlayer } from '@/components/KnockoutBracket';

export const dynamic = 'force-dynamic';

export default async function AdminCompetitionPage({ params }: { params: { slug: string } }) {
  requireAdmin(`/admin/competition/${params.slug}`);

  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: {
      players: { include: { player: true } },
      journees: {
        orderBy: { number: 'asc' },
        include: { matches: { include: { homePlayer: true, awayPlayer: true } } },
      },
      knockoutTies: { orderBy: [{ round: 'asc' }, { slot: 'asc' }] },
    },
  });
  if (!comp) notFound();

  // Available global players: those not already inscribed in this competition.
  // Only relevant while the comp is in REGISTRATION status.
  const enrolledIds = new Set(comp.players.map(cp => cp.playerId));
  const availablePlayers = comp.status === 'REGISTRATION'
    ? (await prisma.player.findMany({ orderBy: { name: 'asc' } }))
        .filter(p => !enrolledIds.has(p.id))
    : [];

  const totalMatches = comp.journees.reduce((s, j) => s + j.matches.length, 0);
  const finishedMatches = comp.journees.reduce(
    (s, j) => s + j.matches.filter(m => m.status === 'FINISHED').length, 0,
  );
  const championshipDone = totalMatches > 0 && finishedMatches === totalMatches;
  const status = comp.status;
  const statusLbl = COMPETITION_STATUS_LABEL[status] ?? COMPETITION_STATUS_LABEL.ONGOING;

  return (
    <div className="space-y-4">
      <AdminNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="text-xs text-txt-secondary hover:text-txt-primary">← Admin</Link>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 flex items-center gap-2 flex-wrap">
            {comp.name}
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${statusLbl.cls}`}>
              {statusLbl.label}
            </span>
          </h1>
          {status !== 'REGISTRATION' && (
            <div className="text-sm text-txt-secondary">
              {finishedMatches}/{totalMatches} matchs joués · {comp.players.length} joueurs
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={status === 'REGISTRATION' ? `/inscription/${comp.slug}` : `/competition/${comp.slug}`}
            className="rounded-lg border border-bdr px-3 py-1.5 text-xs font-semibold text-txt-secondary hover:text-txt-primary"
          >
            {status === 'REGISTRATION' ? 'Voir la page d’inscription →' : 'Voir côté public →'}
          </Link>
          <DeleteCompetitionButton
            slug={comp.slug}
            name={comp.name}
            playersCount={comp.players.length}
          />
        </div>
      </div>

      {status === 'REGISTRATION' ? (
        <RegistrationManager
          slug={comp.slug}
          players={comp.players.map(cp => cp.player) as any}
          availablePlayers={availablePlayers as any}
        />
      ) : (
        <>
          <AdminDrawTriggers comp={comp as any} />
          <ScoreEditor
            slug={comp.slug}
            journees={comp.journees as any}
            knockoutTies={comp.knockoutTies as any}
            players={comp.players.map(cp => cp.player) as any}
            championshipDone={championshipDone}
            competitionStatus={status}
          />
        </>
      )}
    </div>
  );
}

/**
 * Mounts the appropriate draw animation on the admin side. Priority:
 *  - latest fully-seeded knockout round whose ties have no scores yet
 *  - otherwise, the most recently-started journée whose matches have no scores yet
 */
function AdminDrawTriggers({ comp }: { comp: any }) {
  // Knockout rounds first — skip FINAL (deterministic, no draw animation)
  for (const round of ['SEMIFINAL', 'ROUND_OF_16'] as const) {
    const rTies = comp.knockoutTies.filter((t: any) => t.round === round);
    if (rTies.length === 0) continue;
    const allSeeded = rTies.every((t: any) => t.playerAId && t.playerBId);
    if (!allSeeded) continue;
    const anyScores = rTies.some((t: any) =>
      t.leg1HomeScore != null || t.leg1AwayScore != null ||
      t.leg2HomeScore != null || t.leg2AwayScore != null
    );
    if (anyScores) continue;

    const playerById = new Map<string, BPlayer>(
      comp.players.map((cp: any) => [cp.playerId, {
        id: cp.player.id, name: cp.player.name, initials: cp.player.initials,
        color: cp.player.color, imageUrl: cp.player.imageUrl,
      }])
    );
    const views: BTie[] = comp.knockoutTies.map((t: any) => ({
      id: t.id, round: t.round, slot: t.slot, twoLegged: t.twoLegged,
      playerA: t.playerAId ? playerById.get(t.playerAId) ?? null : null,
      playerB: t.playerBId ? playerById.get(t.playerBId) ?? null : null,
      leg1HomeScore: t.leg1HomeScore, leg1AwayScore: t.leg1AwayScore,
      leg2HomeScore: t.leg2HomeScore, leg2AwayScore: t.leg2AwayScore,
      etHomeScore: t.etHomeScore, etAwayScore: t.etAwayScore,
      penA: t.penA, penB: t.penB, status: t.status,
    }));

    // Roulette pool restricted to the participants of THIS round only
    const ids = new Set<string>();
    for (const t of rTies) { ids.add(t.playerAId); ids.add(t.playerBId); }
    const pool: BPlayer[] = Array.from(ids).map(id => playerById.get(id)).filter((x): x is BPlayer => !!x);

    return <KnockoutDrawWatcher slug={comp.slug} ties={views} allPlayers={pool} forceRound={round} />;
  }

  // Pas d'animation auto de journée sur la page admin :
  // l'admin saisit des scores, on ne déclenche pas de tirage à chaque refresh.
  // Les spectateurs voient l'animation sur /competition/<slug> (navigation
  // client-side + bouton "Rejouer le tirage").
  return null;
}
