import { GameLogic } from "../game.logic";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";

export class SandSoldier extends ChessObject {
  /**
   * Get Azir's AP for bonus damage calculation
   * Sand Soldiers deal additional (10 + 50% of Azir's AP) magic damage
   */
  private getAzirChess(): ChessObject {
    // Get Azir's ID from payload
    const azirId = this.chess.skill?.payload?.azirId;
    if (!azirId) {
      return null;
    }

    // Find Azir on the board
    const azir = this.game.board.find((chess) => chess.id === azirId);
    if (!azir || azir.stats.hp <= 0) {
      return null;
    }

    const azirObject = ChessFactory.createChess(azir, this.game);
    return azirObject;
  }

  /**
   * Override attack to deal bonus magic damage based on Azir's AP
   */
  protected attack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1
  ): number {
    const baseDamage = super.attack(chess, forceCritical, damageMultiplier);

    let bonusDamage = 0;
    // Calculate and deal bonus magic damage
    const azir = this.getAzirChess();
    if (azir) {
      bonusDamage = 5 + azir.ap * 0.4;
      if (bonusDamage > 0) {
        this.damage(chess, bonusDamage, "magic", this, this.sunder);
      }
    }

    return baseDamage + bonusDamage;
  }

  postAttack(chess: ChessObject, damage: number): void {
    super.postAttack(chess, damage);

    const azir = this.getAzirChess();
    // Apply post attack for Azir
    if (azir) {
      azir.postAttack(chess, damage);
    }
  }
}
