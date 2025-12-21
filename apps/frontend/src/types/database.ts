// Type definitions for Champion and Item database

export interface AttackRange {
  range: number;
  diagonal: boolean;
  horizontal: boolean;
  vertical: boolean;
}

export interface ChampionStats {
  hp?: number;
  maxHp?: number;
  ad?: number;
  ap?: number;
  physicalResistance?: number;
  magicResistance?: number;
  speed?: number;
  attackRange?: AttackRange;
  goldValue?: number;
  sunder?: number;
  criticalChance?: number;
  criticalDamage?: number;
  cooldownReduction?: number;
  lifesteal?: number;
  damageAmplification?: number;
  hpRegen?: number;
  durability?: number;
}

export interface ChampionSkill {
  type?: "active" | "passive";
  name?: string;
  description?: string;
  cooldown?: number;
  attackRange?: AttackRange;
  targetTypes?: "square" | "squareInRange" | "ally" | "allyMinion" | "enemy" | "none";
}

export interface AuraEffect {
  stat: string;
  modifier: number;
  type: string;
  target: string;
}

export interface ChampionAura {
  id?: string;
  name?: string;
  description?: string;
  range?: number;
  effects?: AuraEffect[];
  active?: boolean;
  requiresAlive?: boolean;
  duration?: string;
}

export interface AttackProjectile {
  shape: "bullet" | "arrow" | "orb" | "bolt" | "missile";
  color: string;
  trailColor?: string;
  size?: number; // 0.5 to 2, default 1
  speed?: number; // 0.5 to 2, default 1
  icon?: string; // Optional emoji/icon
}

export interface ChampionData {
  name: string;
  stats: ChampionStats;
  skill: ChampionSkill;
  aura?: ChampionAura;
  attackProjectile?: AttackProjectile;
}

export interface ItemEffect {
  stat: string;
  value: number;
  type: "add" | "multiply";
  conditional?: boolean;
}

export interface ItemData {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon?: string;
  effects: ItemEffect[];
  isBasic: boolean;
  recipe?: [string, string];
  unique?: boolean;
}

export interface ItemsResponse {
  items: ItemData[];
}
