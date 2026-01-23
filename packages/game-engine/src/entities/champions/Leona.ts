import { Square } from "../../types/Square";
import { getEnemiesInRange } from "../../utils/helpers";
import { ChessFactory } from "../ChessFactory";
import { ChessObject } from "../ChessObject";

export class Leona extends ChessObject {
    skill(): void {
        // Find the target chess pieces
        const top3NearestEnemies = this.getTop3NearestEnemies();
        const sunlightTargets: Array<{ targetId: string; targetPosition: Square }> = [];

        for (const enemy of top3NearestEnemies) {
            this.activeSkillDamage(enemy, 15 + this.ap * 0.2 + this.ad * 0.2, "magic", this, this.sunder);

            // Track target for animation
            sunlightTargets.push({
                targetId: enemy.chess.id,
                targetPosition: { ...enemy.chess.position }
            });

            // Apply slow debuff (2 turns)
            this.applyDebuff(enemy, {
                id: "leona-slow",
                name: "Solar Flare Slow",
                description: "Slowed by 1 for 2 turns",
                duration: 2,
                maxDuration: 2,
                effects: [
                    {
                        stat: "speed",
                        modifier: -1,
                        type: "add",
                    },
                ],
                damagePerTurn: 0,
                damageType: "magic",
                healPerTurn: 0,
                unique: true,
                appliedAt: Date.now(),
                casterPlayerId: this.chess.ownerId,
                casterName: this.chess.name,
                currentStacks: 1,
                maximumStacks: 1,
                cause: "leona-slow",
            });

            // Apply Sunlight mark (3 turns, consumed when ally attacks)
            this.applyDebuff(enemy, {
                id: "sunlight",
                name: "Sunlight",
                description: "Marked by Sunlight for 3 turns. When an ally deals damage, consumes mark for bonus magic damage.",
                duration: 3,
                maxDuration: 3,
                effects: [], // No stat effects, just a consumable mark
                damagePerTurn: 0,
                damageType: "magic",
                healPerTurn: 0,
                unique: true,
                appliedAt: Date.now(),
                casterPlayerId: this.chess.ownerId,
                casterName: this.chess.name,
                currentStacks: 1,
                maximumStacks: 1,
                cause: "sunlight",
            });
        }

        // Store target data in skill payload for animation
        if (this.chess.skill) {
            if (!this.chess.skill.payload) {
                this.chess.skill.payload = {};
            }
            this.chess.skill.payload.sunlightTargets = sunlightTargets;
        }
    }

    private getTop3NearestEnemies(): ChessObject[] {
        const enemies = this.game.board.filter((p) => p.stats.hp > 0 && p.blue !== this.chess.blue && Math.abs(p.position.x - this.chess.position.x) <= 2 && Math.abs(p.position.y - this.chess.position.y) <= 2);
        enemies.sort((a, b) => a.stats.hp - b.stats.hp);
        return enemies.slice(0, 5).map((enemy) => ChessFactory.createChess(enemy, this.game));
    }

    protected getActiveSkillDamage(target: ChessObject): number {
        return 15 + this.ap * 0.2 + this.ad * 0.2;
    }

    protected getActiveSkillDamageType(): "physical" | "magic" {
        return "magic";
    }

    protected getActiveSkillPotential(): number {
        const skill = this.chess.skill;
        if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
            return 0;
        }

        // Direct damage: (15 + 20% AP + 20% AD) per target
        const damagePerTarget = 15 + this.ap * 0.2 + this.ad * 0.2;

        // Targets up to 5 nearest enemies within 2 range
        const avgTargets = 3; // Conservative estimate
        const totalDamage = damagePerTarget * avgTargets;

        // Sunlight debuff value - allies can consume it for additional damage
        // (10 + 25% Physical Resistance + 25% Magic Resistance)
        const sunlightDamage = 10 + this.physicalResistance * 0.25 + this.magicResistance * 0.25;
        const sunlightValue = sunlightDamage * avgTargets * 0.8; // Assume 80% will be consumed

        // Slow debuff adds control value
        const slowValue = 5 * avgTargets;

        return totalDamage + sunlightValue + slowValue;
    }

    public getActiveSkillValue(targetPosition?: Square | null): number {
        const skill = this.chess.skill;
        if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
            return 0;
        }

        const adjacentEnemies = getEnemiesInRange(this.game, this.chess.position, 2, this.chess.blue);
        let damage = 0;
        adjacentEnemies.forEach((enemy) => {
            const enemyObject = ChessFactory.createChess(enemy, this.game);
            damage += this.getActiveSkillDamage(enemyObject);
        });

        // Sunlight mark value - allies can consume for: (10 + 25% PR + 25% MR)
        const sunlightDamage = 10 + this.physicalResistance * 0.25 + this.magicResistance * 0.25;
        const sunlightValue = sunlightDamage * 0.5; // 50% chance ally will consume it

        // Slow debuff (-1 Move Speed for 2 turns)
        const slowValue = 8;

        // Skill hits up to 5 targets, so add value for other potential targets
        const multiTargetBonus = damage * adjacentEnemies.length * 0.5; // Assume 50% other targets get hit

        console.log("Leona active skill value:", damage + sunlightValue + slowValue + multiTargetBonus);
        return damage + sunlightValue + slowValue + multiTargetBonus;
    }
}