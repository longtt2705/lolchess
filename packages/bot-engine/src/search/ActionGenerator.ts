import {
  Game,
  GameEngine,
  EventPayload,
  GameEvent,
  Chess,
  getPlayerPieces,
  getItemById,
  Square,
} from "@lolchess/game-engine";
import { ScoredAction, LoSClearingMove, ActionCategory } from "../types";
import { LoSEvaluator } from "../evaluation/LoSEvaluator";

/** Mobility skills that reposition the caster (targetTypes === "squareInRange") */
const MOBILITY_SKILL_TARGET_TYPE = "squareInRange";

/**
 * Generates all possible legal actions for a player
 */
export class ActionGenerator {
  private losEvaluator: LoSEvaluator;

  constructor(private gameEngine: GameEngine) {
    this.losEvaluator = new LoSEvaluator(gameEngine);
  }

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

      // Generate summoner spell actions (can be used anytime, doesn't consume turn)
      if (
        piece.summonerSpell &&
        !game.hasPerformedActionThisTurn &&
        piece.summonerSpell.currentCooldown === 0
      ) {
        this.generateSummonerSpellActions(game, piece, playerId, actions);
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
   * Generate summoner spell actions for a piece
   */
  private generateSummonerSpellActions(
    game: Game,
    piece: Chess,
    playerId: string,
    actions: EventPayload[]
  ): void {
    const spell = piece.summonerSpell;
    if (!spell || spell.currentCooldown > 0) return;

    switch (spell.type) {
      case "Flash": {
        // Flash: Can target any empty square within range 2
        for (let x = -1; x <= 8; x++) {
          for (let y = 0; y <= 7; y++) {
            // Skip current position
            if (x === piece.position.x && y === piece.position.y) continue;

            // Check if within range 2
            const deltaX = Math.abs(x - piece.position.x);
            const deltaY = Math.abs(y - piece.position.y);
            const distance = Math.max(deltaX, deltaY);

            if (distance > 2) continue;

            // Check if square is empty
            const occupiedBy = game.board.find(
              (p) => p.position.x === x && p.position.y === y && p.stats.hp > 0
            );

            if (!occupiedBy) {
              actions.push({
                playerId,
                event: GameEvent.USE_SUMMONER_SPELL,
                casterPosition: { x: piece.position.x, y: piece.position.y },
                targetPosition: { x, y },
              });
            }
          }
        }
        break;
      }

      case "Ghost":
      case "Heal":
      case "Barrier": {
        // Self-cast spells
        actions.push({
          playerId,
          event: GameEvent.USE_SUMMONER_SPELL,
          casterPosition: { x: piece.position.x, y: piece.position.y },
          targetPosition: { x: piece.position.x, y: piece.position.y },
        });
        break;
      }

      case "Smite": {
        // Smite: Target enemy minions or neutral monsters within range 2
        for (const target of game.board) {
          if (target.stats.hp <= 0) continue;

          // Check if within range 2
          const deltaX = Math.abs(target.position.x - piece.position.x);
          const deltaY = Math.abs(target.position.y - piece.position.y);
          const distance = Math.max(deltaX, deltaY);

          if (distance > 2) continue;

          // Check if it's a neutral monster
          const isNeutralMonster =
            target.ownerId === "neutral" ||
            target.name.includes("Drake") ||
            target.name === "Baron Nashor" ||
            target.name === "Elder Dragon";

          // Check if it's an ENEMY minion (not ally minion)
          const isEnemyMinion =
            (target.name.includes("Minion") ||
              target.name === "Super Minion") &&
            target.ownerId !== piece.ownerId;

          if (isEnemyMinion || isNeutralMonster) {
            actions.push({
              playerId,
              event: GameEvent.USE_SUMMONER_SPELL,
              casterPosition: { x: piece.position.x, y: piece.position.y },
              targetPosition: {
                x: target.position.x,
                y: target.position.y,
              },
            });
          }
        }
        break;
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
   * Generate only summoner spell actions
   */
  generateSummonerSpells(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      if (piece.stats.hp <= 0) continue;
      if (!piece.summonerSpell || piece.summonerSpell.currentCooldown !== 0)
        continue;
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      this.generateSummonerSpellActions(game, piece, playerId, actions);
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

  /**
   * Generate moves that would clear blocked Line of Sight for ranged carries
   * These are moves where a blocking ally piece moves out of a firing lane,
   * allowing a ranged carry to attack an enemy target
   */
  generateLoSClearingMoves(game: Game, playerId: string): EventPayload[] {
    // Only generate LoS clearing moves if action hasn't been performed
    if (game.hasPerformedActionThisTurn) {
      return [];
    }

    const clearingMoves = this.losEvaluator.getLoSClearingMoves(game, playerId);
    const actions: EventPayload[] = [];

    for (const clearingMove of clearingMoves) {
      const blocker = clearingMove.blocker;

      // Check if blocker is stunned
      const isStunned = blocker.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      // Verify this is a valid move
      const action: EventPayload = {
        playerId,
        event: GameEvent.MOVE_CHESS,
        casterPosition: { x: blocker.position.x, y: blocker.position.y },
        targetPosition: clearingMove.moveTo,
      };

      if (this.isValidAction(game, action)) {
        actions.push(action);
      }
    }

    return actions;
  }

  /**
   * Get detailed LoS clearing information (including which carry benefits)
   * Useful for prioritizing moves in the opening
   */
  getLoSClearingDetails(game: Game, playerId: string): LoSClearingMove[] {
    if (game.hasPerformedActionThisTurn) {
      return [];
    }
    return this.losEvaluator.getLoSClearingMoves(game, playerId);
  }

  // ============================================
  // Two-Phase Search Action Generation
  // ============================================

  /**
   * Check if a piece has a mobility skill (skill that repositions the caster)
   * Examples: Ezreal's Arcane Shift (targetTypes === "squareInRange")
   */
  isMobilitySkill(piece: Chess): boolean {
    if (!piece.skill) return false;
    if (piece.skill.currentCooldown !== 0) return false;
    return piece.skill.targetTypes === MOBILITY_SKILL_TARGET_TYPE;
  }

  /**
   * Check if a summoner spell is a positioning spell (Flash)
   */
  isPositioningSummonerSpell(piece: Chess): boolean {
    if (!piece.summonerSpell) return false;
    if (piece.summonerSpell.currentCooldown !== 0) return false;
    return piece.summonerSpell.type === "Flash";
  }

  /**
   * Categorize an action into positioning, combat, or utility
   */
  categorizeAction(game: Game, action: EventPayload): ActionCategory {
    switch (action.event) {
      case GameEvent.MOVE_CHESS:
        return "positioning";

      case GameEvent.USE_SUMMONER_SPELL: {
        // Find the piece
        if (!action.casterPosition) return "utility";
        const piece = game.board.find(
          (p) =>
            p.position.x === action.casterPosition!.x &&
            p.position.y === action.casterPosition!.y &&
            p.stats.hp > 0
        );
        if (!piece?.summonerSpell) return "utility";
        // Flash is positioning, others are utility
        return piece.summonerSpell.type === "Flash" ? "positioning" : "utility";
      }

      case GameEvent.SKILL: {
        // Find the piece
        if (!action.casterPosition) return "combat";
        const piece = game.board.find(
          (p) =>
            p.position.x === action.casterPosition!.x &&
            p.position.y === action.casterPosition!.y &&
            p.stats.hp > 0
        );
        if (!piece?.skill) return "combat";
        // Mobility skills are positioning, others are combat
        return piece.skill.targetTypes === MOBILITY_SKILL_TARGET_TYPE
          ? "positioning"
          : "combat";
      }

      case GameEvent.ATTACK_CHESS:
        return "combat";

      case GameEvent.BUY_ITEM:
      default:
        return "utility";
    }
  }

  /**
   * Generate only positioning actions (moves, Flash, mobility skills)
   * Used in Phase 1 of two-phase search to find optimal position
   */
  generatePositioningActions(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      // Skip dead pieces
      if (piece.stats.hp <= 0) continue;

      // Check if piece is stunned
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      // Only generate actions if action not yet performed
      if (!game.hasPerformedActionThisTurn) {
        // Generate move actions
        this.generateMoveActions(game, piece, playerId, actions);

        // Generate mobility skill actions (e.g., Ezreal's Arcane Shift)
        if (this.isMobilitySkill(piece)) {
          this.generateMobilitySkillActions(game, piece, playerId, actions);
        }
      }

      // Generate Flash actions (doesn't consume turn)
      if (this.isPositioningSummonerSpell(piece)) {
        this.generateFlashActions(game, piece, playerId, actions);
      }
    }

    return actions;
  }

  /**
   * Generate mobility skill actions (skills that reposition the caster)
   */
  private generateMobilitySkillActions(
    game: Game,
    piece: Chess,
    playerId: string,
    actions: EventPayload[]
  ): void {
    const validSkillTargets = this.gameEngine.getValidSkillTargets(
      game,
      piece.id
    );

    for (const target of validSkillTargets) {
      actions.push({
        playerId,
        event: GameEvent.SKILL,
        casterPosition: { x: piece.position.x, y: piece.position.y },
        targetPosition: target,
      });
    }
  }

  /**
   * Generate Flash actions specifically
   */
  private generateFlashActions(
    game: Game,
    piece: Chess,
    playerId: string,
    actions: EventPayload[]
  ): void {
    const spell = piece.summonerSpell;
    if (!spell || spell.type !== "Flash" || spell.currentCooldown > 0) return;

    // Flash: Can target any empty square within range 2
    for (let x = -1; x <= 8; x++) {
      for (let y = 0; y <= 7; y++) {
        // Skip current position
        if (x === piece.position.x && y === piece.position.y) continue;

        // Check if within range 2
        const deltaX = Math.abs(x - piece.position.x);
        const deltaY = Math.abs(y - piece.position.y);
        const distance = Math.max(deltaX, deltaY);

        if (distance > 2) continue;

        // Check if square is empty
        const occupiedBy = game.board.find(
          (p) => p.position.x === x && p.position.y === y && p.stats.hp > 0
        );

        if (!occupiedBy) {
          actions.push({
            playerId,
            event: GameEvent.USE_SUMMONER_SPELL,
            casterPosition: { x: piece.position.x, y: piece.position.y },
            targetPosition: { x, y },
          });
        }
      }
    }
  }

  /**
   * Generate only combat actions (attacks, damage skills)
   * Used in Phase 2 of two-phase search after positioning
   */
  generateCombatActions(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      // Skip dead pieces
      if (piece.stats.hp <= 0) continue;

      // Check if piece is stunned
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      // Only generate actions if action not yet performed
      if (!game.hasPerformedActionThisTurn) {
        // Generate attack actions
        if (!piece.cannotAttack) {
          this.generateAttackActions(game, piece, playerId, actions);
        }

        // Generate non-mobility skill actions (damage/utility skills)
        if (
          piece.skill &&
          piece.skill.currentCooldown === 0 &&
          !this.isMobilitySkill(piece)
        ) {
          this.generateSkillActions(game, piece, playerId, actions);
        }
      }
    }

    return actions;
  }

  /**
   * Check if an action is a "free" action that doesn't end the turn
   * Free actions: Flash, Ghost, Heal, Barrier (summoner spells)
   */
  isFreeAction(action: EventPayload): boolean {
    return action.event === GameEvent.USE_SUMMONER_SPELL;
  }

  /**
   * Get the target position of a positioning action
   */
  getPositioningTarget(action: EventPayload): Square | null {
    if (!action.targetPosition) return null;

    switch (action.event) {
      case GameEvent.MOVE_CHESS:
      case GameEvent.USE_SUMMONER_SPELL:
      case GameEvent.SKILL:
        return action.targetPosition;
      default:
        return null;
    }
  }

  /**
   * Check if we're in the opening phase (rounds 1-5)
   */
  isOpeningPhase(game: Game): boolean {
    return game.currentRound <= 5;
  }
}
