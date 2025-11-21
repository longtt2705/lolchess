import { ChessObject } from "../class/chess";
import { ChessStats } from "../game.schema";

export interface ItemEffect {
  stat: keyof ChessStats;
  value: number;
  type: "add" | "multiply";
  condition?: (chess: ChessObject) => boolean;
}

export interface ItemData {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon?: string;
  effects: ItemEffect[];
  isBasic: boolean;
  recipe?: [string, string]; // Two basic items that combine into this
  unique?: boolean;
  cooldown?: number; // Cooldown in turns for items with active effects
}

// Basic Items (Components)
export const basicItems: ItemData[] = [
  {
    id: "bf_sword",
    name: "B.F. Sword",
    description: "",
    cost: 50,
    icon: "/icons/BFSword.png",
    effects: [{ stat: "ad", value: 10, type: "add" }],
    isBasic: true,
  },
  {
    id: "recurve_bow",
    name: "Recurve Bow",
    description: "",
    cost: 50,
    icon: "/icons/RecurveBow.png",
    effects: [{ stat: "sunder", value: 15, type: "add" }],
    isBasic: true,
  },
  {
    id: "needlessly_rod",
    name: "Needlessly Large Rod",
    description: "",
    cost: 50,
    icon: "/icons/NeedlesslyLargeRod.png",
    effects: [{ stat: "ap", value: 20, type: "add" }],
    isBasic: true,
  },
  {
    id: "tear",
    name: "Tear of the Goddess",
    description: "",
    cost: 50,
    icon: "/icons/TearoftheGoddess.png",
    effects: [{ stat: "cooldownReduction", value: 5, type: "add" }],
    isBasic: true,
  },
  {
    id: "chain_vest",
    name: "Chain Vest",
    description: "",
    cost: 50,
    icon: "/icons/ChainVest.png",
    effects: [{ stat: "physicalResistance", value: 15, type: "add" }],
    isBasic: true,
  },
  {
    id: "negatron_cloak",
    name: "Negatron Cloak",
    description: "",
    cost: 50,
    icon: "/icons/NegatronCloak.png",
    effects: [{ stat: "magicResistance", value: 15, type: "add" }],
    isBasic: true,
  },
  {
    id: "giants_belt",
    name: "Giant's Belt",
    description: "",
    cost: 50,
    icon: "/icons/GiantsBelt.png",
    effects: [{ stat: "maxHp", value: 30, type: "add" }],
    isBasic: true,
  },
  {
    id: "sparring_gloves",
    name: "Sparring Gloves",
    description: "",
    cost: 50,
    icon: "/icons/SparringGloves.png",
    effects: [{ stat: "criticalChance", value: 20, type: "add" }],
    isBasic: true,
  },
];

