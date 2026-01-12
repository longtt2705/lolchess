import { SkillAnimationRenderer } from "./types";
import { genericSkillRenderer } from "./skills/genericSkill";
import { rocketGrabRenderer } from "./skills/rocketGrab";
import { spiritRushRenderer } from "./skills/spiritRush";
import { cardThrowRenderer } from "./skills/cardThrow";
import { arcaneShiftRenderer } from "./skills/arcaneShift";
import { tasteTheirFearRenderer } from "./skills/tasteTheirFear";
import { infectedBonesawRenderer } from "./skills/infectedBonesaw";
import { deathMarkRenderer } from "./skills/deathMark";
import { soulFurnaceRenderer } from "./skills/soulFurnace";
import { judgmentRenderer } from "./skills/judgment";
import { wayOfTheWandererRenderer } from "./skills/wayOfTheWanderer";
import { ariseRenderer } from "./skills/arise";
import { siphonPowerRenderer } from "./skills/siphonPower";
import { furyOfTheSandsRenderer } from "./skills/furyOfTheSands";
import { criticalFlankRenderer } from "./skills/criticalFlank";
import { flashRenderer } from "./skills/flash";
import { ghostRenderer } from "./skills/ghost";
import { healRenderer } from "./skills/heal";
import { barrierRenderer } from "./skills/barrier";
import { smiteRenderer } from "./skills/smite";

/**
 * Registry mapping skill names to their animation renderers
 * Add new skill animations here to make them available
 */
const skillAnimationRegistry: Record<string, SkillAnimationRenderer> = {
  // Blitzcrank
  "Rocket Grab": rocketGrabRenderer,

  // Ahri
  "Spirit Rush": spiritRushRenderer,

  // Twisted Fate
  "Wild Cards": cardThrowRenderer,

  // Ezreal
  "Arcane Shift": arcaneShiftRenderer,

  // Kha'Zix
  "Taste Their Fear": tasteTheirFearRenderer,

  // Dr. Mundo
  "Infected Bonesaw": infectedBonesawRenderer,

  // Zed
  "Death Mark": deathMarkRenderer,

  // Sion
  "Soul Furnace": soulFurnaceRenderer,

  // Garen
  "Judgment": judgmentRenderer,

  // Yasuo
  "Way of the Wanderer": wayOfTheWandererRenderer,

  // Azir
  "Arise": ariseRenderer,

  // Viktor
  "Siphon Power": siphonPowerRenderer,

  // Nasus
  "Fury of the Sands": furyOfTheSandsRenderer,

  // Minions (Melee Minion and Caster Minion)
  "The Critical Flank": criticalFlankRenderer,

  // Summoner Spells
  "Flash": flashRenderer,
  "Ghost": ghostRenderer,
  "Heal": healRenderer,
  "Barrier": barrierRenderer,
  "Smite": smiteRenderer,

  // Add more skills here as they're implemented
  // 'Skill Name': skillRenderer,
};

/**
 * Get the animation renderer for a specific skill
 * Falls back to generic animation if skill-specific one doesn't exist
 */
export const getSkillAnimationRenderer = (
  skillName: string
): SkillAnimationRenderer => {
  const renderer = skillAnimationRegistry[skillName];

  if (renderer) {
    return renderer;
  }

  // Fallback to generic animation
  console.log(
    `No custom animation found for skill: ${skillName}, using generic animation`
  );
  return genericSkillRenderer;
};

/**
 * Register a new skill animation at runtime (for dynamic loading)
 */
export const registerSkillAnimation = (
  skillName: string,
  renderer: SkillAnimationRenderer
): void => {
  skillAnimationRegistry[skillName] = renderer;
};

/**
 * Check if a skill has a custom animation
 */
export const hasCustomAnimation = (skillName: string): boolean => {
  return skillName in skillAnimationRegistry;
};
