import { Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getChessAtPosition } from "../../utils/helpers";
import { getGameRng } from "../../utils/SeededRandom";

export class DrMundo extends ChessObject {
  skill(position?: Square): void {
    // Find the target enemy chess piece
    const targetChess = getChessAtPosition(
      this.game,
      !this.chess.blue,
      position
    );

    if (!targetChess) {
      return;
    }

    const targetChessObject = ChessFactory.createChess(
      targetChess,
      this.game
    );

    // STEP 1: Sacrifice 20% of max health (ALWAYS happens, regardless of hit/miss)
    const sacrificeAmount = Math.floor(this.maxHp * 0.15);
    this.chess.stats.hp = Math.max(1, this.chess.stats.hp - sacrificeAmount);

    // Track the sacrifice amount for animation purposes
    if (!this.game.lastAction) {
      this.game.lastAction = {} as any;
    }
    if (!this.game.lastAction.selfDamage) {
      this.game.lastAction.selfDamage = {};
    }
    this.game.lastAction.selfDamage[this.chess.id] = sacrificeAmount;

    // STEP 2: Calculate miss chance: (50 - 50% of AP)%
    // At 0 AP: 50% miss chance
    // At 100 AP: 0% miss chance
    const missChance = Math.min(50, Math.max(0, 50 - this.ap * 0.5));

    // STEP 3: Roll for hit/miss using seeded RNG
    const rng = getGameRng();
    const skillHits = !rng.chance(missChance); // Inverted: chance returns true if "miss" happens

    if (skillHits) {
      // STEP 4: Skill HIT - deal damage and heal

      // Calculate damage: (10 + 15% his maxHp + 10% AP + 15% target's maxHp)
      const damage =
        10 +
        this.maxHp * 0.15 +
        this.ap * 0.1 +
        targetChessObject.maxHp * 0.15;

      // Deal magic damage
      this.activeSkillDamage(
        targetChessObject,
        damage,
        "magic",
        this,
        this.sunder
      );

      // Heal for (10 + 10% of AP)% of max health
      const healPercent = 15 + this.ap * 0.1;
      const healAmount = Math.floor(this.maxHp * (healPercent / 100));
      this.heal(this, healAmount);
    }
    // STEP 5: If MISS - nothing happens (health already sacrificed)
    // The skill will simply not deal damage or heal
  }

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Calculate hit chance: (50 + 50% of AP)%
    const hitChance = Math.min(100, 50 + this.ap * 0.5) / 100;

    // Base damage: 10 + 15% his maxHp + 10% AP + 15% target's maxHp
    const avgTargetHp = 100; // Assume average target HP
    const baseDamage = 10 + this.maxHp * 0.15 + this.ap * 0.1 + avgTargetHp * 0.15;

    // Heal: (15 + 10% of AP)% of max health
    const healPercent = 15 + this.ap * 0.1;
    const healAmount = this.maxHp * (healPercent / 100);
    const healValue = healAmount * 0.8; // Healing worth 80% of damage

    // Cost: sacrifice 15% of max health
    const sacrificeCost = this.maxHp * 0.15 * 0.5; // Cost worth 50% of its value

    // Expected value accounting for hit chance
    const expectedValue = (baseDamage + healValue - sacrificeCost) * hitChance;

    return expectedValue;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    if (!targetPosition) {
      return 0; // Dr. Mundo's skill requires a target
    }

    const targetPiece = getChessAtPosition(this.game, this.chess.blue, targetPosition);
    if (!targetPiece) {
      return 0;
    }
    const target = ChessFactory.createChess(targetPiece, this.game);

    // Only works on enemies
    if (target.chess.blue === this.chess.blue) {
      return 0;
    }

    // Calculate hit chance: (50 + 50% of AP)%
    const missChance = Math.min(50, Math.max(0, 50 - this.ap * 0.5));
    const hitChance = (100 - missChance) / 100;

    // Damage: 10 + 15% his maxHp + 10% AP + 15% target's maxHp
    const baseDamage = 10 + this.maxHp * 0.15 + this.ap * 0.1 + target.chess.stats.maxHp * 0.15;
    const damage = this.calculateActiveSkillDamage(target);

    // Heal if hit: (15 + 10% of AP)% of max health
    const healPercent = 15 + this.ap * 0.1;
    const healAmount = this.maxHp * (healPercent / 100);
    const healValue = healAmount * 0.8; // Worth 80% as self-sustain

    // Cost: always sacrifice 15% of max health
    const sacrificeCost = this.maxHp * 0.15 * 0.5;

    // Expected value accounting for hit chance
    const expectedValue = (damage + healValue) * hitChance - sacrificeCost;

    // Don't use if Mundo is too low on HP
    if (this.chess.stats.hp < this.maxHp * 0.25) {
      return expectedValue * 0.3; // Much less valuable when low HP
    }

    return Math.max(0, expectedValue);
  }
}
