'use client';
import { useEffect } from 'react';

export default function Error({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto mt-20 text-center space-y-4">
      <div className="text-5xl font-black text-status-loss">⚠</div>
      <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
      <p className="text-sm text-txt-secondary break-words">
        {error.message || 'Erreur inattendue.'}
      </p>
      {error.digest && (
        <div className="text-xs text-txt-muted font-mono">Réf : {error.digest}</div>
      )}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-accent-blue text-white px-4 py-2 text-sm font-semibold hover:bg-blue-600"
        >
          Réessayer
        </button>
        <a
          href="/"
          className="rounded-lg border border-bdr bg-bg-secondary px-4 py-2 text-sm font-semibold text-txt-secondary hover:text-txt-primary"
        >
          Accueil
        </a>
      </div>
    </div>
  );
}
