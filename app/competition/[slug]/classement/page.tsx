import { computeStandings, getTopScorerAndStats } from '@/lib/standings';
import StandingsTable from '@/components/StandingsTable';
import PlayerAvatar from '@/components/PlayerAvatar';

export const dynamic = 'force-dynamic';

export default async function ClassementPage({ params }: { params: { slug: string } }) {
  const [rows, stats] = await Promise.all([
    computeStandings(params.slug),
    getTopScorerAndStats(params.slug),
  ]);

  return (
    <div className="space-y-6">
      <StandingsTable rows={rows} />

      {stats && (stats.topScorer?.player || stats.bestDefense?.player) && (
        <div className="grid sm:grid-cols-2 gap-3">
          {stats.topScorer?.player && (
            <StatCard
              title="Meilleur buteur"
              player={stats.topScorer.player}
              value={`${stats.topScorer.goals} but${stats.topScorer.goals > 1 ? 's' : ''}`}
              accent="text-accent-gold"
            />
          )}
          {stats.bestDefense?.player && (
            <StatCard
              title="Meilleure défense"
              player={stats.bestDefense.player}
              value={`${stats.bestDefense.conceded} encaissé${stats.bestDefense.conceded > 1 ? 's' : ''}`}
              accent="text-accent-cyan"
            />
          )}
        </div>
      )}

      <div className="text-xs text-txt-muted">
        Départage : 1. Points · 2. Différence de buts · 3. Buts marqués · 4. Confrontation directe.
      </div>
    </div>
  );
}

function StatCard({
  title, player, value, accent,
}: { title: string; player: any; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-bdr bg-bg-secondary p-4 flex items-center gap-3">
      <PlayerAvatar
        name={player.name}
        initials={player.initials}
        color={player.color}
        imageUrl={player.imageUrl}
        size={48}
      />
      <div className="flex-1 min-w-0">
        <div className={`text-[10px] uppercase tracking-wider font-bold ${accent}`}>{title}</div>
        <div className="font-bold truncate">{player.name}</div>
      </div>
      <div className="text-2xl font-extrabold tabular-nums">{value.split(' ')[0]}</div>
    </div>
  );
}
