import { ChessStats } from "../game.schema";

export interface ItemEffect {
  stat: keyof ChessStats;
  value: number;
  type: "add" | "multiply";
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
    description: "Grants bonus Attack Damage",
    cost: 50,
    icon: "/icons/BFSword.png",
    effects: [{ stat: "ad", value: 10, type: "add" }],
    isBasic: true,
  },
  {
    id: "recurve_bow",
    name: "Recurve Bow",
    description: "Grants bonus Attack Damage",
    cost: 50,
    icon: "/icons/RecurveBow.png",
    effects: [{ stat: "ad", value: 5, type: "add" }],
    isBasic: true,
  },
  {
    id: "needlessly_rod",
    name: "Needlessly Large Rod",
    description: "Grants bonus Ability Power",
    cost: 50,
    icon: "/icons/NeedlesslyLargeRod.png",
    effects: [{ stat: "ap", value: 10, type: "add" }],
    isBasic: true,
  },
  {
    id: "tear",
    name: "Tear of the Goddess",
    description: "Grants bonus maximum Health",
    cost: 50,
    icon: "/icons/TearoftheGoddess.png",
    effects: [{ stat: "maxHp", value: 20, type: "add" }],
    isBasic: true,
  },
  {
    id: "chain_vest",
    name: "Chain Vest",
    description: "Grants bonus Physical Resistance",
    cost: 50,
    icon: "/icons/ChainVest.png",
    effects: [{ stat: "physicalResistance", value: 10, type: "add" }],
    isBasic: true,
  },
  {
    id: "negatron_cloak",
    name: "Negatron Cloak",
    description: "Grants bonus Magic Resistance",
    cost: 50,
    icon: "/icons/NegatronCloak.png",
    effects: [{ stat: "magicResistance", value: 10, type: "add" }],
    isBasic: true,
  },
  {
    id: "giants_belt",
    name: "Giant's Belt",
    description: "Grants a large amount of bonus Health",
    cost: 50,
    icon: "/icons/GiantsBelt.png",
    effects: [{ stat: "maxHp", value: 30, type: "add" }],
    isBasic: true,
  },
  {
    id: "sparring_gloves",
    name: "Sparring Gloves",
    description: "Grants bonus to all stats",
    cost: 50,
    icon: "/icons/SparringGloves.png",
    effects: [
      { stat: "ad", value: 3, type: "add" },
      { stat: "ap", value: 3, type: "add" },
    ],
    isBasic: true,
  },
];

