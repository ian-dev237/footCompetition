import PlayerAvatar from './PlayerAvatar';
import clsx from 'clsx';
import { KNOCKOUT_LABEL } from '@/lib/constants';

export type BPlayer = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

export type BTie = {
  id: string;
  round: 'ROUND_OF_16' | 'SEMIFINAL' | 'FINAL';
  slot: number;
  twoLegged: boolean;
  playerA: BPlayer | null;
  playerB: BPlayer | null;
  leg1HomeScore: number | null;
  leg1AwayScore: number | null;
  leg2HomeScore: number | null;
  leg2AwayScore: number | null;
  etHomeScore: number | null;
  etAwayScore: number | null;
  penA: number | null;
  penB: number | null;
  status: string;
};

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

function TieCard({ t }: { t: BTie }) {
  const w = winnerSide(t);
  const aggA = aggregateForA(t);
  const aggB = aggregateForB(t);

  return (
    <div className="rounded-xl border border-bdr bg-bg-secondary overflow-hidden">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-txt-muted border-b border-bdr flex items-center justify-between">
        <span>{KNOCKOUT_LABEL[t.round]} · #{t.slot}</span>
        {t.twoLegged && <span className="text-accent-cyan">Aller-retour</span>}
      </div>
      <Side player={t.playerA} agg={aggA} highlight={w === 'a'} />
      <div className="h-px bg-bdr" />
      <Side player={t.playerB} agg={aggB} highlight={w === 'b'} />

      {t.twoLegged && (t.leg1HomeScore != null || t.leg2HomeScore != null) && (
        <div className="px-3 py-2 border-t border-bdr text-[11px] text-txt-secondary flex items-center justify-between">
          <span>
            Aller {t.leg1HomeScore ?? '-'}–{t.leg1AwayScore ?? '-'}
            <span className="mx-2 text-txt-muted">·</span>
            Retour {t.leg2HomeScore ?? '-'}–{t.leg2AwayScore ?? '-'}
          </span>
          {(t.etHomeScore != null || t.penA != null) && (
            <span className="text-accent-gold font-semibold">
              {t.penA != null ? `tab ${t.penA}–${t.penB}` : `a.p. ${t.etHomeScore}–${t.etAwayScore}`}
            </span>
          )}
        </div>
      )}
      {!t.twoLegged && t.leg1HomeScore != null && (
        <div className="px-3 py-2 border-t border-bdr text-[11px] text-txt-secondary flex items-center justify-between">
          <span>Finale {t.leg1HomeScore}–{t.leg1AwayScore}</span>
          {(t.etHomeScore != null || t.penA != null) && (
            <span className="text-accent-gold font-semibold">
              {t.penA != null ? `tab ${t.penA}–${t.penB}` : `a.p. ${t.etHomeScore}–${t.etAwayScore}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Side({ player, agg, highlight }: { player: BPlayer | null; agg: number | null; highlight: boolean }) {
  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2.5',
      highlight && 'bg-accent-blue/10',
    )}>
      {player ? (
        <>
          <PlayerAvatar {...player} size={28} />
          <span className={clsx('flex-1 truncate text-sm', highlight ? 'font-bold text-txt-primary' : 'text-txt-secondary')}>
            {player.name}
          </span>
        </>
      ) : (
        <>
          <div className="w-7 h-7 rounded-full bg-bg-tertiary border border-bdr" />
          <span className="flex-1 text-sm text-txt-muted italic">À déterminer</span>
        </>
      )}
      <span className={clsx('font-bold tabular-nums text-right min-w-[1.5ch]', highlight && 'text-accent-blue')}>
        {agg ?? '-'}
      </span>
    </div>
  );
}

export default function KnockoutBracket({
  ties, champion,
}: { ties: BTie[]; champion: BPlayer | null }) {
  const r16 = ties.filter(t => t.round === 'ROUND_OF_16').sort((a, b) => a.slot - b.slot);
  const sf  = ties.filter(t => t.round === 'SEMIFINAL').sort((a, b) => a.slot - b.slot);
  const final = ties.find(t => t.round === 'FINAL');

  return (
    <div className="space-y-6">
      {champion && (
        <div className="rounded-xl border border-accent-gold/40 bg-gradient-to-br from-accent-gold/20 to-bg-secondary p-6 flex items-center gap-4">
          <PlayerAvatar {...champion} size={72} />
          <div>
            <div className="text-[11px] uppercase tracking-wider text-accent-gold font-bold">🏆 Champion</div>
            <div className="text-2xl font-extrabold">{champion.name}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wider text-txt-muted font-semibold">Huitièmes</div>
          {r16.length === 0 && <div className="text-sm text-txt-muted italic">Tirage à venir.</div>}
          {r16.map(t => <TieCard key={t.id} t={t} />)}
        </div>
        <div className="space-y-3 md:pt-12">
          <div className="text-xs uppercase tracking-wider text-txt-muted font-semibold">Demi-finales</div>
          {sf.length === 0 && <div className="text-sm text-txt-muted italic">À venir.</div>}
          {sf.map(t => <TieCard key={t.id} t={t} />)}
        </div>
        <div className="space-y-3 md:pt-28">
          <div className="text-xs uppercase tracking-wider text-txt-muted font-semibold">Finale</div>
          {!final && <div className="text-sm text-txt-muted italic">À venir.</div>}
          {final && <TieCard t={final} />}
        </div>
      </div>
    </div>
  );
}
