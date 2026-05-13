import clsx from 'clsx';
import PlayerAvatar from './PlayerAvatar';
import type { StandingsRow } from '@/lib/standings';

function rankBadge(rank: number, total: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank === 4 && total >= 4) return '🎯';
  return null;
}

export default function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-bdr bg-bg-secondary">
      <table className="w-full text-sm">
        <thead className="bg-bg-tertiary text-txt-secondary uppercase text-[10px] tracking-wider">
          <tr>
            <th className="py-2 px-2 text-left">#</th>
            <th className="py-2 px-2 text-left">Joueur</th>
            <th className="py-2 px-1 text-center" title="Matchs joués">MJ</th>
            <th className="py-2 px-1 text-center" title="Victoires">V</th>
            <th className="py-2 px-1 text-center" title="Nuls">N</th>
            <th className="py-2 px-1 text-center" title="Défaites">D</th>
            <th className="py-2 px-1 text-center" title="Buts pour">BP</th>
            <th className="py-2 px-1 text-center" title="Buts contre">BC</th>
            <th className="py-2 px-1 text-center" title="Différence">Diff</th>
            <th className="py-2 px-2 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const top4 = r.rank <= 4 && rows.length >= 4;
            return (
              <tr
                key={r.playerId}
                className={clsx(
                  'border-t border-bdr transition',
                  top4 && 'bg-accent-blue/5',
                )}
              >
                <td className="py-2 px-2 font-bold tabular-nums">
                  <div className="flex items-center gap-1">
                    <span className={clsx(top4 ? 'text-accent-blue' : 'text-txt-secondary')}>{r.rank}</span>
                    <span>{rankBadge(r.rank, rows.length)}</span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2 min-w-[140px]">
                    <PlayerAvatar
                      name={r.name}
                      initials={r.initials}
                      color={r.color}
                      imageUrl={r.imageUrl}
                      size={28}
                    />
                    <span className="font-medium truncate">{r.name}</span>
                  </div>
                </td>
                <td className="text-center tabular-nums text-txt-secondary">{r.mj}</td>
                <td className="text-center tabular-nums text-status-win">{r.v}</td>
                <td className="text-center tabular-nums text-txt-secondary">{r.n}</td>
                <td className="text-center tabular-nums text-status-loss">{r.d}</td>
                <td className="text-center tabular-nums">{r.bp}</td>
                <td className="text-center tabular-nums">{r.bc}</td>
                <td className={clsx('text-center tabular-nums font-medium',
                  r.diff > 0 && 'text-status-win',
                  r.diff < 0 && 'text-status-loss',
                )}>{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                <td className="text-right pr-3 font-bold tabular-nums">{r.points}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={10} className="py-6 text-center text-txt-muted">Aucun joueur inscrit.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
