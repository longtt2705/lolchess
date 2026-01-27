import { Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getChessAtPosition } from "../../utils/helpers";

// We need to access getPieceBaseStats from GameLogic, but to avoid circular dependency,
// we define the Sand Soldier stats inline here
const SAND_SOLDIER_STATS = {
  maxHp: 100,
  ad: 10,
  ap: 0,
  physicalResistance: 25,
  magicResistance: 25,
  speed: 1,
  attackRange: {
    range: 2,
    diagonal: true,
    horizontal: true,
    vertical: true,
    lShape: false,
  },
  goldValue: 35,
  sunder: 0,
  criticalChance: 0,
  criticalDamage: 150,
  damageAmplification: 0,
  hpRegen: 0,
  cooldownReduction: 0,
  lifesteal: 0,
  durability: 0,
  attackProjectile: {
    shape: "spear",
    color: "#DAA520",
    trailColor: "#F4A460",
    size: 1.0,
    speed: 1.2,
  },
};

export class Azir extends ChessObject {
  /**
   * Maximum number of Sand Soldiers Azir can control
   */
  private static readonly MAX_SAND_SOLDIERS = 3;

  /**
   * Count Sand Soldiers owned by this Azir
   */
  private countSandSoldiers(): number {
    return this.game.board.filter(
      (chess) =>
        chess.name === "Sand Soldier" &&
        chess.skill?.payload?.azirId === this.chess.id &&
        chess.stats.hp > 0
    ).length;
  }

  /**
   * Arise - Promote a Minion to a Sand Soldier
   * Targets ally Melee or Caster Minions within range
   * Maximum 3 Sand Soldiers can be controlled at a time
   */
  skill(position?: Square): void {
    // Check if we already have max Sand Soldiers
    if (this.countSandSoldiers() >= Azir.MAX_SAND_SOLDIERS) {
      return;
    }

    // Find the target ally minion at the position
    const targetChess = getChessAtPosition(
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
    const sandSoldierStats = SAND_SOLDIER_STATS;
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
    minion.attackProjectile = sandSoldierStats.attackProjectile;

    // Store Azir's ID in the Sand Soldier's skill payload
    // This allows the Sand Soldier to find Azir for bonus damage calculation
    if (!minion.skill) {
      minion.skill = {
        name: "Sand Soldier",
        description:
          "This unit deals additional (15 + 35% of Azir's AP) magic damage to their target, also, apply the Azir's attack effects after attacking. When a Sand Soldier attacks, other Sand Soldiers within 2 squares of the target will also attack the target (ignoring the attack direction) but deal less than 40% of the Sand Soldier's damage.",
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

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Check if we already have max Sand Soldiers
    if (this.countSandSoldiers() >= Azir.MAX_SAND_SOLDIERS) {
      return 0; // Can't create more
    }

    // Value of promoting a minion to Sand Soldier
    // Sand Soldier gets significantly better stats and removes movement restrictions

    // Stat improvements:
    // - HP: 30-40 -> 100 (+60-70 HP)
    // - AD: 5-10 -> 10 (small increase)
    // - Range: 1 -> 2 (better positioning)
    // - Resistances: improved significantly
    // - Can move freely (no backward restriction)

    const hpGainValue = 65 * 0.4; // HP increase worth 40% as defensive value
    const statImprovementValue = 15; // Better stats overall
    const mobilityValue = 10; // Removes movement restrictions
    const rangeValue = 8; // Increased attack range

    // Strategic value: Sand Soldiers attack when Azir attacks (within 2 squares)
    // This provides additional damage output
    const synergyValue = 12;

    return hpGainValue + statImprovementValue + mobilityValue + rangeValue + synergyValue;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Check if we already have max Sand Soldiers
    if (this.countSandSoldiers() >= Azir.MAX_SAND_SOLDIERS) {
      return 0;
    }

    if (!targetPosition) {
      return 0; // Azir's skill requires a target
    }

    const targetPiece = getChessAtPosition(this.game, this.chess.blue, targetPosition);
    if (!targetPiece) {
      return 0;
    }
    const target = ChessFactory.createChess(targetPiece, this.game);

    // Only works on ally minions
    if (target.chess.blue !== this.chess.blue) {
      return 0;
    }

    // Only works on Melee Minion or Caster Minion
    if (target.chess.name !== "Melee Minion" && target.chess.name !== "Caster Minion") {
      return 0;
    }

    // Value of promoting this specific minion to Sand Soldier

    // HP increase: Minions have 30-40 HP, Sand Soldiers have 100 HP
    const hpGain = 100 - target.chess.stats.hp;
    const hpGainValue = hpGain * 0.4;

    // Stat improvements (better resistances, AD)
    const statValue = 20;

    // Mobility improvement (removes movement restrictions)
    const mobilityValue = 12;

    // Range improvement (1 -> 2)
    const rangeValue = 10;

    // Strategic synergy - Sand Soldier attacks when Azir attacks
    // More valuable if Azir is positioned to use this synergy
    const synergyValue = 15;

    // Positional value - more valuable if minion is well-positioned
    // Check if minion is near enemies (within 2-3 squares)
    let positionalBonus = 0;
    for (const enemy of this.game.board) {
      if (enemy.blue !== this.chess.blue && enemy.stats.hp > 0) {
        const distance = Math.max(
          Math.abs(target.chess.position.x - enemy.position.x),
          Math.abs(target.chess.position.y - enemy.position.y)
        );
        if (distance <= 3) {
          positionalBonus = 10;
          break;
        }
      }
    }

    return hpGainValue + statValue + mobilityValue + rangeValue + synergyValue + positionalBonus;
  }
}
