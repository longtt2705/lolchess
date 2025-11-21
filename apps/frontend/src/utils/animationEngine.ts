import { getSkillAnimationRenderer } from "../animations/SkillAnimator";
import { ChessPosition, GameState } from "../hooks/useGame";

export interface AnimationAction {
  id: string;
  type:
    | "move"
    | "attack"
    | "skill"
    | "damage"
    | "stat_change"
    | "death"
    | "buy_item";
  timestamp: number;
  delay: number; // When to start this animation (in ms from sequence start)
  duration: number; // How long the animation lasts
  data: any;
}

export interface MoveAnimationData {
  pieceId: string;
  fromPosition: ChessPosition;
  toPosition: ChessPosition;
}

export interface AttackAnimationData {
  attackerId: string;
  attackerPosition: ChessPosition;
  targetId: string;
  targetPosition: ChessPosition;
  damage?: number;
}

export interface SkillAnimationData {
  casterId: string;
  casterPosition: ChessPosition;
  skillName: string;
  targetPosition?: ChessPosition;
  targetId?: string;
  pulledToPosition?: ChessPosition; // For Rocket Grab: actual position the target was pulled to
  cardTargets?: Array<{
    targetId: string;
    targetPosition: ChessPosition;
    cardCount: number;
  }>; // For Twisted Fate: all targets hit by cards
  totalCardCount?: number; // For Twisted Fate: total number of cards thrown
}

export interface DamageAnimationData {
  pieceId: string;
  position: ChessPosition;
  damage: number;
  isDamage: boolean; // true for damage, false for heal
}

export interface StatChangeAnimationData {
  pieceId: string;
  position: ChessPosition;
  stat: string;
  oldValue: number;
  newValue: number;
}

export interface DeathAnimationData {
  pieceId: string;
  position: ChessPosition;
}

export interface ItemBuyAnimationData {
  targetId: string;
  itemId: string;
}

/**
 * Analyzes game state changes and generates a sequence of animations
 */
