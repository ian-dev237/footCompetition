'use client';
import { useRef, useState } from 'react';

export default function ImageUpload({
  playerId, currentUrl, onUploaded,
}: { playerId: string; currentUrl: string | null; onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    setErr(null);
    if (file.size > 2 * 1024 * 1024) { setErr('Image > 2 Mo'); return; }
    // client-side square crop via canvas
    const cropped = await squareCrop(file);
    const form = new FormData();
    form.append('file', cropped, 'avatar.jpg');
    setBusy(true);
    try {
      const res = await fetch(`/api/players/${playerId}/image`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const { imageUrl } = await res.json();
      onUploaded(imageUrl);
    } catch (e: any) {
      setErr(e.message || 'Erreur upload');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-accent-blue text-white hover:bg-blue-600 disabled:opacity-50"
      >
        {busy ? 'Envoi…' : currentUrl ? 'Remplacer photo' : 'Ajouter photo'}
      </button>
      {currentUrl && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await fetch(`/api/players/${playerId}/image`, { method: 'DELETE' });
            setBusy(false);
            if (res.ok) onUploaded('');
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold bg-bg-tertiary text-txt-secondary border border-bdr hover:bg-bg-primary"
        >
          Supprimer
        </button>
      )}
      {err && <span className="text-xs text-status-loss">{err}</span>}
    </div>
  );
}

async function squareCrop(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const TARGET = 400;
    const canvas = document.createElement('canvas');
    canvas.width = TARGET; canvas.height = TARGET;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET, TARGET);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.9)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
