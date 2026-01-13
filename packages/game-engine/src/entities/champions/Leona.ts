import { Square } from "../../types/Square";
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
}