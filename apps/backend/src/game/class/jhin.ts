import { ChessObject } from "./chess";
import { Debuff } from "../game.schema";

export class Jhin extends ChessObject {
  // Create speed boost debuff for after critical strike
  createSpeedBoostDebuff(): Debuff {
    return {
      id: "jhin_whisper_speed",
      name: "Whisper Speed Boost",
      description: "Increased speed from Jhin's critical strike",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: 2,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
    } as Debuff;
  }

  attack(chess: ChessObject): void {
    // Initialize or get attack count from skill payload
    if (!this.chess.skill?.payload) {
      this.chess.skill.payload = { attackCount: 0 };
    }

    this.chess.skill.payload.attackCount++;

    // Every 4th attack is critical
    const isCritical = this.chess.skill.payload.attackCount % 4 === 0;

    if (isCritical) {
      // Deal critical damage (double damage)
      const criticalDamage = this.ad * 2;
      this.damage(chess, criticalDamage, "physical");

      // Grant +2 Move Speed
      const speedBoost = this.createSpeedBoostDebuff();
      this.applyDebuff(this, speedBoost);
    } else {
      super.attack(chess);
    }
  }
}
