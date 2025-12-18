import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";
import { MeleeMinion } from "./meleeminion";

export class SandSoldier extends MeleeMinion {
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
      bonusDamage = 5 + azir.ap * 0.65;
      if (bonusDamage > 0) {
        this.damage(chess, bonusDamage, "magic", this, this.sunder);
      }
    }

    return baseDamage + bonusDamage;
  }

  postAttack(chess: ChessObject, damage: number): void {
    super.postAttack(chess, damage);

    const azir = this.getAzirChess();
    if (!azir) {
      return;
    }

    // Special handling for Azir's Guinsoo's Rageblade
    // When Azir has Guinsoo's Rageblade, the Sand Soldier should perform the additional attack
    if (azir.chess.items.some((item) => item.id === "guinsoo_rageblade")) {
      const guinsooRageblade = azir.chess.items.find(
        (item) => item.id === "guinsoo_rageblade"
      );
      if (guinsooRageblade && guinsooRageblade.currentCooldown <= 0) {
        // Set Guinsoo's cooldown on Azir
        guinsooRageblade.currentCooldown =
          azir.getItemCooldown(guinsooRageblade);
        // Trigger Sand Soldier's additional attack (not Azir's)
        this.executeAttack(chess, false, 0.5);
      }
    }

    // Apply other post attack effects from Azir
    // Note: Guinsoo's Rageblade is already handled above and now on cooldown,
    // so it won't double-trigger when azir.postAttack is called
    azir.postAttack(chess, damage);
  }
}
