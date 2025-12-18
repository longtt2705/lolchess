import { Debuff } from "../game.schema";
import { ChessObject } from "./chess";

export class Tryndamere extends ChessObject {
  private createUndyingRageDebuff(): Debuff {
    return {
      id: "undying_rage",
      name: "Undying Rage",
      description: "Survive with 1 HP for 2 turns.",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "hp",
          modifier: 0,
          type: "add",
        },
      ],
      damagePerTurn: 0,
    } as Debuff;
  }

  protected postTakenDamage(attacker: ChessObject, damage: number, damageType: "physical" | "magic" | "true"): void {
    super.postTakenDamage(attacker, damage, damageType);
    if (this.chess.debuffs.some((debuff) => debuff.id === "undying_rage")) {
      if (this.chess.stats.hp <= 0) {
        this.chess.stats.hp = 1;
      }
      return;
    }

    // Undying Rage: survive with 1 HP for 2 turns the first time he would die
    if (this.chess.stats.hp <= 0 && this.chess.skill.currentCooldown <= 0) {
      this.chess.stats.hp = 1;
      this.applyDebuff(this, this.createUndyingRageDebuff());

      this.chess.skill.currentCooldown = this.skillCooldown;
    }
  }

  get ad(): number {
    return super.ad + Math.floor((this.maxHp - this.chess.stats.hp) / 5) * (1 + this.ap * 0.05);
  }
}
