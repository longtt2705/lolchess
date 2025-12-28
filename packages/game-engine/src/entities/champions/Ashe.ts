import { ChessObject } from "../ChessObject";
import { Debuff } from "../../types";
import { getGameRng } from "../../utils/SeededRandom";

export class Ashe extends ChessObject {
  // Create the Frost Shot debuff
  createFrostShotDebuff(casterPlayerId: string): Debuff {
    const rng = getGameRng();
    const isCritical = rng.chance(this.criticalChance);
    return {
      id: "frost_shot",
      name: "Frost Shot",
      description: "Slowed by Ashe's frost arrows, taking increased damage",
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "speed",
          modifier: isCritical ? -2 : -1,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: casterPlayerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  // Apply Frost Shot debuff to target
  applyFrostShot(target: ChessObject, casterPlayerId: string): boolean {
    const frostShotDebuff = this.createFrostShotDebuff(casterPlayerId);
    return this.applyDebuff(target, frostShotDebuff);
  }

  protected isCriticalStrike(): boolean {
    return false;
  }

  get ad(): number {
    return (
      super.ad + Math.floor((this.criticalChance / 25) * (10 + this.ap * 0.1))
    );
  }

  attack(chess: ChessObject): number {
    let baseDamage = super.attack(chess);

    // Apply Frost Shot debuff
    this.applyFrostShot(chess, this.chess.ownerId);
    return baseDamage;
  }
}
