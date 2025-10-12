import { ChessObject } from "./chess";
import { Debuff } from "../game.schema";

export class Ashe extends ChessObject {
  // Create the Frost Shot debuff
  createFrostShotDebuff(casterPlayerId: string): Debuff {
    return {
      id: "frost_shot",
      name: "Frost Shot",
      description: "Slowed by Ashe's frost arrows, taking increased damage",
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "speed",
          modifier: -1,
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

  attack(chess: ChessObject): number {
    let baseDamage = super.attack(chess);

    // Check if passive is disabled by Evenshroud
    if (this.isPassiveDisabled()) {
      return baseDamage;
    }

    // Apply Frost Shot debuff
    this.applyFrostShot(chess, this.chess.ownerId);

    // Check if target has Frost Shot debuff for bonus damage
    const hasFrostShot = chess.chess.debuffs.some(
      (debuff) => debuff.id === "frost_shot"
    );
    const bonusDamage = hasFrostShot
      ? Math.floor(this.ad * (0.2 + this.ap * 0.1))
      : 0;

    if (bonusDamage > 0) {
      baseDamage += this.damage(chess, bonusDamage, "physical", this, this.sunder);
    }
    return baseDamage;
  }
}
