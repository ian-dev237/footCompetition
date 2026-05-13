# Prompt de développement — Application Compétition PlayStation (Pro 26)

## Contexte général

Développer une **application web** pour gérer une compétition de jeux vidéo (FIFA / EA Sports FC sur PlayStation) organisée en **une seule journée**. L'application est accessible depuis n'importe quel appareil (téléphone, tablette, PC) sans installation. Les scores sont visibles en **temps réel** par tous les participants. Le design doit ressembler à une vraie application de football comme **Sofascore**, **FlashScore** ou **OneFootball** : fond sombre, typographie forte, affichage des scores professionnel.

---

## Stack technique — Next.js + PostgreSQL

| Couche | Technologie | Rôle |
|---|---|---|
| Framework | **Next.js 14** (App Router) | Structure de l'app, routing, SSR/SSG |
| UI | **Tailwind CSS + shadcn/ui** | Composants, styles, dark mode |
| Base de données | **PostgreSQL** (via Neon.tech ou Railway) | Stockage persistant de toutes les données |
| ORM | **Prisma** | Modèles de données, migrations, requêtes typées |
| Temps réel | **Server-Sent Events (SSE)** ou **Pusher** | Mise à jour live des scores pour tous |
| Upload images | **Cloudinary** ou **Vercel Blob** | Stockage des photos de profil des joueurs |
| Auth (optionnel) | **NextAuth.js** | Protéger l'administration (saisie des scores) |
| Hébergement | **Vercel** (gratuit) | Déploiement continu depuis GitHub |
| DB hébergée | **Neon.tech** (gratuit) | PostgreSQL serverless, compatible Vercel |

### Commandes de démarrage du projet

```bash
npx create-next-app@latest competition-ps --typescript --tailwind --app
cd competition-ps
npm install prisma @prisma/client
npm install @uploadthing/react uploadthing   # ou cloudinary
npm install pusher pusher-js                  # temps réel
npx shadcn-ui@latest init
npx prisma init
```

---

## Fonctionnalités principales

### 1. Gestion des joueurs
- Ajouter, modifier et supprimer des joueurs
- **Upload de photo de profil** : le joueur peut uploader sa propre photo (JPG/PNG, max 2 Mo)
- Si pas de photo : avatar généré automatiquement avec les initiales et une couleur unique
- Chaque joueur a une fiche complète : nom, photo, couleur d'avatar, statistiques personnelles
- Statistiques affichées sur la fiche : MJ · V · N · D · BP · BC · Diff · Points · Meilleur score (victoire la plus large)
- Nombre de joueurs dynamique (minimum 4, pas de limite fixe)

### 2. Upload et gestion des images joueurs
- Formulaire d'upload avec prévisualisation avant confirmation
- Recadrage automatique en format carré (1:1) côté client avant upload
- Stockage sur **Cloudinary** ou **Vercel Blob** (CDN mondial, chargement rapide)
- URL de l'image sauvegardée dans PostgreSQL (champ `imageUrl` sur le joueur)
- Possibilité de remplacer ou supprimer la photo à tout moment
- Fallback automatique vers l'avatar initiales si imageUrl est null

```typescript
// Exemple de composant upload (avec UploadThing)
import { UploadButton } from "@uploadthing/react";

<UploadButton
  endpoint="playerImageUploader"
  onClientUploadComplete={(res) => {
    updatePlayerImage(player.id, res[0].url);
  }}
  appearance={{
    button: "bg-blue-600 hover:bg-blue-700",
  }}
/>
```

### 3. Création de compétition
- Saisir le nom de la compétition (ex. : "Pro 26")
- Sélectionner les joueurs participants parmi la liste existante
- Choisir le format : **Round-Robin** (tous contre tous) ou **Élimination directe**
- **Génération automatique du calendrier** : algorithme round-robin équitable, chaque joueur joue exactement une fois par journée
- Nombre de journées calculé automatiquement : `N - 1` si pair, `N` si impair
- La compétition est immédiatement accessible via une URL partageable (ex: `/competition/pro-26`)

### 4. Calendrier et journées (Phase Championnat)
- Navigation entre les journées (J1, J2, … Jn)
- Chaque journée affiche ses N/2 matchs
- Indicateur visuel de progression : journée complète (vert) · en cours (orange) · non commencée (gris)
- Saisie des scores réservée à l'administrateur (protégée par mot de passe ou NextAuth)
- Tous les autres accèdent en **lecture seule** et voient les scores se mettre à jour en direct
- Validation : scores entiers ≥ 0 uniquement, confirmation avant sauvegarde
- Possibilité de corriger un score déjà saisi (avec log de modification)

