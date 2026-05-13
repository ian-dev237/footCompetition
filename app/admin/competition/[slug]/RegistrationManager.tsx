'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAvatar from '@/components/PlayerAvatar';
import ManualAddPlayer from './ManualAddPlayer';

type Player = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

export default function RegistrationManager({
  slug, players, availablePlayers,
}: { slug: string; players: Player[]; availablePlayers: Player[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Player | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/inscription/${slug}`
    : `/inscription/${slug}`;

  // Close modal on Escape
  useEffect(() => {
    if (!showStartModal && !removeTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showStartModal) setShowStartModal(false);
      if (removeTarget && !removeBusy) setRemoveTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showStartModal, removeTarget, removeBusy]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }

  async function enroll(player: Player) {
    setEnrollError(null);
    setEnrollingId(player.id);
    const res = await fetch(`/api/competitions/${slug}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: player.id }),
    });
    setEnrollingId(null);
    if (res.ok) {
      router.refresh();
    } else {
      setEnrollError(`${player.name} : ${(await res.json().catch(() => ({}))).error ?? 'Erreur'}`);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoveError(null);
    setRemoveBusy(true);
    const res = await fetch(`/api/competitions/${slug}/register/${removeTarget.id}`, { method: 'DELETE' });
    setRemoveBusy(false);
    if (res.ok) {
      setRemoveTarget(null);
      router.refresh();
    } else {
      setRemoveError((await res.json()).error ?? 'Erreur');
    }
  }

  async function confirmStart() {
    setStartError(null);
    setBusy(true);
    const res = await fetch(`/api/competitions/${slug}/start`, { method: 'POST' });
    if (res.ok) {
      // wipe any "already seen" markers so the draw animation plays fresh
      try {
        const keysToWipe: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`draw:${slug}:`)) keysToWipe.push(k);
        }
        keysToWipe.forEach(k => localStorage.removeItem(k));
        const skeys: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith(`draw:${slug}:`)) skeys.push(k);
        }
        skeys.forEach(k => sessionStorage.removeItem(k));
      } catch { /* ignore */ }
      setShowStartModal(false);
      router.push(`/admin/competition/${slug}`);
      router.refresh();
    } else {
      setStartError((await res.json()).error ?? 'Erreur lors du démarrage');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-bdr bg-bg-secondary p-5 space-y-3">
        <h2 className="font-bold">Lien d’inscription à partager</h2>
        <p className="text-sm text-txt-secondary">
          Envoie ce lien aux participants. Ils s’inscrivent eux-mêmes avec leur nom et leur photo.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            onFocus={e => e.currentTarget.select()}
            className="flex-1 rounded-lg bg-bg-tertiary border border-bdr px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={copy}
            className="rounded-lg bg-accent-blue text-white font-semibold px-4 py-2 text-sm hover:bg-blue-600"
          >
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
        </div>
      </section>

      <ManualAddPlayer slug={slug} />

      {availablePlayers.length > 0 && (
        <section className="rounded-xl border border-bdr bg-bg-secondary p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h2 className="font-bold">Joueurs disponibles</h2>
              <p className="text-xs text-txt-muted mt-0.5">
                Issus de l’annuaire global, non encore inscrits à cette compétition.
              </p>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="rounded-lg bg-bg-tertiary border border-bdr px-3 py-1.5 text-xs focus:outline-none focus:border-accent-blue"
            />
          </div>

          {enrollError && (
            <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
              <span aria-hidden>⚠</span>
              <span>{enrollError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {availablePlayers
              .filter(p => p.name.toLowerCase().includes(search.toLowerCase().trim()))
              .map(p => {
                const busy = enrollingId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => enroll(p)}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-lg bg-bg-tertiary border border-bdr p-2 text-left transition hover:border-accent-blue hover:bg-accent-blue/5 disabled:opacity-50"
                    title={`Inscrire ${p.name}`}
                  >
                    <PlayerAvatar {...p} size={32} />
                    <span className="text-sm truncate flex-1">{p.name}</span>
                    <span className={busy ? 'text-txt-muted text-xs' : 'text-accent-blue font-bold text-base shrink-0'}>
                      {busy ? '…' : '+'}
                    </span>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-bdr bg-bg-secondary p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Inscrits ({players.length})</h2>
          <button
            onClick={() => setShowStartModal(true)}
            disabled={busy || players.length < 4}
            className="rounded-lg bg-accent-gold text-bg-primary font-bold px-4 py-2 text-sm hover:opacity-90 disabled:opacity-40"
          >
            {busy ? '…' : `Démarrer le tournoi (${players.length})`}
          </button>
        </div>
        <p className="text-xs text-txt-muted">
          Une fois démarré, plus aucune inscription possible. Tu peux retirer des joueurs avant de lancer.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg bg-bg-tertiary border border-bdr p-2">
              <PlayerAvatar {...p} size={32} />
              <span className="text-sm truncate flex-1">{p.name}</span>
              <button
                onClick={() => { setRemoveError(null); setRemoveTarget(p); }}
                className="text-xs text-txt-muted hover:text-status-loss px-1"
                title="Retirer"
              >
                ✕
              </button>
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-full text-center text-txt-muted text-sm py-6 border border-dashed border-bdr rounded-xl">
              Aucune inscription pour l’instant. La page se mettra à jour automatiquement.
            </div>
          )}
        </div>
      </section>

      {showStartModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-modal-title"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
          onClick={() => !busy && setShowStartModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-bdr bg-bg-secondary shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-accent-gold/20 text-accent-gold flex items-center justify-center text-xl shrink-0">
                ⚡
              </div>
              <div className="min-w-0">
                <h3 id="start-modal-title" className="font-bold text-lg leading-tight">
                  Démarrer le tournoi ?
                </h3>
                <p className="text-sm text-txt-secondary mt-1">
                  Démarrer le tournoi avec <span className="text-txt-primary font-semibold">{players.length} joueurs</span> ?
                  Les inscriptions seront fermées.
                </p>
              </div>
            </div>

            {startError && (
              <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{startError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStartModal(false)}
                disabled={busy}
                className="rounded-lg border border-bdr bg-bg-tertiary px-4 py-2 text-sm font-semibold text-txt-secondary hover:text-txt-primary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmStart}
                disabled={busy}
                autoFocus
                className="rounded-lg bg-accent-gold text-bg-primary px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {busy ? 'Démarrage…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-modal-title"
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
          onClick={() => !removeBusy && setRemoveTarget(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-bdr bg-bg-secondary shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-status-loss/20 text-status-loss flex items-center justify-center text-xl shrink-0">
                ✕
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="remove-modal-title" className="font-bold text-lg leading-tight">
                  Retirer cet inscrit ?
                </h3>
                <p className="text-sm text-txt-secondary mt-1">
                  <span className="text-txt-primary font-semibold">{removeTarget.name}</span> sera retiré
                  des inscrits. Cette action est définitive.
                </p>
              </div>
              <PlayerAvatar {...removeTarget} size={40} />
            </div>

            {removeError && (
              <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{removeError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={removeBusy}
                className="rounded-lg border border-bdr bg-bg-tertiary px-4 py-2 text-sm font-semibold text-txt-secondary hover:text-txt-primary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={removeBusy}
                autoFocus
                className="rounded-lg bg-status-loss text-white px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-50"
              >
                {removeBusy ? 'Suppression…' : 'Retirer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
