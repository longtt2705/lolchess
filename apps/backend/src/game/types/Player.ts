export interface Player {
  id: string;
  userId: string;
  username: string;
  gold: number;
  board: any[];
  bench: any[];
  position: number;
  isEliminated: boolean;
  lastRoundDamage: number;
  side?: string;
  selectedChampions: string[];
  bannedChampions: string[];
}
