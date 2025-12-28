/**
 * Game Engine Callbacks
 * These callbacks allow the game engine to communicate events
 * without having side effects (like console.log)
 */

import { Chess, Square, Item, Debuff } from "./index";

/**
 * Callback interface for game engine events
 * All callbacks are optional - the engine will only call them if provided
 */
export interface GameEngineCallbacks {
  /**
   * Called when a neutral monster spawns (Drake, Baron)
   */
  onMonsterSpawned?: (monster: Chess, position: Square) => void;

  /**
   * Called when a monster respawns after being killed
   */
  onMonsterRespawned?: (monster: Chess, position: Square) => void;

  /**
   * Called when a piece is killed
   */
  onPieceKilled?: (
    killer: Chess,
    victim: Chess,
    goldAwarded: number
  ) => void;

  /**
   * Called when gold is awarded to a player
   */
  onGoldAwarded?: (
    playerId: string,
    amount: number,
    reason: string
  ) => void;

  /**
   * Called when an item is combined from components
   */
  onItemCombined?: (
    champion: Chess,
    newItem: Item,
    component1: Item,
    component2: Item
  ) => void;

  /**
   * Called when a debuff is applied
   */
  onDebuffApplied?: (
    target: Chess,
    debuff: Debuff,
    source: Chess
  ) => void;

  /**
   * Called when damage is dealt
   */
  onDamageDealt?: (
    source: Chess,
    target: Chess,
    damage: number,
    damageType: "physical" | "magic" | "true" | "non-lethal"
  ) => void;

  /**
   * Called when healing occurs
   */
  onHeal?: (target: Chess, amount: number, source?: Chess) => void;

  /**
   * Called when a shield is applied
   */
  onShieldApplied?: (
    target: Chess,
    amount: number,
    duration: number
  ) => void;

  /**
   * Called when a piece moves
   */
  onPieceMoved?: (
    piece: Chess,
    fromPosition: Square,
    toPosition: Square
  ) => void;

  /**
   * Called when a skill is used
   */
  onSkillUsed?: (
    caster: Chess,
    skillName: string,
    targetPosition?: Square
  ) => void;

  /**
   * Called when a critical strike occurs
   */
  onCriticalStrike?: (
    attacker: Chess,
    target: Chess,
    damage: number
  ) => void;

  /**
   * Called when a minion is promoted to super minion
   */
  onMinionPromoted?: (minion: Chess) => void;

  /**
   * Called when the game ends
   */
  onGameOver?: (
    winner: "blue" | "red" | null,
    reason: string
  ) => void;

  /**
   * Called when a new round starts
   */
  onRoundStart?: (roundNumber: number, isBluesTurn: boolean) => void;

  /**
   * Called when shop items are refreshed
   */
  onShopRefreshed?: (itemIds: string[]) => void;

  /**
   * Called when an aura effect is applied
   */
  onAuraApplied?: (
    source: Chess,
    target: Chess,
    auraName: string
  ) => void;

  /**
   * Called when an aura effect expires
   */
  onAuraExpired?: (
    source: Chess,
    target: Chess,
    auraName: string
  ) => void;

  /**
   * Called when castling occurs
   */
  onCastling?: (
    king: Chess,
    rook: Chess,
    kingNewPosition: Square,
    rookNewPosition: Square
  ) => void;

  /**
   * Generic debug/log callback for development
   */
  onDebug?: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Context object passed through game engine operations
 * Contains callbacks and other shared state
 */
export interface GameContext {
  callbacks?: GameEngineCallbacks;
}

