// Type definitions for Champion and Item database

export interface AttackRange {
  range: number;
  diagonal: boolean;
  horizontal: boolean;
  vertical: boolean;
}

export interface ChampionStats {
  maxHp?: number;
  ad?: number;
  ap?: number;
  physicalResistance?: number;
  magicResistance?: number;
  speed?: number;
  attackRange?: AttackRange;
}

export interface ChampionSkill {
  type?: "active" | "passive";
  name?: string;
  description?: string;
  cooldown?: number;
  attackRange?: AttackRange;
  targetTypes?: string;
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

export interface ChampionData {
  name: string;
  stats: ChampionStats;
  skill: ChampionSkill;
  aura?: ChampionAura;
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
