'use client';

/**
 * Last-resort fallback when an error happens in the root layout itself.
 * Must define its own <html> and <body>.
 */
export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{
        margin: 0, minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0D1117', color: '#F0F6FC',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
          <div style={{ fontSize: 48, color: '#EF4444', marginBottom: 8 }}>⚠</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '8px 0' }}>Erreur fatale</h1>
          <p style={{ fontSize: 14, color: '#8B949E', margin: '8px 0 20px' }}>
            {error.message || 'Erreur inattendue dans le layout racine.'}
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: '#3B82F6', color: 'white', border: 0,
              padding: '8px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
