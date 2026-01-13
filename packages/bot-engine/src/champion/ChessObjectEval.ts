import { Chess, ChessObject, Game } from "@lolchess/game-engine";

export class PotentialDamage {
    public damage: number = 0;
    public isAttack: boolean = false;
    public isSkill: boolean = false;
}

export class ChessObjectEval extends ChessObject {
    constructor(chess: Chess, game: Game) {
        super(chess, game);
    }

    protected isTargetAttackable(target: ChessObject): boolean {
        return this.validateAttack(target.chess.position, this.attackRange);
    }

    protected isTargetSkillable(target: ChessObject): boolean {
        return this.validateSkill(this.chess.skill, target.chess.position);
    }

    protected getActiveSkillDamage(target: ChessObject): number {
        return 0
    }

    public calculateDamageAttack(target: ChessObject): number {
        const totalShield = target.chess.shields?.reduce((acc, shield) => acc + shield.amount, 0) || 0;
        const damageAmplificationFactor = (this.damageAmplification + 100) / 100;
        const criticalDamageFactor = this.criticalChance > 50 ? this.criticalDamage / 100 : 1; // 50% chance to crit
        const durabilityFactor = this.durability > 0 ? (100 - this.durability) / 100 : 1;
        const damage = this.calculateDamage(target, Math.floor(this.ad * damageAmplificationFactor * criticalDamageFactor * durabilityFactor), "physical", this.sunder);

        return Math.max(damage - totalShield, 0);
    }

    public calculateDamageActiveSkill(target: ChessObject): number {
        const totalShield = target.chess.shields?.reduce((acc, shield) => acc + shield.amount, 0) || 0;
        const damageAmplificationFactor = (this.damageAmplification + 100) / 100;
        const criticalDamageFactor = this.criticalChance > 50 && this.hasItem("jeweled_gauntlet") ? this.criticalDamage / 100 : 1; // 50% chance to crit with jeweled gauntlet
        const durabilityFactor = this.durability > 0 ? (100 - this.durability) / 100 : 1;
        const damage = this.calculateDamage(target, Math.floor(this.getActiveSkillDamage(target) * damageAmplificationFactor * criticalDamageFactor * durabilityFactor), "physical", this.sunder);
        return Math.max(damage - totalShield, 0);
    }

    public getMaterialValue(): number {
        let value = 0;
        value += this.chess.stats.goldValue || 0;
        value += (this.ad || 0) * 0.4;
        value += (this.ap || 0) * 0.4;
        value += (this.physicalResistance || 0) * 0.15;
        value += (this.magicResistance || 0) * 0.1;
        value += this.sunder * 0.1;
        value += this.criticalChance * 0.1;
        value += this.criticalDamage * 0.1;
        value += this.damageAmplification * 0.1;
        value += this.lifesteal * 0.1;
        value += this.hpRegen * 1;
        value += this.maxHp * 0.05;
        value += this.durability * 0.1;
        value += this.cooldownReduction * 0.1;
        value += this.chess.skill?.currentCooldown === 0 ? 10 : 0;
        value += this.chess.items?.length || 0 * 10;
        return Math.floor(value);
    }
}
