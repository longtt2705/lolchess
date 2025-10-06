import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

export type GameDocument = Game & Document;
export type SquareDocument = Square & Document;
export type AttackRangeDocument = AttackRange & Document;
export type ChessStatsDocument = ChessStats & Document;
export type DebuffEffectDocument = DebuffEffect & Document;
export type DebuffDocument = Debuff & Document;
export type AuraEffectDocument = AuraEffect & Document;
export type AuraDocument = Aura & Document;
export type ChessDocument = Chess & Document;
export type EventPayloadDocument = EventPayload & Document;
export type BanPickStateDocument = BanPickState & Document;
export type PlayerDocument = Player & Document;
export type GameSettingsDocument = GameSettings & Document;

export enum GameEvent {
  MOVE_CHESS = "move_chess",
  ATTACK_CHESS = "attack_chess",
  BUY_ITEM = "buy_item",
  SKILL = "skill",
}

export class Square {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;
}

export class AttackRange {
  @Prop({ default: false })
  diagonal: boolean;

  @Prop({ default: false })
  horizontal: boolean;

  @Prop({ default: false })
  vertical: boolean;

  @Prop({ required: true })
  range: number;
}

export class ChessStats {
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

  @Prop({ type: AttackRange, required: true })
  attackRange: AttackRange;

  @Prop({ required: true })
  goldValue: number;

  @Prop({ default: 0 })
  sunder: number;

  @Prop({ default: 0 })
  criticalChance: number;

  @Prop({ default: 150 })
  criticalDamage: number; // Default 150% (1.5x multiplier)

  @Prop({ default: 0 })
  cooldownReduction: number; // Reduces skill cooldowns (percentage)

  @Prop({ default: 0 })
  lifesteal: number; // Heals for a percentage of physical damage dealt
}

export class DebuffEffect {
  @Prop({ required: true })
  stat: string; // 'speed', 'hp', 'ad', 'ap', etc.

  @Prop({ required: true })
  modifier: number; // positive or negative value

  @Prop({ default: "add" })
  type: string; // 'add', 'multiply', 'set'
}

export class Debuff {
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

  @Prop({ type: [DebuffEffect], default: [] })
  effects: DebuffEffect[]; // stat modifications

  @Prop({ default: "physical" })
  damagePerTurn: number; // damage dealt each turn

  @Prop({ default: 0 })
  damageType: "physical" | "magic" | "true"; // 'physical', 'magic', 'true'

  @Prop({ default: 0 })
  healPerTurn: number; // heal each turn

  @Prop({ default: false })
  unique: boolean; // can only have one instance

  @Prop({ required: true })
  appliedAt: number; // timestamp when applied

  @Prop({ required: true })
  casterPlayerId: string; // who applied this debuff

  @Prop()
  casterName?: string; // champion name of the caster (for icon display)
}

export class AuraEffect {
  @Prop({ required: true })
  stat: string; // 'speed', 'ad', 'ap', etc.

  @Prop({ required: true })
  modifier: number; // positive or negative value

  @Prop({ default: "add" })
  type: string; // 'add', 'multiply', 'set'

  @Prop({ default: "allies" })
  target: string; // 'allies', 'enemies', 'all'
}

export class Aura {
  @Prop({ required: true })
  id: string; // unique identifier

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: 1 })
  range: number; // how many squares the aura reaches (1 = adjacent only)

  @Prop({ type: [AuraEffect], default: [] })
  effects: AuraEffect[]; // stat modifications

  @Prop({ default: true })
  active: boolean; // whether the aura is currently active

  @Prop({ default: false })
  requiresAlive: boolean; // aura only works if the piece is alive

  @Prop({ default: "permanent" })
  duration: string; // 'permanent', 'turn', 'combat'
}

@Schema()
export class Item {
  @Prop({ required: true })
  id: string;
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  description: string;
  @Prop({ type: ChessStats, required: true })
  stats: ChessStats;
  @Prop({ required: true })
  unique: boolean;
}

export class Skill {
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  description: string;
  @Prop({ required: true })
  cooldown: number;
  @Prop({ type: AttackRange, required: true })
  attackRange: AttackRange;
  @Prop({ required: true })
  targetTypes: "square" | "ally" | "enemy" | "none";
  @Prop({ required: true })
  currentCooldown: number;
  @Prop({ required: true })
  type: "passive" | "active";
  @Prop({ type: mongoose.Schema.Types.Mixed, required: false })
  payload?: any;
}

