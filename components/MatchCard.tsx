import PlayerAvatar from './PlayerAvatar';
import LiveDot from './LiveDot';
import clsx from 'clsx';

type Player = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

export type MatchCardProps = {
  homePlayer: Player;
  awayPlayer: Player;
  homeScore: number | null;
  awayScore: number | null;
  status: string; // PENDING | LIVE | FINISHED
  compact?: boolean;
};

export default function MatchCard({
  homePlayer, awayPlayer, homeScore, awayScore, status, compact,
}: MatchCardProps) {
  const finished = status === 'FINISHED';
  const live = status === 'LIVE';
  const pending = status === 'PENDING';

  const homeWin = finished && homeScore != null && awayScore != null && homeScore > awayScore;
  const awayWin = finished && homeScore != null && awayScore != null && awayScore > homeScore;

  return (
    <div className={clsx(
      'rounded-xl bg-bg-secondary border border-bdr px-4 py-3 flex items-center gap-3 transition hover:bg-bg-tertiary',
      compact && 'py-2',
    )}>
      <div className="flex-1 flex items-center gap-3 min-w-0">
        <PlayerAvatar {...homePlayer} size={compact ? 32 : 40} />
        <span className={clsx(
          'truncate font-medium',
          homeWin ? 'text-txt-primary' : 'text-txt-secondary',
        )}>{homePlayer.name}</span>
      </div>

      <div className="flex flex-col items-center min-w-[80px]">
        {pending && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted">À jouer</span>
        )}
        {(finished || live) && (
          <div className="flex items-baseline gap-2 font-bold text-xl tabular-nums">
            <span className={clsx(homeWin ? 'text-status-win' : 'text-txt-primary')}>{homeScore ?? '-'}</span>
            <span className="text-txt-muted text-sm">-</span>
            <span className={clsx(awayWin ? 'text-status-win' : 'text-txt-primary')}>{awayScore ?? '-'}</span>
          </div>
        )}
        {live && <LiveDot />}
        {finished && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-txt-muted mt-0.5">FT</span>
        )}
      </div>

      <div className="flex-1 flex items-center gap-3 justify-end min-w-0">
        <span className={clsx(
          'truncate font-medium text-right',
          awayWin ? 'text-txt-primary' : 'text-txt-secondary',
        )}>{awayPlayer.name}</span>
        <PlayerAvatar {...awayPlayer} size={compact ? 32 : 40} />
      </div>
    </div>
  );
}
