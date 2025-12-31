import { Chess, Game, getPlayerPieces } from "@lolchess/game-engine";

/**
 * Evaluates material (piece) value on the board
 */
export class MaterialEvaluator {
  // Piece type base values (in addition to gold value)
  private static readonly PIECE_VALUES: Record<string, number> = {
    Poro: 1000, // King - extremely valuable
    Champion: 50, // Base champion value
    "Siege Minion": 40,
    "Super Minion": 60,
    "Melee Minion": 20,
    "Caster Minion": 25,
    "Sand Soldier": 35,
    Drake: 100, // Neutral objectives
    "Baron Nashor": 200,
  };

  // Minion types for identification
  private static readonly MINION_TYPES = [
    "Melee Minion",
    "Caster Minion",
    "Siege Minion",
    "Super Minion",
    "Sand Soldier",
  ];

  /**
   * Calculate total material score for a player
   */
  evaluate(game: Game, playerId: string): number {
    const pieces = getPlayerPieces(game, playerId);
    return pieces.reduce((total, piece) => {
      return total + this.evaluatePiece(piece);
    }, 0);
  }

  /**
   * Calculate material difference between two players
   */
  evaluateDifference(
    game: Game,
    playerId: string,
    opponentId: string
  ): number {
    return this.evaluate(game, playerId) - this.evaluate(game, opponentId);
  }

  /**
   * Evaluate a single piece's material value
   */
  evaluatePiece(piece: Chess): number {
    let value = 0;

    // Base gold value
    value += piece.stats.goldValue || 0;

    // Add type-specific bonus
    const typeValue =
      MaterialEvaluator.PIECE_VALUES[piece.name] ||
      MaterialEvaluator.PIECE_VALUES["Champion"];
    value += typeValue;

    // HP percentage factor - damaged pieces are worth less
    const hpPercent = piece.stats.hp / piece.stats.maxHp;
    value *= 0.5 + hpPercent * 0.5;

    // Stat-based value for champions
    if (!this.isMinion(piece.name)) {
      // AD contribution
      value += (piece.stats.ad || 0) * 0.4;
      // AP contribution
      value += (piece.stats.ap || 0) * 0.4;
      // Tankiness contribution
      value += (piece.stats.physicalResistance || 0) * 0.15;
      value += (piece.stats.magicResistance || 0) * 0.1;
    }

    // Skill availability bonus
    if (piece.skill && piece.skill.currentCooldown === 0) {
      value += 15;
    }

    // Item value
    if (piece.items && piece.items.length > 0) {
      value += piece.items.length * 20;
    }

    // Shield value
    if (piece.shields && piece.shields.length > 0) {
      const totalShield = piece.shields.reduce((sum, s) => sum + s.amount, 0);
      value += totalShield * 0.3;
    }

    return Math.floor(value);
  }

  /**
   * Check if a piece is a minion type
   */
  isMinion(pieceName: string): boolean {
    return MaterialEvaluator.MINION_TYPES.includes(pieceName);
  }

  /**
   * Get all living pieces for a player sorted by value
   */
  getPiecesByValue(game: Game, playerId: string): Chess[] {
    const pieces = getPlayerPieces(game, playerId);
    return pieces.sort((a, b) => this.evaluatePiece(b) - this.evaluatePiece(a));
  }
}