### 5. Classement général (Standings)
- Mis à jour en **temps réel** dès qu'un score est saisi en base
- Colonnes : Rang · Photo · Joueur · MJ · V · N · D · BP · BC · Diff · Points
- Règles de départage : 1. Points → 2. Différence de buts → 3. Buts pour → 4. Confrontation directe
- Les 4 premiers surlignés en bleu (qualifiés phases finales)
- Badges visuels de rang : 🥇 Or · 🥈 Argent · 🥉 Bronze · 🎯 4e qualifié

### 6. Phases finales (Playoff)
- Se débloquent automatiquement quand tous les matchs de championnat sont terminés (ou déclenchement manuel par l'admin)
- **Demi-finales** : 1er vs 4e / 2e vs 3e
- **Petite finale** : perdant DF1 vs perdant DF2 (3e place)
- **Finale** : vainqueur DF1 vs vainqueur DF2
- Bracket visuel type coupe avec photos des joueurs
- Saisie des scores de chaque match, propagation automatique dans le bracket
- Pas de match nul possible en phases finales (champ "score après prolongation" si égalité)
- Affichage du champion avec animation de célébration

### 7. Statistiques & palmarès
- Meilleur buteur du tournoi (photo + nombre de buts)
- Meilleure défense (moins de buts encaissés)
- Match avec le plus de buts
- Victoire la plus large
- Historique des compétitions passées (palmarès)

---

## Schéma de base de données PostgreSQL (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Player {
  id          String   @id @default(cuid())
  name        String
  initials    String   // 2 lettres générées automatiquement
  color       String   // couleur hex pour avatar fallback
  imageUrl    String?  // URL Cloudinary/Vercel Blob (nullable)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  homeMatches Match[]  @relation("HomePlayer")
  awayMatches Match[]  @relation("AwayPlayer")
  competitions CompetitionPlayer[]
}

model Competition {
  id          String   @id @default(cuid())
  name        String   // ex: "Pro 26"
  slug        String   @unique // ex: "pro-26" pour l'URL
  status      CompetitionStatus @default(SETUP)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  players        CompetitionPlayer[]
  journees       Journee[]
  playoffMatches PlayoffMatch[]
}

enum CompetitionStatus {
  SETUP      // configuration en cours
  ONGOING    // championnat en cours
  PLAYOFFS   // phases finales
  FINISHED   // terminée
}

model CompetitionPlayer {
  id            String      @id @default(cuid())
  competition   Competition @relation(fields: [competitionId], references: [id])
  competitionId String
  player        Player      @relation(fields: [playerId], references: [id])
  playerId      String
  rank          Int?        // rang final

  @@unique([competitionId, playerId])
}

model Journee {
  id            String      @id @default(cuid())
  number        Int
  competition   Competition @relation(fields: [competitionId], references: [id])
  competitionId String
  matches       Match[]

  @@unique([competitionId, number])
}

model Match {
  id           String      @id @default(cuid())
  journee      Journee     @relation(fields: [journeeId], references: [id])
  journeeId    String
  homePlayer   Player      @relation("HomePlayer", fields: [homePlayerId], references: [id])
  homePlayerId String
  awayPlayer   Player      @relation("AwayPlayer", fields: [awayPlayerId], references: [id])
  awayPlayerId String
  homeScore    Int?        // null = pas encore joué
  awayScore    Int?
  status       MatchStatus @default(PENDING)
  playedAt     DateTime?
  updatedAt    DateTime    @updatedAt
}

enum MatchStatus {
  PENDING   // à jouer
  LIVE      // en cours
  FINISHED  // terminé
}

model PlayoffMatch {
  id            String       @id @default(cuid())
  competition   Competition  @relation(fields: [competitionId], references: [id])
  competitionId String
  round         PlayoffRound
  homePlayerId  String?      // déterminé dynamiquement depuis le classement
  awayPlayerId  String?
  homeScore     Int?
  awayScore     Int?
  homeScoreET   Int?         // score après prolongation si égalité
  awayScoreET   Int?
  status        MatchStatus  @default(PENDING)
}

