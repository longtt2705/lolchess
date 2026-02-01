import {
  Game,
  GameEngine,
  GameEvent,
  EventPayload,
  Chess,
  getPlayerPieces,
  getPieceAtPosition,
  Square,
} from "@lolchess/game-engine";
import { ThreatEvaluator } from "../evaluation/ThreatEvaluator";
import { MaterialEvaluator } from "../evaluation/MaterialEvaluator";

/**
 * Strategy for summoner spell usage
 * 
 * Evaluates when and which summoner spell to use based on:
 * - Piece threat level (prioritize Poro and high-value pieces)
 * - HP thresholds (emergency situations)
 * - Positioning opportunities (Flash for escape or engage)
 * - Objective control (Smite for securing kills)
 */
export class SummonerSpellStrategy {
  private threatEvaluator: ThreatEvaluator;

  constructor(private gameEngine: GameEngine) {
    this.threatEvaluator = new ThreatEvaluator(
      gameEngine,
      new MaterialEvaluator()
    );
  }

  /**
   * Check if any summoner spell should be used
   */
  shouldUseSummonerSpell(game: Game, playerId: string): boolean {
    if (game.hasUsedSummonerSpellThisTurn) return false;

    const pieces = this.getEligiblePieces(game, playerId);
    return pieces.some((piece) => {
      if (!piece.summonerSpell || piece.summonerSpell.currentCooldown > 0) {
        return false;
      }

      switch (piece.summonerSpell.type) {
        case "Flash":
          return this.evaluateFlash(game, piece, playerId).score > 0;
        case "Ghost":
          return this.evaluateGhost(game, piece, playerId) > 0;
        case "Heal":
          return this.evaluateHeal(game, piece, playerId) > 0;
        case "Barrier":
          return this.evaluateBarrier(game, piece, playerId) > 0;
        case "Smite":
          return this.evaluateSmite(game, piece, playerId).score > 0;
        default:
          return false;
      }
    });
  }

  /**
   * Recommend the best summoner spell to use
   * Returns the spell action with highest priority
   */
  recommendSummonerSpell(
    game: Game,
    playerId: string
  ): EventPayload | null {
    if (game.hasUsedSummonerSpellThisTurn) return null;

    const pieces = this.getEligiblePieces(game, playerId);
    let bestAction: EventPayload | null = null;
    let bestScore = 0;

    for (const piece of pieces) {
      if (!piece.summonerSpell || piece.summonerSpell.currentCooldown > 0) {
        continue;
      }

      let score = 0;
      let action: EventPayload | null = null;

      switch (piece.summonerSpell.type) {
        case "Flash": {
          const flashEval = this.evaluateFlash(game, piece, playerId);
          score = flashEval.score;
          if (score > 0 && flashEval.target) {
            action = {
              playerId,
              event: GameEvent.USE_SUMMONER_SPELL,
              casterPosition: { x: piece.position.x, y: piece.position.y },
              targetPosition: flashEval.target,
            };
          }
          break;
        }

        case "Ghost": {
          score = this.evaluateGhost(game, piece, playerId);
          if (score > 0) {
            action = {
              playerId,
              event: GameEvent.USE_SUMMONER_SPELL,
              casterPosition: { x: piece.position.x, y: piece.position.y },
              targetPosition: { x: piece.position.x, y: piece.position.y },
            };
          }
          break;
        }

        case "Heal": {
          score = this.evaluateHeal(game, piece, playerId);
          if (score > 0) {
            action = {
              playerId,
              event: GameEvent.USE_SUMMONER_SPELL,
              casterPosition: { x: piece.position.x, y: piece.position.y },
              targetPosition: { x: piece.position.x, y: piece.position.y },
            };
          }
          break;
        }

        case "Barrier": {
          score = this.evaluateBarrier(game, piece, playerId);
          if (score > 0) {
            action = {
              playerId,
              event: GameEvent.USE_SUMMONER_SPELL,
              casterPosition: { x: piece.position.x, y: piece.position.y },
              targetPosition: { x: piece.position.x, y: piece.position.y },
            };
          }
          break;
        }

        case "Smite": {
          const smiteEval = this.evaluateSmite(game, piece, playerId);
          score = smiteEval.score;
          if (score > 0 && smiteEval.target) {
            action = {
              playerId,
              event: GameEvent.USE_SUMMONER_SPELL,
              casterPosition: { x: piece.position.x, y: piece.position.y },
              targetPosition: {
                x: smiteEval.target.position.x,
                y: smiteEval.target.position.y,
              },
            };
          }
          break;
        }
      }

      if (score > bestScore && action) {
        bestScore = score;
        bestAction = action;
      }
    }

    if (bestAction) {
      console.log(
        `[SummonerSpellStrategy] Recommending spell with score ${bestScore}`
      );
    }

    return bestAction;
  }

