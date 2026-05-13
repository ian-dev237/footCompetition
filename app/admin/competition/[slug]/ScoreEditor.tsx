'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import PlayerAvatar from '@/components/PlayerAvatar';
import { KNOCKOUT_LABEL } from '@/lib/constants';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function SaveBadge({ state, error }: { state: SaveState; error?: string | null }) {
  if (state === 'idle') return <span className="w-5" aria-hidden />;
  if (state === 'saving') {
    return (
      <span title="Sauvegarde…" className="inline-flex items-center text-txt-muted">
        <span className="h-2 w-2 rounded-full bg-accent-blue animate-livepulse" />
      </span>
    );
  }
  if (state === 'saved') {
    return <span title="Enregistré" className="text-status-win text-base leading-none">✓</span>;
  }
  return (
    <span title={error ?? 'Erreur'} className="text-status-loss text-base leading-none">!</span>
  );
}

type Player = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

type Match = {
  id: string;
  homePlayerId: string;
  awayPlayerId: string;
  homePlayer: Player;
  awayPlayer: Player;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
};

type Journee = {
  id: string;
  number: number;
  matches: Match[];
};

type KTie = {
  id: string;
  round: 'ROUND_OF_16' | 'SEMIFINAL' | 'FINAL';
  slot: number;
  twoLegged: boolean;
  playerAId: string | null;
  playerBId: string | null;
  leg1HomeScore: number | null;
  leg1AwayScore: number | null;
  leg2HomeScore: number | null;
  leg2AwayScore: number | null;
  etHomeScore: number | null;
  etAwayScore: number | null;
  penA: number | null;
  penB: number | null;
  status: string;
  drawnAt: Date | string | null;
};

