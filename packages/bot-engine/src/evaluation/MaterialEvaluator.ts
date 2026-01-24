import {
  Chess,
  ChessFactory,
  Game,
  getPlayerPieces,
} from "@lolchess/game-engine";

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
    "Baron Nashor": 200,
    "Infernal Drake": 100,
    "Mountain Drake": 100,
    "Ocean Drake": 100,
    "Chemtech Drake": 100,
    "Hextech Drake": 100,
    "Cloud Drake": 100,
    "Elder Dragon": 250,
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
      return total + this.evaluatePiece(piece, game);
    }, 0);
  }

  /**
   * Calculate material difference between two players
   */
  evaluateDifference(game: Game, playerId: string, opponentId: string): number {
    return this.evaluate(game, playerId) - this.evaluate(game, opponentId);
  }

  /**
   * Evaluate a single piece's material value
   */
  evaluatePiece(piece: Chess, game: Game): number {
    let value = 0;

    // Base gold value
    value += piece.stats.goldValue || 0;

    // Add type-specific bonus
    const typeValue =
      MaterialEvaluator.PIECE_VALUES[piece.name] ||
      MaterialEvaluator.PIECE_VALUES["Champion"];
    value += typeValue;

    // HP percentage factor - damaged pieces are worth less
    // Guard against division by zero or undefined maxHp
    const maxHp = piece.stats.maxHp || 1;
    const hp = piece.stats.hp || 0;
    const hpPercent = Math.min(1, Math.max(0, hp / maxHp));
    value *= 0.5 + hpPercent * 0.5;

    // Stat-based value for champions
    if (!this.isMinion(piece.name) && piece.name !== "Poro") {
      try {
        const materialValue = ChessFactory.createChess(
          piece,
          game
        ).getMaterialValue();
        // Guard against NaN from getMaterialValue
        if (!isNaN(materialValue) && isFinite(materialValue)) {
          value += materialValue;
        }
      } catch {
        // If getMaterialValue fails, just use base value
      }
    }

    // Ensure we never return NaN
    const result = Math.floor(value);
    return isNaN(result) ? 0 : result;
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
    return pieces.sort(
      (a, b) =>
        this.evaluatePiece(b, game) - this.evaluatePiece(a, game) ||
        a.name.localeCompare(b.name)
    );
  }
}
