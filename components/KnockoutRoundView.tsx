import PlayerAvatar from './PlayerAvatar';
import clsx from 'clsx';
import { KNOCKOUT_LABEL } from '@/lib/constants';
import type { BTie, BPlayer } from './KnockoutBracket';

function aggregateForA(t: BTie): number | null {
  if (t.twoLegged) {
    if (t.leg1HomeScore == null || t.leg2AwayScore == null) return null;
    return t.leg1HomeScore + t.leg2AwayScore;
  }
  return t.leg1HomeScore;
}
function aggregateForB(t: BTie): number | null {
  if (t.twoLegged) {
    if (t.leg1AwayScore == null || t.leg2HomeScore == null) return null;
    return t.leg1AwayScore + t.leg2HomeScore;
  }
  return t.leg1AwayScore;
}

function winnerSide(t: BTie): 'a' | 'b' | null {
  if (t.status !== 'FINISHED') return null;
  const aggA = aggregateForA(t);
  const aggB = aggregateForB(t);
  if (aggA != null && aggB != null && aggA !== aggB) return aggA > aggB ? 'a' : 'b';
  if (t.etHomeScore != null && t.etAwayScore != null && t.etHomeScore !== t.etAwayScore)
    return t.etHomeScore > t.etAwayScore ? 'a' : 'b';
  if (t.penA != null && t.penB != null && t.penA !== t.penB) return t.penA > t.penB ? 'a' : 'b';
  return null;
}

type Size = 'sm' | 'md' | 'lg' | 'xl';
const SIZE_PRESETS: Record<Size, { avatar: number; name: string; agg: string; gap: string }> = {
  sm: { avatar: 32,  name: 'text-sm',         agg: 'text-base',           gap: 'gap-2' },
  md: { avatar: 56,  name: 'text-base sm:text-lg', agg: 'text-xl sm:text-2xl', gap: 'gap-3' },
  lg: { avatar: 96,  name: 'text-xl sm:text-2xl', agg: 'text-3xl sm:text-4xl',  gap: 'gap-4' },
  xl: { avatar: 128, name: 'text-2xl sm:text-4xl', agg: 'text-4xl sm:text-6xl', gap: 'gap-5' },
};

export default function KnockoutRoundView({
  ties, size = 'md', layout = 'grid',
}: {
  ties: BTie[];
  size?: Size;
  layout?: 'grid' | 'stack';
}) {
  if (ties.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-bdr p-12 text-center text-txt-muted">
        Pas encore débloqué. Termine la phase précédente d'abord.
      </div>
    );
  }
  return (
    <div className={clsx(
      layout === 'grid' ? 'grid gap-4 md:grid-cols-2' : 'space-y-4',
    )}>
      {ties.map(t => <BigTieCard key={t.id} t={t} size={size} />)}
    </div>
  );
}

function BigTieCard({ t, size }: { t: BTie; size: Size }) {
  const w = winnerSide(t);
  const aggA = aggregateForA(t);
  const aggB = aggregateForB(t);
  const P = SIZE_PRESETS[size];

  return (
    <div className="rounded-2xl border border-bdr bg-bg-secondary overflow-hidden">
      <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-txt-muted border-b border-bdr flex items-center justify-between">
        <span>{KNOCKOUT_LABEL[t.round]} · #{t.slot}</span>
        <span className="text-accent-cyan">{t.twoLegged ? 'Aller-retour' : 'Match unique'}</span>
      </div>

      <div className={clsx('p-4 sm:p-6 grid grid-cols-[1fr_auto_1fr] items-center', P.gap)}>
        <SidePlayer player={t.playerA} highlight={w === 'a'} size={size} align="left" />

        <div className={clsx(
          'flex flex-col items-center font-black tabular-nums',
          P.agg,
        )}>
          <div className="flex items-baseline gap-2">
            <span className={clsx(w === 'a' && 'text-accent-gold')}>{aggA ?? '-'}</span>
            <span className="text-txt-muted text-xl sm:text-2xl">–</span>
            <span className={clsx(w === 'b' && 'text-accent-gold')}>{aggB ?? '-'}</span>
          </div>
          {t.status === 'FINISHED' && <div className="text-[10px] text-status-win mt-1 tracking-wider">CUMUL</div>}
        </div>

        <SidePlayer player={t.playerB} highlight={w === 'b'} size={size} align="right" />
      </div>

      {(t.leg1HomeScore != null || t.leg2HomeScore != null) && (
        <div className="px-4 py-2 border-t border-bdr text-[11px] sm:text-xs text-txt-secondary flex items-center justify-center gap-3 flex-wrap">
          {t.twoLegged ? (
            <>
              <span>Aller {t.leg1HomeScore ?? '-'}–{t.leg1AwayScore ?? '-'}</span>
              <span className="text-txt-muted">·</span>
              <span>Retour {t.leg2HomeScore ?? '-'}–{t.leg2AwayScore ?? '-'}</span>
            </>
          ) : (
            <span>Score final {t.leg1HomeScore ?? '-'}–{t.leg1AwayScore ?? '-'}</span>
          )}
          {(t.etHomeScore != null || t.penA != null) && (
            <>
              <span className="text-txt-muted">·</span>
              <span className="text-accent-gold font-semibold">
                {t.penA != null ? `tab ${t.penA}–${t.penB}` : `a.p. ${t.etHomeScore}–${t.etAwayScore}`}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SidePlayer({
  player, highlight, size, align,
}: {
  player: BPlayer | null;
  highlight: boolean;
  size: Size;
  align: 'left' | 'right';
}) {
  const P = SIZE_PRESETS[size];
  return (
    <div className={clsx('flex items-center min-w-0', P.gap, align === 'right' ? 'flex-row-reverse text-right' : '')}>
      {player ? (
        <div className={clsx(
          'rounded-full shrink-0 transition',
          highlight
            ? 'ring-4 ring-accent-gold/70 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
            : 'ring-2 ring-bdr',
        )}>
          <PlayerAvatar {...player} size={P.avatar} />
        </div>
      ) : (
        <div
          className="rounded-full bg-bg-tertiary border border-bdr shrink-0"
          style={{ width: P.avatar, height: P.avatar }}
        />
      )}
      <div className="min-w-0">
        <div className={clsx(
          'font-bold truncate transition',
          P.name,
          highlight ? 'text-txt-primary' : 'text-txt-secondary',
        )}>
          {player?.name ?? <span className="italic text-txt-muted">À déterminer</span>}
        </div>
      </div>
    </div>
  );
}
