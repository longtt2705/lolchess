import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

// Import pure types
import {
  Square as SquareType,
  AttackRange as AttackRangeType,
  ChessStats as ChessStatsType,
  DebuffEffect as DebuffEffectType,
  Debuff as DebuffType,
  AuraEffect as AuraEffectType,
  Aura as AuraType,
  Item as ItemType,
  Skill as SkillType,
  Shield as ShieldType,
  AttackProjectile as AttackProjectileType,
  Chess as ChessType,
  EventPayload as EventPayloadType,
  ActionDetails as ActionDetailsType,
  BanPickState as BanPickStateType,
  Player as PlayerType,
  GameSettings as GameSettingsType,
  Game as GameType,
  GameEvent,
} from "./types";

// Re-export pure types for backward compatibility
export type {
  SquareType as Square,
  AttackRangeType as AttackRange,
  ChessStatsType as ChessStats,
  DebuffEffectType as DebuffEffect,
  DebuffType as Debuff,
  AuraEffectType as AuraEffect,
  AuraType as Aura,
  ItemType as Item,
  SkillType as Skill,
  ShieldType as Shield,
  AttackProjectileType as AttackProjectile,
  ChessType as Chess,
  EventPayloadType as EventPayload,
  ActionDetailsType as ActionDetails,
  BanPickStateType as BanPickState,
  PlayerType as Player,
  GameSettingsType as GameSettings,
  GameType as Game,
};

// Re-export the enum
export { GameEvent };

// Model name constants for Mongoose
export const GAME_MODEL_NAME = "Game";

// Mongoose Document types
export type GameDocument = GameType & Document;
export type SquareDocument = SquareType & Document;
export type AttackRangeDocument = AttackRangeType & Document;
export type ChessStatsDocument = ChessStatsType & Document;
export type DebuffEffectDocument = DebuffEffectType & Document;
export type DebuffDocument = DebuffType & Document;
export type AuraEffectDocument = AuraEffectType & Document;
export type AuraDocument = AuraType & Document;
export type ChessDocument = ChessType & Document;
export type EventPayloadDocument = EventPayloadType & Document;
export type ActionDetailsDocument = ActionDetailsType & Document;
export type BanPickStateDocument = BanPickStateType & Document;
export type PlayerDocument = PlayerType & Document;
export type GameSettingsDocument = GameSettingsType & Document;

// Mongoose Subdocument Classes (no @Schema decorator - these are embedded)
export class SquareSchema implements SquareType {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;
}

export class AttackRangeSchema implements AttackRangeType {
  @Prop({ default: false })
  diagonal: boolean;

  @Prop({ default: false })
  horizontal: boolean;

  @Prop({ default: false })
  vertical: boolean;

  @Prop({ required: true })
  range: number;

  @Prop({ default: false })
  lShape: boolean;
}

export class ChessStatsSchema implements ChessStatsType {
  @Prop({ required: true })
  hp: number;

  @Prop({ required: true })
  maxHp: number;

  @Prop({ required: true })
  ad: number;

  @Prop({ required: true })
  ap: number;

  @Prop({ required: true })
  physicalResistance: number;

  @Prop({ required: true })
  magicResistance: number;

  @Prop({ required: true })
  speed: number;

  @Prop({ type: AttackRangeSchema, required: true })
  attackRange: AttackRangeType;

  @Prop({ required: true })
  goldValue: number;

  @Prop({ default: 0 })
  sunder: number;

  @Prop({ default: 0 })
  criticalChance: number;

  @Prop({ default: 125 })
  criticalDamage: number; // Default 125% (1.25x multiplier)

  @Prop({ default: 0 })
  cooldownReduction: number; // Reduces skill cooldowns (percentage)

  @Prop({ default: 0 })
  lifesteal: number; // Heals for a percentage of physical damage dealt

  @Prop({ default: 0 })
  damageAmplification: number; // Increases all damage dealt (percentage)

  @Prop({ default: 0 })
  hpRegen: number; // HP regenerated per turn

  @Prop({ default: 0 })
  durability: number; // Durability of the piece (percentage)
}

export class DebuffEffectSchema implements DebuffEffectType {
  @Prop({ required: true })
  stat: string; // 'speed', 'hp', 'ad', 'ap', etc.

