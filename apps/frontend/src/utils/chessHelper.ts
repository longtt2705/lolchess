import { ChessPiece } from "@/hooks/useGame";

// Damage thresholds for unlocking Viktor modules
export const VIKTOR_DAMAGE_THRESHOLDS = [50, 150, 300];

const getTransformationIcon = (piece: ChessPiece) => {
  if (piece.name === "Nasus") {
    return "/icons/nasus_skill.webp";
  }
  return "/icons/transformation.webp";
};

export const getImageUrl = (piece: ChessPiece) => {
  if (piece.name === "Poro") {
    return "/icons/poro.png";
  }
  if (piece.name === "Super Minion") {
    return piece.blue
      ? "/icons/blue_super_minion.png"
      : "/icons/red_super_minion.png";
  }
  if (piece.name === "Melee Minion") {
    return piece.blue
      ? "/icons/blue_melee_minion.png"
      : "/icons/red_melee_minion.png";
  }
  if (piece.name === "Caster Minion") {
    return piece.blue
      ? "/icons/blue_caster_minion.png"
      : "/icons/red_caster_minion.png";
  }
  if (piece.name === "Siege Minion") {
    return piece.blue
      ? "/icons/blue_siege_minion.png"
      : "/icons/red_siege_minion.png";
  }
  if (piece.name === "Drake") {
    return "/icons/drake.webp";
  }
  if (piece.name === "Baron Nashor") {
    return "/icons/baron.webp";
  }
  if (piece.debuffs && piece.debuffs.length > 0) {
    if (piece.debuffs.some((debuff) => debuff.isTransformation)) {
      return getTransformationIcon(piece);
    }
  }
  return `/icons/${piece.name.toLowerCase()}.webp`;
};

// Helper function to check if a piece is a champion (can buy items)
export const isChampion = (piece: ChessPiece): boolean => {
  const nonChampionTypes = [
    "Poro",
    "Melee Minion",
    "Caster Minion",
    "Siege Minion",
    "Super Minion",
    "Drake",
    "Baron Nashor",
    "Sand Soldier",
  ];
  return !nonChampionTypes.includes(piece.name);
};

// Helper function to get stat icon path
export const getStatIcon = (stat: string): string => {
  const iconMap: { [key: string]: string } = {
    ad: "/icons/AD.svg",
    ap: "/icons/AP.svg",
    maxHp: "/icons/icon-hp.svg",
    physicalResistance: "/icons/Armor.svg",
    magicResistance: "/icons/MagicResist.svg",
    speed: "/icons/speed.png",
    attackRange: "/icons/Range.svg",
    sunder: "/icons/AS.svg",
    criticalChance: "/icons/CritChance.svg",
    criticalDamage: "/icons/CritDamage.svg",
    damageAmplification: "/icons/icon-da.png",
    cooldownReduction: "/icons/icon-cdr.webp",
    lifesteal: "/icons/icon-sv.png",
    hpRegen: "/icons/icon-hp-regen.png",
    durability: "/icons/icon-durability.png",
  };
  return iconMap[stat] || "/icons/AD.svg";
};

// Helper function to format numbers and avoid floating point precision issues
export const formatNumber = (value: number, decimals: number = 0): string => {
  // Round to avoid floating point precision issues
  const rounded =
    Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  // If it's a whole number, don't show decimals
  if (Math.abs(rounded % 1) < 0.0001) {
    return Math.round(rounded).toString();
  }
  // Otherwise, show up to the specified decimal places and remove trailing zeros
  return rounded.toFixed(decimals).replace(/\.?0+$/, "");
};

