export interface DebuffEffect {
  stat: string; // 'speed', 'hp', 'ad', 'ap', etc.
  modifier: number; // positive or negative value
  type: string; // 'add', 'multiply', 'set'
}

export interface Debuff {
  id: string; // unique identifier
  name: string;
  description: string;
  duration: number; // turns remaining
  maxDuration: number; // original duration
  effects: DebuffEffect[]; // stat modifications
  damagePerTurn: number; // damage dealt each turn
  damageType: "physical" | "magic" | "true" | "non-lethal"; // 'physical', 'magic', 'true', 'non-lethal'
  stun?: boolean; // whether the debuff is a stun
  healPerTurn: number; // heal each turn
  unique: boolean; // can only have one instance
  currentStacks?: number; // current number of stacks
  maximumStacks?: number; // maximum number of stacks
  appliedAt: number; // timestamp when applied
  casterPlayerId: string; // who applied this debuff
  casterName?: string; // champion name of the caster (for icon display)
  payload?: any; // flexible payload for custom debuff data
  isTransformation?: boolean; // whether this is a transformation debuff (affects HP management)
  onExpireId?: string; // identifier for custom expire logic (e.g., 'nasus_transform')
}