enum PlayoffRound {
  SEMIFINAL_1
  SEMIFINAL_2
  THIRD_PLACE
  FINAL
}
```

---

## API Routes (Next.js App Router)

```
app/
├── api/
│   ├── players/
│   │   ├── route.ts                  GET (liste) · POST (créer)
│   │   └── [id]/
│   │       ├── route.ts              GET · PUT · DELETE
│   │       └── image/route.ts        POST (upload photo)
│   ├── competitions/
│   │   ├── route.ts                  GET · POST
│   │   └── [slug]/
│   │       ├── route.ts              GET · PUT
│   │       ├── standings/route.ts    GET classement calculé
│   │       ├── journees/
│   │       │   └── [num]/route.ts    GET journée + matchs
│   │       └── matches/
│   │           └── [id]/route.ts     PUT (saisir score)
│   └── realtime/
│       └── route.ts                  SSE endpoint pour les updates live
```

---

## Temps réel — Server-Sent Events (SSE)

```typescript
// app/api/realtime/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(async () => {
        const [standings, matches] = await Promise.all([
          computeStandings(slug!),
          getMatchesForCurrentJournee(slug!),
        ]);
        const data = `data: ${JSON.stringify({ standings, matches })}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
      }, 2000);

      return () => clearInterval(interval);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

// Hook côté client
function useRealtime(slug: string) {
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    const es = new EventSource(`/api/realtime?slug=${slug}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setStandings(data.standings);
      setMatches(data.matches);
    };
    return () => es.close();
  }, [slug]);

  return { standings, matches };
}
```

---

## Gestion des images joueurs — Cloudinary

```typescript
// lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadPlayerImage(file: Buffer, playerId: string) {
  const result = await cloudinary.uploader.upload(
    `data:image/jpeg;base64,${file.toString('base64')}`,
    {
      folder: 'competition-ps/players',
      public_id: `player-${playerId}`,
      overwrite: true,
      transformation: [
        // Recadrage intelligent centré sur le visage
        { width: 200, height: 200, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    }
  );
  return result.secure_url;
}

export async function deletePlayerImage(playerId: string) {
  await cloudinary.uploader.destroy(`competition-ps/players/player-${playerId}`);
}
```

### Variables d'environnement (.env.local)

```env
# Base de données PostgreSQL (Neon.tech)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Cloudinary (images joueurs)
CLOUDINARY_CLOUD_NAME="votre_cloud_name"
CLOUDINARY_API_KEY="votre_api_key"
CLOUDINARY_API_SECRET="votre_api_secret"

# Admin (protection saisie des scores)
ADMIN_PASSWORD="votre_mot_de_passe_admin"

# NextAuth (optionnel)
NEXTAUTH_SECRET="votre_secret_aleatoire"
NEXTAUTH_URL="http://localhost:3000"
```

---

## Structure des dossiers Next.js

```
competition-ps/
├── app/
│   ├── layout.tsx                       Layout global (dark mode forcé)
│   ├── page.tsx                         Accueil — liste des compétitions
│   ├── competition/
│   │   └── [slug]/
│   │       ├── page.tsx                 Vue journées (défaut)
│   │       ├── classement/page.tsx      Classement temps réel
│   │       └── playoffs/page.tsx        Bracket phases finales
│   ├── admin/
│   │   ├── page.tsx                     Dashboard admin
│   │   ├── joueurs/page.tsx             Gestion joueurs + photos
│   │   └── competition/[slug]/page.tsx  Saisie des scores
│   └── api/                             (voir section API Routes)
├── components/
│   ├── MatchCard.tsx                    Card match avec photos + scores
│   ├── StandingsTable.tsx               Tableau classement temps réel
│   ├── PlayerAvatar.tsx                 Photo circulaire ou initiales
│   ├── PlayerImageUpload.tsx            Upload + preview + recadrage
│   ├── PlayoffBracket.tsx               Arbre tournoi SVG avec photos
│   └── JourneeNav.tsx                   Navigation journées + dots
├── lib/
│   ├── prisma.ts                        Client Prisma singleton
│   ├── cloudinary.ts                    Helpers upload / delete image
│   ├── standings.ts                     Calcul classement depuis DB
│   └── round-robin.ts                   Algorithme génération calendrier
└── prisma/
    └── schema.prisma
```

---

## Design — Style Application Football Professionnelle

### Inspirations visuelles
- **Sofascore** : photos rondes des joueurs, cards de matchs épurées, dark mode natif, scores en gras
- **FlashScore** : densité d'information élevée, tableau compact
- **OneFootball** : typographie forte, transitions fluides, hiérarchie claire

### Palette de couleurs (Tailwind config)

```javascript
// tailwind.config.js
colors: {
  bg: {
    primary:   '#0D1117',   // fond principal (noir GitHub)
    secondary: '#161B22',   // fond des cartes
    tertiary:  '#21262D',   // fond inputs et hover
  },
  accent: {
    blue:   '#3B82F6',      // actions principales, qualifiés
    gold:   '#F59E0B',      // 1er place, champion
    cyan:   '#06B6D4',      // indicateur LIVE
  },
  status: {
    win:  '#10B981',        // victoire (vert)
    loss: '#EF4444',        // défaite (rouge)
    draw: '#6B7280',        // nul (gris)
  },
  text: {
    primary:   '#F0F6FC',   // blanc cassé
    secondary: '#8B949E',   // gris moyen
    muted:     '#484F58',   // gris foncé
  },
  border: '#30363D',
}
```

### Composants UI clés

- **PlayerAvatar** : photo circulaire Next.js `<Image>` (40px inline, 80px sur fiche), fallback initiales colorées
- **MatchCard** : photo home gauche · score centré grand · photo away droite · badge LIVE / FT / À JOUER
- **StandingsRow** : rang · photo 32px · nom · stats colonnes · points gras à droite · ligne bleue si top 4
- **PlayoffBracket** : SVG responsive avec photos dans les nœuds, lignes de connexion, vainqueur surligné
- **LiveDot** : point rouge animé (pulse CSS) quand un match est en cours

---

## Algorithme Round-Robin

```typescript
// lib/round-robin.ts
export function generateRoundRobin(players: { id: string; name: string }[]) {
  const list = [...players];
  if (list.length % 2 !== 0) list.push(null as any); // bye si impair

  const rounds = list.length - 1;
  const half = list.length / 2;
  const schedule: { home: typeof players[0]; away: typeof players[0] }[][] = [];

  for (let round = 0; round < rounds; round++) {
    const matches = [];
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[list.length - 1 - i];
      if (home && away) matches.push({ home, away });
    }
    schedule.push(matches);
    // Rotation : fixer le premier, faire tourner les autres
    list.splice(1, 0, list.pop()!);
  }
  return schedule;
}
```

---

## Règles métier

- **Points** : Victoire = 3 pts · Nul = 1 pt · Défaite = 0 pt
- **Départage** : Points → Différence de buts → Buts marqués → Confrontation directe
- **Phases finales** : Top 4 du classement général
- **Demi-finales** : 1er vs 4e / 2e vs 3e (avantage au mieux classé = domicile)
- **Phase de groupes** : nul autorisé
- **Phases finales** : résultat obligatoirement tranché (score après prolongation si égalité)

---

## Flux utilisateur (User Flow)

```
ADMIN (protégé par mot de passe)
  └─> /admin
        ├─> Gérer les joueurs
        │     ├─> Ajouter un joueur (nom + upload photo)
        │     ├─> Modifier / supprimer un joueur
        │     └─> Remplacer la photo d'un joueur
        ├─> Créer une compétition
        │     ├─> Nommer + sélectionner les joueurs
        │     └─> Générer le calendrier automatiquement
        └─> Gérer une compétition en cours
              ├─> Saisir / corriger les scores
              └─> Déclencher les phases finales

