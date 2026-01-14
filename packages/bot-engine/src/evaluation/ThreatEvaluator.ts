import {
  ChessFactory,
  Game,
  GameEngine,
  getPieceAtPosition,
  getPlayerPieces,
} from "@lolchess/game-engine";
import { ThreatInfo } from "../types";
import { MaterialEvaluator } from "./MaterialEvaluator";

/**
 * Evaluates threats and attack opportunities
 */
export class ThreatEvaluator {
  constructor(
    private gameEngine: GameEngine,
    private materialEvaluator: MaterialEvaluator
  ) {}
  /**
   * Get all threats a player can make
   */
  getPlayerThreats(game: Game, playerId: string): ThreatInfo[] {
    const threats: ThreatInfo[] = [];
    const pieces = getPlayerPieces(game, playerId);

    for (const piece of pieces) {
      const chessObject = ChessFactory.createChess(piece, game);
      if (piece.cannotAttack || chessObject.isStunned || piece.stats.hp <= 0)
        continue;

      const attackTargets = this.gameEngine.getValidAttacks(game, piece.id);
      for (const targetPos of attackTargets) {
        const target = getPieceAtPosition(game, targetPos);
        if (!target) continue;
        const targetChessObject = ChessFactory.createChess(target, game);
        const potentialDamage =
          chessObject.calculateDamageAttack(targetChessObject);
        const canKill = targetChessObject.chess.stats.hp <= potentialDamage;

        // Calculate priority
        let priority = potentialDamage;
        if (canKill) priority += 100;
        if (target.name === "Poro") priority += 500;
        priority += this.materialEvaluator.evaluatePiece(target, game);

        threats.push({
          attacker: piece,
          target,
          damage: potentialDamage,
          canKill,
          priority,
        });
      }

      if (
        piece.skill?.type === "active" &&
        piece.skill?.currentCooldown === 0
      ) {
        const skillTargets = this.gameEngine.getValidSkillTargets(
          game,
          piece.id
        );
        for (const targetPos of skillTargets) {
          const target = getPieceAtPosition(game, targetPos);
          if (!target) continue;
          const targetChessObject = ChessFactory.createChess(target, game);
          const potentialDamage =
            chessObject.calculateDamageActiveSkill(targetChessObject);
          const canKill = targetChessObject.chess.stats.hp <= potentialDamage;

          // Calculate priority
          let priority = potentialDamage;
          if (canKill) priority += 100;
          if (target.name === "Poro") priority += 500;
          priority += this.materialEvaluator.evaluatePiece(target, game);

          threats.push({
            attacker: piece,
            target,
            damage: potentialDamage,
            canKill,
            priority,
          });
        }
      }
    }

    // Sort by priority (highest first)
    return threats.sort((a, b) => b.priority - a.priority);
  }
  /**
   * Get lethal threats (attacks that can kill)
   */
  getLethalThreats(game: Game, playerId: string): ThreatInfo[] {
    return this.getPlayerThreats(game, playerId).filter((t) => t.canKill);
  }

  /**
   * Evaluate overall threat score for a player
   */
  evaluateThreatScore(game: Game, playerId: string): number {
    const threats = this.getPlayerThreats(game, playerId);
    return threats.reduce((acc, threat) => acc + threat.priority, 0);
  }
}
