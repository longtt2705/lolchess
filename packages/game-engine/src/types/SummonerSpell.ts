// Summoner Spell Types for LOL Chess

export type SummonerSpellType = "Flash" | "Ghost" | "Heal" | "Barrier" | "Smite";

export interface SummonerSpell {
  type: SummonerSpellType;
  cooldown: number; // Total cooldown in turns
  currentCooldown: number; // Current cooldown remaining (0 = ready)
}

// Summoner spell definitions with cooldowns from RULE.md
export const SUMMONER_SPELLS: Record<
  SummonerSpellType,
  { cooldown: number; description: string }
> = {
  Flash: {
    cooldown: 20,
    description: "Teleport the caster to a target square.",
  },
  Ghost: {
    cooldown: 10,
    description:
      "Increase the speed of the caster by 1 and become ghost (do not block the ally attack) for 3 turns.",
  },
  Heal: {
    cooldown: 15,
    description: "Heal the caster and the local ally with the lowest HP.",
  },
  Barrier: {
    cooldown: 15,
    description: "Create a barrier around your pieces to block incoming damage.",
  },
  Smite: {
    cooldown: 10,
    description: "Deal 50 true damage to minions or neutral monsters.",
  },
};

// All available summoner spell types
export const SUMMONER_SPELL_TYPES: SummonerSpellType[] = [
  "Flash",
  "Ghost",
  "Heal",
  "Barrier",
  "Smite",
];

// Create a new summoner spell instance
export function createSummonerSpell(type: SummonerSpellType): SummonerSpell {
  return {
    type,
    cooldown: SUMMONER_SPELLS[type].cooldown,
    currentCooldown: 0,
  };
}
