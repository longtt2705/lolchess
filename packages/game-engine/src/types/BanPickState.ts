import { SummonerSpellType } from "./SummonerSpell";

export interface BanPickState {
  phase: string;
  currentTurn: string;
  turnNumber: number;
  bannedChampions: string[];
  blueBans: string[];
  redBans: string[];
  banHistory: string[]; // Tracks each ban turn: champion name or "SKIPPED"
  bluePicks: string[];
  redPicks: string[];
  blueChampionOrder: string[]; // Final champion order after reordering
  redChampionOrder: string[]; // Final champion order after reordering
  blueReady: boolean; // Blue player confirmed their order
  redReady: boolean; // Red player confirmed their order
  blueSummonerSpells: Record<string, SummonerSpellType>; // Champion name -> spell type
  redSummonerSpells: Record<string, SummonerSpellType>; // Champion name -> spell type
  turnStartTime: number;
  turnTimeLimit: number;
}

