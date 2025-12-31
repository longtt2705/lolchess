import {
  Game,
  GameEngine,
  EventPayload,
  GameEvent,
  Chess,
  getPlayerPieces,
  getItemById,
} from "@lolchess/game-engine";
import { ScoredAction } from "../types";

/**
 * Generates all possible legal actions for a player
 */
export class ActionGenerator {
  constructor(private gameEngine: GameEngine) {}

  /**
   * Generate all possible actions for a player
   */
  generateAll(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      // Skip dead pieces
      if (piece.stats.hp <= 0) continue;

      // Check if piece is stunned
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      // Only generate move/attack/skill if action not yet performed
      if (!game.hasPerformedActionThisTurn) {
        // Generate move actions
        this.generateMoveActions(game, piece, playerId, actions);

        // Generate attack actions
        if (!piece.cannotAttack) {
          this.generateAttackActions(game, piece, playerId, actions);
        }

        // Generate skill actions
        if (piece.skill && piece.skill.currentCooldown === 0) {
          this.generateSkillActions(game, piece, playerId, actions);
        }
      }
    }

    // Generate item purchase actions
    if (!game.hasPerformedActionThisTurn && !game.hasBoughtItemThisTurn) {
      this.generateItemActions(game, playerId, playerPieces, actions);
    }

    return actions;
  }

  /**
   * Generate move actions for a piece
   */
  private generateMoveActions(
    game: Game,
    piece: Chess,
    playerId: string,
    actions: EventPayload[]
  ): void {
    const validMoves = this.gameEngine.getValidMoves(game, piece.id);
    for (const target of validMoves) {
      actions.push({
        playerId,
        event: GameEvent.MOVE_CHESS,
        casterPosition: { x: piece.position.x, y: piece.position.y },
        targetPosition: target,
      });
    }
  }

  /**
   * Generate attack actions for a piece
   */
  private generateAttackActions(
    game: Game,
    piece: Chess,
    playerId: string,
    actions: EventPayload[]
  ): void {
    const validAttacks = this.gameEngine.getValidAttacks(game, piece.id);
    for (const target of validAttacks) {
      actions.push({
        playerId,
        event: GameEvent.ATTACK_CHESS,
        casterPosition: { x: piece.position.x, y: piece.position.y },
        targetPosition: target,
      });
    }
  }

  /**
   * Generate skill actions for a piece
   */
  private generateSkillActions(
    game: Game,
    piece: Chess,
    playerId: string,
    actions: EventPayload[]
  ): void {
    const validSkillTargets = this.gameEngine.getValidSkillTargets(
      game,
      piece.id
    );

    // Handle self-cast skills
    if (piece.skill!.targetTypes === "none") {
      actions.push({
        playerId,
        event: GameEvent.SKILL,
        casterPosition: { x: piece.position.x, y: piece.position.y },
        targetPosition: { x: piece.position.x, y: piece.position.y },
      });
    } else {
      for (const target of validSkillTargets) {
        actions.push({
          playerId,
          event: GameEvent.SKILL,
          casterPosition: { x: piece.position.x, y: piece.position.y },
          targetPosition: target,
        });
      }
    }
  }

  /**
   * Generate item purchase actions
   */
  private generateItemActions(
    game: Game,
    playerId: string,
    playerPieces: Chess[],
    actions: EventPayload[]
  ): void {
    const player = game.players.find((p) => p.userId === playerId);
    if (!player || player.gold <= 0 || !game.shopItems) return;

    for (const itemId of game.shopItems) {
      const item = getItemById(itemId);
      if (!item) continue;
      if (player.gold < item.cost) continue;
      if (!item.isBasic) continue;

      // Generate purchase for each eligible champion
      for (const piece of playerPieces) {
        if (piece.stats.hp <= 0) continue;
        if (piece.items && piece.items.length >= 3) continue;

        // Only champions can receive items
        const nonChampionTypes = [
          "Poro",
          "Melee Minion",
          "Caster Minion",
          "Siege Minion",
          "Super Minion",
          "Drake",
          "Baron Nashor",
        ];
        if (nonChampionTypes.includes(piece.name)) continue;

        actions.push({
          playerId,
          event: GameEvent.BUY_ITEM,
          itemId: itemId,
          targetChampionId: piece.id,
        });
      }
    }
  }

  /**
   * Generate only attack actions (for quick tactical evaluation)
   */
  generateAttacks(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      if (piece.stats.hp <= 0 || piece.cannotAttack) continue;
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      if (!game.hasPerformedActionThisTurn) {
        this.generateAttackActions(game, piece, playerId, actions);
      }
    }

    return actions;
  }

  /**
   * Generate only move actions
   */
  generateMoves(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      if (piece.stats.hp <= 0) continue;
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      if (!game.hasPerformedActionThisTurn) {
        this.generateMoveActions(game, piece, playerId, actions);
      }
    }

    return actions;
  }

  /**
   * Generate only skill actions
   */
  generateSkills(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      if (piece.stats.hp <= 0) continue;
      if (!piece.skill || piece.skill.currentCooldown !== 0) continue;
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      if (!game.hasPerformedActionThisTurn) {
        this.generateSkillActions(game, piece, playerId, actions);
      }
    }

    return actions;
  }

  /**
   * Validate an action is legal
   */
  isValidAction(game: Game, action: EventPayload): boolean {
    const result = this.gameEngine.validateAction(game, action);
    return result.valid;
  }

  /**
   * Filter actions to only valid ones
   */
  filterValid(game: Game, actions: EventPayload[]): EventPayload[] {
    return actions.filter((action) => this.isValidAction(game, action));
  }
}
