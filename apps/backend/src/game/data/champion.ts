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
      maxHp: 160,
      ad: 50,
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
        "Aatrox's next basic attack deals bonus 10% target's max health + 50% AP magic damage and heals him.",
      cooldown: 3,
    },
  },
  {
    name: "Ahri",
    stats: {
      maxHp: 130,
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
        "Ahri dashes to a square, dealing 10 + 50% AP magic damage and applying a slow and damage each turn to any piece at or adjacent to that square.",
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
      maxHp: 180,
      ad: 50,
      ap: 0,
      physicalResistance: 15,
      magicResistance: 15,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Perseverance",
      description:
        "If Garen has not recently been struck by damage or enemy abilities, he regenerates 10% of his total health each turn.",
      cooldown: 4,
      currentCooldown: 0,
    },
  },
  {
    name: "Janna",
    stats: {
      maxHp: 120,
      ad: 30,
      ap: 0,
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
        "Janna's allies gain +1 if adjacent to her. You can activate this skill to +2 + 20% of AP Move Speed of nearby allies for 2 turns.",
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
      maxHp: 100,
      ad: 35,
      ap: 0,
      physicalResistance: 5,
      magicResistance: 5,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Frost Shot",
      description:
        "Ashe's attacks slow their target, causing her to deal increased (10+10% of AP) physical damage to these targets.",
      cooldown: 0,
    },
  },
  {
    name: "Tristana",
    stats: {
      maxHp: 90,
      ad: 30,
      ap: 0,
      physicalResistance: 5,
      magicResistance: 5,
      attackRange: {
        range: 8,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Draw a Bead",
      description: "Increases Tristana's Attack Range to 8.",
      cooldown: 0,
    },
  },
  {
    name: "Blitzcrank",
    stats: {
      maxHp: 160,
      ad: 30,
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
      name: "Rocket Grab",
      description:
        "Blitzcrank launches a rocket, dealing 15 + 60% AP magic damage and pulling the target to him.",
      cooldown: 3,
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
      maxHp: 130,
      ad: 40,
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
      cooldown: 2,
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
      maxHp: 130,
      ad: 40,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
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
      ap: 0,
      physicalResistance: 30,
      magicResistance: 10,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Granite Shield",
      description:
        "Malphite gains 15 physical resistance. His attack range is increased by 1 and deals damage equal to (10+10% of AP) magic damage to his target.",
      cooldown: 0,
    },
  },
  {
    name: "Sion",
    stats: {
      maxHp: 180,
      ad: 30,
      ap: 0,
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
      name: "Soul Furnace",
      description:
        "When Sion kills enemies, he passively gains maximum Health.",
      cooldown: 0,
    },
  },
  {
    name: "Jhin",
    stats: {
      maxHp: 44,
      ad: 44,
      ap: 0,
      physicalResistance: 4,
      magicResistance: 4,
      attackRange: {
        range: 4,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Whisper",
      description: "Every 4th attack deals critical damage and +2 + 10% of AP Move Speed.",
      cooldown: 0,
    },
  },
  {
    name: "Soraka",
    stats: {
      maxHp: 100,
      ad: 30,
      ap: 0,
      physicalResistance: 5,
      magicResistance: 5,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "active",
      name: "Astral Infusion",
      description:
        "Soraka sacrifices a portion of her own health to heal another friendly champion. Heals for 20 + 10% of AP.",
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
      maxHp: 140,
      ad: 35,
      ap: 0,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "active",
      name: "Siphoning Strike",
      description:
        "Nasus strikes his foe, dealing 20 + 10% of AP magic damage and increasing the power of his future Siphoning Strikes if he slays his target.",
      cooldown: 2,
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
      maxHp: 100,
      ad: 30,
      ap: 0,
      physicalResistance: 5,
      magicResistance: 5,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Toxic Shot",
      description:
        "Teemo's basic attacks apply a debuff to the target, dealing (10+10% of AP) physical damage each turn.",
      cooldown: 0,
    },
  },
  {
    name: "Rammus",
    stats: {
      maxHp: 130,
      ad: 35,
      ap: 0,
      physicalResistance: 15,
      magicResistance: 10,
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
      maxHp: 130,
      ad: 45,
      ap: 0,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Way of the Wanderer",
      description:
        "Yasuo's Critical Strike Chance is doubled. After a Critical Strike, Yasuo gains (+3 + 10% of AP) Sunder.",
      cooldown: 0,
    },
  },
  {
    name: "Tryndamere",
    stats: {
      maxHp: 130,
      ad: 45,
      ap: 0,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Undying Rage",
      description:
        "The first time Tryndamere is slain, he will survive with 1 HP. His attack deals bonus (1 + 10% of AP) physical damage for each 3 HP he lost.",
      cooldown: 0,
    },
  },
  {
    name: "Viktor",
    stats: {
      maxHp: 110,
      ad: 30,
      ap: 0,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "active",
      name: "Siphon Power",
      description:
        "Viktor deals 20 + 10% of AP magic damage to a target, and empowers his next basic attack.",
      cooldown: 3,
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
    name: "Twisted Fate",
    stats: {
      maxHp: 110,
      ad: 30,
      ap: 0,
      physicalResistance: 10,
      magicResistance: 10,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    skill: {
      type: "passive",
      name: "Stacked Deck",
      description:
        "Twisted Fate deals bonus (10+10% of AP) magic damage. He earns more 10 gold for each enemy killed.",
      cooldown: 0,
    },
  },
];
