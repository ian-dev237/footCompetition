'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAvatar from '@/components/PlayerAvatar';
import ImageUpload from '@/components/ImageUpload';

type Player = {
  id: string;
  name: string;
  initials: string;
  color: string;
  imageUrl: string | null;
};

export default function PlayersManager({ initialPlayers }: { initialPlayers: Player[] }) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [removeTarget, setRemoveTarget] = useState<Player | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (!removeTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !removeBusy) setRemoveTarget(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [removeTarget, removeBusy]);

  function setRowError(id: string, msg: string | null) {
    setRowErrors(prev => ({ ...prev, [id]: msg }));
  }

  async function addPlayer() {
    if (!newName.trim()) return;
    setAddError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Erreur');
      }
      const p = await res.json();
      setPlayers(ps => [...ps, p]);
      setNewName('');
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function rename(id: string, name: string) {
    const current = players.find(p => p.id === id);
    if (!current || current.name === name) return;
    const res = await fetch(`/api/players/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const p = await res.json();
      setPlayers(ps => ps.map(x => x.id === id ? p : x));
      setRowError(id, null);
    } else {
      const data = await res.json().catch(() => ({}));
      setRowError(id, data.error ?? 'Erreur');
      // restore the previous name visually
      const ref = inputRefs.current[id];
      if (ref) ref.value = current.name;
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoveError(null);
    setRemoveBusy(true);
    const res = await fetch(`/api/players/${removeTarget.id}`, { method: 'DELETE' });
    setRemoveBusy(false);
    if (res.ok) {
      const removedId = removeTarget.id;
      setPlayers(ps => ps.filter(x => x.id !== removedId));
      setRemoveTarget(null);
      router.refresh();
    } else {
      setRemoveError((await res.json().catch(() => ({}))).error ?? 'Erreur lors de la suppression');
    }
  }

  function setImageUrl(id: string, url: string) {
    setPlayers(ps => ps.map(x => x.id === id ? { ...x, imageUrl: url || null } : x));
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-bdr bg-bg-secondary p-4 space-y-2">
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={e => { setNewName(e.target.value); if (addError) setAddError(null); }}
            onKeyDown={e => e.key === 'Enter' && addPlayer()}
            placeholder="Nom du joueur"
            className="flex-1 rounded-lg bg-bg-tertiary border border-bdr px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
          />
          <button
            onClick={addPlayer}
            disabled={busy || !newName.trim()}
            className="rounded-lg bg-accent-blue text-white font-semibold px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
        {addError && (
          <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
            <span aria-hidden>⚠</span>
            <span>{addError}</span>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {players.map(p => (
          <div key={p.id} className="rounded-xl border border-bdr bg-bg-secondary p-4 space-y-2">
            <div className="flex items-center gap-3">
              <PlayerAvatar {...p} size={56} />
              <div className="flex-1 min-w-0">
                <input
                  ref={el => { inputRefs.current[p.id] = el; }}
                  defaultValue={p.name}
                  onFocus={() => setRowError(p.id, null)}
                  onBlur={e => { if (e.target.value.trim()) rename(p.id, e.target.value.trim()); }}
                  className="w-full bg-transparent border-b border-transparent focus:border-accent-blue focus:outline-none font-semibold"
                />
                <div className="mt-2">
                  <ImageUpload playerId={p.id} currentUrl={p.imageUrl} onUploaded={url => setImageUrl(p.id, url)} />
                </div>
              </div>
              <button
                onClick={() => { setRemoveError(null); setRemoveTarget(p); }}
                className="text-xs text-txt-muted hover:text-status-loss"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
            {rowErrors[p.id] && (
              <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-1.5 text-xs text-status-loss flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{rowErrors[p.id]}</span>
              </div>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <div className="rounded-xl border border-dashed border-bdr p-8 text-center text-txt-muted text-sm sm:col-span-2">
            Aucun joueur pour l’instant.
          </div>
        )}
      </div>

      {removeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-player-title"
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
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
                <h3 id="del-player-title" className="font-bold text-lg leading-tight">
                  Supprimer ce joueur ?
                </h3>
                <p className="text-sm text-txt-secondary mt-1">
                  <span className="text-txt-primary font-semibold">{removeTarget.name}</span> sera supprimé,
                  ainsi que sa photo et son historique. Cette action est définitive.
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
                {removeBusy ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
