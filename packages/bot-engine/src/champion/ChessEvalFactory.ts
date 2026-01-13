import { Chess, Game } from "@lolchess/game-engine";
import { ChessObjectEval } from "./ChessObjectEval";


export interface IChessFactory {
    createChess(chess: Chess, game: Game): ChessObjectEval;
}

export class ChessEvalFactory implements IChessFactory {
    public static createChess(chess: Chess, game: Game): ChessObjectEval {
        switch (chess.name) {
            default:
                return new ChessObjectEval(chess, game);
        }
    }

    // Instance method for interface compliance
    createChess(chess: Chess, game: Game): ChessObjectEval {
        return ChessEvalFactory.createChess(chess, game);
    }
}

// Singleton instance for convenience
export const chessEvalFactory = new ChessEvalFactory();