// Helper function to get skill state display for champions with payload-based mechanics
export const getSkillStateDisplay = (
  championName: string,
  skillPayload: any
) => {
  if (!skillPayload) return null;

  switch (championName) {
    case "Jhin":
      const jhinCount = skillPayload.attackCount || 0;
      const jhinProgress = jhinCount % 4;
      return {
        badge: `${jhinProgress}/4`,
        tooltip: `Attack Counter: ${jhinProgress}/4 attacks${jhinProgress === 3 ? " (Next attack is CRITICAL!)" : ""}`,
      };

    case "Nasus":
      const bonusDamage = skillPayload.bonusDamage || 0;
      return {
        badge: `+${bonusDamage}`,
        tooltip: `Siphoning Strike Bonus: +${bonusDamage} damage from kills`,
      };

    case "Tristana":
      const tristanaCount = skillPayload.attackCount || 0;
      const tristanaProgress = tristanaCount % 4;
      return {
        badge: `${tristanaProgress}/4`,
        tooltip: `Explosive Charge: ${tristanaProgress}/4 attacks${tristanaProgress === 3 ? " (Next attack explodes!)" : ""}`,
      };

    case "Tryndamere":
      const hasUsedRage = skillPayload.hasUsedUndyingRage || false;
      return {
        badge: hasUsedRage ? "✗" : "✓",
        tooltip: `Undying Rage: ${hasUsedRage ? "Already used this game" : "Available (will survive at 1 HP)"}`,
      };

    default:
      return null;
  }
};

export const getIconConfig = (debuff: any) => {
  const debuffIconMap: Record<string, { src: string; alt: string }> = {
    wounded: { src: "/icons/wounded.webp", alt: "Wounded" },
    burned: { src: "/icons/burned.jpg", alt: "Burned" },
    venom: { src: "/icons/SerpentsFang.png", alt: "Venom" },
    aura_evenshroud_armor_reduction: {
      src: "/icons/Evenshroud.png",
      alt: "Evenshroud",
    },
    titans_resolve: { src: "/icons/TitansResolve.png", alt: "Titans Resolve" },
    adaptive_helm_armor: {
      src: "/icons/AdaptiveHelm.png",
      alt: "Adaptive Helm",
    },
    adaptive_helm_mr: { src: "/icons/AdaptiveHelm.png", alt: "Adaptive Helm" },
    undying_rage: { src: "/icons/tryndamere_skill.webp", alt: "Undying Rage" },
    deaths_dance: { src: "/icons/DeathsDance.png", alt: "Deaths Dance" },
    fury_of_the_sands: { src: "/icons/nasus_skill.webp", alt: "Ascended Form" },
    fury_of_the_sands_slow: {
      src: "/icons/nasus_skill.webp",
      alt: "Sands of Ruin",
    },
    infernal_drake_buff: {
      src: "/icons/InfernalDragonSoul.png",
      alt: "Infernal Dragon Soul",
    },
    cloud_drake_buff: {
      src: "/icons/CloudDragonSoul.png",
      alt: "Cloud Dragon Soul",
    },
    mountain_drake_buff: {
      src: "/icons/MountainDragonSoul.png",
      alt: "Mountain Dragon Soul",
    },
    hextech_drake_buff: {
      src: "/icons/HextechDragonSoul.png",
      alt: "Hextech Dragon Soul",
    },
    ocean_drake_buff: {
      src: "/icons/OceanDragonSoul.png",
      alt: "Ocean Dragon Soul",
    },
    chemtech_drake_buff: {
      src: "/icons/ChemtechDragonSoul.png",
      alt: "Chemtech Dragon Soul",
    },
    elder_drake_buff: {
      src: "/icons/elder dragon.webp",
      alt: "Elder Dragon Buff",
    },
    sunlight: {
      src: "/icons/LeonaSunlight.png",
      alt: "Sunlight Mark",
    },
    "leona-slow": {
      src: "/icons/leona_skill.webp",
      alt: "Solar Flare Slow",
    }
  };

  let iconConfig = debuffIconMap[debuff.id];
  if (debuff.id.startsWith("deaths_dance_")) {
    iconConfig = { src: "/icons/DeathsDance.png", alt: "Deaths Dance" };
  } else if (debuff.id.startsWith("ghost_")) {
    iconConfig = { src: "/icons/Ghost.png", alt: "Ghost" };
  }
  return iconConfig;
};
