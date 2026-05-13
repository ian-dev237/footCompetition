import { prisma } from '@/lib/prisma';
import KnockoutRoundView from '@/components/KnockoutRoundView';
import KnockoutDrawWatcher from '@/app/competition/[slug]/playoffs/KnockoutDrawWatcher';
import { buildPlayerMap, tieToView, poolForRound } from '@/lib/knockout-view';
import { KNOCKOUT_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function HuitiemesPage({ params }: { params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: {
      players: { include: { player: true } },
      knockoutTies: { where: { round: 'ROUND_OF_16' }, orderBy: { slot: 'asc' } },
    },
  });
  if (!comp) return null;

  const playerById = buildPlayerMap(comp.players);
  const views = comp.knockoutTies.map(t => tieToView(t, playerById));
  const pool = poolForRound(views); // only the 8 qualified

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold">{KNOCKOUT_LABEL.ROUND_OF_16}</h2>
        <p className="text-sm text-txt-secondary">Aller-retour · cumul = aller + retour, prolongation puis tab si égalité.</p>
      </div>

      {/* Replay the draw animation for this round only, with pool restricted to its 8 players */}
      <KnockoutDrawWatcher slug={comp.slug} ties={views} allPlayers={pool} forceRound="ROUND_OF_16" />

      <KnockoutRoundView ties={views} size="md" layout="grid" />
    </div>
  );
}
