import { ChessObject } from "./chess";

export class Garen extends ChessObject {
  postTakenDamage(attacker: ChessObject, damage: number): void {
    super.postTakenDamage(attacker, damage);
    if (damage > 0) {
      this.chess.skill.currentCooldown = this.skillCooldown;
    }
  }

  preEnterTurn(isBlueTurn: boolean): void {
    super.preEnterTurn(isBlueTurn);
    if (this.chess.skill.currentCooldown > 0) {
      return;
    }
    this.heal(this, this.maxHp * 0.1);
  }
}