// Combined Items (Made from 2 basic items)
export const combinedItems: ItemData[] = [
  // B.F. Sword Combinations
  {
    id: "infinity_edge",
    name: "Infinity Edge",
    description: "Grants massive Attack Damage bonus",
    cost: 0,
    icon: "/icons/InfinityEdge.png",
    effects: [{ stat: "ad", value: 25, type: "add" }],
    isBasic: false,
    recipe: ["bf_sword", "bf_sword"],
    unique: true,
  },
  {
    id: "giant_slayer",
    name: "Giant Slayer",
    description: "Grants Attack Damage and attack speed",
    cost: 0,
    icon: "/icons/GiantSlayer.png",
    effects: [{ stat: "ad", value: 15, type: "add" }],
    isBasic: false,
    recipe: ["bf_sword", "recurve_bow"],
  },
  {
    id: "hextech_gunblade",
    name: "Hextech Gunblade",
    description: "Grants Attack Damage and Ability Power",
    cost: 0,
    icon: "/icons/HextechGunblade.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "ap", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "needlessly_rod"],
  },
  {
    id: "bloodthirster",
    name: "Bloodthirster",
    description: "Grants Attack Damage and maximum Health",
    cost: 0,
    icon: "/icons/Bloodthirster.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "maxHp", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "tear"],
  },
  {
    id: "edge_of_night",
    name: "Edge of Night",
    description: "Grants Attack Damage and Physical Resistance",
    cost: 0,
    icon: "/icons/EdgeOfNight.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "physicalResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "chain_vest"],
  },
  {
    id: "quicksilver",
    name: "Quicksilver",
    description: "Grants Attack Damage and Magic Resistance",
    cost: 0,
    icon: "/icons/quicksilver.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "magicResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "negatron_cloak"],
  },
  {
    id: "sterak_gage",
    name: "Sterak's Gage",
    description: "Grants Attack Damage and massive Health",
    cost: 0,
    icon: "/icons/sterak_gage.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "maxHp", value: 35, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "giants_belt"],
  },
  {
    id: "last_whisper",
    name: "Last Whisper",
    description: "Grants Attack Damage and Sunder",
    cost: 0,
    icon: "/icons/LastWhisper.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "sunder", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "pickaxe"],
  },
  {
    id: "infinity_blade",
    name: "Infinity Blade",
    description: "Grants Attack Damage and Critical Chance",
    cost: 0,
    icon: "/icons/InfinityBlade.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "cloak"],
  },
  {
    id: "deadly_force",
    name: "Deadly Force",
    description: "Grants Attack Damage and Critical Damage",
    cost: 0,
    icon: "/icons/DeadlyForce.png",
    effects: [
      { stat: "ad", value: 12, type: "add" },
      { stat: "criticalDamage", value: 30, type: "add" },
    ],
    isBasic: false,
    recipe: ["bf_sword", "gloves"],
  },
  {
    id: "divine_sunderer",
    name: "Divine Sunderer",
    description: "Grants balanced offensive stats",
    cost: 0,
    icon: "/icons/DivineSunderer.png",
    effects: [
      { stat: "ad", value: 10, type: "add" },
      { stat: "ap", value: 5, type: "add" },
      { stat: "sunder", value: 5, type: "add" },
    ],
    isBasic: false,
    recipe: ["sparring_gloves", "pickaxe"],
  },
  {
    id: "phantom_dancer",
    name: "Phantom Dancer",
    description: "Grants Critical Chance and Attack Speed",
    cost: 0,
    icon: "/icons/PhantomDancer.png",
    effects: [
      { stat: "ad", value: 7, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "cloak"],
  },
  {
    id: "jeweled_gauntlet",
    name: "Jeweled Gauntlet",
    description: "Grants Ability Power and Critical Chance",
    cost: 0,
    icon: "/icons/JeweledGauntlet.png",
    effects: [
      { stat: "ap", value: 12, type: "add" },
      { stat: "criticalChance", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "cloak"],
  },
  {
    id: "armor_shredder",
    name: "Armor Shredder",
    description: "Grants double Sunder bonus",
    cost: 0,
    icon: "/icons/ArmorShredder.png",
    effects: [{ stat: "sunder", value: 25, type: "add" }],
    isBasic: false,
    recipe: ["pickaxe", "pickaxe"],
    unique: true,
  },
  {
    id: "critical_edge",
    name: "Critical Edge",
    description: "Grants massive Critical Chance",
    cost: 0,
    icon: "/icons/CriticalEdge.png",
    effects: [{ stat: "criticalChance", value: 50, type: "add" }],
    isBasic: false,
    recipe: ["cloak", "cloak"],
    unique: true,
  },
  {
    id: "executioners_calling",
    name: "Executioner's Calling",
    description: "Grants massive Critical Damage",
    cost: 0,
    icon: "/icons/ExecutionersCalling.png",
    effects: [{ stat: "criticalDamage", value: 60, type: "add" }],
    isBasic: false,
    recipe: ["gloves", "gloves"],
    unique: true,
  },

  // Recurve Bow Combinations
  {
    id: "statikk_shiv",
    name: "Statikk Shiv",
    description: "Grants double attack speed bonus",
    cost: 0,
    icon: "/icons/statikk_shiv.png",
    effects: [{ stat: "ad", value: 12, type: "add" }],
    isBasic: false,
    recipe: ["recurve_bow", "recurve_bow"],
    unique: true,
  },
  {
    id: "guinsoo_rageblade",
    name: "Guinsoo's Rageblade",
    description: "Grants attack speed and Ability Power",
    cost: 0,
    icon: "/icons/guinsoo_rageblade.png",
    effects: [
      { stat: "ad", value: 7, type: "add" },
      { stat: "ap", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "needlessly_rod"],
  },
  {
    id: "titans_resolve",
    name: "Titan's Resolve",
    description: "Grants attack speed and Health",
    cost: 0,
    icon: "/icons/titans_resolve.png",
    effects: [
      { stat: "ad", value: 7, type: "add" },
      { stat: "maxHp", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "tear"],
  },
  {
    id: "runaans_hurricane",
    name: "Runaan's Hurricane",
    description: "Grants attack speed and Physical Resistance",
    cost: 0,
    icon: "/icons/runaans_hurricane.png",
    effects: [
      { stat: "ad", value: 7, type: "add" },
      { stat: "physicalResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "chain_vest"],
  },
  {
    id: "zeke_herald",
    name: "Zeke's Herald",
    description: "Grants attack speed and Magic Resistance",
    cost: 0,
    icon: "/icons/zeke_herald.png",
    effects: [
      { stat: "ad", value: 7, type: "add" },
      { stat: "magicResistance", value: 12, type: "add" },
    ],
    isBasic: false,
    recipe: ["recurve_bow", "negatron_cloak"],
  },

  // Needlessly Large Rod Combinations
  {
    id: "rabadon_deathcap",
    name: "Rabadon's Deathcap",
    description: "Grants massive Ability Power",
    cost: 0,
    icon: "/icons/rabadon_deathcap.png",
    effects: [{ stat: "ap", value: 30, type: "add" }],
    isBasic: false,
    recipe: ["needlessly_rod", "needlessly_rod"],
    unique: true,
  },
  {
    id: "archangel_staff",
    name: "Archangel's Staff",
    description: "Grants Ability Power and Health",
    cost: 0,
    icon: "/icons/archangel_staff.png",
    effects: [
      { stat: "ap", value: 12, type: "add" },
      { stat: "maxHp", value: 25, type: "add" },
    ],
    isBasic: false,
    recipe: ["needlessly_rod", "tear"],
  },
  {
    id: "morellonomicon",
    name: "Morellonomicon",
    description: "Grants Ability Power and Physical Resistance",
    cost: 0,
    icon: "/icons/morellonomicon.png",
    effects: [
      { stat: "ap", value: 12, type: "add" },
      { stat: "physicalResistance", value: 12, type: "add" },
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
    icon: "/icons/gargoyle_stoneplate.png",
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
    description: "Grants massive Magic Resistance",
    cost: 0,
    icon: "/icons/dragon_claw.png",
    effects: [{ stat: "magicResistance", value: 25, type: "add" }],
    isBasic: false,
    recipe: ["negatron_cloak", "negatron_cloak"],
    unique: true,
  },

  // Giant's Belt Combinations
  {
    id: "warmog_armor",
    name: "Warmog's Armor",
    description: "Grants enormous Health",
    cost: 0,
    icon: "/icons/warmog_armor.png",
    effects: [{ stat: "maxHp", value: 75, type: "add" }],
    isBasic: false,
    recipe: ["giants_belt", "giants_belt"],
    unique: true,
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
