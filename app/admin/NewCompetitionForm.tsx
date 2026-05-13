'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewCompetitionForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Nom requis'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'erreur');
      const comp = await res.json();
      router.push(`/admin/competition/${comp.slug}`);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-txt-secondary mb-1">Nom de la compétition</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-lg bg-bg-tertiary border border-bdr px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
        />
        <div className="text-[11px] text-txt-muted mt-1">
          Tu obtiendras ensuite un lien public à partager aux participants pour qu’ils s’inscrivent.
        </div>
      </div>
      {err && <div className="text-xs text-status-loss">{err}</div>}
      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="rounded-lg bg-accent-blue text-white font-semibold px-4 py-2 hover:bg-blue-600 disabled:opacity-40"
      >
        {busy ? 'Création…' : 'Créer et ouvrir les inscriptions'}
      </button>
    </form>
  );
}