  @Prop({ required: true })
  modifier: number; // positive or negative value

  @Prop({ default: "add" })
  type: string; // 'add', 'multiply', 'set'
}

export class DebuffSchema implements DebuffType {
  @Prop({ required: true })
  id: string; // unique identifier

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  duration: number; // turns remaining

  @Prop({ required: true })
  maxDuration: number; // original duration

  @Prop({ type: [DebuffEffectSchema], default: [] })
  effects: DebuffEffectType[]; // stat modifications

  @Prop({ default: 0 })
  damagePerTurn: number; // damage dealt each turn

  @Prop({ default: "physical" })
  damageType: "physical" | "magic" | "true" | "non-lethal"; // 'physical', 'magic', 'true', 'non-lethal'

  @Prop({ default: false })
  stun: boolean; // whether the debuff is a stun

  @Prop({ default: 0 })
  healPerTurn: number; // heal each turn

  @Prop({ default: false })
  unique: boolean; // can only have one instance

  @Prop({ default: 1, required: false })
  currentStacks: number; // current number of stacks

  @Prop({ default: 1, required: false })
  maximumStacks: number; // maximum number of stacks

  @Prop({ required: true })
  appliedAt: number; // timestamp when applied

  @Prop({ required: true })
  casterPlayerId: string; // who applied this debuff

  @Prop()
  casterName?: string; // champion name of the caster (for icon display)

  @Prop({ type: Object, default: {} })
  payload?: any; // flexible payload for custom debuff data
}

export class AuraEffectSchema implements AuraEffectType {
  @Prop({ required: true })
  stat: string; // 'speed', 'ad', 'ap', etc.

  @Prop({ required: true })
  modifier: number; // positive or negative value

  @Prop({ default: "add" })
  type: string; // 'add', 'multiply', 'set'

  @Prop({ default: "allies" })
  target: string; // 'allies', 'enemies', 'all'
}

export class AuraSchema implements AuraType {
  @Prop({ required: true })
  id: string; // unique identifier

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: 1 })
  range: number; // how many squares the aura reaches (1 = adjacent only)

  @Prop({ type: [AuraEffectSchema], default: [] })
  effects: AuraEffectType[]; // stat modifications

  @Prop({ default: true })
  active: boolean; // whether the aura is currently active

  @Prop({ default: false })
  requiresAlive: boolean; // aura only works if the piece is alive

  @Prop({ default: "permanent" })
  duration: string; // 'permanent', 'turn', 'combat'
}

export class ItemSchema implements ItemType {
  @Prop({ required: true })
  id: string;
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  description: string;
  @Prop({ type: mongoose.Schema.Types.Mixed, required: false })
  payload?: any;
  @Prop({ required: true })
  unique: boolean;
  @Prop({ required: true, default: 0 })
  cooldown: number;
  @Prop({ required: true, default: 0 })
  currentCooldown: number;
}

export class SkillSchema implements SkillType {
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  description: string;
  @Prop({ required: true })
  cooldown: number;
  @Prop({ type: AttackRangeSchema, required: true })
  attackRange: AttackRangeType;
  @Prop({ required: true })
  targetTypes:
    | "square"
    | "squareInRange"
    | "ally"
    | "allyMinion"
    | "enemy"
    | "none";
  @Prop({ required: true })
  currentCooldown: number;
  @Prop({ required: true })
  type: "passive" | "active";
  @Prop({ type: mongoose.Schema.Types.Mixed, required: false })
  payload?: any;
}

export class ShieldSchema implements ShieldType {
  @Prop({ required: true })
  id: string;
  @Prop({ required: true })
  amount: number;
  @Prop({ required: true })
  duration: number;
}

export class AttackProjectileSchema implements AttackProjectileType {
  @Prop({ required: true })
  shape: string; // "bullet" | "arrow" | "orb" | "bolt" | "missile"

  @Prop({ required: true })
  color: string;

  @Prop()
  trailColor?: string;

  @Prop()
  size?: number;

  @Prop()
  speed?: number;

  @Prop()
  icon?: string;
}

