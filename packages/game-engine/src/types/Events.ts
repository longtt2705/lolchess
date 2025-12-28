import { Square } from "./Square";

export enum GameEvent {
  MOVE_CHESS = "move_chess",
  ATTACK_CHESS = "attack_chess",
  BUY_ITEM = "buy_item",
  SKILL = "skill",
}

export interface EventPayload {
  playerId: string;
  event: GameEvent;
  casterPosition?: Square;
  targetPosition?: Square;
  // For BUY_ITEM events
  itemId?: string;
  targetChampionId?: string;
}

// Action details for animation tracking
export interface ActionDetails {
  timestamp: number;
  actionType: GameEvent;
  casterId: string; // Chess piece ID
  casterPosition: Square;
  targetId?: string; // Chess piece ID (if applicable)
  targetPosition?: Square;
  fromPosition?: Square; // For moves
  damage?: number; // Damage dealt
  affectedPieceIds: string[]; // All pieces affected by this action
  statChanges?: Record<string, { oldValue: number; newValue: number }>;
  itemId?: string; // For BUY_ITEM events
  skillName?: string; // For SKILL events
  pulledToPosition?: Square; // For Rocket Grab: actual position the target was pulled to
  killedPieceIds?: string[]; // Pieces that died as a result of this action
  killerPlayerId?: string; // Player who gets credit for kills (for gold)
  selfDamage?: Record<string, number>; // Track self-damage for champions like Dr. Mundo (pieceId -> damage amount)
  guinsooProc?: boolean; // For Guinsoo's Rageblade: indicates the attack triggered a second attack
  whirlwindTargets?: Array<{
    targetId: string;
    targetPosition: Square;
  }>; // For Yasuo: targets hit by the whirlwind on critical strike
  additionalAttacks?: Array<{
    attackerId: string;
    attackerPosition: Square;
    targetId: string;
    targetPosition: Square;
  }>; // For Sand Soldiers: chain attacks from nearby soldiers
  fourthShotProc?: boolean; // For Jhin and Tristana: indicates this is their 4th shot
  fourthShotAoeTargets?: Array<{
    targetId: string;
    targetPosition: Square;
  }>; // For Tristana: adjacent enemies hit by 4th shot explosion
}

