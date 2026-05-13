export const CompetitionStatus = {
  REGISTRATION: 'REGISTRATION',
  ONGOING: 'ONGOING',
  KNOCKOUT: 'KNOCKOUT',
  FINISHED: 'FINISHED',
} as const;
export type CompetitionStatus = (typeof CompetitionStatus)[keyof typeof CompetitionStatus];

export const COMPETITION_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  REGISTRATION: { label: 'Inscriptions', cls: 'bg-accent-cyan/20 text-accent-cyan' },
  ONGOING:      { label: 'Phase de poule', cls: 'bg-accent-blue/20 text-accent-blue' },
  KNOCKOUT:     { label: 'Phases finales', cls: 'bg-accent-gold/20 text-accent-gold' },
  FINISHED:     { label: 'Terminée', cls: 'bg-status-win/20 text-status-win' },
};

export const MatchStatus = {
  PENDING: 'PENDING',
  LIVE: 'LIVE',
  FINISHED: 'FINISHED',
} as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];

export const KnockoutRound = {
  ROUND_OF_16: 'ROUND_OF_16',
  SEMIFINAL:   'SEMIFINAL',
  FINAL:       'FINAL',
} as const;
export type KnockoutRound = (typeof KnockoutRound)[keyof typeof KnockoutRound];

export const KNOCKOUT_LABEL: Record<string, string> = {
  ROUND_OF_16: 'Huitièmes',
  SEMIFINAL:   'Demi-finales',
  FINAL:       'Finale',
};

export const KNOCKOUT_SIZE: Record<string, number> = {
  ROUND_OF_16: 4, // 4 ties of 2 players (8 players)
  SEMIFINAL:   2,
  FINAL:       1,
};

export const APP_NAME = 'eFootball™';
