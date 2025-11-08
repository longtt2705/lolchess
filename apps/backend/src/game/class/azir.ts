import { GameLogic } from "../game.logic";
import { Square } from "../game.schema";
import { ChessObject } from "./chess";

export class Azir extends ChessObject {
  /**
   * Arise - Promote a Minion to a Sand Soldier
   * Targets ally Melee or Caster Minions within range
   */
  skill(position?: Square): void {
    // Find the target ally minion at the position
    const targetChess = GameLogic.getChess(
      this.game,
      this.chess.blue,
      position
    );

    if (!targetChess) {
      return;
    }

    // Validate that target is a Melee Minion or Caster Minion
    if (
      targetChess.name !== "Melee Minion" &&
      targetChess.name !== "Caster Minion"
    ) {
      return;
    }

    // Transform the minion into a Sand Soldier
    this.promoteMinionToSandSoldier(targetChess);
  }

  /**
   * Transform a minion into a Sand Soldier with enhanced stats
   */
  private promoteMinionToSandSoldier(minion: any): void {
    // Transform to Sand Soldier
    minion.name = "Sand Soldier";

    // Update stats to Sand Soldier base stats
    const sandSoldierStats = GameLogic["getPieceBaseStats"]("Sand Soldier");
    minion.stats.maxHp = sandSoldierStats.maxHp;
    minion.stats.hp = sandSoldierStats.maxHp; // Full health on promotion
    minion.stats.ad = sandSoldierStats.ad;
    minion.stats.ap = sandSoldierStats.ap;
    minion.stats.physicalResistance = sandSoldierStats.physicalResistance;
    minion.stats.magicResistance = sandSoldierStats.magicResistance;
    minion.stats.speed = sandSoldierStats.speed;
    minion.stats.attackRange = sandSoldierStats.attackRange;
    minion.stats.goldValue = sandSoldierStats.goldValue;

    // Remove minion movement restrictions
    minion.cannotMoveBackward = false;
    minion.canOnlyMoveVertically = false;

    // Store Azir's ID in the Sand Soldier's skill payload
    // This allows the Sand Soldier to find Azir for bonus damage calculation
    if (!minion.skill) {
      minion.skill = {
        name: "Sand Soldier",
        description:
          "This unit deals additional (5 + 40% of AP) magic damage to their target. After attacking, apply the Azir's attack effects.",
        cooldown: 0,
        currentCooldown: 0,
        type: "passive",
        attackRange: sandSoldierStats.attackRange,
        targetTypes: "none",
        payload: {},
      };
    }
    if (!minion.skill.payload) {
      minion.skill.payload = {};
    }
    minion.skill.payload.azirId = this.chess.id;
  }

  /**
   * When Azir dies, all Sand Soldiers created by him should die
   */
  protected postTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true"
  ): void {
    super.postTakenDamage(attacker, damage, damageType);

    // If Azir dies, kill all Sand Soldiers linked to him
    if (this.chess.stats.hp <= 0) {
      this.killLinkedSandSoldiers();
    }
  }

  /**
   * Kill all Sand Soldiers that were created by this Azir
   */
  private killLinkedSandSoldiers(): void {
    this.game.board.forEach((chess) => {
      if (
        chess.name === "Sand Soldier" &&
        chess.skill?.payload?.azirId === this.chess.id &&
        chess.stats.hp > 0
      ) {
        // Kill the Sand Soldier
        chess.stats.hp = 0;
      }
    });
  }
}