export class AnimationEngine {
  /**
   * Analyzes the lastAction from the game state and generates animations
   */
  static generateAnimationSequence(
    gameState: GameState,
    previousGameState: GameState | null
  ): AnimationAction[] {
    const animations: AnimationAction[] = [];

    if (!gameState.lastAction) {
      return animations;
    }

    const { lastAction } = gameState;
    let currentDelay = 0;

    // 1. Handle movement animation
    if (
      lastAction.actionType === "move_chess" &&
      lastAction.fromPosition &&
      lastAction.targetPosition
    ) {
      const piece = gameState.board.find((p) => p.id === lastAction.casterId);
      if (piece) {
        animations.push({
          id: `move_${lastAction.timestamp}`,
          type: "move",
          timestamp: lastAction.timestamp,
          delay: currentDelay,
          duration: 500,
          data: {
            pieceId: lastAction.casterId,
            fromPosition: lastAction.fromPosition,
            toPosition: lastAction.targetPosition,
          } as MoveAnimationData,
        });
        currentDelay += 500;
      }
    }

    // 2. Handle attack animation
    if (lastAction.actionType === "attack_chess" && lastAction.targetId) {
      const attacker = gameState.board.find(
        (p) => p.id === lastAction.casterId
      );

      if (attacker) {
        animations.push({
          id: `attack_${lastAction.timestamp}`,
          type: "attack",
          timestamp: lastAction.timestamp,
          delay: currentDelay,
          duration: 600,
          data: {
            attackerId: lastAction.casterId,
            attackerPosition: lastAction.casterPosition,
            targetId: lastAction.targetId,
            targetPosition: lastAction.targetPosition,
          } as AttackAnimationData,
        });
        currentDelay += 600;

        // Note: Damage numbers are handled by stat changes below, no need to add here
      }
    }

    // 3. Handle skill animation
    if (lastAction.actionType === "skill" && lastAction.skillName) {
      const caster = gameState.board.find((p) => p.id === lastAction.casterId);

      if (caster) {
        // Get skill-specific animation renderer to use its duration
        const skillRenderer = getSkillAnimationRenderer(lastAction.skillName);

        // Prepare the skill animation config data
        const skillAnimationData = {
          casterId: lastAction.casterId,
          casterPosition: lastAction.casterPosition,
          skillName: lastAction.skillName,
          targetPosition: lastAction.targetPosition,
          targetId: lastAction.targetId, // Add targetId for skill animations
          pulledToPosition: lastAction.pulledToPosition, // Add pulledToPosition for Rocket Grab
          cardTargets: (lastAction as any).cardTargets, // Add cardTargets for Twisted Fate
          totalCardCount: (lastAction as any).totalCardCount, // Add totalCardCount for Twisted Fate
        } as SkillAnimationData;

        // Calculate duration - support both static and dynamic duration
        const calculatedDuration =
          typeof skillRenderer.duration === "function"
            ? skillRenderer.duration(skillAnimationData)
            : skillRenderer.duration;

        animations.push({
          id: `skill_${lastAction.timestamp}`,
          type: "skill",
          timestamp: lastAction.timestamp,
          delay: currentDelay,
          duration: calculatedDuration, // Use calculated duration
          data: skillAnimationData,
        });
        currentDelay += calculatedDuration;
      }
    }

    // 4. Handle self-damage (e.g., Dr. Mundo's sacrifice)
    // This needs to be shown BEFORE stat changes so it doesn't get hidden by heals
    if (lastAction.selfDamage) {
      Object.entries(lastAction.selfDamage).forEach(([pieceId, damage]) => {
        const piece = gameState.board.find((p) => p.id === pieceId);
        if (piece && damage > 0) {
          animations.push({
            id: `self_damage_${pieceId}_${lastAction.timestamp}`,
            type: "damage",
            timestamp: lastAction.timestamp,
            delay: currentDelay,
            duration: 1200,
            data: {
              pieceId,
              position: piece.position,
              damage: Math.round(damage),
              isDamage: true,
            } as DamageAnimationData,
          });
        }
      });

      // Add slight delay after self-damage
      if (Object.keys(lastAction.selfDamage).length > 0) {
        currentDelay += 300;
      }
    }

    // 5. Handle stat changes (with floating text)
    if (lastAction.statChanges) {
      Object.entries(lastAction.statChanges).forEach(([key, change]) => {
        const [pieceId, stat] = key.split(".");
        const piece = gameState.board.find((p) => p.id === pieceId);

        if (piece && stat) {
          // Only show HP changes as damage/heal, other stats as stat changes
          if (stat === "hp") {
            const hpDiff = change.newValue - change.oldValue;
            // Only show NET stat changes if not already covered by selfDamage
            // Skip showing if the piece had selfDamage and the change is negative (already shown)
            const hasSelfDamage = lastAction.selfDamage && lastAction.selfDamage[pieceId];
            if (hpDiff !== 0 && !(hasSelfDamage && hpDiff < 0)) {
              animations.push({
                id: `damage_${pieceId}_${lastAction.timestamp}`,
                type: "damage",
                timestamp: lastAction.timestamp,
                delay: currentDelay,
                duration: 1200,
                data: {
                  pieceId,
                  position: piece.position,
                  damage: Math.abs(hpDiff),
                  isDamage: hpDiff < 0,
                } as DamageAnimationData,
              });
            }
          } else {
            // Show other stat changes
            animations.push({
              id: `stat_${pieceId}_${stat}_${lastAction.timestamp}`,
              type: "stat_change",
              timestamp: lastAction.timestamp,
              delay: currentDelay,
              duration: 1500,
              data: {
                pieceId,
                position: piece.position,
                stat,
                oldValue: change.oldValue,
                newValue: change.newValue,
              } as StatChangeAnimationData,
            });
          }
        }
      });

      // Add delay if there were stat changes
      if (Object.keys(lastAction.statChanges).length > 0) {
        currentDelay += 400;
      }
    }

    // 6. Handle death animations
    if (lastAction.killedPieceIds && lastAction.killedPieceIds.length > 0) {
      lastAction.killedPieceIds.forEach((pieceId) => {
        // Try to get the piece's last known position from previousGameState
        let position: ChessPosition | undefined;
        if (previousGameState) {
          const deadPiece = previousGameState.board.find(
            (p) => p.id === pieceId
          );
          if (deadPiece) {
            position = deadPiece.position;
          }
        }

        if (
          !position &&
          lastAction.targetId === pieceId &&
          lastAction.targetPosition
        ) {
          position = lastAction.targetPosition;
        }

        if (position) {
          animations.push({
            id: `death_${pieceId}_${lastAction.timestamp}`,
            type: "death",
            timestamp: lastAction.timestamp,
            delay: currentDelay,
            duration: 800,
            data: {
              pieceId,
              position,
            } as DeathAnimationData,
          });
        }
      });

      if (lastAction.killedPieceIds.length > 0) {
        currentDelay += 800;
      }
    }

    // 6. Handle item purchase
    if (lastAction.actionType === "buy_item" && lastAction.itemId) {
      animations.push({
        id: `buy_item_${lastAction.timestamp}`,
        type: "buy_item",
        timestamp: lastAction.timestamp,
        delay: currentDelay,
        duration: 500,
        data: {
          targetId: lastAction.targetId,
          itemId: lastAction.itemId,
        } as ItemBuyAnimationData,
      });
    }

    return animations;
  }

  /**
   * Check if animations should be played for this game state update
   */
  static shouldPlayAnimations(
    gameState: GameState,
    previousGameState: GameState | null
  ): boolean {
    // Don't play animations if there's no previous state (initial load)
    if (!previousGameState) {
      return false;
    }

    // Don't play animations if there's no lastAction
    if (!gameState.lastAction) {
      return false;
    }

    // Don't play animations if the lastAction timestamp is the same as before
    if (
      previousGameState.lastAction &&
      previousGameState.lastAction.timestamp === gameState.lastAction.timestamp
    ) {
      return false;
    }

    return true;
  }
}
