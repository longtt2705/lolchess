import { AttackRange } from "./AttackRange";

export interface ChessStats {
  hp: number;
  maxHp: number;
  ad: number;
  ap: number;
  physicalResistance: number;
  magicResistance: number;
  speed: number;
  attackRange: AttackRange;
  goldValue: number;
  sunder: number;
  criticalChance: number;
  criticalDamage: number; // Default 125% (1.25x multiplier)
  cooldownReduction: number; // Reduces skill cooldowns (percentage)
  lifesteal: number; // Heals for a percentage of physical damage dealt
  damageAmplification: number; // Increases all damage dealt (percentage)
  hpRegen: number; // HP regenerated per turn
  durability: number; // Durability of the piece (percentage)
}
