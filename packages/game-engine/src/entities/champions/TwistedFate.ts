import { Square } from "../../types";
import { ChessObject } from "../ChessObject";
import { ChessFactory } from "../ChessFactory";
import { getAdjacentSquares, getChessAtPosition } from "../../utils/helpers";

export class TwistedFate extends ChessObject {
  skill(position?: Square): void {
    const cardCount = 10 + Math.floor(this.ap * 0.2);
    const targetChess = getChessAtPosition(
      this.game,
      !this.chess.blue,
      position
    );

    const targets: ChessObject[] = [
      ChessFactory.createChess(targetChess, this.game),
    ];
    getAdjacentSquares(position).forEach((square) => {
      const targetChess = getChessAtPosition(
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
          (1 + this.ap * 0.05 + this.ad * 0.05) * 0.6,
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

  protected getActiveSkillPotential(): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    // Card count: 10 + 20% AP
    const cardCount = 10 + Math.floor(this.ap * 0.2);

    // First card damage: 1 + 5% AP + 5% AD
    const firstCardDamage = 1 + this.ap * 0.05 + this.ad * 0.05;

    // Subsequent cards: 60% of first card damage
    const subsequentCardDamage = firstCardDamage * 0.6;

    // Assume hitting 2-3 targets (main target + adjacent enemies)
    const avgTargets = 2.5;
    
    // Calculate total damage: first cards to each target + subsequent cards distributed
    const firstCardsTotal = firstCardDamage * avgTargets;
    const remainingCards = Math.max(0, cardCount - avgTargets);
    const subsequentCardsTotal = subsequentCardDamage * remainingCards;

    return firstCardsTotal + subsequentCardsTotal;
  }

  public getActiveSkillValue(targetPosition?: Square | null): number {
    const skill = this.chess.skill;
    if (!skill || skill.type !== "active" || skill.currentCooldown > 0) {
      return 0;
    }

    if (!targetPosition) {
      return 0; // TF's skill requires a target
    }

    const targetPiece = getChessAtPosition(this.game, this.chess.blue, targetPosition);
    if (!targetPiece) {
      return 0;
    }
    const target = ChessFactory.createChess(targetPiece, this.game);

    // Only works on enemies
    if (target.chess.blue === this.chess.blue) {
      return 0;
    }

    // Card count: 10 + 20% AP
    const cardCount = 10 + Math.floor(this.ap * 0.2);

    // First card to target: 1 + 5% AP + 5% AD
    const firstCardDamage = this.calculateActiveSkillDamage(target);

    // Subsequent cards deal 60% damage
    const subsequentCardDamage = firstCardDamage * 0.6;

    // Cards distribute to target and adjacent enemies
    // Estimate 2-3 total targets (target + adjacents)
    const estimatedTargets = 2.5;
    
    // First card per target
    const firstCardsValue = firstCardDamage * estimatedTargets;
    
    // Remaining cards distributed
    const remainingCards = Math.max(0, cardCount - estimatedTargets);
    const subsequentValue = subsequentCardDamage * remainingCards;

    return firstCardsValue + subsequentValue;
  }
}
