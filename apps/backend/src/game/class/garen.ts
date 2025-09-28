import { ChessObject } from "./chess";

export class Garen extends ChessObject {
  postTakenDamage(): void {
    this.chess.skill.currentCooldown = this.chess.skill.cooldown;
  }

  preEnterTurn(isBlueTurn: boolean): void {
    super.preEnterTurn(isBlueTurn);
    if (this.chess.skill.currentCooldown > 0) {
      return;
    }
    this.heal(this, this.maxHp * 0.1);
  }
}
