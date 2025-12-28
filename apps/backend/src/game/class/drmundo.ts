import { Square } from "../types";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";
import { getChessAtPosition } from "../utils/helpers";
import { getGameRng } from "../utils/SeededRandom";

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
}

