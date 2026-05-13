'use client';

import { useState } from 'react';
import PlayerAvatar from '@/components/PlayerAvatar';

type RegisteredPlayer = {
  id: string;
  player: {
    name: string;
    initials: string;
    color: string;
    imageUrl?: string | null;
  };
};

export default function RegisteredPlayers({ players }: { players: RegisteredPlayer[] }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);

  return (
    <>
      <section>
        <div className="text-xs uppercase tracking-wider text-txt-muted font-semibold mb-2">
          Inscrits ({players.length})
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {players.map(cp => (
            <div key={cp.id} className="flex items-center gap-2 rounded-lg bg-bg-secondary border border-bdr p-2">
              {cp.player.imageUrl ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(cp.player.imageUrl!);
                    setSelectedName(cp.player.name);
                  }}
                  className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue"
                  aria-label={`Voir la photo de ${cp.player.name}`}
                >
                  <PlayerAvatar
                    name={cp.player.name}
                    initials={cp.player.initials}
                    color={cp.player.color}
                    imageUrl={cp.player.imageUrl}
                    size={32}
                  />
                </button>
              ) : (
                <PlayerAvatar
                  name={cp.player.name}
                  initials={cp.player.initials}
                  color={cp.player.color}
                  imageUrl={null}
                  size={32}
                />
              )}
              <span className="text-sm truncate">{cp.player.name}</span>
            </div>
          ))}
          {players.length === 0 && (
            <div className="col-span-full text-center text-txt-muted text-sm py-6 border border-dashed border-bdr rounded-xl">
              Sois le premier à t’inscrire.
            </div>
          )}
        </div>
      </section>

      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-full max-h-full overflow-hidden rounded-3xl bg-bg-secondary p-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute right-3 top-3 rounded-full bg-black/70 text-white w-8 h-8 flex items-center justify-center text-lg"
              aria-label="Fermer"
            >
              ×
            </button>
            <div className="mb-3 text-sm font-semibold text-center text-txt-primary">
              {selectedName}
            </div>
            <img
              src={selectedImage}
              alt={selectedName || 'Photo du joueur'}
              className="max-w-[90vw] max-h-[80vh] rounded-3xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
