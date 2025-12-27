import { GameLogic } from "../game.logic";
import { Square } from "../types";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";

export class TwistedFate extends ChessObject {
  skill(position?: Square): void {
    const cardCount = 10 + Math.floor(this.ap * 0.2);
    const targetChess = GameLogic.getChess(
      this.game,
      !this.chess.blue,
      position
    );

    const targets: ChessObject[] = [
      ChessFactory.createChess(targetChess, this.game),
    ];
    GameLogic.getAdjacentSquares(position).forEach((square) => {
      const targetChess = GameLogic.getChess(
        this.game,
        !this.chess.blue,
        square
      );
      if (targetChess) {
        const targetChessObject = ChessFactory.createChess(
          targetChess,
          this.game
        );
        targets.push(targetChessObject);
      }
    });

    // Track targets for animation
    const cardTargetsMap = new Map<
      string,
      { targetId: string; targetPosition: Square; cardCount: number }
    >();

    const isFirstCard = new Set<string>();
    for (let i = 0; i < cardCount; i++) {
      const target = targets[i % targets.length];
      if (isFirstCard.has(target.chess.id)) {
        this.activeSkillDamage(
          target,
          (1 + this.ap * 0.05 + this.ad * 0.05) * 0.5,
          "magic",
          this,
          this.sunder
        );
      } else {
        this.activeSkillDamage(
          target,
          1 + this.ap * 0.05 + this.ad * 0.05,
          "magic",
          this,
          this.sunder
        );
        isFirstCard.add(target.chess.id);
      }

      // Track which target received this card
      const targetId = target.chess.id;
      if (cardTargetsMap.has(targetId)) {
        cardTargetsMap.get(targetId)!.cardCount++;
      } else {
        cardTargetsMap.set(targetId, {
          targetId: targetId,
          targetPosition: { ...target.chess.position },
          cardCount: 1,
        });
      }
    }

    // Store card target data in skill payload for animation
    if (this.chess.skill) {
      if (!this.chess.skill.payload) {
        this.chess.skill.payload = {};
      }
      this.chess.skill.payload.cardTargets = Array.from(
        cardTargetsMap.values()
      );
      this.chess.skill.payload.totalCardCount = cardCount;
    }
  }
}
