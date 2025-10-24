import { ChessObject } from "./chess";

export class Tristana extends ChessObject {
  get range(): number {
    if (this.isPassiveDisabled()) {
      return super.range;
    }
    return super.range + 6;
  }

  attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);
    if (this.isPassiveDisabled()) {
      return baseDamage;
    }

    // Initialize or get attack count from skill payload
    if (!this.chess.skill?.payload) {
      this.chess.skill.payload = { attackCount: 0 };
    }

    this.chess.skill.payload.attackCount++;

    // Every 4th attack deals bonus (10+50% of AP) physical damage to the target and his adjacent squares
    if (this.chess.skill.payload.attackCount % 4 === 0) {
      this.damage(chess, 10 + this.ap * 0.5, "physical", this, this.sunder);
    }
    return baseDamage;
  }
}