// Combined Items (Made from 2 basic items)
export const combinedItems: ItemData[] = [
  // B.F. Sword Combinations
  {
    id: "infinity_edge",
    name: "Infinity Edge",
    description: "",
    cost: 0,
    icon: "/icons/InfinityEdge.png",
    effects: [
      { stat: "ad", value: 15, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
      { stat: "criticalDamage", value: 50, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "sparring_gloves"],
    unique: true,
  },
  {
    id: "giant_slayer",
    name: "Giant Slayer",
    description:
      "+15% Damage Amplification against chess having more than 200 HP.",
    cost: 0,
    icon: "/icons/GiantSlayer.png",
    effects: [
      { stat: "ad", value: 15, type: "add" },
      { stat: "sunder", value: 20, type: "add" },
      { stat: "damageAmplification", value: 5, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "recurve_bow"],
  },
  {
    id: "hextech_gunblade",
    name: "Hextech Gunblade",
    description: "Heal 15% of damage dealt from all sources.",
    cost: 0,
    icon: "/icons/HextechGunblade.png",
    effects: [
      { stat: "ad", value: 15, type: "add" },
      { stat: "ap", value: 25, type: "add" },
      { stat: "damageAmplification", value: 7, type: "add" },
    ],
    isBasic: false,
    unique: true,
    recipe: ["bf_sword", "needlessly_rod"],
  },
  {
    id: "bloodthirster",
    name: "Bloodthirster",
    description: "Gains additional 15% lifesteal effect when HP is below 40%",
    cost: 0,
    icon: "/icons/Bloodthirster.png",
    effects: [
      { stat: "ad", value: 15, type: "add" },
      { stat: "magicResistance", value: 20, type: "add" },
      { stat: "lifesteal", value: 15, type: "add" },
      {
        stat: "lifesteal",
        value: 15,
        type: "add",
        condition: (chess) => chess.chess.stats.hp < chess.maxHp * 0.4,
      },
    ],
    isBasic: false,
    recipe: ["bf_sword", "negatron_cloak"],
    unique: true,
  },
  {
    id: "edge_of_night",
    name: "Edge of Night",
    description:
      "Once per game, when this chess is about to be killed, they survive with 1 HP",
    cost: 0,
    icon: "/icons/EdgeofNight.png",
    effects: [
      { stat: "ad", value: 15, type: "add" },
      { stat: "physicalResistance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "chain_vest"],
    unique: true,
  },
  {
    id: "sterak_gage",
    name: "Sterak's Gage",
    description:
      "At 40% Health, gain a shield equal to 50% of the wearer's maximum Health that decays over 3 turns.",
    cost: 0,
    icon: "/icons/SteraksGage.png",
    effects: [
      { stat: "ad", value: 15, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "giants_belt"],
    unique: true,
    cooldown: 10,
  },
  {
    id: "spear_of_shojin",
    name: "Spear of Shojin",
    description: "Reduce 1 round of cooldown of skill for each attack.",
    cost: 0,
    icon: "/icons/SpearofShojin.png",
    effects: [
      { stat: "ad", value: 15, type: "add" },
      { stat: "cooldownReduction", value: 5, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "tear"],
  },
  {
    id: "deathblade",
    name: "Deathblade",
    description: "",
    cost: 0,
    icon: "/icons/Deathblade.png",
    effects: [
      { stat: "ad", value: 30, type: "add" },
      { stat: "damageAmplification", value: 10, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "bf_sword"],
    unique: true,
  },

  // Recurve Bow Combinations
  {
    id: "rapid_firecannon",
    name: "Rapid Firecannon",
    description: "Gain additional 1 attack range.",
    cost: 0,
    icon: "/icons/RapidFirecannon.png",
    effects: [
      { stat: "sunder", value: 30, type: "add" },
      { stat: "damageAmplification", value: 5, type: "add" },
      { stat: "attackRange", value: 1, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "recurve_bow"],
    unique: true,
  },
  {
    id: "guinsoo_rageblade",
    name: "Guinsoo's Rageblade",
    description: "Each attack grant 2 permanent Sunder.",
    cost: 0,
    icon: "/icons/GuinsoosRageblade.png",
    effects: [
      { stat: "sunder", value: 20, type: "add" },
      { stat: "ap", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "needlessly_rod"],
  },
  {
    id: "titans_resolve",
    name: "Titan's Resolve",
    description:
      "Each times being attacked, grant 5 damage amplification + armor + magic resistance for 3 turns. (Max 4 times)",
    cost: 0,
    icon: "/icons/TitansResolve.png",
    effects: [
      { stat: "sunder", value: 20, type: "add" },
      { stat: "physicalResistance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "chain_vest"],
  },
  {
    id: "wit_s_end",
    name: "Wit's End",
    description: "Each attacks grant 3 permanent magic resistance.",
    cost: 0,
    icon: "/icons/WitsEnd.png",
    effects: [
      { stat: "sunder", value: 20, type: "add" },
      { stat: "magicResistance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "negatron_cloak"],
  },
  {
    id: "void_staff",
    name: "Void Staff",
    description: "Ignore 30% of enemy magic resistance.",
    cost: 0,
    icon: "/icons/VoidStaff.png",
    effects: [
      { stat: "sunder", value: 20, type: "add" },
      { stat: "cooldownReduction", value: 5, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "tear"],
  },
  {
    id: "last_whisper",
    name: "Last Whisper",
    description: "Ignore 30% of enemy physical resistance.",
    cost: 0,
    icon: "/icons/LastWhisper.png",
    effects: [
      { stat: "sunder", value: 20, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "sparring_gloves"],
  },
  {
    id: "nashors_tooth",
    name: "Nashor's Tooth",
    description:
      "After using an active skill, grant 10% damage amplification for 2 turns. Each attack deals 10 + 20% of AP magic damage to the target.",
    cost: 0,
    icon: "/icons/NashorsTooth.png",
    effects: [
      { stat: "sunder", value: 20, type: "add" },
      { stat: "ap", value: 15, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "giants_belt"],
  },

  // Needlessly Large Rod Combinations
  {
    id: "rabadon_deathcap",
    name: "Rabadon's Deathcap",
    description: "",
    cost: 0,
    icon: "/icons/RabadonsDeathcap.png",
    effects: [
      { stat: "ap", value: 50, type: "add" },
      { stat: "damageAmplification", value: 10, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "needlessly_rod"],
    unique: true,
  },
  {
    id: "archangel_staff",
    name: "Archangel's Staff",
    description:
      "Each times using an active skill, grant 5 permanent Ability Power.",
    cost: 0,
    icon: "/icons/ArchangelsStaff.png",
    effects: [
      { stat: "ap", value: 25, type: "add" },
      { stat: "cooldownReduction", value: 5, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "tear"],
  },
  {
    id: "crownguard",
    name: "Crownguard",
    description: "Immidiate gain a 30% of max Health Shield. If the shield is broken, gain 10 AP.",
    cost: 0,
    icon: "/icons/Crownguard.png",
    effects: [
      { stat: "ap", value: 25, type: "add" },
      { stat: "physicalResistance", value: 20, type: "add" },
      { stat: "maxHp", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "chain_vest"],
  },
  {
    id: "thiefs_gloves",
    name: "Thief's Gloves",
    description:
      "Steal 2 points from random stats (AD/AP/Armor/Magic Resist) of the enemy for each attack.",
    cost: 0,
    icon: "/icons/ThiefsGloves.png",
    effects: [
      { stat: "ap", value: 25, type: "add" },
      { stat: "magicResistance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "negatron_cloak"],
  },
  {
    id: "morellonomicon",
    name: "Morellonomicon",
    description: "Deal damage will Burn and Wound enemies for 3 turns.",
    cost: 0,
    icon: "/icons/Morellonomicon.png",
    effects: [
      { stat: "ap", value: 25, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "giants_belt"],
  },
  {
    id: "jeweled_gauntlet",
    name: "Jeweled Gauntlet",
    description: "Active skills can critically strike.",
    cost: 0,
    icon: "/icons/JeweledGauntlet.png",
    effects: [
      { stat: "ap", value: 25, type: "add" },
      { stat: "criticalChance", value: 35, type: "add" },
      { stat: "criticalDamage", value: 50, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "sparring_gloves"],
    unique: true,
  },

  // Chain Vest Combinations
  {
    id: "bramble_vest",
    name: "Bramble Vest",
    description:
      "Take 8% reduced damage from attacks. When struck by any attack, deal 8 + 10% of Physical Resistance magic damage to all adjacent enemies.",
    cost: 0,
    icon: "/icons/BrambleVest.png",
    effects: [{ stat: "physicalResistance", value: 40, type: "add" }],
    isBasic: false,
    recipe: ["chain_vest", "chain_vest"],
    unique: true,
  },
  {
    id: "gargoyle_stoneplate",
    name: "Gargoyle Stoneplate",
    description: "Gain 20 Armor and 20 Magic Resist when HP is below 40%.",
    cost: 0,
    icon: "/icons/GargoyleStoneplate.png",
    effects: [
      { stat: "physicalResistance", value: 20, type: "add" },
      { stat: "magicResistance", value: 20, type: "add" },
      {
        stat: "physicalResistance",
        value: 20,
        type: "add",
        condition: (chess) => chess.chess.stats.hp < chess.maxHp * 0.4,
      },
      {
        stat: "magicResistance",
        value: 20,
        type: "add",
        condition: (chess) => chess.chess.stats.hp < chess.maxHp * 0.4,
      },
    ],
    isBasic: false,
    recipe: ["chain_vest", "negatron_cloak"],
    unique: true,
  },
  {
    id: "sunfire_cape",
    name: "Sunfire Cape",
    description: "Deal Burn and Wound to adjacent enemies for 3 turns.",
    cost: 0,
    icon: "/icons/SunfireCape.png",
    effects: [
      { stat: "physicalResistance", value: 20, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
    ],
    isBasic: false,
    recipe: ["chain_vest", "giants_belt"],
    unique: true,
  },
  {
    id: "steadfast_heart",
    name: "Steadfast Heart",
    description:
      "Gain 10% Durability. While above 50% Health, instead gain 18% Durability.",
    cost: 0,
    icon: "/icons/SteadfastHeart.png",
    effects: [
      { stat: "physicalResistance", value: 20, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["chain_vest", "sparring_gloves"],
    unique: true,
  },

  // Negatron Cloak Combinations
  {
    id: "dragon_claw",
    name: "Dragon's Claw",
    description: "+30 more magic resistance when HP is below 40%.",
    cost: 0,
    icon: "/icons/DragonsClaw.png",
    effects: [
      { stat: "magicResistance", value: 40, type: "add" },
      {
        stat: "magicResistance",
        value: 30,
        type: "add",
        condition: (chess) => chess.chess.stats.hp < chess.maxHp * 0.4,
      },
    ],
    isBasic: false,
    recipe: ["negatron_cloak", "negatron_cloak"],
    unique: true,
  },
  {
    id: "evenshroud",
    name: "Evenshroud",
    description: "Disables all enemies' passive skills adjacent to the wearer.",
    cost: 0,
    icon: "/icons/Evenshroud.png",
    effects: [
      { stat: "maxHp", value: 35, type: "add" },
      { stat: "magicResistance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["giants_belt", "negatron_cloak"],
    unique: true,
  },
  {
    id: "quicksilver",
    name: "Quicksilver",
    description: "Resistance to all active debuffs from opponent for 2 turns",
    cost: 0,
    icon: "/icons/Quicksilver.png",
    effects: [
      { stat: "sunder", value: 10, type: "add" },
      { stat: "magicResistance", value: 20, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["sparring_gloves", "negatron_cloak"],
    unique: true,
    cooldown: 10,
  },

  // Giant's Belt Combinations
  {
    id: "warmog_armor",
    name: "Warmog's Armor",
    description: "Grants 20% Maximum Health",
    cost: 0,
    icon: "/icons/WarmogsArmor.png",
    effects: [
      { stat: "maxHp", value: 80, type: "add" },
      { stat: "maxHp", value: 1.2, type: "multiply" },
      { stat: "hpRegen", value: 2, type: "add" },
    ],
    isBasic: false,
    recipe: ["giants_belt", "giants_belt"],
  },
  {
    id: "strikers_flail",
    name: "Striker's Flail",
    description:
      "Critical Strike increases Damage Amplification by 10 for 2 turns.",
    cost: 0,
    icon: "/icons/StrikersFlail.png",
    effects: [
      { stat: "criticalChance", value: 25, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
      { stat: "damageAmplification", value: 7, type: "add" },
    ],
    isBasic: false,
    recipe: ["giants_belt", "sparring_gloves"],
    unique: true,
  },

  // Tear Combinations
  {
    id: "blue_buff",
    name: "Blue Buff",
    description: "Reduce 1 round of cooldown of skill after using it.",
    cost: 0,
    icon: "/icons/BlueBuff.png",
    effects: [
      { stat: "cooldownReduction", value: 10, type: "add" },
      { stat: "damageAmplification", value: 5, type: "add" },
    ],
    isBasic: false,
    recipe: ["tear", "tear"],
    unique: true,
  },
  {
    id: "protectors_vow",
    name: "Protector's Vow",
    description:
      "Gain 15% max Health shield for 2 turns after using an active skill.",
    cost: 0,
    icon: "/icons/ProtectorsVow.png",
    effects: [
      { stat: "cooldownReduction", value: 5, type: "add" },
      { stat: "physicalResistance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["tear", "chain_vest"],
  },
  {
    id: "hand_of_justice",
    name: "Hand of Justice",
    description:
      "Gain additional 10 AD and 10 AP when HP is below 40%. Heal 15% of damage dealt from all sources.",
    cost: 0,
    icon: "/icons/HandofJustice.png",
    effects: [
      { stat: "criticalChance", value: 25, type: "add" },
      { stat: "cooldownReduction", value: 5, type: "add" },
      { stat: "ad", value: 10, type: "add" },
      { stat: "ap", value: 10, type: "add" },
      {
        stat: "ad",
        value: 10,
        type: "add",
        condition: (chess) => chess.chess.stats.hp < chess.maxHp * 0.4,
      },
      {
        stat: "ap",
        value: 10,
        type: "add",
        condition: (chess) => chess.chess.stats.hp < chess.maxHp * 0.4,
      },
      {
        stat: "lifesteal",
        value: 10,
        type: "add",
        condition: (chess) => chess.chess.stats.hp < chess.maxHp * 0.4,
      },
    ],
    isBasic: false,
    recipe: ["tear", "sparring_gloves"],
  },
  {
    id: "adaptive_helm",
    name: "Adaptive Helm",
    description:
      "Gain 20 Armor or 20 Magic Resist for 3 turns when taken damage based on the damage type.",
    cost: 0,
    icon: "/icons/AdaptiveHelm.png",
    effects: [
      { stat: "cooldownReduction", value: 5, type: "add" },
      { stat: "magicResistance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["tear", "negatron_cloak"],
  },
  {
    id: "spirit_visage",
    name: "Spirit Visage",
    description:
      "Grants 30% health heal from all sources. Restore 5% of missing Health each turn.",
    cost: 0,
    icon: "/icons/SpiritVisage.png",
    effects: [
      { stat: "maxHp", value: 35, type: "add" },
      { stat: "cooldownReduction", value: 5, type: "add" },
      { stat: "hpRegen", value: 2, type: "add" },
    ],
    isBasic: false,
    recipe: ["tear", "giants_belt"],
  },
  {
    id: "serpents_fang",
    name: "Serpent's Fang",
    description:
      "Deal damage will inflict the venom debuff on the enemy for 3 turns. If the enemy doesn't have the venom debuff, reduce all their active shields by 50%.",
    cost: 0,
    icon: "/icons/SerpentsFang.png",
    effects: [
      { stat: "criticalChance", value: 50, type: "add" },
      { stat: "ad", value: 10, type: "add" },
      { stat: "ap", value: 10, type: "add" },
    ],
    isBasic: false,
    recipe: ["sparring_gloves", "sparring_gloves"],
    unique: true,
  },
];

// All items combined
export const allItems: ItemData[] = [...basicItems, ...combinedItems];

// Helper function to get item by ID
export function getItemById(itemId: string): ItemData | undefined {
  return allItems.find((item) => item.id === itemId);
}

// Helper function to get recipe for combining
export function findCombinedItem(
  item1Id: string,
  item2Id: string
): ItemData | undefined {
  return combinedItems.find((item) => {
    if (!item.recipe) return false;
    const [r1, r2] = item.recipe;
    return (
      (r1 === item1Id && r2 === item2Id) || (r1 === item2Id && r2 === item1Id)
    );
  });
}

// Helper function to check if an item can be combined with another
export function canCombineItems(item1Id: string, item2Id: string): boolean {
  // Only basic items can be combined
  const item1 = getItemById(item1Id);
  const item2 = getItemById(item2Id);

  if (!item1?.isBasic || !item2?.isBasic) return false;

  return !!findCombinedItem(item1Id, item2Id);
}

// Apply item stats to champion stats
export function applyItemStats(
  baseStats: Partial<ChessStats>,
  items: ItemData[]
): Partial<ChessStats> {
  const stats = { ...baseStats };

  items.forEach((item) => {
    item.effects.forEach((effect) => {
      const currentValue = (stats[effect.stat] as number) || 0;
      if (effect.type === "add") {
        (stats[effect.stat] as number) = currentValue + effect.value;
      } else if (effect.type === "multiply") {
        (stats[effect.stat] as number) = currentValue * effect.value;
      }
    });
  });

  return stats;
}
