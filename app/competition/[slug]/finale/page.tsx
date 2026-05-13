import { prisma } from '@/lib/prisma';
import KnockoutRoundView from '@/components/KnockoutRoundView';
import ChampionCelebration from './ChampionCelebration';
import { buildPlayerMap, tieToView, winnerOfTie } from '@/lib/knockout-view';
import { KNOCKOUT_LABEL } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function FinalePage({ params }: { params: { slug: string } }) {
  const comp = await prisma.competition.findUnique({
    where: { slug: params.slug },
    include: {
      players: { include: { player: true } },
      knockoutTies: { where: { round: 'FINAL' }, orderBy: { slot: 'asc' } },
    },
  });
  if (!comp) return null;

  const playerById = buildPlayerMap(comp.players);
  const views = comp.knockoutTies.map(t => tieToView(t, playerById));
  const final = views[0];
  const champion = final ? winnerOfTie(final) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-accent-gold to-accent-cyan bg-clip-text text-transparent">
          {KNOCKOUT_LABEL.FINAL}
        </h2>
        <p className="text-sm text-txt-secondary">Match unique. Prolongation puis tirs au but si égalité.</p>
      </div>

      {/* Intentionally no draw animation here: the two finalists are determined
          by the semifinals, not by a random draw. */}

      <KnockoutRoundView ties={views} size="xl" layout="stack" />

      {champion && comp.celebrationAt && (
        <ChampionCelebration
          slug={comp.slug}
          celebrationAt={comp.celebrationAt.toISOString()}
          championName={champion.name}
          championInitials={champion.initials}
          championColor={champion.color}
          championImageUrl={champion.imageUrl}
          losers={comp.players
            .map(cp => cp.player)
            .filter(p => p.id !== champion.id)
            .map(p => ({
              name: p.name,
              initials: p.initials,
              color: p.color,
              imageUrl: p.imageUrl,
            }))}
          totalPlayers={comp.players.length}
        />
      )}
    </div>
  );
}