  // ============================================
  // Private Spell Evaluation Methods
  // ============================================

  /**
   * Evaluate Flash usage
   * Priority: Escape danger > Reposition for kill
   */
  private evaluateFlash(
    game: Game,
    piece: Chess,
    playerId: string
  ): { score: number; target?: Square } {
    let bestScore = 0;
    let bestTarget: Square | undefined;

    // Check current danger level
    const currentSafety = this.threatEvaluator.evaluatePositionSafety(
      game,
      piece,
      playerId
    );

    // Bonus for Poro in danger
    const isPoro = piece.name === "Poro";
    const isInDanger = currentSafety < -50;
    const isCriticalDanger = currentSafety < -100;

    // Generate all possible Flash positions (range 2)
    const flashPositions: Square[] = [];
    for (let x = -1; x <= 8; x++) {
      for (let y = 0; y <= 7; y++) {
        const deltaX = Math.abs(x - piece.position.x);
        const deltaY = Math.abs(y - piece.position.y);
        const distance = Math.max(deltaX, deltaY);

        if (distance > 0 && distance <= 2) {
          // Check if square is empty
          const occupied = game.board.find(
            (p) => p.position.x === x && p.position.y === y && p.stats.hp > 0
          );
          if (!occupied) {
            flashPositions.push({ x, y });
          }
        }
      }
    }

    // Evaluate each Flash position
    for (const pos of flashPositions) {
      const originalPos = { ...piece.position };
      piece.position = pos;

      const newSafety = this.threatEvaluator.evaluatePositionSafety(
        game,
        piece,
        playerId
      );

      piece.position = originalPos;

      let score = 0;

      // Escape scenario: reward improvement in safety
      if (isInDanger && newSafety > currentSafety + 30) {
        score = newSafety - currentSafety;

        // Huge bonus for escaping critical danger
        if (isCriticalDanger && newSafety > -20) {
          score += 300;
        }

        // Extra bonus for Poro escaping
        if (isPoro) {
          score += 400;
        }
      }

      // Aggressive scenario: reposition for better attacks (low priority)
      if (!isInDanger && newSafety > -30) {
        const originalPos = { ...piece.position };
        piece.position = pos;

        const attackTargets = this.gameEngine.getValidAttacks(game, piece.id);
        let attackValue = 0;

        for (const targetPos of attackTargets) {
          const target = getPieceAtPosition(game, targetPos);
          if (target && target.blue !== piece.blue) {
            if (target.name === "Poro") {
              attackValue += 200;
            } else {
              attackValue += target.stats.goldValue || 0;
            }
          }
        }

        piece.position = originalPos;

        // Only use Flash aggressively if significant value
        if (attackValue > 100) {
          score = Math.floor(attackValue * 0.3); // Lower priority than escape
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = pos;
      }
    }

    return { score: bestScore, target: bestTarget };
  }

  /**
   * Evaluate Ghost usage
   * Priority: Chase enemy Poro/carry > Escape
   */
  private evaluateGhost(game: Game, piece: Chess, playerId: string): number {
    let score = 0;

    // Check if piece is in danger (escape scenario)
    const currentSafety = this.threatEvaluator.evaluatePositionSafety(
      game,
      piece,
      playerId
    );

    if (currentSafety < -30) {
      score += Math.abs(currentSafety) * 0.5; // Moderate escape value
    }

    // Check chase potential (can we reach high-value targets with +1 speed?)
    const isBlue = game.bluePlayer === playerId;
    const enemyPoro = game.board.find(
      (p) => p.name === "Poro" && p.blue !== isBlue && p.stats.hp > 0
    );

    if (enemyPoro) {
      const distance = Math.max(
        Math.abs(enemyPoro.position.x - piece.position.x),
        Math.abs(enemyPoro.position.y - piece.position.y)
      );

      // If Poro is within range with +1 speed (3 turns)
      if (distance <= piece.stats.speed + 1 + 3) {
        score += 150;
      }
    }

    return score;
  }

  /**
   * Evaluate Heal usage
   * Priority: Save low HP allies in danger
   */
  private evaluateHeal(game: Game, piece: Chess, playerId: string): number {
    let score = 0;

    // Check caster HP
    const casterHpPercent = piece.stats.hp / piece.stats.maxHp;
    if (casterHpPercent < 0.4) {
      score += (0.4 - casterHpPercent) * 200; // Up to 80 points
    }

    // Check nearby allies
    const playerPieces = getPlayerPieces(game, playerId);
    const adjacentAllies = playerPieces.filter((ally) => {
      if (ally.id === piece.id || ally.stats.hp <= 0) return false;

      const distance = Math.max(
        Math.abs(ally.position.x - piece.position.x),
        Math.abs(ally.position.y - piece.position.y)
      );
      return distance === 1;
    });

    if (adjacentAllies.length > 0) {
      // Find lowest HP ally
      const lowestHpAlly = adjacentAllies.reduce((min, ally) =>
        ally.stats.hp < min.stats.hp ? ally : min
      );

      const allyHpPercent = lowestHpAlly.stats.hp / lowestHpAlly.stats.maxHp;
      if (allyHpPercent < 0.5) {
        score += (0.5 - allyHpPercent) * 150; // Up to 75 points

        // Check if ally is in danger
        const allySafety = this.threatEvaluator.evaluatePositionSafety(
          game,
          lowestHpAlly,
          playerId
        );
        if (allySafety < -20) {
          score += Math.abs(allySafety) * 0.5;
        }

        // Bonus if ally is Poro
        if (lowestHpAlly.name === "Poro") {
          score += 200;
        }
      }
    }

    return score;
  }

  /**
   * Evaluate Barrier usage
   * Priority: Protect high-value pieces from incoming damage
   */
  private evaluateBarrier(game: Game, piece: Chess, playerId: string): number {
    let score = 0;

    // Check if piece is threatened
    const currentSafety = this.threatEvaluator.evaluatePositionSafety(
      game,
      piece,
      playerId
    );

    if (currentSafety < -30) {
      // Barrier value = incoming damage up to shield amount (50 HP)
      const incomingDamage = Math.min(Math.abs(currentSafety), 50);
      score += incomingDamage * 2; // Double value for prevention

      // Extra value for Poro
      if (piece.name === "Poro") {
        score += 300;
      }

      // Extra value for high-value pieces (carries)
      const pieceValue = piece.stats.goldValue || 0;
      if (pieceValue > 100) {
        score += 50;
      }
    }

    return score;
  }

  /**
   * Evaluate Smite usage
   * Priority: Secure low HP minions/monsters
   */
  private evaluateSmite(
    game: Game,
    piece: Chess,
    playerId: string
  ): { score: number; target?: Chess } {
    let bestScore = 0;
    let bestTarget: Chess | undefined;

    const isBlue = game.bluePlayer === playerId;

    // Find all enemy minions and neutral monsters within range 2
    for (const target of game.board) {
      if (target.stats.hp <= 0) continue;

      const distance = Math.max(
        Math.abs(target.position.x - piece.position.x),
        Math.abs(target.position.y - piece.position.y)
      );

      if (distance > 2) continue;

      // Check if valid Smite target
      const isNeutralMonster =
        target.ownerId === "neutral" ||
        target.name.includes("Drake") ||
        target.name === "Baron Nashor" ||
        target.name === "Elder Dragon";

      const isEnemyMinion =
        (target.name.includes("Minion") || target.name === "Super Minion") &&
        target.blue !== isBlue;

      if (!isEnemyMinion && !isNeutralMonster) continue;

      // Smite deals 35-65 true damage (average 50)
      const smiteDamage = 50;

      // Score based on securing the kill
      if (target.stats.hp <= smiteDamage + 15) {
        let score = target.stats.goldValue || 20;

        // Higher priority if HP is in execute range
        if (target.stats.hp <= smiteDamage) {
          score += 100;
        }

        // Bonus for high-value monsters
        if (isNeutralMonster) {
          score += 50;
        }

        if (score > bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      }
    }

    return { score: bestScore, target: bestTarget };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Get pieces eligible to use summoner spells
   */
  private getEligiblePieces(game: Game, playerId: string): Chess[] {
    const pieces = getPlayerPieces(game, playerId);
    return pieces.filter((piece) => {
      if (piece.stats.hp <= 0) return false;

      // Check if stunned
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) return false;

      // Must have summoner spell ready
      if (!piece.summonerSpell || piece.summonerSpell.currentCooldown > 0) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if Poro is in critical danger
   */
  private isPoroInDanger(game: Game, playerId: string): boolean {
    const isBlue = game.bluePlayer === playerId;
    const poro = game.board.find(
      (p) => p.name === "Poro" && p.blue === isBlue && p.stats.hp > 0
    );

    if (!poro) return false;

    const safety = this.threatEvaluator.evaluatePositionSafety(
      game,
      poro,
      playerId
    );

    return safety < -50;
  }
}
