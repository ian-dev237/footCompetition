'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/admin';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Échec de la connexion');
      }
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-12 rounded-xl border border-bdr bg-bg-secondary p-6">
      <h1 className="text-xl font-bold mb-1">Connexion admin</h1>
      <p className="text-sm text-txt-secondary mb-4">Seul l’administrateur peut saisir les scores et créer des compétitions.</p>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          autoFocus
          value={pwd}
          onChange={e => setPwd(e.target.value)}
          placeholder="Mot de passe"
          className="w-full rounded-lg bg-bg-tertiary border border-bdr px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
        />
        {err && <div className="text-xs text-status-loss">{err}</div>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-accent-blue text-white font-semibold py-2 hover:bg-blue-600 disabled:opacity-50"
        >
          {busy ? '…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
