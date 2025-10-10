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
    effects: [{ stat: "ap", value: 10, type: "add" }],
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
    effects: [{ stat: "physicalResistance", value: 10, type: "add" }],
    isBasic: true,
  },
  {
    id: "negatron_cloak",
    name: "Negatron Cloak",
    description: "",
    cost: 50,
    icon: "/icons/NegatronCloak.png",
    effects: [{ stat: "magicResistance", value: 10, type: "add" }],
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
      { stat: "criticalChance", value: 15, type: "add" },
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
      { stat: "ap", value: 15, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "needlessly_rod"],
  },
  {
    id: "bloodthirster",
    name: "Bloodthirster",
    description: "Gains additional 25% lifesteal effect when HP is below 25%",
    cost: 0,
    icon: "/icons/Bloodthirster.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "lifesteal", value: 25, type: "add" },
      {
        stat: "lifesteal",
        value: 25,
        type: "add",
        condition: (chess) =>
          chess.chess.stats.hp < chess.chess.stats.maxHp * 0.25,
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
      { stat: "ad", value: 12, type: "add" },
      { stat: "physicalResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "chain_vest"],
    unique: true,
  },
  {
    id: "sterak_gage",
    name: "Sterak's Gage",
    description: "At 40% Health, gain a shield equal to 50% of the wearer's maximum Health that decays over 3 turns.",
    cost: 0,
    icon: "/icons/SteraksGage.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "giants_belt"],
    unique: true,
  },
  {
    id: "spear_of_shojin",
    name: "Spear of Shojin",
    description: "Reduce 0.5 rounds of cooldown of skill for each attack.",
    cost: 0,
    icon: "/icons/SpearofShojin.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "cooldownReduction", value: 10, type: "add" },
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
      { stat: "ad", value: 25, type: "add" },
      { stat: "damageAmplification", value: 10, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "bf_sword"],
    unique: true,
  },

  // Recurve Bow Combinations
  {
    id: "red_buff",
    name: "Red Buff",
    description: "Deal damage will Burn and Wound enemies for 3 turns.",
    cost: 0,
    icon: "/icons/RedBuff.png",
    effects: [
      { stat: "sunder", value: 30, type: "add" },
      { stat: "damageAmplification", value: 3, type: "add" },
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
    icon: "/icons/GuinsooRageblade.png",
    effects: [
      { stat: "sunder", value: 17, type: "add" },
      { stat: "ap", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "needlessly_rod"],
  },
  {
    id: "titans_resolve",
    name: "Titan's Resolve",
    description: "Each times being attacked, grant 5 damage amplification + armor + magic resistance for 3 turns. (Max 4 times)",
    cost: 0,
    icon: "/icons/TitansResolve.png",
    effects: [
      { stat: "sunder", value: 18, type: "add" },
      { stat: "physicalResistance", value: 12, type: "add" },
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
      { stat: "sunder", value: 18, type: "add" },
      { stat: "magicResistance", value: 12, type: "add" },
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
      { stat: "sunder", value: 18, type: "add" },
      { stat: "cooldownReduction", value: 10, type: "add" },
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
      { stat: "sunder", value: 18, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "sparring_gloves"],
  },

  // Needlessly Large Rod Combinations
  {
    id: "rabadon_deathcap",
    name: "Rabadon's Deathcap",
    description: "",
    cost: 0,
    icon: "/icons/RabadonsDeathcap.png",
    effects: [
      { stat: "ap", value: 25, type: "add" },
      { stat: "damageAmplification", value: 10, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "needlessly_rod"],
    unique: true,
  },
  {
    id: "archangel_staff",
    name: "Archangel's Staff",
    description: "Each times using an active skill, grant 5 permanent Ability Power.",
    cost: 0,
    icon: "/icons/ArchangelsStaff.png",
    effects: [
      { stat: "ap", value: 12, type: "add" },
      { stat: "cooldownReduction", value: 10, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "tear"],
  },
  {
    id: "crownguard",
    name: "Crownguard",
    description: "Immidiate gain a 25% max Health Shield.",
    cost: 0,
    icon: "/icons/Crownguard.png",
    effects: [
      { stat: "ap", value: 15, type: "add" },
      { stat: "physicalResistance", value: 15, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "chain_vest"],
  },
  {
    id: "ionic_spark",
    name: "Ionic Spark",
    description: "Grants Ability Power and Magic Resistance",
    cost: 0,
    icon: "/icons/ionic_spark.png",
    effects: [
      { stat: "ap", value: 12, type: "add" },
      { stat: "magicResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "negatron_cloak"],
  },

  // Chain Vest Combinations
  {
    id: "bramble_vest",
    name: "Bramble Vest",
    description: "Grants massive Physical Resistance",
    cost: 0,
    icon: "/icons/bramble_vest.png",
    effects: [{ stat: "physicalResistance", value: 25, type: "add" }],
    isBasic: false,
    recipe: ["chain_vest", "chain_vest"],
    unique: true,
  },
  {
    id: "gargoyle_stoneplate",
    name: "Gargoyle Stoneplate",
    description: "Grants Physical and Magic Resistance",
    cost: 0,
    icon: "/icons/GargoyleStoneplate.png",
    effects: [
      { stat: "physicalResistance", value: 15, type: "add" },
      { stat: "magicResistance", value: 15, type: "add" },
    ],
    isBasic: false,
    recipe: ["chain_vest", "negatron_cloak"],
  },
  {
    id: "sunfire_cape",
    name: "Sunfire Cape",
    description: "Grants Physical Resistance and Health",
    cost: 0,
    icon: "/icons/sunfire_cape.png",
    effects: [
      { stat: "physicalResistance", value: 12, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
    ],
    isBasic: false,
    recipe: ["chain_vest", "giants_belt"],
  },

  // Negatron Cloak Combinations
  {
    id: "dragon_claw",
    name: "Dragon's Claw",
    description: "+15 more magic resistance when HP is below 40%",
    cost: 0,
    icon: "/icons/DragonsClaw.png",
    effects: [
      { stat: "magicResistance", value: 25, type: "add" },
      {
        stat: "magicResistance",
        value: 15,
        type: "add",
        condition: (chess) =>
          chess.chess.stats.hp < chess.chess.stats.maxHp * 0.4,
      },
    ],
    isBasic: false,
    recipe: ["negatron_cloak", "negatron_cloak"],
    unique: true,
  },
  {
    id: "quicksilver",
    name: "Quicksilver",
    description: "Resistant to all active debuffs for 3 turns",
    cost: 0,
    icon: "/icons/Quicksilver.png",
    effects: [
      { stat: "sunder", value: 10, type: "add" },
      { stat: "magicResistance", value: 12, type: "add" },
      { stat: "criticalChance", value: 20, type: "add" },
    ],
    isBasic: false,
    recipe: ["sparring_gloves", "negatron_cloak"],
    unique: true,
  },

  // Giant's Belt Combinations
  {
    id: "warmog_armor",
    name: "Warmog's Armor",
    description: "Grants 10% Maximum Health",
    cost: 0,
    icon: "/icons/WarmogsArmor.png",
    effects: [
      { stat: "maxHp", value: 50, type: "add" },
      { stat: "maxHp", value: 1.1, type: "multiply" },
    ],
    isBasic: false,
    recipe: ["giants_belt", "giants_belt"],
  },

  // Tear Combinations
  {
    id: "blue_buff",
    name: "Blue Buff",
    description: "Grants Health and sustain",
    cost: 0,
    icon: "/icons/blue_buff.png",
    effects: [{ stat: "maxHp", value: 50, type: "add" }],
    isBasic: false,
    recipe: ["tear", "tear"],
    unique: true,
  },
  {
    id: "redemption",
    name: "Redemption",
    description: "Grants Health and Physical Resistance",
    cost: 0,
    icon: "/icons/redemption.png",
    effects: [
      { stat: "maxHp", value: 25, type: "add" },
      { stat: "physicalResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["tear", "chain_vest"],
  },
  {
    id: "chalice_of_power",
    name: "Chalice of Power",
    description: "Grants Health and Magic Resistance",
    cost: 0,
    icon: "/icons/chalice_of_power.png",
    effects: [
      { stat: "maxHp", value: 25, type: "add" },
      { stat: "magicResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["tear", "negatron_cloak"],
  },
  {
    id: "protector_vow",
    name: "Protector's Vow",
    description: "Grants massive Health bonus",
    cost: 0,
    icon: "/icons/protector_vow.png",
    effects: [{ stat: "maxHp", value: 60, type: "add" }],
    isBasic: false,
    recipe: ["tear", "giants_belt"],
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
