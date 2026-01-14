import { Chess, Game } from "@lolchess/game-engine";
import { ChampionValue } from "../types";

/**
 * Evaluates individual champions for strategic decisions
 */
export class ChampionEvaluator {
    /**
     * Evaluate a champion's overall value
     */
    evaluateChampion(piece: Chess, game: Game): ChampionValue {
        const baseValue = piece.stats.goldValue || this.estimateGoldValue(piece);
        const combatValue = this.evaluateCombatValue(piece);
        const strategicValue = this.evaluateStrategicValue(piece);
        const healthFactor = piece.stats.hp / piece.stats.maxHp;

        const total =
            baseValue * 1.0 +
            combatValue * 0.5 +
            strategicValue * 0.3 +
            healthFactor * 20;

        return {
            baseValue,
            combatValue,
            strategicValue,
            healthFactor,
            total,
        };
    }

    /**
     * Estimate gold value for pieces without explicit value
     */
    private estimateGoldValue(piece: Chess): number {
        // Poro is extremely valuable (game-winning target)
        if (piece.name === "Poro") {
            return 500;
        }

        // Minions have low value
        if (this.isMinion(piece.name)) {
            return 10;
        }

        // Estimate based on stats
        let value = 50; // Base champion value
        value += piece.stats.ad * 0.5;
        value += piece.stats.ap * 0.5;
        value += piece.stats.maxHp * 0.1;

        return value;
    }

    /**
     * Evaluate combat effectiveness (damage output potential)
     */
    private evaluateCombatValue(piece: Chess): number {
        let value = 0;

        // AD contribution
        value += piece.stats.ad * 2;

        // AP contribution
        value += piece.stats.ap * 2;

        // Critical chance contribution
        value += piece.stats.criticalChance * 0.5;

        // Attack range contribution
        const range = piece.stats.attackRange?.range || 1;
        value += range * 10;

        return value;
    }

    /**
     * Evaluate strategic value (skills, utility)
     */
    private evaluateStrategicValue(piece: Chess): number {
        let value = 0;

        // Skill availability
        if (piece.skill) {
            value += 30;
            if (piece.skill.currentCooldown === 0) {
                value += 20; // Skill ready is more valuable
            }
        }

        // Summoner spell availability
        if (piece.summonerSpell) {
            value += 15;
            if (piece.summonerSpell.currentCooldown === 0) {
                value += 10;
            }
        }

        // Items contribute to strategic value
        if (piece.items) {
            value += piece.items.length * 15;
        }

        return value;
    }

    /**
     * Check if a piece is a minion
     */
    private isMinion(name: string): boolean {
        return (
            name === "Melee Minion" ||
            name === "Caster Minion" ||
            name === "Siege Minion" ||
            name === "Super Minion"
        );
    }
}