@Schema()
export class Chess {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Square, required: true })
  position: Square;

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

  @Prop({ type: ChessStats, required: true })
  stats: ChessStats;

  @Prop({ required: true })
  blue: boolean;

  @Prop({ type: Skill })
  skill?: Skill;

  @Prop({ type: [Item], required: true })
  items: Item[];

  @Prop({ type: [Debuff], default: [] })
  debuffs: Debuff[];

  @Prop({ type: [Aura], default: [] })
  auras: Aura[];

  @Prop()
  deadAtRound?: number; // Track which round the piece died
}

@Schema()
export class EventPayload {
  @Prop({ required: true })
  playerId: string;

  @Prop({ required: true, enum: GameEvent })
  event: GameEvent;

  @Prop({ type: Square })
  casterPosition?: Square;

  @Prop({ type: Square })
  targetPosition?: Square;

  // For BUY_ITEM events
  @Prop()
  itemId?: string;

  @Prop()
  targetChampionId?: string;
}

// Action details for animation tracking
export class ActionDetails {
  @Prop({ required: true })
  timestamp: number;

  @Prop({ required: true, enum: GameEvent })
  actionType: GameEvent;

  @Prop({ required: true })
  casterId: string; // Chess piece ID

  @Prop({ type: Square, required: true })
  casterPosition: Square;

  @Prop()
  targetId?: string; // Chess piece ID (if applicable)

  @Prop({ type: Square })
  targetPosition?: Square;

  @Prop({ type: Square })
  fromPosition?: Square; // For moves

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

  @Prop({ type: [String], default: [] })
  killedPieceIds?: string[]; // Pieces that died as a result of this action

  @Prop()
  killerPlayerId?: string; // Player who gets credit for kills (for gold)
}

@Schema()
export class BanPickState {
  @Prop({ required: true, enum: ["ban", "pick", "complete"] })
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

  @Prop({ required: true })
  turnStartTime: number;

  @Prop({ default: 30 })
  turnTimeLimit: number;
}

@Schema()
export class Player {
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
export class GameSettings {
  @Prop({ default: 60 })
  roundTime: number;

  @Prop({ default: 0 })
  startingGold: number;
}

@Schema({ timestamps: true })
export class Game {
  @Prop({ required: true })
  name: string;

  @Prop({
    required: true,
    enum: ["waiting", "ban_pick", "in_progress", "finished"],
  })
  status: string;

  @Prop({ type: [Player], default: [] })
  players: Player[];

  @Prop({ required: true, default: 2 })
  maxPlayers: number;

  @Prop({ default: 1 })
  currentRound: number;

  @Prop({ type: GameSettings, default: {} })
  gameSettings: GameSettings;

  @Prop()
  winner?: string;

  @Prop({
    required: true,
    enum: ["ban_phase", "pick_phase", "gameplay"],
    default: "ban_phase",
  })
  phase: string;

  @Prop({ type: BanPickState })
  banPickState?: BanPickState;

  @Prop()
  bluePlayer?: string;

  @Prop()
  redPlayer?: string;

  @Prop({ type: [Chess], default: [] })
  board: Chess[];

  @Prop({ type: ActionDetails })
  lastAction?: ActionDetails;
}

export const SquareSchema = SchemaFactory.createForClass(Square);
export const AttackRangeSchema = SchemaFactory.createForClass(AttackRange);
export const ChessStatsSchema = SchemaFactory.createForClass(ChessStats);
export const DebuffEffectSchema = SchemaFactory.createForClass(DebuffEffect);
export const DebuffSchema = SchemaFactory.createForClass(Debuff);
export const AuraEffectSchema = SchemaFactory.createForClass(AuraEffect);
export const AuraSchema = SchemaFactory.createForClass(Aura);
export const ChessSchema = SchemaFactory.createForClass(Chess);
export const SkillSchema = SchemaFactory.createForClass(Skill);
export const EventPayloadSchema = SchemaFactory.createForClass(EventPayload);
export const ActionDetailsSchema = SchemaFactory.createForClass(ActionDetails);
export const BanPickStateSchema = SchemaFactory.createForClass(BanPickState);
export const PlayerSchema = SchemaFactory.createForClass(Player);
export const GameSettingsSchema = SchemaFactory.createForClass(GameSettings);
export const GameSchema = SchemaFactory.createForClass(Game);
export const ItemSchema = SchemaFactory.createForClass(Item);