@Schema()
export class ChessSchema implements ChessType {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: SquareSchema, required: true })
  position: SquareType;

  @Prop({ type: SquareSchema })
  startingPosition?: SquareType;

  @Prop({ default: false })
  cannotMoveBackward: boolean;

  @Prop({ default: false })
  canOnlyMoveVertically: boolean;

  @Prop({ default: false })
  hasMovedBefore: boolean;

  @Prop({ default: false })
  cannotAttack: boolean;

  @Prop({ required: true })
  ownerId: string;

  @Prop({ type: ChessStatsSchema, required: true })
  stats: ChessStatsType;

  @Prop({ required: true })
  blue: boolean;

  @Prop({ type: SkillSchema })
  skill?: SkillType;

  @Prop({ type: [ItemSchema], required: true })
  items: ItemType[];

  @Prop({ type: [DebuffSchema], default: [] })
  debuffs: DebuffType[];

  @Prop({ type: [AuraSchema], default: [] })
  auras: AuraType[];

  @Prop({ type: [ShieldSchema], default: [] })
  shields: ShieldType[];

  @Prop({ type: AttackProjectileSchema })
  attackProjectile?: AttackProjectileType;

  @Prop()
  deadAtRound?: number; // Track which round the piece died
}

@Schema()
export class EventPayloadSchema implements EventPayloadType {
  @Prop({ required: true })
  playerId: string;

  @Prop({ required: true, enum: GameEvent })
  event: GameEvent;

  @Prop({ type: SquareSchema })
  casterPosition?: SquareType;

  @Prop({ type: SquareSchema })
  targetPosition?: SquareType;

  // For BUY_ITEM events
  @Prop()
  itemId?: string;

  @Prop()
  targetChampionId?: string;
}

// Action details for animation tracking
@Schema()
export class ActionDetailsSchema implements ActionDetailsType {
  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: true, enum: GameEvent })
  actionType: GameEvent;

  @Prop({ required: true })
  casterId: string; // Chess piece ID

  @Prop({ type: SquareSchema, required: true })
  casterPosition: SquareType;

  @Prop()
  targetId?: string; // Chess piece ID (if applicable)

  @Prop({ type: SquareSchema })
  targetPosition?: SquareType;

  @Prop({ type: SquareSchema })
  fromPosition?: SquareType; // For moves

  @Prop({ default: 0 })
  damage?: number; // Damage dealt

  @Prop({ type: [String], default: [] })
  affectedPieceIds: string[]; // All pieces affected by this action

  @Prop({ type: mongoose.Schema.Types.Mixed })
  statChanges?: Record<string, { oldValue: number; newValue: number }>;

  @Prop()
  itemId?: string; // For BUY_ITEM events

  @Prop()
  skillName?: string; // For SKILL events

  @Prop({ type: SquareSchema })
  pulledToPosition?: SquareType; // For Rocket Grab: actual position the target was pulled to

  @Prop({ type: [String], default: [] })
  killedPieceIds?: string[]; // Pieces that died as a result of this action

  @Prop()
  killerPlayerId?: string; // Player who gets credit for kills (for gold)

  @Prop({ type: mongoose.Schema.Types.Mixed })
  selfDamage?: Record<string, number>; // Track self-damage for champions like Dr. Mundo (pieceId -> damage amount)

  @Prop()
  guinsooProc?: boolean; // For Guinsoo's Rageblade: indicates the attack triggered a second attack

  @Prop({ type: [mongoose.Schema.Types.Mixed] })
  whirlwindTargets?: Array<{
    targetId: string;
    targetPosition: SquareType;
  }>; // For Yasuo: targets hit by the whirlwind on critical strike

  @Prop({ type: [mongoose.Schema.Types.Mixed] })
  additionalAttacks?: Array<{
    attackerId: string;
    attackerPosition: SquareType;
    targetId: string;
    targetPosition: SquareType;
  }>; // For Sand Soldiers: chain attacks from nearby soldiers

  @Prop()
  fourthShotProc?: boolean; // For Jhin and Tristana: indicates this is their 4th shot

  @Prop({ type: [mongoose.Schema.Types.Mixed] })
  fourthShotAoeTargets?: Array<{
    targetId: string;
    targetPosition: SquareType;
  }>; // For Tristana: adjacent enemies hit by 4th shot explosion
}

