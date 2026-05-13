'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import PlayerAvatar from '@/components/PlayerAvatar';
import { computeInitials, pickColor } from '@/lib/avatar';

export default function InscriptionForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setErr(null);
    if (file.size > 3 * 1024 * 1024) { setErr('photo > 3 Mo'); return; }
    const cropped = await squareCrop(file);
    setPhotoFile(new File([cropped], 'photo.jpg', { type: 'image/jpeg' }));
    setPhotoPreview(URL.createObjectURL(cropped));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Entre ton nom'); return; }
    setBusy(true); setErr(null);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      if (photoFile) form.append('photo', photoFile);
      const res = await fetch(`/api/competitions/${slug}/register`, { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? 'erreur');
      setDone(true);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl bg-status-win/10 border border-status-win/40 p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <div className="font-bold text-lg">Inscription confirmée</div>
        <div className="text-sm text-txt-secondary mt-1">À toi de jouer, {name} !</div>
      </div>
    );
  }

  const previewInitials = computeInitials(name || '?');
  const previewColor = pickColor(name || '?');

  return (
    <form onSubmit={submit} className="rounded-xl border border-bdr bg-bg-secondary p-5 space-y-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative shrink-0 group"
          title="Ajouter une photo"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-accent-blue" />
          ) : (
            <PlayerAvatar
              name={name || '?'}
              initials={previewInitials}
              color={previewColor}
              imageUrl={null}
              size={80}
            />
          )}
          <span className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-accent-blue text-white text-xs font-bold flex items-center justify-center ring-2 ring-bg-secondary">
            +
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <label className="block text-xs font-semibold text-txt-secondary mb-1">Ton nom</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="ex. Karim"
            maxLength={40}
            autoFocus
            className="w-full rounded-lg bg-bg-tertiary border border-bdr px-3 py-2.5 text-sm focus:outline-none focus:border-accent-blue"
          />
          <div className="text-[11px] text-txt-muted mt-1">
            Photo optionnelle · sans photo, un avatar avec tes initiales sera créé.
          </div>
        </div>
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

      <button
        type="submit"
        disabled={busy || !name.trim()}
        className="w-full rounded-lg bg-accent-blue text-white font-semibold py-3 hover:bg-blue-600 disabled:opacity-40"
      >
        {busy ? 'Envoi…' : 'Je m’inscris'}
      </button>
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