export default function ScoreEditor({
  slug, journees, knockoutTies, players, championshipDone, competitionStatus, celebrationAt,
}: {
  slug: string;
  journees: Journee[];
  knockoutTies: KTie[];
  players: Player[];
  championshipDone: boolean;
  competitionStatus: string;
  celebrationAt: string | null;
}) {
  const router = useRouter();
  const [currentJ, setCurrentJ] = useState(() => {
    const firstUnfinished = journees.find(j => j.matches.some(m => m.status !== 'FINISHED'));
    return firstUnfinished?.number ?? journees[0]?.number ?? 1;
  });
  const playerById = new Map(players.map(p => [p.id, p]));
  const r16 = knockoutTies.filter(t => t.round === 'ROUND_OF_16');
  const sf  = knockoutTies.filter(t => t.round === 'SEMIFINAL');
  const final = knockoutTies.find(t => t.round === 'FINAL');
  const knockoutSeeded = knockoutTies.length > 0;
  const r16Done = r16.length === 4 && r16.every(t => t.status === 'FINISHED');
  const sfSeeded = sf.length > 0 && sf.every(t => t.playerAId && t.playerBId);

  const [showR16Modal, setShowR16Modal] = useState(false);
  const [showSFModal, setShowSFModal] = useState(false);
  const [drawBusy, setDrawBusy] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  type RedrawFrom = 'ROUND_OF_16' | 'SEMIFINAL';
  const [redrawTarget, setRedrawTarget] = useState<RedrawFrom | null>(null);
  const [redrawBusy, setRedrawBusy] = useState(false);
  const [redrawError, setRedrawError] = useState<string | null>(null);

  useEffect(() => {
    if (!showR16Modal && !showSFModal && !redrawTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showR16Modal && !drawBusy) setShowR16Modal(false);
      if (showSFModal && !drawBusy) setShowSFModal(false);
      if (redrawTarget && !redrawBusy) setRedrawTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showR16Modal, showSFModal, drawBusy, redrawTarget, redrawBusy]);

  async function confirmRedraw() {
    if (!redrawTarget) return;
    setRedrawError(null);
    setRedrawBusy(true);
    const res = await fetch(`/api/competitions/${slug}/knockout/redraw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: redrawTarget }),
    });
    if (res.ok) {
      try {
        ['ROUND_OF_16', 'SEMIFINAL', 'FINAL'].forEach(r => {
          localStorage.removeItem(`draw:${slug}:${r}`);
          sessionStorage.removeItem(`draw:${slug}:${r}`);
        });
        sessionStorage.removeItem(`champion-celebration:${slug}`);
      } catch { /* ignore */ }
      setRedrawTarget(null);
      setRedrawBusy(false);
      router.refresh();
    } else {
      setRedrawError((await res.json().catch(() => ({}))).error ?? 'Erreur');
      setRedrawBusy(false);
    }
  }

  useEffect(() => {
    if (!showR16Modal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowR16Modal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showR16Modal]);

  async function confirmDrawR16() {
    setDrawError(null);
    setDrawBusy(true);
    const res = await fetch(`/api/competitions/${slug}/knockout`, { method: 'POST' });
    if (res.ok) {
      try {
        ['ROUND_OF_16', 'SEMIFINAL', 'FINAL'].forEach(r => {
          localStorage.removeItem(`draw:${slug}:${r}`);
          sessionStorage.removeItem(`draw:${slug}:${r}`);
        });
      } catch { /* ignore */ }
      setShowR16Modal(false);
      setDrawBusy(false);
      router.refresh();
    } else {
      setDrawError((await res.json()).error ?? 'Erreur lors du tirage');
      setDrawBusy(false);
    }
  }

  async function confirmDrawSF() {
    setDrawError(null);
    setDrawBusy(true);
    const res = await fetch(`/api/competitions/${slug}/knockout/semifinals`, { method: 'POST' });
    if (res.ok) {
      try {
        ['SEMIFINAL', 'FINAL'].forEach(r => {
          localStorage.removeItem(`draw:${slug}:${r}`);
          sessionStorage.removeItem(`draw:${slug}:${r}`);
        });
      } catch { /* ignore */ }
      setShowSFModal(false);
      setDrawBusy(false);
      router.refresh();
    } else {
      setDrawError((await res.json()).error ?? 'Erreur lors du tirage');
      setDrawBusy(false);
    }
  }

  const [celebBusy, setCelebBusy] = useState(false);
  const [celebError, setCelebError] = useState<string | null>(null);
  async function triggerCelebration() {
    setCelebError(null);
    setCelebBusy(true);
    const res = await fetch(`/api/competitions/${slug}/celebration`, { method: 'POST' });
    if (res.ok) {
      try {
        // Strip any old per-tab guard so the celebration can replay in this tab too.
        Object.keys(sessionStorage).forEach(k => {
          if (k.startsWith(`champion-celebration:${slug}`)) sessionStorage.removeItem(k);
        });
      } catch { /* ignore */ }
      setCelebBusy(false);
      router.refresh();
    } else {
      setCelebError((await res.json().catch(() => ({}))).error ?? 'Erreur');
      setCelebBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Championship section */}
      <section className="space-y-3">
        <h2 className="font-bold">Phase de poule (Round-Robin)</h2>

        <div className="flex flex-wrap gap-2">
          {journees.map(j => {
            const total = j.matches.length;
            const done = j.matches.filter(m => m.status === 'FINISHED').length;
            const active = j.number === currentJ;
            return (
              <button
                key={j.id}
                onClick={() => setCurrentJ(j.number)}
                className={clsx(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold border flex items-center gap-2 transition',
                  active
                    ? 'bg-accent-blue text-white border-accent-blue'
                    : 'bg-bg-secondary border-bdr text-txt-secondary hover:text-txt-primary',
                )}
              >
                <span>J{j.number}</span>
                <span className="text-[10px] tabular-nums opacity-80">{done}/{total}</span>
              </button>
            );
          })}
        </div>

        {/* Keep all journées mounted so debounced saves never get cancelled
            when the admin switches journée mid-typing. Only the current one
            is visible. */}
        {journees.map(j => (
          <div
            key={j.id}
            className={clsx('grid gap-2', j.number !== currentJ && 'hidden')}
          >
            {j.matches.map(m => (
              <MatchRow key={m.id} slug={slug} m={m} />
            ))}
          </div>
        ))}
      </section>

      {/* Knockout section */}
      {(knockoutSeeded || championshipDone) && (
        <section className="space-y-4">
          <h2 className="font-bold">Phases finales</h2>

          {championshipDone && !knockoutSeeded && (
            <div className="rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm">Phase de poule terminée 🎉</div>
                <div className="text-xs text-txt-secondary mt-0.5">
                  Lance le tirage des huitièmes pour démarrer les phases finales.
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDrawError(null); setShowR16Modal(true); }}
                className="shrink-0 rounded-lg bg-accent-gold text-bg-primary font-bold px-3 py-2 text-xs hover:opacity-90"
              >
                🎲 Tirage des huitièmes →
              </button>
            </div>
          )}

          {knockoutSeeded && (
            <RoundBlock
              title="Huitièmes (aller-retour)"
              ties={r16}
              slug={slug}
              playerById={playerById}
              onRedraw={r16.length > 0 ? () => { setRedrawError(null); setRedrawTarget('ROUND_OF_16'); } : undefined}
            />
          )}

          {r16Done && !sfSeeded && (
            <div className="rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-sm">Huitièmes terminés 🎉</div>
                <div className="text-xs text-txt-secondary mt-0.5">
                  Lance le tirage des demi-finales pour pouvoir saisir les scores.
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setDrawError(null); setShowSFModal(true); }}
                className="shrink-0 rounded-lg bg-accent-gold text-bg-primary font-bold px-3 py-2 text-xs hover:opacity-90"
              >
                🎲 Tirage des demi-finales →
              </button>
            </div>
          )}

          <RoundBlock
            title="Demi-finales (aller-retour)"
            ties={sf}
            slug={slug}
            playerById={playerById}
            locked={!sfSeeded}
            lockedHint={!r16Done
              ? 'Termine d’abord les huitièmes.'
              : 'Lance le tirage des demi-finales pour débloquer la saisie des scores.'}
            onRedraw={sf.some(t => t.playerAId && t.playerBId) ? () => { setRedrawError(null); setRedrawTarget('SEMIFINAL'); } : undefined}
          />
          {final && (
            <RoundBlock title="Finale (match unique)" ties={[final]} slug={slug} playerById={playerById} />
          )}

          {competitionStatus === 'FINISHED' && (
            <div className="rounded-xl border border-accent-gold/40 bg-accent-gold/10 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-accent-gold">🏆 Compétition terminée</div>
                  <div className="text-xs text-txt-secondary mt-0.5">
                    {celebrationAt
                      ? `Cérémonie lancée le ${new Date(celebrationAt).toLocaleString('fr-FR')}. Tu peux la relancer côté public.`
                      : 'Lance la cérémonie pour que le sacre du champion s’affiche côté public.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={triggerCelebration}
                  disabled={celebBusy}
                  className="shrink-0 rounded-lg bg-accent-gold text-bg-primary font-bold px-3 py-2 text-xs hover:opacity-90 disabled:opacity-50"
                >
                  {celebBusy
                    ? 'Lancement…'
                    : celebrationAt ? '🎉 Relancer la cérémonie' : '🎉 Lancer la cérémonie →'}
                </button>
              </div>
              {celebError && (
                <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-xs text-status-loss flex items-start gap-2">
                  <span aria-hidden>⚠</span>
                  <span>{celebError}</span>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {redrawTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="redraw-modal-title"
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
          onClick={() => !redrawBusy && setRedrawTarget(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-status-loss/40 bg-bg-secondary shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-status-loss/20 text-status-loss flex items-center justify-center text-xl shrink-0">
                ↻
              </div>
              <div className="min-w-0">
                <h3 id="redraw-modal-title" className="font-bold text-lg leading-tight">
                  {redrawTarget === 'ROUND_OF_16'
                    ? 'Refaire le tirage des huitièmes ?'
                    : 'Refaire le tirage des demi-finales ?'}
                </h3>
                <p className="text-sm text-txt-secondary mt-1">
                  {redrawTarget === 'ROUND_OF_16'
                    ? 'Cela va effacer tous les scores des huitièmes, des demi-finales et de la finale, puis tirer 4 nouvelles affiches parmi les 8 meilleurs.'
                    : 'Cela va effacer les paires et les scores des demi-finales et de la finale, puis tirer 2 nouvelles affiches parmi les 4 vainqueurs des huitièmes.'}
                </p>
                <p className="text-xs text-status-loss mt-2 font-semibold">
                  Cette action est irréversible.
                </p>
              </div>
            </div>

            {redrawError && (
              <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{redrawError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRedrawTarget(null)}
                disabled={redrawBusy}
                className="rounded-lg border border-bdr bg-bg-tertiary px-4 py-2 text-sm font-semibold text-txt-secondary hover:text-txt-primary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmRedraw}
                disabled={redrawBusy}
                autoFocus
                className="rounded-lg bg-status-loss text-white px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {redrawBusy ? 'Nouveau tirage…' : 'Refaire le tirage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSFModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sf-modal-title"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
          onClick={() => !drawBusy && setShowSFModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-bdr bg-bg-secondary shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center text-xl shrink-0">
                🎲
              </div>
              <div className="min-w-0">
                <h3 id="sf-modal-title" className="font-bold text-lg leading-tight">
                  Tirage des demi-finales ?
                </h3>
                <p className="text-sm text-txt-secondary mt-1">
                  Les <span className="text-txt-primary font-semibold">4 vainqueurs des huitièmes</span> seront tirés au sort en 2 affiches.
                  L’animation se lancera côté public.
                </p>
              </div>
            </div>

            {drawError && (
              <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{drawError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSFModal(false)}
                disabled={drawBusy}
                className="rounded-lg border border-bdr bg-bg-tertiary px-4 py-2 text-sm font-semibold text-txt-secondary hover:text-txt-primary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDrawSF}
                disabled={drawBusy}
                autoFocus
                className="rounded-lg bg-accent-gold text-bg-primary px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {drawBusy ? 'Tirage…' : 'Lancer le tirage'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showR16Modal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="r16-modal-title"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
          onClick={() => !drawBusy && setShowR16Modal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-bdr bg-bg-secondary shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center text-xl shrink-0">
                🎲
              </div>
              <div className="min-w-0">
                <h3 id="r16-modal-title" className="font-bold text-lg leading-tight">
                  Tirage des huitièmes ?
                </h3>
                <p className="text-sm text-txt-secondary mt-1">
                  Lancer le tirage aléatoire des huitièmes ?
                  Les <span className="text-txt-primary font-semibold">8 meilleurs du classement</span> seront tirés au sort.
                </p>
              </div>
            </div>

            {drawError && (
              <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{drawError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowR16Modal(false)}
                disabled={drawBusy}
                className="rounded-lg border border-bdr bg-bg-tertiary px-4 py-2 text-sm font-semibold text-txt-secondary hover:text-txt-primary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDrawR16}
                disabled={drawBusy}
                autoFocus
                className="rounded-lg bg-accent-gold text-bg-primary px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {drawBusy ? 'Tirage…' : 'Lancer le tirage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundBlock({
  title, ties, slug, playerById, onRedraw, locked, lockedHint,
}: {
  title: string;
  ties: KTie[];
  slug: string;
  playerById: Map<string, Player>;
  onRedraw?: () => void;
  locked?: boolean;
  lockedHint?: string;
}) {
  if (ties.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wider text-txt-muted font-semibold">{title}</div>
        {onRedraw && !locked && (
          <button
            type="button"
            onClick={onRedraw}
            className="rounded-lg border border-bdr bg-bg-secondary text-txt-secondary hover:text-status-loss hover:border-status-loss/50 px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1"
            title="Refaire le tirage de cette phase"
          >
            <span aria-hidden>↻</span>
            <span>Refaire le tirage</span>
          </button>
        )}
      </div>
      {locked ? (
        <div className="rounded-xl border border-dashed border-bdr bg-bg-secondary/50 p-4 text-sm text-txt-muted text-center">
          🔒 {lockedHint ?? 'Tirage en attente.'}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {ties.map(t => (
            <TieEditor
              key={`${t.id}:${t.drawnAt ? new Date(t.drawnAt).getTime() : 'none'}`}
              slug={slug}
              t={t}
              playerA={t.playerAId ? playerById.get(t.playerAId) ?? null : null}
              playerB={t.playerBId ? playerById.get(t.playerBId) ?? null : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TieEditor({
  slug, t, playerA, playerB,
}: {
  slug: string;
  t: KTie;
  playerA: Player | null;
  playerB: Player | null;
}) {
  const router = useRouter();
  const [leg1H, setLeg1H] = useState(t.leg1HomeScore?.toString() ?? '');
  const [leg1A, setLeg1A] = useState(t.leg1AwayScore?.toString() ?? '');
  const [leg2H, setLeg2H] = useState(t.leg2HomeScore?.toString() ?? '');
  const [leg2A, setLeg2A] = useState(t.leg2AwayScore?.toString() ?? '');
  const [etH, setEtH]     = useState(t.etHomeScore?.toString() ?? '');
  const [etA, setEtA]     = useState(t.etAwayScore?.toString() ?? '');
  const [penA, setPenA]   = useState(t.penA?.toString() ?? '');
  const [penB, setPenB]   = useState(t.penB?.toString() ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const initialMountRef = useRef(true);
  const savedFadeRef = useRef<number | null>(null);

  const ready = !!playerA && !!playerB;

  // Aggregate so far
  const aggA = (() => {
    if (t.twoLegged) {
      const a = leg1H === '' ? null : Number(leg1H);
      const b = leg2A === '' ? null : Number(leg2A);
      if (a == null || b == null) return null;
      return a + b;
    }
    return leg1H === '' ? null : Number(leg1H);
  })();
  const aggB = (() => {
    if (t.twoLegged) {
      const a = leg1A === '' ? null : Number(leg1A);
      const b = leg2H === '' ? null : Number(leg2H);
      if (a == null || b == null) return null;
      return a + b;
    }
    return leg1A === '' ? null : Number(leg1A);
  })();
  const bothLegsIn = t.twoLegged ? (leg1H && leg1A && leg2H && leg2A) : (leg1H && leg1A);
  const isTie = bothLegsIn && aggA != null && aggB != null && aggA === aggB;
  const etDone = etH !== '' && etA !== '' && Number(etH) !== Number(etA);
  const needPen = bothLegsIn && isTie && (etH === '' || etA === '' || Number(etH) === Number(etA));

  useEffect(() => {
    if (!ready) return;
    if (initialMountRef.current) { initialMountRef.current = false; return; }

    const parse = (v: string): { value: number | null; bad: boolean } => {
      if (v === '') return { value: null, bad: false };
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 99) return { value: null, bad: true };
      return { value: n, bad: false };
    };

    const fields = { leg1H, leg1A, leg2H, leg2A, etH, etA, penA, penB };
    const parsed: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(fields)) {
      const p = parse(v);
      if (p.bad) {
        setSaveState('error');
        setErrMsg('Score invalide (0–99)');
        return;
      }
      parsed[k] = p.value;
    }
    setErrMsg(null);
    setSaveState('saving');

    const body = {
      leg1HomeScore: parsed.leg1H,
      leg1AwayScore: parsed.leg1A,
      leg2HomeScore: parsed.leg2H,
      leg2AwayScore: parsed.leg2A,
      etHomeScore: parsed.etH,
      etAwayScore: parsed.etA,
      penA: parsed.penA,
      penB: parsed.penB,
    };

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/competitions/${slug}/knockout-ties/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erreur');
        setSaveState('saved');
        router.refresh();
        if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
        savedFadeRef.current = window.setTimeout(() => setSaveState('idle'), 1500) as unknown as number;
      } catch (e: any) {
        setSaveState('error');
        setErrMsg(e.message ?? 'Erreur');
      }
    }, 500) as unknown as number;

    return () => clearTimeout(timer);
  }, [leg1H, leg1A, leg2H, leg2A, etH, etA, penA, penB, ready, slug, t.id, router]);

  return (
    <div className="rounded-xl border border-bdr bg-bg-secondary p-3 space-y-2">
      <div className="text-[10px] uppercase tracking-wider text-txt-muted font-bold flex items-center justify-between gap-2">
        <span>{KNOCKOUT_LABEL[t.round]} · #{t.slot}</span>
        <span className="flex items-center gap-2">
          <SaveBadge state={saveState} error={errMsg} />
          <span className="text-accent-cyan">{t.twoLegged ? 'Aller-retour' : 'Match unique'}</span>
        </span>
      </div>

      {!ready ? (
        <div className="text-sm text-txt-muted italic">
          {t.round === 'SEMIFINAL'
            ? 'En attente des huitièmes…'
            : t.round === 'FINAL'
            ? 'En attente des demi-finales…'
            : 'Joueurs non assignés.'}
        </div>
      ) : (
        <>
          <PlayersHeader playerA={playerA!} playerB={playerB!} aggA={aggA} aggB={aggB} />

          <Leg
            label={t.twoLegged ? `Aller — ${playerA!.name} à domicile` : 'Match'}
            home={leg1H} away={leg1A} setHome={setLeg1H} setAway={setLeg1A}
            swapLabels={t.twoLegged ? [playerA!.name, playerB!.name] : undefined}
          />
          {t.twoLegged && (
            <Leg
              label={`Retour — ${playerB!.name} à domicile`}
              home={leg2H} away={leg2A} setHome={setLeg2H} setAway={setLeg2A}
              swapLabels={[playerB!.name, playerA!.name]}
            />
          )}

          {isTie && (
            <div className="rounded-lg bg-bg-tertiary p-2 space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-accent-gold font-bold">
                Égalité au cumulé — saisis le score après prolongation
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-[10px] text-txt-muted">a.p.</span>
                <input
                  type="number" min={0} max={99}
                  value={etH} onChange={e => setEtH(e.target.value)}
                  placeholder={playerA!.name.split(' ')[0]}
                  className="flex-1 text-center rounded bg-bg-primary border border-bdr py-1 tabular-nums text-sm focus:outline-none focus:border-accent-gold"
                />
                <span className="text-txt-muted">–</span>
                <input
                  type="number" min={0} max={99}
                  value={etA} onChange={e => setEtA(e.target.value)}
                  placeholder={playerB!.name.split(' ')[0]}
                  className="flex-1 text-center rounded bg-bg-primary border border-bdr py-1 tabular-nums text-sm focus:outline-none focus:border-accent-gold"
                />
              </div>
              {needPen && !etDone && (
                <div className="flex items-center gap-2">
                  <span className="w-12 text-[10px] text-txt-muted">t.a.b.</span>
                  <input
                    type="number" min={0} max={99}
                    value={penA} onChange={e => setPenA(e.target.value)}
                    placeholder="tirs"
                    className="flex-1 text-center rounded bg-bg-primary border border-bdr py-1 tabular-nums text-sm focus:outline-none focus:border-accent-gold"
                  />
                  <span className="text-txt-muted">–</span>
                  <input
                    type="number" min={0} max={99}
                    value={penB} onChange={e => setPenB(e.target.value)}
                    placeholder="tirs"
                    className="flex-1 text-center rounded bg-bg-primary border border-bdr py-1 tabular-nums text-sm focus:outline-none focus:border-accent-gold"
                  />
                </div>
              )}
            </div>
          )}

          {errMsg && saveState === 'error' && (
            <div className="text-[11px] text-status-loss">{errMsg}</div>
          )}
        </>
      )}
    </div>
  );
}

function PlayersHeader({
  playerA, playerB, aggA, aggB,
}: { playerA: Player; playerB: Player; aggA: number | null; aggB: number | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <PlayerAvatar {...playerA} size={28} />
        <span className="truncate">{playerA.name}</span>
      </div>
      <div className="font-bold tabular-nums px-2">
        {aggA ?? '-'} – {aggB ?? '-'}
      </div>
      <div className="flex items-center gap-2 min-w-0 justify-end">
        <span className="truncate text-right">{playerB.name}</span>
        <PlayerAvatar {...playerB} size={28} />
      </div>
    </div>
  );
}

function Leg({
  label, home, away, setHome, setAway, swapLabels,
}: {
  label: string;
  home: string; away: string;
  setHome: (v: string) => void; setAway: (v: string) => void;
  swapLabels?: [string, string];
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] text-txt-muted uppercase tracking-wider">{label}</div>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[11px] text-right text-txt-secondary truncate">
          {swapLabels ? swapLabels[0] : 'home'}
        </span>
        <input
          type="number" min={0} max={99}
          value={home} onChange={e => setHome(e.target.value)}
          className="w-12 text-center rounded-lg bg-bg-tertiary border border-bdr py-1 font-bold tabular-nums text-sm focus:outline-none focus:border-accent-blue"
        />
        <span className="text-txt-muted">–</span>
        <input
          type="number" min={0} max={99}
          value={away} onChange={e => setAway(e.target.value)}
          className="w-12 text-center rounded-lg bg-bg-tertiary border border-bdr py-1 font-bold tabular-nums text-sm focus:outline-none focus:border-accent-blue"
        />
        <span className="flex-1 text-[11px] text-txt-secondary truncate">
          {swapLabels ? swapLabels[1] : 'away'}
        </span>
      </div>
    </div>
  );
}

function MatchRow({ slug, m }: { slug: string; m: Match }) {
  const router = useRouter();
  const [home, setHome] = useState<string>(m.homeScore?.toString() ?? '');
  const [away, setAway] = useState<string>(m.awayScore?.toString() ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const initialMountRef = useRef(true);
  const savedFadeRef = useRef<number | null>(null);

  useEffect(() => {
    if (initialMountRef.current) { initialMountRef.current = false; return; }

    const h = home === '' ? null : Number(home);
    const a = away === '' ? null : Number(away);
    if ((h !== null && (!Number.isInteger(h) || h < 0 || h > 99))
      || (a !== null && (!Number.isInteger(a) || a < 0 || a > 99))) {
      setSaveState('error');
      setErrMsg('Score invalide (0–99)');
      return;
    }
    setErrMsg(null);
    setSaveState('saving');

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/competitions/${slug}/matches/${m.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeScore: h, awayScore: a }),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erreur');
        setSaveState('saved');
        router.refresh();
        if (savedFadeRef.current) clearTimeout(savedFadeRef.current);
        savedFadeRef.current = window.setTimeout(() => setSaveState('idle'), 1500) as unknown as number;
      } catch (e: any) {
        setSaveState('error');
        setErrMsg(e.message ?? 'Erreur');
      }
    }, 500) as unknown as number;

    return () => clearTimeout(t);
  }, [home, away, m.id, slug, router]);

  return (
    <div className="rounded-xl border border-bdr bg-bg-secondary p-3 flex items-center gap-2">
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <PlayerAvatar {...m.homePlayer} size={32} />
        <span className="truncate text-sm">{m.homePlayer.name}</span>
      </div>
      <input
        type="number" min={0} max={99}
        value={home} onChange={e => setHome(e.target.value)}
        className="w-12 text-center rounded-lg bg-bg-tertiary border border-bdr py-1.5 font-bold tabular-nums focus:outline-none focus:border-accent-blue"
      />
      <span className="text-txt-muted">–</span>
      <input
        type="number" min={0} max={99}
        value={away} onChange={e => setAway(e.target.value)}
        className="w-12 text-center rounded-lg bg-bg-tertiary border border-bdr py-1.5 font-bold tabular-nums focus:outline-none focus:border-accent-blue"
      />
      <div className="flex-1 flex items-center gap-2 justify-end min-w-0">
        <span className="truncate text-sm text-right">{m.awayPlayer.name}</span>
        <PlayerAvatar {...m.awayPlayer} size={32} />
      </div>
      <div className="w-5 flex items-center justify-center shrink-0">
        <SaveBadge state={saveState} error={errMsg} />
      </div>
    </div>
  );
}