@Schema()
export class BanPickStateSchema implements BanPickStateType {
  @Prop({ required: true, enum: ["ban", "pick", "reorder", "complete"] })
  phase: string;

  @Prop({ required: true, enum: ["blue", "red"] })
  currentTurn: string;

  @Prop({ required: true, default: 1 })
  turnNumber: number;

  @Prop({ type: [String], default: [] })
  bannedChampions: string[];

  @Prop({ type: [String], default: [] })
  blueBans: string[];

  @Prop({ type: [String], default: [] })
  redBans: string[];

  @Prop({ type: [String], default: [] })
  banHistory: string[]; // Tracks each ban turn: champion name or "SKIPPED"

  @Prop({ type: [String], default: [] })
  bluePicks: string[];

  @Prop({ type: [String], default: [] })
  redPicks: string[];

  @Prop({ type: [String], default: [] })
  blueChampionOrder: string[]; // Final champion order after reordering

  @Prop({ type: [String], default: [] })
  redChampionOrder: string[]; // Final champion order after reordering

  @Prop({ default: false })
  blueReady: boolean; // Blue player confirmed their order

  @Prop({ default: false })
  redReady: boolean; // Red player confirmed their order

  @Prop({ required: true })
  turnStartTime: number;

  @Prop({ default: 30 })
  turnTimeLimit: number;
}

@Schema()
export class PlayerSchema implements PlayerType {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ default: 0 })
  gold: number;

  @Prop({ type: [Object], default: [] })
  board: any[];

  @Prop({ type: [Object], default: [] })
  bench: any[];

  @Prop({ required: true })
  position: number;

  @Prop({ default: false })
  isEliminated: boolean;

  @Prop({ default: 0 })
  lastRoundDamage: number;

  @Prop({ enum: ["blue", "red"] })
  side?: string;

  @Prop({ type: [String], default: [] })
  selectedChampions: string[];

  @Prop({ type: [String], default: [] })
  bannedChampions: string[];
}

@Schema()
export class GameSettingsSchema implements GameSettingsType {
  @Prop({ default: 60 })
  roundTime: number;

  @Prop({ default: 0 })
  startingGold: number;
}

@Schema({ timestamps: true })
export class GameSchema implements GameType {
  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: ["waiting", "ban_pick", "in_progress", "finished"],
  })
  status: string;

  @Prop({ type: [PlayerSchema], default: [] })
  players: PlayerType[];

  @Prop({ required: true, default: 2 })
  maxPlayers: number;

  @Prop({ default: 1 })
  currentRound: number;

  @Prop({ type: GameSettingsSchema, default: {} })
  gameSettings: GameSettingsType;

  @Prop()
  winner?: string;

  @Prop({
    required: true,
    enum: ["ban_phase", "pick_phase", "gameplay"],
    default: "ban_phase",
  })
  phase: string;

  @Prop({ type: BanPickStateSchema })
  banPickState?: BanPickStateType;

  @Prop()
  bluePlayer?: string;

  @Prop()
  redPlayer?: string;

  @Prop({ type: [ChessSchema], default: [] })
  board: ChessType[];

  @Prop({ type: ActionDetailsSchema })
  lastAction?: ActionDetailsType;

  @Prop({ default: false })
  hasBoughtItemThisTurn: boolean;

  @Prop({ default: false })
  hasPerformedActionThisTurn: boolean;

  @Prop({ type: [String], default: [] })
  shopItems: string[]; // Current available shop item IDs

  @Prop({ default: 0 })
  shopRefreshRound: number; // Track when shop was last refreshed
}

// Export Mongoose schema factories (only for document classes with @Schema decorator)
export const ChessMongooseSchema = SchemaFactory.createForClass(ChessSchema);
export const EventPayloadMongooseSchema =
  SchemaFactory.createForClass(EventPayloadSchema);
export const ActionDetailsMongooseSchema =
  SchemaFactory.createForClass(ActionDetailsSchema);
export const BanPickStateMongooseSchema =
  SchemaFactory.createForClass(BanPickStateSchema);
export const PlayerMongooseSchema = SchemaFactory.createForClass(PlayerSchema);
export const GameSettingsMongooseSchema =
  SchemaFactory.createForClass(GameSettingsSchema);
export const GameMongooseSchema = SchemaFactory.createForClass(GameSchema);
