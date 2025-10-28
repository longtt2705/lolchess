import { SkillAnimationRenderer } from "./types";
import { genericSkillRenderer } from "./skills/genericSkill";
import { rocketGrabRenderer } from "./skills/rocketGrab";
import { spiritRushRenderer } from "./skills/spiritRush";
import { cardThrowRenderer } from "./skills/cardThrow";

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
