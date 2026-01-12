import { Player } from "./Player";
import { Chess } from "./Chess";
import { ActionDetails } from "./Events";
import { BanPickState } from "./BanPickState";

export interface GameSettings {
  roundTime: number;
  startingGold: number;
}

export interface Game {
  name: string;
  status: string;
  players: Player[];
  maxPlayers: number;
  currentRound: number;
  gameSettings: GameSettings;
  winner?: string | null;
  phase: string;
  banPickState?: BanPickState;
  bluePlayer?: string;
  redPlayer?: string;
  board: Chess[];
  lastAction?: ActionDetails;
  hasBoughtItemThisTurn: boolean;
  hasUsedSummonerSpellThisTurn: boolean;
  hasPerformedActionThisTurn: boolean;
  shopItems: string[]; // Current available shop item IDs
  shopRefreshRound: number; // Track when shop was last refreshed
  rngSeed: number; // Initial seed for this game (for replays)
  rngState: number; // Current RNG state (for save/load)
  // Dragon Soul System
  drakePool: string[]; // Available drake types to spawn (starts with 6, removes on spawn)
  drakesKilled: number; // Total drakes killed in game
  elderDrakeKillerTeam: string | null; // Player ID who has Elder buff (execute below 15% HP)
}

