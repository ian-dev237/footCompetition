'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteCompetitionButton({
  slug, name, playersCount, compact = false,
}: { slug: string; name: string; playersCount: number; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

  async function confirmDelete() {
    setErr(null);
    setBusy(true);
    const res = await fetch(`/api/competitions/${slug}`, { method: 'DELETE' });
    if (res.ok) {
      // wipe any local "seen" animation flags tied to this competition
      try {
        const wipe = (s: Storage) => {
          const keys: string[] = [];
          for (let i = 0; i < s.length; i++) {
            const k = s.key(i);
            if (k && k.startsWith(`draw:${slug}:`)) keys.push(k);
          }
          keys.forEach(k => s.removeItem(k));
        };
        wipe(localStorage);
        wipe(sessionStorage);
      } catch { /* ignore */ }
      router.push('/admin');
      router.refresh();
    } else {
      setErr((await res.json()).error ?? 'Erreur');
      setBusy(false);
    }
  }

  const expected = name.trim();
  const canConfirm = confirmText.trim() === expected;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          // When nested inside a <Link>, prevent navigation
          e.preventDefault();
          e.stopPropagation();
          setConfirmText(''); setErr(null); setOpen(true);
        }}
        title={compact ? 'Supprimer la compétition' : undefined}
        className={
          compact
            ? 'h-7 w-7 rounded-full border border-bdr bg-bg-tertiary text-txt-muted hover:text-status-loss hover:border-status-loss/60 flex items-center justify-center text-sm'
            : 'rounded-lg border border-status-loss/40 bg-status-loss/10 text-status-loss px-3 py-1.5 text-xs font-semibold hover:bg-status-loss/20'
        }
      >
        {compact ? '✕' : 'Supprimer la compétition'}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-comp-title"
          className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-status-loss/40 bg-bg-secondary shadow-2xl p-6 space-y-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-status-loss/20 text-status-loss flex items-center justify-center text-xl shrink-0">
                ⚠
              </div>
              <div className="min-w-0">
                <h3 id="del-comp-title" className="font-bold text-lg leading-tight">
                  Supprimer la compétition ?
                </h3>
                <p className="text-sm text-txt-secondary mt-1">
                  <span className="text-txt-primary font-semibold">« {name} »</span> sera supprimée
                  définitivement, avec ses {playersCount} inscrit{playersCount > 1 ? 's' : ''},
                  son calendrier, ses scores et ses photos.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs text-txt-secondary mb-1">
                Pour confirmer, tape exactement : <span className="font-mono text-txt-primary">{expected}</span>
              </label>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={expected}
                autoFocus
                className="w-full rounded-lg bg-bg-tertiary border border-bdr px-3 py-2 text-sm focus:outline-none focus:border-status-loss"
              />
            </div>

            {err && (
              <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
                <span aria-hidden>⚠</span>
                <span>{err}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-lg border border-bdr bg-bg-tertiary px-4 py-2 text-sm font-semibold text-txt-secondary hover:text-txt-primary disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={busy || !canConfirm}
                className="rounded-lg bg-status-loss text-white px-4 py-2 text-sm font-bold hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {busy ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
