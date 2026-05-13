'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Subscribes to the SSE stream for a competition. When the version changes,
 * triggers a `router.refresh()` so the current RSC re-renders with fresh data.
 */
export default function Realtime({ slug }: { slug: string }) {
  const router = useRouter();
  const versionRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');

  useEffect(() => {
    const es = new EventSource(`/api/realtime?slug=${encodeURIComponent(slug)}`);
    es.onopen = () => setStatus('live');
    es.onerror = () => setStatus('offline');
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (versionRef.current === null) versionRef.current = data.version;
        else if (data.version !== versionRef.current) {
          versionRef.current = data.version;
          router.refresh();
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [slug, router]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-bg-secondary/90 backdrop-blur border border-bdr px-3 py-1.5 text-xs">
      <span className={
        status === 'live' ? 'inline-block h-2 w-2 rounded-full bg-status-win animate-livepulse' :
        status === 'offline' ? 'inline-block h-2 w-2 rounded-full bg-status-loss' :
        'inline-block h-2 w-2 rounded-full bg-accent-gold'
      } />
      <span className="text-txt-secondary uppercase tracking-wider font-semibold">
        {status === 'live' ? 'Live' : status === 'offline' ? 'Hors ligne' : 'Connexion…'}
      </span>
    </div>
  );
}
