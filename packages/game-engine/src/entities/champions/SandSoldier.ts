import { Chess, Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { MeleeMinion } from "./MeleeMinion";

export class SandSoldier extends MeleeMinion {
  /**
   * Flag to track if this is a chain attack (to prevent infinite recursion)
   */
  private isChainAttack: boolean = false;

  /**
   * Get Azir's chess object for bonus damage calculation
   * Sand Soldiers deal additional (5 + 25% of Azir's AP) magic damage
   */
  private getAzirChess(): ChessObject | null {
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
   * Find Sand Soldiers within 2 squares of target position (Chebyshev distance)
   */
  private findNearbySandSoldiers(targetPosition: Square): Chess[] {
    const azirId = this.chess.skill?.payload?.azirId;
    if (!azirId) {
      return [];
    }

    return this.game.board.filter((chess) => {
      // Must be a Sand Soldier linked to the same Azir
      if (chess.name !== "Sand Soldier") return false;
      if (chess.skill?.payload?.azirId !== azirId) return false;
      if (chess.stats.hp <= 0) return false;
      // Exclude self
      if (chess.id === this.chess.id) return false;

      // Check if within 2 squares of target (Chebyshev distance)
      const dx = Math.abs(chess.position.x - targetPosition.x);
      const dy = Math.abs(chess.position.y - targetPosition.y);

      const distance = Math.max(dx, dy);

      return distance <= 2;
    });
  }

  /**
   * Trigger chain attacks from nearby Sand Soldiers
   */
  private triggerChainAttacks(target: ChessObject): void {
    // Don't trigger chain attacks if this is already a chain attack
    if (this.isChainAttack) {
      return;
    }

    const nearbySoldiers = this.findNearbySandSoldiers(target.chess.position);

    // Initialize additionalAttacks array if not exists
    if (!this.game.lastAction) {
      return;
    }
    if (!this.game.lastAction.additionalAttacks) {
      this.game.lastAction.additionalAttacks = [];
    }

    for (const soldier of nearbySoldiers) {
      // Check if target is still alive
      if (target.chess.stats.hp <= 0) {
        break;
      }

      // Create soldier object and mark as chain attack
      const soldierObject = ChessFactory.createChess(
        soldier,
        this.game
      ) as SandSoldier;
      soldierObject.isChainAttack = true;

      // Ignore the attack direction
      this.game.lastAction.additionalAttacks.push({
        attackerId: soldier.id,
        attackerPosition: { x: soldier.position.x, y: soldier.position.y },
        targetId: target.chess.id,
        targetPosition: {
          x: target.chess.position.x,
          y: target.chess.position.y,
        },
      });

      // Execute chain attack at 50% damage
      soldierObject.executeAttack(target, false, 0.6);
    }
  }

  /**
   * Override attack to deal bonus magic damage based on Azir's AP
   * Bonus damage: 5 + 25% of Azir's AP
   */
  protected attack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1
  ): number {
    const baseDamage = super.attack(chess, forceCritical, damageMultiplier);

    let bonusDamage = 0;
    // Calculate and deal bonus magic damage: 15 + 30% of Azir's AP
    const azir = this.getAzirChess();
    if (azir) {
      bonusDamage = 15 + azir.ap * 0.3;
      if (bonusDamage > 0) {
        azir.dealDamage(
          chess,
          bonusDamage * damageMultiplier,
          "magic",
          azir.sunder,
          true
        );
      }
    }

    return baseDamage + bonusDamage;
  }

  /**
   * Override postAttack to trigger chain attacks and apply Azir's effects
   */
  postAttack(chess: ChessObject, damage: number): void {
    super.postAttack(chess, damage);

    const azir = this.getAzirChess();
    if (!azir) {
      return;
    }

    // Only trigger chain attacks on primary attacks (not chain attacks)
    if (!this.isChainAttack) {
      // Trigger chain attacks from nearby Sand Soldiers
      this.triggerChainAttacks(chess);

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
}
