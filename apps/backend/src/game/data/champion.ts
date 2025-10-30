import { Aura, ChessStats, Skill } from "../game.schema";

export type ChampionData = {
  name: string;
  stats: Partial<ChessStats>;
  skill: Partial<Skill>;
  aura?: Partial<Aura>;
};

export const champions: ChampionData[] = [
  {
    name: "Aatrox",
    stats: {
      maxHp: 110,
      ad: 45,
      physicalResistance: 10,
      magicResistance: 5,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Deathbringer Stance",
      description:
        "Aatrox's next basic attack deals bonus 10% target's max health + 50% AP magic damage and heals him (10 + 25% of AP) HP.",
      cooldown: 5,
    },
  },
  {
    name: "Ahri",
    stats: {
      maxHp: 90,
      ad: 35,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      magicResistance: 5,
      physicalResistance: 5,
    },
    skill: {
      type: "active",
      name: "Spirit Rush",
      description:
        "Ahri dashes to a square, dealing (10 + 50% AP) magic damage and applying a slow and (5 + 10% AP) magic damage each turn to any piece at or adjacent to that square.",
      cooldown: 5,
      attackRange: {
        range: 8,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      targetTypes: "square",
    },
  },
  {
    name: "Garen",
    stats: {
      maxHp: 125,
      ad: 40,
      ap: 0,
      physicalResistance: 30,
      magicResistance: 15,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 3,
    },
    skill: {
      type: "passive",
      name: "Perseverance",
      description:
        "If Garen has not recently been struck by damage, he regenerates 10% of his total health each turn. Each turn, Garen gains 1 Armor (Max 30)",
      cooldown: 4,
      currentCooldown: 0,
    },
  },
  {
    name: "Janna",
    stats: {
      maxHp: 60,
      ad: 10,
      ap: 30,
      physicalResistance: 5,
      magicResistance: 5,
      speed: 2,
      goldValue: 45,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "active",
      name: "Tailwind",
      description:
        "Janna's allies gain +1 if adjacent to her. You can activate this skill to increase 2 Move Speed and give a shield of (20 + 100% AP) to nearby allies for 2 turns.",
      cooldown: 5,
      targetTypes: "none",
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    aura: {
      id: "janna_tailwind",
      name: "Tailwind",
      description: "Grants +1 to adjacent allied chess pieces",
      range: 1,
      effects: [{ stat: "speed", modifier: 1, type: "add", target: "allies" }],
      active: true,
      requiresAlive: true,
      duration: "permanent",
    },
  },
  {
    name: "Ashe",
    stats: {
      maxHp: 80,
      ad: 35,
      ap: 0,
      physicalResistance: 5,
      magicResistance: 5,
      attackRange: {
        range: 3,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Frost Shot",
      description:
        "Ashe's attacks slow their target, causing her to deal increased (20+10% of AP) physical damage to these targets.",
      cooldown: 0,
    },
  },
  {
    name: "Tristana",
    stats: {
      maxHp: 60,
      ad: 30,
      ap: 0,
      physicalResistance: 5,
      magicResistance: 5,
      attackRange: {
        range: 2, // Passive range (base is 2 when disabled)
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Draw a Bead",
      description:
        "Tristana's Attack Range gains 1 every 5 rounds (max 8). Every 4th attack deals bonus (10+50% of AP) physical damage to the target and his adjacent squares.",
      cooldown: 0,
    },
  },
  {
    name: "Blitzcrank",
    stats: {
      maxHp: 115,
      ad: 15,
      ap: 30,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      magicResistance: 10,
      physicalResistance: 10,
      hpRegen: 2,
    },
    skill: {
      type: "active",
      name: "Rocket Grab",
      description:
        "Blitzcrank launches a rocket diagonally, dealing (15 + 80% AP) magic damage and pulling the target to him.",
      cooldown: 4,
      attackRange: {
        range: 4,
        diagonal: true,
        horizontal: false,
        vertical: false,
      },
      targetTypes: "enemy",
    },
  },
  {
    name: "Kha'Zix",
    stats: {
      maxHp: 90,
      ad: 35,
      ap: 10,
      criticalChance: 20,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      magicResistance: 10,
      physicalResistance: 10,
    },
    skill: {
      type: "active",
      name: "Taste Their Fear",
      description:
        "Deals 20 + 80% AD + 50% AP physical damage to the target. Damage increased on Isolated targets.",
      cooldown: 4,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      targetTypes: "enemy",
    },
  },
  {
    name: "Zed",
    stats: {
      maxHp: 100,
      ad: 40,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      speed: 2,
    },
    skill: {
      type: "passive",
      name: "Contempt for the Weak",
      description:
        "Zed's basic attacks against low health targets deals bonus (10+10% of AP) magic damage.",
      cooldown: 0,
    },
  },
  {
    name: "Malphite",
    stats: {
      maxHp: 150,
      ad: 35,
      ap: 30,
      physicalResistance: 30,
      magicResistance: 10,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 2,
    },
    skill: {
      type: "passive",
      name: "Granite Shield",
      description:
        "If Malphite didn't get hit by damage for 2 turns, he gains a shield equal to (10+40% of AP)% of his max health. He gains 15 armor if having shield.",
      cooldown: 2,
      currentCooldown: 0,
    },
  },
  {
    name: "Sion",
    stats: {
      maxHp: 150,
      ad: 25,
      ap: 30,
      physicalResistance: 15,
      magicResistance: 10,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 3,
    },
    skill: {
      type: "passive",
      name: "Soul Furnace",
      description:
        "When Sion kills enemies, he passively gains maximum Health. He deals bonus (10 + 25% AP) of his max health magic damage to his target.",
      cooldown: 0,
    },
  },
  {
    name: "Jhin",
    stats: {
      maxHp: 44,
      ad: 44,
      ap: 4,
      physicalResistance: 4,
      magicResistance: 4,
      attackRange: {
        range: 4,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 4,
      criticalChance: 4,
      sunder: 4,
      lifesteal: 4,
      speed: 2,
    },
    skill: {
      type: "passive",
      name: "Whisper",
      description:
        "Every 4th attack deals critical damage and deals bonus (4+44% of AP + 44% of bonus AD) physical damage. When critical, Jhin gains +1 Move Speed for 2 turns.",
      cooldown: 0,
    },
  },
  {
    name: "Soraka",
    stats: {
      maxHp: 80,
      ad: 10,
      ap: 20,
      physicalResistance: 5,
      magicResistance: 5,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 5,
    },
    skill: {
      type: "active",
      name: "Astral Infusion",
      description:
        "Soraka sacrifices a 20% of her own health to heal another friendly champion. Heals for 20 + (10 + 10% of AP) of the target's max health.",
      cooldown: 3,
      attackRange: {
        range: 3,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      targetTypes: "ally",
    },
  },
  {
    name: "Nasus",
    stats: {
      maxHp: 115,
      ad: 35,
      ap: 10,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 2,
      lifesteal: 10,
    },
    skill: {
      type: "active",
      name: "Siphoning Strike",
      description:
        "Nasus strikes his foe, dealing (20 + 40% of AP + 100% of AD) magic damage and increasing 15 damage of his future Siphoning Strikes if he slays his target. Apply the attack's effect.",
      cooldown: 3,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      targetTypes: "enemy",
    },
  },
  {
    name: "Teemo",
    stats: {
      maxHp: 80,
      ad: 5,
      ap: 30,
      physicalResistance: 10,
      magicResistance: 5,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      speed: 3,
    },
    skill: {
      type: "passive",
      name: "Toxic Shot",
      description:
        "Teemo's basic attacks apply a debuff to the target, dealing more (5 + 60% of AP) magic damage and applying (5 + 25% of AP) magic damage each turn for 2 turns.",
      cooldown: 0,
    },
  },
  {
    name: "Rammus",
    stats: {
      maxHp: 120,
      ad: 15,
      ap: 20,
      physicalResistance: 35,
      magicResistance: 20,
      hpRegen: 2, // Rammus has passive healing
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Defensive Ball Curl",
      description:
        "Rammus returns damage to enemies that attack him based on his physical resistance. Heals for 10% of his physical resistance each turn.",
      cooldown: 0,
    },
  },
  {
    name: "Yasuo",
    stats: {
      maxHp: 95,
      ad: 45,
      ap: 10,
      sunder: 5,
      physicalResistance: 20,
      magicResistance: 10,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 2,
      criticalDamage: 125,
      criticalChance: 0,
    },
    skill: {
      type: "passive",
      name: "Way of the Wanderer",
      description:
        "Yasuo's Critical Strike Chance is doubled. After a Critical Strike, Yasuo gains (2 + 10% of AP) Sunder. The 50% redundant critical chance is converted to AD.",
      cooldown: 0,
    },
  },
  {
    name: "Tryndamere",
    stats: {
      maxHp: 100,
      ad: 45,
      ap: 0,
      criticalChance: 25,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      hpRegen: 2,
    },
    skill: {
      type: "passive",
      name: "Undying Rage",
      description:
        "The first time Tryndamere is slain, he will survive with 1 HP. His attack deals bonus 1 physical damage for each (10 - 5% of AP) HP he lost.",
      cooldown: 0,
    },
  },
  {
    name: "Viktor",
    stats: {
      maxHp: 75,
      ad: 10,
      ap: 30,
      criticalChance: 30,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 3,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "active",
      name: "Siphon Power",
      description:
        "Viktor deals (20 + 80% of AP) magic damage to a target, and empowers his next basic attack, dealing bonus (15 + 50% of AP) magic damage.",
      cooldown: 3,
      attackRange: {
        range: 3,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      targetTypes: "enemy",
    },
  },
  {
    name: "Twisted Fate",
    stats: {
      maxHp: 65,
      ad: 25,
      ap: 20,
      criticalChance: 15,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 3,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "active",
      name: "Wild Cards",
      description:
        "Throws (1+40% of AP) cards to a target and his adjacent enemies, each card deals (1 + 5% AP + 10% AD) magic damage to the target and his adjacent enemies.",
      cooldown: 5,
      attackRange: {
        range: 3,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
      targetTypes: "enemy",
    },
  },
];
