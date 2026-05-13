import { prisma } from '@/lib/prisma';
import KnockoutRoundView from '@/components/KnockoutRoundView';
import KnockoutDrawWatcher from '@/app/competition/[slug]/playoffs/KnockoutDrawWatcher';
import { buildPlayerMap, tieToView, poolForRound } from '@/lib/knockout-view';
import { KNOCKOUT_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function DemiFinalesPage({ params }: { params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: {
      players: { include: { player: true } },
      knockoutTies: { where: { round: 'SEMIFINAL' }, orderBy: { slot: 'asc' } },
    },
  });
  if (!comp) return null;

  const playerById = buildPlayerMap(comp.players);
  const views = comp.knockoutTies.map(t => tieToView(t, playerById));
  const pool = poolForRound(views); // only the 4 SF participants

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold">{KNOCKOUT_LABEL.SEMIFINAL}</h2>
        <p className="text-sm text-txt-secondary">Aller-retour · les vainqueurs accèdent à la finale.</p>
      </div>

      <KnockoutDrawWatcher slug={comp.slug} ties={views} allPlayers={pool} forceRound="SEMIFINAL" />

      <KnockoutRoundView ties={views} size="lg" layout="stack" />
    </div>
  );
}