SPECTATEURS (tous les appareils, temps réel, sans compte)
  └─> /competition/pro-26
        ├─> Journées → scores live
        ├─> Classement → tableau mis à jour en continu
        └─> Phases finales → bracket avec avancement en direct
```

---

## Déploiement Vercel + Neon

```bash
# 1. Pousser le projet sur GitHub
git init && git add . && git commit -m "init competition-ps"
gh repo create competition-ps --public --push

# 2. Déployer sur Vercel (connecter le repo GitHub depuis vercel.com)
# Ajouter les variables d'environnement dans le dashboard Vercel

# 3. Créer la base PostgreSQL sur neon.tech (gratuit, tier Hobby)
# Copier la DATABASE_URL dans les variables Vercel

# 4. Appliquer le schéma Prisma
npx prisma db push
npx prisma generate

# L'app est en ligne sur https://competition-ps.vercel.app
```

---

## Fonctionnalités avancées (optionnelles v2)

- QR code affiché à l'entrée de la salle pour que tous accèdent directement
- Export PDF du classement final avec photos des joueurs
- Mode présentation plein écran (TV / vidéoprojecteur) avec classement défilant
- Notifications browser (Web Push) à chaque score mis à jour
- Historique des compétitions passées avec palmarès et photos des champions

---

*Prompt généré pour le développement de l'application "Compétition PlayStation — Pro 26".*
*Stack : Next.js 14 · PostgreSQL (Neon.tech) · Prisma · Tailwind CSS · shadcn/ui · Cloudinary · Vercel.*
