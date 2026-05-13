'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAvatar from '@/components/PlayerAvatar';
import { computeInitials, pickColor } from '@/lib/avatar';

/**
 * Admin-side form that inscribes a player directly to a competition.
 * Uses the same /register endpoint as the public inscription page — so we get
 * the same duplicate-name protection and photo handling for free.
 */
export default function ManualAddPlayer({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setName('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setErr(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function onFile(file: File) {
    setErr(null);
    if (file.size > 3 * 1024 * 1024) { setErr('photo > 3 Mo'); return; }
    const cropped = await squareCrop(file);
    setPhotoFile(new File([cropped], 'photo.jpg', { type: 'image/jpeg' }));
    setPhotoPreview(URL.createObjectURL(cropped));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Entre un nom'); return; }
    setBusy(true); setErr(null);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      if (photoFile) form.append('photo', photoFile);
      const res = await fetch(`/api/competitions/${slug}/register`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Erreur');
      reset();
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const previewName = name || '?';
  const previewInitials = computeInitials(previewName);
  const previewColor = pickColor(previewName);

  return (
    <form onSubmit={submit} className="rounded-xl border border-bdr bg-bg-secondary p-4 space-y-3">
      <h3 className="font-bold text-sm">Ajouter un joueur manuellement</h3>
      <p className="text-xs text-txt-muted -mt-1">
        Inscrit directement à cette compétition (équivalent au lien d’inscription public).
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative shrink-0"
          title="Ajouter une photo"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" className="h-14 w-14 rounded-full object-cover ring-2 ring-accent-blue" />
          ) : (
            <PlayerAvatar
              name={previewName}
              initials={previewInitials}
              color={previewColor}
              imageUrl={null}
              size={56}
            />
          )}
          <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-accent-blue text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-bg-secondary">
            +
          </span>
        </button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nom du joueur"
          maxLength={40}
          className="flex-1 rounded-lg bg-bg-tertiary border border-bdr px-3 py-2 text-sm focus:outline-none focus:border-accent-blue"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-accent-blue text-white font-semibold px-4 py-2 text-sm hover:bg-blue-600 disabled:opacity-40"
        >
          {busy ? '…' : 'Ajouter'}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      {err && (
        <div role="alert" className="rounded-lg border border-status-loss/40 bg-status-loss/10 px-3 py-2 text-sm text-status-loss flex items-start gap-2">
          <span aria-hidden>⚠</span>
          <span>{err}</span>
        </div>
      )}
    </form>
  );
}

async function squareCrop(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
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
