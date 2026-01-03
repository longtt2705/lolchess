import { ChessObject } from "../entities/ChessObject";
import { ChessFactory } from "../entities/ChessFactory";
import { ChampionData, champions } from "../data/champions";
import {
  basicItems,
  getViktorModulesCount,
  getItemById,
  findCombinedItem,
} from "../data/items";
import { getAdjacentSquares as getAdjacentSquaresHelper } from "../utils/helpers";
import {
  SeededRandom,
  clearGameRng,
  getGameRng,
  setGameRng,
} from "../utils/SeededRandom";
import {
  ActionDetails,
  Chess,
  EventPayload,
  Game,
  GameEvent,
  Player,
  Square,
} from "../types";

// Shop rotation constants
export const SHOP_ITEMS_COUNT = 3; // Number of items displayed in shop
export const SHOP_REFRESH_INTERVAL = 4; // Refresh shop every N rounds (4 rounds = 2 turns per player)

// Configuration for environment-specific behavior
let _isDevelopmentMode = false;

/**
 * Set development mode for the game engine
 * In development mode, players start with 1000 gold instead of the configured amount
 */
export function setDevelopmentMode(isDev: boolean): void {
  _isDevelopmentMode = isDev;
}

/**
 * Check if the engine is in development mode
 */
export function isDevelopmentMode(): boolean {
  return _isDevelopmentMode;
}

export class GameLogic {
  public static processGame(game: Game, event: EventPayload): Game {
    if (!game) {
      throw new Error("Game not found");
    }

    // Initialize RNG from game state
    const rng = new SeededRandom(game.rngState || game.rngSeed || Date.now());
    setGameRng(rng);

    try {
      return this._processGameInternal(game, event, rng);
    } finally {
      // Save RNG state back to game and clear global context
      game.rngState = rng.getSeed();
      clearGameRng();
    }
  }

  private static _processGameInternal(
    game: Game,
    event: EventPayload,
    rng: SeededRandom
  ): Game {
    const isBlue = event.playerId === game.bluePlayer;

    let casterChess: Chess | null = null;
    if (event.event === GameEvent.BUY_ITEM) {
      casterChess = game.board.find(
        (chess) =>
          chess.id === event.targetChampionId &&
          chess.ownerId === event.playerId
      );
    } else {
      casterChess = this.getChess(game, isBlue, event.casterPosition);
    }
    if (!casterChess) {
      throw new Error("Caster not found");
    }

    // Initialize action details
    const actionDetails: ActionDetails = {
      timestamp: Date.now(),
      actionType: event.event,
      casterId: casterChess.id,
      casterPosition: { x: casterChess.position.x, y: casterChess.position.y },
      affectedPieceIds: [],
      killedPieceIds: [],
      killerPlayerId: event.playerId, // Track who performed the action for gold rewards
    };

    // Assign action details to game BEFORE processing so it's available during action execution
    // (e.g., for Sand Soldier chain attacks to add to additionalAttacks)
    game.lastAction = actionDetails;

    // Take snapshots of pieces before action
    const pieceStatsBefore = new Map<string, any>();
    game.board.forEach((piece) => {
      pieceStatsBefore.set(piece.id, {
        hp: piece.stats.hp,
        ad: piece.stats.ad,
        ap: piece.stats.ap,
        speed: piece.stats.speed,
        physicalResistance: piece.stats.physicalResistance,
        magicResistance: piece.stats.magicResistance,
        position: { x: piece.position.x, y: piece.position.y },
      });
    });

    // Check if the caster is stunned (cannot perform move, attack, or skill actions)
    const isStunned =
      casterChess.debuffs?.some((debuff) => debuff.stun) ?? false;

    switch (event.event) {
      case GameEvent.MOVE_CHESS:
        if (isStunned) {
          throw new Error("Stunned unit cannot move");
        }
        this.processMoveChess(
          game,
          isBlue,
          casterChess,
          event.targetPosition,
          actionDetails
        );
        // Mark that a board action has been performed
        game.hasPerformedActionThisTurn = true;
        break;
      case GameEvent.ATTACK_CHESS: {
        if (isStunned) {
          throw new Error("Stunned unit cannot attack");
        }
        this.processAttackChess(
          game,
          isBlue,
          casterChess,
          event.targetPosition,
          actionDetails
        );
        // Mark that a board action has been performed
        game.hasPerformedActionThisTurn = true;
        break;
      }
      case GameEvent.SKILL: {
        if (isStunned) {
          throw new Error("Stunned unit cannot use skills");
        }
        this.processSkill(
          game,
          casterChess,
          event.targetPosition,
          actionDetails
        );
        // Mark that a board action has been performed
        game.hasPerformedActionThisTurn = true;
        break;
      }
      case GameEvent.BUY_ITEM: {
        this.processBuyItem(
          game,
          event.playerId,
          event.itemId!,
          event.targetChampionId,
          actionDetails
        );
        break;
      }
      default:
        break;
    }

    // Detect stat changes and killed pieces
    actionDetails.statChanges = {};
    game.board.forEach((piece) => {
      const before = pieceStatsBefore.get(piece.id);
      if (before) {
        if (before.hp !== piece.stats.hp) {
          actionDetails.statChanges![`${piece.id}.hp`] = {
            oldValue: before.hp,
            newValue: piece.stats.hp,
          };
          if (!actionDetails.affectedPieceIds.includes(piece.id)) {
            actionDetails.affectedPieceIds.push(piece.id);
          }
        }
        // Track other stat changes
        ["ad", "ap", "speed", "physicalResistance", "magicResistance"].forEach(
          (stat) => {
            if (before[stat] !== piece.stats[stat]) {
              actionDetails.statChanges![`${piece.id}.${stat}`] = {
                oldValue: before[stat],
                newValue: piece.stats[stat],
              };
              if (!actionDetails.affectedPieceIds.includes(piece.id)) {
                actionDetails.affectedPieceIds.push(piece.id);
              }
            }
          }
        );
      }
    });

    // Find killed pieces
    pieceStatsBefore.forEach((before, pieceId) => {
      const piece = game.board.find((p) => p.id === pieceId);
      if (!piece && before.hp > 0) {
        actionDetails.killedPieceIds!.push(pieceId);
      }
    });

    this.applyAuraDebuffs(game);

    // Only post-process (end turn) for non-buy-item actions
    // Buy item does not end the turn
    if (event.event !== GameEvent.BUY_ITEM) {
      this.postProcessGame(game);
    }
    return game;
  }

  private static postProcessGame(game: Game): Game {
    this.checkPawnPromotion(game);
    this.checkGameOver(game);
    this.spawnNeutralMonsters(game);
    this.startNextRound(game);
    // Check if game is over again after starting the next round
    this.checkGameOver(game);
    return game;
  }

  public static getChess(
    game: Game,
    isBlue: boolean,
    square: Square
  ): Chess | null {
    const chess = game.board.find(
      (chess) =>
        chess.position.x === square.x &&
        chess.position.y === square.y &&
        chess.stats.hp > 0
    );
    if (!chess) {
      return null;
    }
    if (chess.blue !== isBlue) {
      return null;
    }
    return chess;
  }

  /**
   * Get all adjacent squares from a position
   * @deprecated Use getAdjacentSquares from utils/helpers instead
   */
  public static getAdjacentSquares(square: Square): Square[] {
    return getAdjacentSquaresHelper(square);
  }

  private static processMoveChess(
    game: Game,
    isBlue: boolean,
    casterChess: Chess,
    targetPosition: Square,
    actionDetails: ActionDetails
  ): Game {
    const targetChess = this.getChess(game, isBlue, targetPosition);
    if (targetChess) {
      throw new Error("Target is already occupied");
    }

    actionDetails.fromPosition = {
      x: casterChess.position.x,
      y: casterChess.position.y,
    };
    actionDetails.targetPosition = targetPosition;

    const chessObject = ChessFactory.createChess(casterChess, game);
    chessObject.move(targetPosition);

    return game;
  }

  private static processAttackChess(
    game: Game,
    isBlue: boolean,
    casterChess: Chess,
    targetPosition: Square,
    actionDetails: ActionDetails
  ): Game {
    // First try to find an enemy piece
    let targetChess = this.getChess(game, !isBlue, targetPosition);

    // If no enemy piece found, check for neutral monsters (Drake, Baron)
    if (!targetChess) {
      targetChess =
        game.board.find(
          (chess) =>
            chess.position.x === targetPosition.x &&
            chess.position.y === targetPosition.y &&
            chess.stats.hp > 0 &&
            chess.ownerId === "neutral"
        ) || null;
    }

    if (!targetChess) {
      throw new Error("Target not found");
    }

    actionDetails.targetId = targetChess.id;
    actionDetails.targetPosition = targetPosition;

    // Check if Guinsoo's Rageblade will proc on this attack (before executing the attack)
    // For Sand Soldiers, check Azir's items instead
    let guinsooRageblade;
    if (
      casterChess.name === "Sand Soldier" &&
      casterChess.skill?.payload?.azirId
    ) {
      // Find Azir on the board
      const azir = game.board.find(
        (chess) =>
          chess.id === casterChess.skill.payload.azirId && chess.stats.hp > 0
      );
      if (azir) {
        guinsooRageblade = azir.items.find(
          (item) => item.id === "guinsoo_rageblade"
        );
      }
    } else {
      // Normal chess pieces - check their own items
      guinsooRageblade = casterChess.items.find(
        (item) => item.id === "guinsoo_rageblade"
      );
    }

    if (guinsooRageblade && guinsooRageblade.currentCooldown <= 0) {
      actionDetails.guinsooProc = true;
    }

    const hpBefore = targetChess.stats.hp;

    const chessObject = ChessFactory.createChess(casterChess, game);
    const targetChessObject = ChessFactory.createChess(targetChess, game);
    chessObject.executeAttack(targetChessObject);

    const hpAfter = targetChess.stats.hp;
    actionDetails.damage = Math.max(0, hpBefore - hpAfter);

    // After executing the attack, check for attack-triggered payload data
    if (casterChess.skill?.payload) {
      // Yasuo's Way of the Wanderer: whirlwindTargets (triggered on critical strike)
      if (casterChess.skill.payload.whirlwindTargets !== undefined) {
        actionDetails.whirlwindTargets =
          casterChess.skill.payload.whirlwindTargets;
        // Clear the payload after copying so it doesn't persist to next attack
        delete casterChess.skill.payload.whirlwindTargets;
      }

      // Jhin and Tristana's 4th shot detection
      if (
        (casterChess.name === "Jhin" || casterChess.name === "Tristana") &&
        casterChess.skill.payload.attackCount !== undefined &&
        casterChess.skill.payload.attackCount % 4 === 0
      ) {
        actionDetails.fourthShotProc = true;

        // For Tristana, collect AOE targets (adjacent enemies hit by explosion)
        if (casterChess.name === "Tristana") {
          const adjacentSquares = this.getAdjacentSquares(targetPosition);
          const aoeTargets: Array<{
            targetId: string;
            targetPosition: Square;
          }> = [];

          for (const square of adjacentSquares) {
            const adjacentEnemy = this.getChess(game, !isBlue, square);
            if (adjacentEnemy && adjacentEnemy.stats.hp > 0) {
              aoeTargets.push({
                targetId: adjacentEnemy.id,
                targetPosition: square,
              });
            }
          }

          if (aoeTargets.length > 0) {
            actionDetails.fourthShotAoeTargets = aoeTargets;
          }
        }
      }
    }

    return game;
  }

  private static processSkill(
    game: Game,
    casterChess: Chess,
    skillPosition?: Square,
    actionDetails?: ActionDetails
  ): Game {
    if (actionDetails && casterChess.skill) {
      actionDetails.skillName = casterChess.skill.name;
      actionDetails.targetPosition = skillPosition;

      // Set targetId if there's a piece at the target position
      if (skillPosition) {
        const targetChess =
          this.getChess(game, true, skillPosition) ||
          this.getChess(game, false, skillPosition);
        if (targetChess) {
          actionDetails.targetId = targetChess.id;
        }
      }
    }

    const chessObject = ChessFactory.createChess(casterChess, game);
    chessObject.executeSkill(skillPosition);

    // Ionic Spark: Deal damage to caster when they use an ability
    const ionicSparkHolders = game.board.filter(
      (piece) =>
        piece.blue !== casterChess.blue && // Enemy team
        piece.stats.hp > 0 &&
        piece.items.some((item) => item.id === "ionic_spark")
    );

    for (const holder of ionicSparkHolders) {
      const ionicSparkItem = holder.items.find(
        (item) => item.id === "ionic_spark"
      );
      if (ionicSparkItem && ionicSparkItem.currentCooldown <= 0) {
        // Calculate damage: 5x skill cooldown
        const skillCooldown = casterChess.skill?.cooldown || 0;
        const damage = skillCooldown * 5;

        // Deal magic damage from Ionic Spark holder to caster
        const holderObject = ChessFactory.createChess(holder, game);
        holderObject.dealDamage(
          chessObject,
          damage,
          "magic",
          holderObject.sunder
        );

        // Set item on cooldown
        ionicSparkItem.currentCooldown = ionicSparkItem.cooldown || 7;
      }
    }

    // After executing the skill, check for skill-specific payload data
    if (actionDetails && casterChess.skill?.payload) {
      // Blitzcrank's Rocket Grab: pulledToPosition
      if (casterChess.skill.payload.pulledToPosition) {
        actionDetails.pulledToPosition =
          casterChess.skill.payload.pulledToPosition;
      }

      // Twisted Fate's Pick a Card: cardTargets
      if (casterChess.skill.payload.cardTargets) {
        (actionDetails as any).cardTargets =
          casterChess.skill.payload.cardTargets;
      }
      if (casterChess.skill.payload.totalCardCount) {
        (actionDetails as any).totalCardCount =
          casterChess.skill.payload.totalCardCount;
      }

      // Viktor's Siphon Power: viktorModules
      if (casterChess.skill.payload.viktorModules) {
        (actionDetails as any).viktorModules =
          casterChess.skill.payload.viktorModules;
      }
    }

    return game;
  }

  private static isBlueTurn(game: Game): boolean {
    return game.currentRound % 2 !== 0;
  }

  // Shuffle shop items - randomly select N items from basic items
  private static shuffleShopItems(game: Game): void {
    // Use seeded RNG for deterministic shuffling
    const rng = getGameRng();
    const shuffled = rng.shuffle([...basicItems]);

    // Take the first N items
    game.shopItems = shuffled.slice(0, SHOP_ITEMS_COUNT).map((item) => item.id);
    game.shopRefreshRound = game.currentRound;
  }

  private static startNextRound(game: Game): Game {
    // Now increment the round for the next player
    game.currentRound++;

    if (game.currentRound % 20 === 0) {
      game.players[0].gold += 50;
      game.players[1].gold += 50;
    }

    // Refresh shop items after red player's turn every SHOP_REFRESH_INTERVAL rounds
    // (currentRound - 1) is the just-completed round; check if it's a refresh interval
    const justCompletedRound = game.currentRound - 1;
    if (
      justCompletedRound > 0 &&
      justCompletedRound % SHOP_REFRESH_INTERVAL === 0
    ) {
      this.shuffleShopItems(game);
    }

    const currentPlayerId = this.isBlueTurn(game)
      ? game.bluePlayer
      : game.redPlayer;

    // Reset turn action flags for the new turn
    game.hasBoughtItemThisTurn = false;
    game.hasPerformedActionThisTurn = false;

    // Find the player by index to ensure proper mutation
    const playerIndex = game.players.findIndex(
      (p) => p.userId === currentPlayerId
    );
    if (playerIndex !== -1) {
      game.players[playerIndex].gold += 5;
    }

    // Prepare pieces for the next turn
    game.board.forEach((chess) => {
      const chessObject = ChessFactory.createChess(chess, game);
      chessObject.preEnterTurn(this.isBlueTurn(game));
    });
    return game;
  }

  // Apply all active auras as debuffs
  private static applyAuraDebuffs(game: Game): void {
    // First, clean up expired aura debuffs
    game.board.forEach((chess) => {
      const chessObject = ChessFactory.createChess(chess, game);
      chessObject.cleanupExpiredAuraDebuffs();
    });

    // Then apply current auras
    game.board.forEach((chess) => {
      const chessObject = ChessFactory.createChess(chess, game);
      chessObject.applyAuraDebuffs();
    });
  }

  // Debug method to show all active auras in the game
  public static getActiveAuras(
    game: Game
  ): Array<{ chessName: string; auras: any[] }> {
    const result: Array<{ chessName: string; auras: any[] }> = [];

    game.board.forEach((chess) => {
      if (chess && chess.auras && chess.auras.length > 0) {
        const activeAuras = chess.auras.filter((aura) => aura.active);
        if (activeAuras.length > 0) {
          result.push({
            chessName: chess.name,
            auras: activeAuras.map((aura) => ({
              id: aura.id,
              name: aura.name,
              description: aura.description,
              range: aura.range,
              effects: aura.effects,
            })),
          });
        }
      }
    });

    return result;
  }

  // Get all pieces affected by a specific chess piece's auras
  public static getAuraTargets(game: Game, sourceChess: any): any[] {
    const targets: any[] = [];
    const sourceChessObject = ChessFactory.createChess(sourceChess, game);

    sourceChess.auras.forEach((aura: any) => {
      if (!aura.active) return;

      game.board.forEach((targetChess: any) => {
        if (!targetChess || targetChess === sourceChess) return;
        if (targetChess.stats.hp <= 0) return;

        if (
          sourceChessObject.isInAuraRange(sourceChess, targetChess, aura.range)
        ) {
          aura.effects.forEach((effect: any) => {
            if (
              sourceChessObject.shouldAuraAffectTarget(
                sourceChess,
                targetChess,
                effect.target
              )
            ) {
              targets.push({
                targetName: targetChess.name,
                auraName: aura.name,
                effect: effect,
              });
            }
          });
        }
      });
    });

    return targets;
  }

  // Check for pawn promotion according to RULE.md
  private static checkPawnPromotion(game: Game): Game {
    const meleeMinions = game.board.filter(
      (chess) => chess.name === "Melee Minion"
    );

    meleeMinions.forEach((minion) => {
      const shouldPromote = this.shouldPromoteMinion(minion);
      if (shouldPromote) {
        this.promoteMinion(minion);
      }
    });

    return game;
  }

  private static shouldPromoteMinion(minion: Chess): boolean {
    // Blue side minions promote when reaching rank 8 (y = 7 in 0-indexed)
    // Red side minions promote when reaching rank 1 (y = 0 in 0-indexed)
    if (minion.blue && minion.position.y === 7) {
      return true; // Blue minion reached red's back rank
    }
    if (!minion.blue && minion.position.y === 0) {
      return true; // Red minion reached blue's back rank
    }
    return false;
  }

  private static promoteMinion(minion: Chess): void {
    // Transform Melee Minion into Super Minion with enhanced stats
    minion.name = "Super Minion";
    minion.stats.maxHp = 300;
    minion.stats.hp = 300; // Full health on promotion
    minion.stats.ad = 100;
    minion.stats.ap = 100;
    minion.stats.physicalResistance = 50;
    minion.stats.magicResistance = 50;
    minion.stats.goldValue = 50;
    minion.stats.speed = 5;
    minion.cannotMoveBackward = false;
    minion.canOnlyMoveVertically = false;
  }

  // Initialize game board with starting positions according to RULE.md
  public static initGame(
    game: Game,
    blueChampions?: string[],
    redChampions?: string[]
  ): Game {
    if (!game.bluePlayer || !game.redPlayer) {
      throw new Error("Both players must be assigned before initializing game");
    }

    game.board = [];

    // Initialize Blue side (ranks 1 and 2)
    this.initBluePieces(game, blueChampions);

    // Initialize Red side (ranks 7 and 8)
    this.initRedPieces(game, redChampions);

    // Set initial game state
    game.status = "in_progress";
    game.currentRound = 1;
    game.phase = "gameplay";
    game.hasBoughtItemThisTurn = false;
    game.hasPerformedActionThisTurn = false;

    // Initialize player gold (starting gold from game settings)
    const bluePlayerIndex = game.players.findIndex(
      (p) => p.userId === game.bluePlayer
    );
    const redPlayerIndex = game.players.findIndex(
      (p) => p.userId === game.redPlayer
    );
    const devModeGold = isDevelopmentMode() ? 1000 : 0;
    if (bluePlayerIndex !== -1) {
      game.players[bluePlayerIndex].gold =
        devModeGold || game.gameSettings?.startingGold || 0;
    }
    if (redPlayerIndex !== -1) {
      game.players[redPlayerIndex].gold =
        devModeGold || game.gameSettings?.startingGold || 0;
    }

    // Initialize shop items with random selection
    this.shuffleShopItems(game);

    this.applyAuraDebuffs(game);

    return game;
  }

  private static initBluePieces(game: Game, champions?: string[]): void {
    const bluePlayerId = game.bluePlayer!;

    // Rank 1 (y=0): Back rank pieces
    // a1 & h1: Siege Minions (Rooks)
    game.board.push(
      this.createPiece("Siege Minion", { x: 0, y: 0 }, bluePlayerId, true)
    );
    game.board.push(
      this.createPiece("Siege Minion", { x: 7, y: 0 }, bluePlayerId, true)
    );

    // e1: Poro (King)
    game.board.push(
      this.createPiece("Poro", { x: 4, y: 0 }, bluePlayerId, true)
    );

    // b1, c1, d1, f1, g1: Champions (from ban/pick phase)
    const championPositions = [1, 2, 3, 5, 6]; // b1, c1, d1, f1, g1
    championPositions.forEach((x, index) => {
      const championName =
        champions && champions[index] ? champions[index] : "Garen"; // Default champion
      const champion = this.createChampionPiece(
        championName,
        { x, y: 0 },
        bluePlayerId,
        true
      );
      game.board.push(champion);
    });

    // Rank 2 (y=1): Minions
    // a2 & h2: Caster Minions
    game.board.push(
      this.createPiece("Caster Minion", { x: 0, y: 1 }, bluePlayerId, true)
    );
    game.board.push(
      this.createPiece("Caster Minion", { x: 7, y: 1 }, bluePlayerId, true)
    );

    // b2 through g2: Melee Minions
    for (let x = 1; x <= 6; x++) {
      game.board.push(
        this.createPiece("Melee Minion", { x, y: 1 }, bluePlayerId, true)
      );
    }
  }

  private static initRedPieces(game: Game, champions?: string[]): void {
    const redPlayerId = game.redPlayer!;

    // Rank 8 (y=7): Back rank pieces
    // a8 & h8: Siege Minions (Rooks)
    game.board.push(
      this.createPiece("Siege Minion", { x: 0, y: 7 }, redPlayerId, false)
    );
    game.board.push(
      this.createPiece("Siege Minion", { x: 7, y: 7 }, redPlayerId, false)
    );

    // e8: Poro (King)
    game.board.push(
      this.createPiece("Poro", { x: 4, y: 7 }, redPlayerId, false)
    );

    // b8, c8, d8, f8, g8: Champions (from ban/pick phase)
    const championPositions = [1, 2, 3, 5, 6]; // b8, c8, d8, f8, g8
    championPositions.forEach((x, index) => {
      const championName =
        champions && champions[index] ? champions[index] : "Aatrox"; // Default champion
      game.board.push(
        this.createChampionPiece(championName, { x, y: 7 }, redPlayerId, false)
      );
    });

    // Rank 7 (y=6): Minions
    // a7 & h7: Caster Minions
    game.board.push(
      this.createPiece("Caster Minion", { x: 0, y: 6 }, redPlayerId, false)
    );
    game.board.push(
      this.createPiece("Caster Minion", { x: 7, y: 6 }, redPlayerId, false)
    );

    // b7 through g7: Melee Minions
    for (let x = 1; x <= 6; x++) {
      game.board.push(
        this.createPiece("Melee Minion", { x, y: 6 }, redPlayerId, false)
      );
    }
  }

  private static createPiece(
    type: string,
    position: Square,
    ownerId: string,
    isBlue: boolean
  ): Chess {
    const pieceId = `${type.toLowerCase().replace(/\s+/g, "_")}_${position.x}_${position.y}_${Date.now()}`;

    const baseStats = this.getPieceBaseStats(type);
    const { attackProjectile, ...statsOnly } = baseStats;

    return {
      id: pieceId,
      name: type,
      position,
      startingPosition: { x: position.x, y: position.y },
      cannotMoveBackward: type === "Melee Minion" || type === "Caster Minion",
      canOnlyMoveVertically:
        type === "Melee Minion" || type === "Caster Minion",
      hasMovedBefore: false,
      cannotAttack: type === "Poro",
      ownerId,
      blue: isBlue,
      stats: {
        ...statsOnly,
        hp: statsOnly.maxHp, // Start with full HP
      },
      skill:
        type !== "Poro" && !type.includes("Minion")
          ? this.getDefaultSkill(type)
          : undefined,
      attackProjectile: attackProjectile, // Add attackProjectile at the piece level
      items: [],
      debuffs: [],
      auras: [],
      shields: [],
    } as Chess;
  }

  private static getPieceBaseStats(type: string): any {
    const stats: { [key: string]: any } = {
      Poro: {
        maxHp: 100,
        ad: 0,
        ap: 0,
        physicalResistance: 50,
        magicResistance: 50,
        speed: 1,
        attackRange: {
          range: 0,
          diagonal: false,
          horizontal: false,
          vertical: false,
          lShape: false,
        },
        goldValue: 0, // Game ends if killed
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
        skill: {
          type: "passive",
          name: "Poro Resilience",
          description:
            "Cannot take more than 50% of max HP as damage from a single source.",
          cooldown: 0,
          currentCooldown: 0,
          targetTypes: "none",
          attackRange: {
            range: 0,
            diagonal: false,
            horizontal: false,
            vertical: false,
            lShape: false,
          },
        },
      },
      Champion: {
        maxHp: 80,
        ad: 50,
        ap: 0,
        physicalResistance: 10,
        magicResistance: 10,
        speed: 1,
        attackRange: {
          range: 2,
          diagonal: true,
          horizontal: true,
          vertical: true,
          lShape: false,
        },
        goldValue: 50,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 125,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
      },
      "Siege Minion": {
        maxHp: 200,
        ad: 40,
        ap: 0,
        physicalResistance: 25,
        magicResistance: 10,
        speed: 4,
        attackRange: {
          range: 8,
          diagonal: false,
          horizontal: true,
          vertical: true,
          lShape: false,
        },
        goldValue: 40,
        sunder: 0,
        criticalChance: 10,
        criticalDamage: 125,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
        attackProjectile: {
          shape: "missile",
          color: "#FF6600",
          trailColor: "#FF9944",
          size: 1.2,
          speed: 0.9,
          icon: "💣",
        },
      },
      "Melee Minion": {
        maxHp: 100,
        ad: 25,
        ap: 0,
        physicalResistance: 20,
        magicResistance: 5,
        speed: 1,
        attackRange: {
          range: 1,
          diagonal: true,
          horizontal: true,
          vertical: true,
          lShape: false,
        },
        goldValue: 20,
        sunder: 0,
        criticalChance: 10,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
      },
      "Caster Minion": {
        maxHp: 50,
        ad: 35,
        ap: 0,
        physicalResistance: 15,
        magicResistance: 5,
        speed: 1,
        attackRange: {
          range: 2,
          diagonal: true,
          horizontal: true,
          vertical: true,
          lShape: false,
        },
        goldValue: 25,
        sunder: 0,
        criticalChance: 10,
        criticalDamage: 125,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
        attackProjectile: {
          shape: "orb",
          color: "#9966FF",
          trailColor: "#BB99FF",
          size: 0.6,
          speed: 1.2,
          icon: "⚫",
        },
      },
      "Super Minion": {
        maxHp: 500,
        ad: 50,
        ap: 0,
        physicalResistance: 45,
        magicResistance: 30,
        speed: 2,
        attackRange: {
          range: 1,
          diagonal: true,
          horizontal: true,
          vertical: true,
          lShape: false,
        },
        goldValue: 40,
        sunder: 0,
        criticalChance: 10,
        criticalDamage: 125,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
      },
      "Sand Soldier": {
        maxHp: 100,
        ad: 10,
        ap: 10,
        physicalResistance: 40,
        magicResistance: 25,
        speed: 1,
        attackRange: {
          range: 2,
          diagonal: true,
          horizontal: true,
          vertical: true,
          lShape: false,
        },
        goldValue: 35,
        sunder: 0,
        criticalChance: 10,
        criticalDamage: 125,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
        attackProjectile: {
          shape: "spear",
          color: "#DAA520",
          trailColor: "#F4A460",
          size: 1.0,
          speed: 1.2,
        },
      },
    };

    return stats[type] || stats["Champion"];
  }

  private static createChampionPiece(
    championName: string,
    position: Square,
    ownerId: string,
    isBlue: boolean
  ): Chess {
    // Import champion data to get accurate stats
    const championData = champions.find(
      (c: ChampionData) => c.name === championName
    );

    if (!championData) {
      // Fallback to default champion
      return this.createPiece("Champion", position, ownerId, isBlue);
    }

    const pieceId = `${championName.toLowerCase().replace(/\s+/g, "_")}_${position.x}_${position.y}_${Date.now()}`;

    const result = {
      id: pieceId,
      name: championName,
      position,
      startingPosition: { x: position.x, y: position.y },
      cannotMoveBackward: false,
      canOnlyMoveVertically: false,
      hasMovedBefore: false,
      cannotAttack: false,
      ownerId,
      blue: isBlue,
      stats: {
        hp: championData.stats.maxHp,
        maxHp: championData.stats.maxHp,
        ad: championData.stats.ad ?? 50,
        ap: championData.stats.ap ?? 0,
        physicalResistance: championData.stats.physicalResistance ?? 10,
        magicResistance: championData.stats.magicResistance ?? 10,
        speed: championData.stats.speed ?? 2,
        hpRegen: championData.stats.hpRegen ?? 1,
        attackRange: championData.stats.attackRange ?? {
          range: 2,
          diagonal: true,
          horizontal: true,
          vertical: true,
          lShape: false,
        },
        goldValue: championData.stats.goldValue ?? 50,
        sunder: championData.stats.sunder ?? 0,
        criticalChance: championData.stats.criticalChance ?? 15,
        criticalDamage: championData.stats.criticalDamage ?? 125,
        damageAmplification: championData.stats.damageAmplification ?? 0,
        cooldownReduction: championData.stats.cooldownReduction ?? 0,
        lifesteal: championData.stats.lifesteal ?? 0,
        durability: championData.stats.durability ?? 0,
      },
      skill: championData.skill
        ? {
            type: championData.skill.type,
            name: championData.skill.name,
            description: championData.skill.description,
            cooldown: championData.skill.cooldown,
            currentCooldown: championData.skill.currentCooldown || 0,
            attackRange: championData.skill.attackRange ||
              championData.stats.attackRange || {
                range: 1,
                diagonal: true,
                horizontal: true,
                vertical: true,
              },
            targetTypes: championData.skill.targetTypes || "none",
          }
        : undefined,
      items: [],
      debuffs: [],
      auras: championData.aura ? [championData.aura] : [],
      shields: [],
    } as Chess;

    // Initialize Viktor's module data in skill.payload if this is Viktor
    if (championName === "Viktor") {
      const rng = getGameRng();
      result.skill.payload = {
        currentModuleIndex: rng.nextInt(0, getViktorModulesCount()), // Random starting module (deterministic)
        cumulativeDamage: 0, // No damage dealt yet
        unlockedModulesCount: 0, // No modules unlocked yet
      };
    }

    return result;
  }

  private static getDefaultSkill(type: string): any {
    // Return a basic skill structure - would be replaced with actual champion skills
    return {
      type: "passive",
      name: "Default Skill",
      description: "Default skill for " + type,
      cooldown: 0,
      currentCooldown: 0,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
        lShape: false,
      },
      targetTypes: "none",
    };
  }

  // Spawn neutral monsters according to RULE.md
  private static spawnNeutralMonsters(game: Game): Game {
    // Drake spawns at i4 at end of Red's 5th turn (round 10)
    if (game.currentRound === 10) {
      this.spawnDrake(game);
    }

    // Baron spawns at z5 at end of Red's 10th turn (round 20)
    if (game.currentRound === 20) {
      this.spawnBaron(game);
    }

    // Check for monster respawning (10 turns after death)
    this.checkMonsterRespawn(game);

    return game;
  }

  private static spawnDrake(game: Game): void {
    // Check if Drake already exists
    const existingDrake = game.board.find((chess) => chess.name === "Drake");
    if (existingDrake) return;

    const drakePosition = { x: 8, y: 3 }; // i4 position (i=8, 4=3 in 0-indexed)

    // Check if position is occupied by another piece
    const occupiedByPiece = game.board.find(
      (chess) =>
        chess.position.x === drakePosition.x &&
        chess.position.y === drakePosition.y
    );

    // If position is occupied, don't spawn yet (will retry next turn)
    if (occupiedByPiece) {
      return;
    }

    const drake: Chess = {
      id: `drake_${game.currentRound}`,
      name: "Drake",
      position: drakePosition,
      cannotMoveBackward: false,
      cannotAttack: false,
      ownerId: "neutral",
      blue: false, // Neutral
      stats: {
        hp: 250,
        maxHp: 250,
        ad: 0,
        ap: 0,
        physicalResistance: 20,
        magicResistance: 20,
        speed: 0, // Cannot move
        attackRange: {
          range: 0,
          diagonal: false,
          horizontal: false,
          vertical: false,
          lShape: false,
        },
        goldValue: 10,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
      },
      skill: undefined,
      items: [],
      debuffs: [],
      auras: [],
      shields: [],
    } as Chess;

    game.board.push(drake);
  }

  private static spawnBaron(game: Game): void {
    // Check if Baron already exists
    const existingBaron = game.board.find(
      (chess) => chess.name === "Baron Nashor"
    );
    if (existingBaron) return;

    const baronPosition = { x: -1, y: 4 }; // z5 position (z=-1, 5=4 in 0-indexed)

    // Check if position is occupied by another piece
    const occupiedByPiece = game.board.find(
      (chess) =>
        chess.position.x === baronPosition.x &&
        chess.position.y === baronPosition.y
    );

    // If position is occupied, don't spawn yet (will retry next turn)
    if (occupiedByPiece) {
      return;
    }

    const baron: Chess = {
      id: `baron_${game.currentRound}`,
      name: "Baron Nashor",
      position: baronPosition,
      cannotMoveBackward: false,
      cannotAttack: false,
      ownerId: "neutral",
      blue: false, // Neutral
      stats: {
        hp: 500,
        maxHp: 500,
        ad: 0,
        ap: 0,
        physicalResistance: 50,
        magicResistance: 50,
        speed: 0, // Cannot move
        attackRange: {
          range: 0,
          diagonal: false,
          horizontal: false,
          vertical: false,
          lShape: false,
        },
        goldValue: 50,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
        cooldownReduction: 0,
        lifesteal: 0,
        durability: 0,
      },
      skill: undefined,
      items: [],
      debuffs: [],
      auras: [],
      shields: [],
    } as Chess;

    game.board.push(baron);
  }

  private static checkMonsterRespawn(game: Game): void {
    // This would need to be implemented with a death tracking system
    // For now, we'll implement basic respawn logic

    // Check for Drake respawn (every 10 turns after initial spawn if dead)
    if (game.currentRound > 10 && (game.currentRound - 10) % 10 === 0) {
      const drake = game.board.find((chess) => chess.name === "Drake");
      if (!drake) {
        this.spawnDrake(game);
      }
    }

    // Check for Baron respawn (every 10 turns after initial spawn if dead)
    if (game.currentRound > 20 && (game.currentRound - 20) % 10 === 0) {
      const baron = game.board.find((chess) => chess.name === "Baron Nashor");
      if (!baron) {
        this.spawnBaron(game);
      }
    }
  }

  // Process BUY_ITEM event
  private static processBuyItem(
    game: Game,
    playerId: string,
    itemId: string,
    championId?: string,
    actionDetails?: ActionDetails
  ): Game {
    // Validate purchase timing
    if (game.hasBoughtItemThisTurn) {
      throw new Error("Already bought an item this turn");
    }

    if (game.hasPerformedActionThisTurn) {
      throw new Error("Cannot buy items after performing a board action");
    }

    if (actionDetails) {
      actionDetails.itemId = itemId;
      actionDetails.targetId = championId;
    }
    const playerIndex = game.players.findIndex((p) => p.userId === playerId);
    if (playerIndex === -1) {
      throw new Error("Player not found");
    }
    const player = game.players[playerIndex];

    // Get item data
    const itemData = getItemById(itemId);

    if (!itemData) {
      throw new Error("Item not found");
    }

    // Check if this is a Viktor module
    const isViktorModule = itemData.isViktorModule === true;

    // Only basic items OR Viktor modules can be purchased directly
    if (!itemData.isBasic && !isViktorModule) {
      throw new Error(
        "Can only purchase basic items. Combined items are created automatically."
      );
    }

    // Calculate current item price with inflation (only for basic items, not Viktor modules)
    const itemCost = isViktorModule
      ? itemData.cost
      : this.getCurrentItemPrice(player);

    if (player.gold < itemCost) {
      throw new Error("Insufficient gold");
    }

    if (!championId) {
      throw new Error("Must specify a champion to give the item to");
    }

    const champion = game.board.find(
      (chess) => chess.id === championId && chess.ownerId === playerId
    );
    if (!champion) {
      throw new Error("Champion not found or not owned by player");
    }

    // Viktor modules can only be bought for Viktor
    if (isViktorModule) {
      if (champion.name !== "Viktor") {
        throw new Error("Viktor modules can only be equipped by Viktor");
      }

      // Initialize Viktor's module data in skill.payload if not present
      if (!champion.skill?.payload) {
        const rng = getGameRng();
        champion.skill.payload = {
          currentModuleIndex: rng.nextInt(0, getViktorModulesCount()),
          cumulativeDamage: 0,
          unlockedModulesCount: 0,
        };
      }

      // Check if this module is the currently available one
      const currentModuleIndex = champion.skill.payload.currentModuleIndex;
      const expectedModuleId = `viktor_module_${(currentModuleIndex % 5) + 1}`;
      if (itemId !== expectedModuleId) {
        throw new Error(
          "This module is not currently available in Viktor's shop"
        );
      }

      // Check damage thresholds: 50/150/300 for 1st/2nd/3rd modules
      const modulesPurchased = champion.items.filter(
        (item) => getItemById(item.id)?.isViktorModule
      ).length;
      const damageThresholds = [50, 150, 300];
      const requiredDamage = damageThresholds[modulesPurchased] || 9999;

      if (champion.skill.payload.cumulativeDamage < requiredDamage) {
        throw new Error(
          `Need ${requiredDamage} cumulative Siphon Power damage to unlock this module (current: ${champion.skill.payload.cumulativeDamage})`
        );
      }
    }

    // Only champions can receive items (not minions, Poro, or neutral monsters)
    const nonChampionTypes = [
      "Poro",
      "Melee Minion",
      "Caster Minion",
      "Siege Minion",
      "Super Minion",
      "Drake",
      "Baron Nashor",
    ];
    if (nonChampionTypes.includes(champion.name)) {
      throw new Error("Only champions can equip items");
    }

    if (champion.items.length >= 3) {
      if (champion.items.length === 3) {
        if (champion.items.every((item) => !getItemById(item.id)?.isBasic)) {
          throw new Error("Champion already has maximum items (3)");
        }
      } else {
        throw new Error("Champion already has maximum items (3)");
      }
    }

    // Add item to champion
    const newItem = {
      id: itemData.id,
      name: itemData.name,
      description: itemData.description,
      stats: this.convertItemEffectsToStats(itemData.effects),
      unique: itemData.unique || false,
      cooldown: itemData.cooldown || 0,
      currentCooldown: 0,
    };

    const championObject = ChessFactory.createChess(champion, game);
    let maxHpBefore = championObject.maxHp;
    championObject.acquireItem(newItem);

    // Check for item combining (TFT-style) - but not for Viktor modules
    if (!isViktorModule) {
      this.checkAndCombineItems(championObject);
    }

    // After combining, check if champion has more than 3 items
    if (championObject.chess.items.length > 3) {
      throw new Error("Champion already has maximum items (3)");
    }

    let maxHpAfter = championObject.maxHp;
    let hpIncrease = maxHpAfter - maxHpBefore;
    championObject.chess.stats.hp += hpIncrease;

    // For Viktor modules, shuffle to next module in rotation
    if (isViktorModule && champion.skill?.payload) {
      champion.skill.payload.currentModuleIndex =
        (champion.skill.payload.currentModuleIndex + 1) %
        getViktorModulesCount();

      // Check if Viktor now has 3 modules (all item slots are modules)
      const moduleCount = champion.items.filter(
        (item) => getItemById(item.id)?.isViktorModule
      ).length;
      if (moduleCount >= 3) {
        // Apply permanent 50% AP bonus as a debuff
        const hasGloriousEvolution = champion.debuffs?.some(
          (d) => d.id === "viktor_glorious_evolution"
        );
        if (!hasGloriousEvolution) {
          const apBonusDebuff = {
            id: "viktor_glorious_evolution",
            name: "Glorious Evolution",
            description: "Viktor has fully evolved, gaining 50% bonus AP.",
            duration: -1,
            maxDuration: -1,
            effects: [
              {
                stat: "ap",
                modifier: 1.5,
                type: "multiply",
              },
            ],
            damagePerTurn: 0,
            damageType: "magic" as const,
            healPerTurn: 0,
            stun: false,
            unique: true,
            currentStacks: 1,
            maximumStacks: 1,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Viktor",
          };
          if (!champion.debuffs) {
            champion.debuffs = [];
          }
          champion.debuffs.push(apBonusDebuff);
        }
      }
    }

    // Deduct gold and increment items bought counter (only for basic items)
    game.players[playerIndex].gold -= itemCost;
    if (!isViktorModule) {
      game.players[playerIndex].itemsBought += 1;
    }

    // Mark that an item was bought this turn
    game.hasBoughtItemThisTurn = true;

    return game;
  }

  /**
   * Calculate the current item price based on player's inflation system
   * Price = baseItemCost + (itemsBought * inflationStep)
   */
  private static getCurrentItemPrice(player: Player): number {
    return (
      player.baseItemCost +
      Math.min(player.itemsBought, 5) * player.inflationStep
    );
  }

  // Convert item effects to ChessStats format
  private static convertItemEffectsToStats(effects: any[]): any {
    const stats: any = {};
    effects.forEach((effect) => {
      if (effect.type === "add") {
        stats[effect.stat] = effect.value;
      }
    });
    return stats;
  }

  // Check if two basic items can combine into a stronger item
  private static checkAndCombineItems(champion: ChessObject): void {
    if (champion.chess.items.length < 2) return;

    const championBasicItems = champion.chess.items.filter(
      (item) => getItemById(item.id)?.isBasic
    );

    // Check all pairs of items for possible combinations
    for (let i = 0; i < championBasicItems.length - 1; i++) {
      for (let j = i + 1; j < championBasicItems.length; j++) {
        const item1 = championBasicItems[i];
        const item2 = championBasicItems[j];

        const combinedItemData = findCombinedItem(item1.id, item2.id);

        if (combinedItemData) {
          // Check if champion already has this unique item
          if (combinedItemData.unique) {
            const hasUnique = champion.chess.items.some(
              (item) => item.id === combinedItemData.id
            );
            if (hasUnique) continue; // Skip if already has this unique item
          }

          // Remove the two basic items
          const item1Index = champion.chess.items.indexOf(item1);
          const item2Index = champion.chess.items.indexOf(item2);
          champion.chess.items.splice(item2Index, 1); // Remove second item first (higher index)
          champion.chess.items.splice(item1Index, 1); // Then remove first item

          // Add the combined item
          const combinedItem = {
            id: combinedItemData.id,
            name: combinedItemData.name,
            description: combinedItemData.description,
            stats: this.convertItemEffectsToStats(combinedItemData.effects),
            unique: combinedItemData.unique || false,
            cooldown: combinedItemData.cooldown || 0,
            currentCooldown: 0,
          };

          champion.acquireItem(combinedItem);
          // Recursively check for more combinations
          this.checkAndCombineItems(champion);
          return;
        }
      }
    }
  }

  // Award buffs for killing neutral monsters
  public static awardMonsterKillReward(
    game: Game,
    killerPlayerId: string,
    monsterName: string
  ): void {
    const playerIndex = game.players.findIndex(
      (p) => p.userId === killerPlayerId
    );
    if (playerIndex === -1) return;

    if (monsterName === "Drake") {
      // Award Drake Soul Buff: +50 Gold, All pieces gain +20 AD
      game.players[playerIndex].gold += 50;
      this.applyDrakeSoulBuff(game, killerPlayerId);
    } else if (monsterName === "Baron Nashor") {
      // Award Hand of Baron Buff: +250 Gold, buffs for minions and champions
      game.players[playerIndex].gold += 250;
      this.applyHandOfBaronBuff(game, killerPlayerId);
    }
  }

  private static applyDrakeSoulBuff(game: Game, playerId: string): void {
    // Drake Soul Buff: All pieces gain +20 AD
    const playerPieces = game.board.filter(
      (chess) => chess.ownerId === playerId
    );
    playerPieces.forEach((chess) => {
      chess.stats.ad += 20;
    });
  }

  private static applyHandOfBaronBuff(game: Game, playerId: string): void {
    // Hand of Baron Buff:
    // - Minions and Siege Minions: +40 AD and +40 Physical Resistance
    // - Champions: +20 AP, +20 AD, +20 Physical Resistance, +20 Magic Resistance
    const playerPieces = game.board.filter(
      (chess) => chess.ownerId === playerId
    );

    playerPieces.forEach((chess) => {
      const isMinion =
        chess.name === "Melee Minion" ||
        chess.name === "Caster Minion" ||
        chess.name === "Siege Minion" ||
        chess.name === "Super Minion";

      const isChampion = !isMinion && chess.name !== "Poro";

      if (isMinion) {
        chess.stats.ad += 40;
        chess.stats.physicalResistance += 40;
      } else if (isChampion) {
        chess.stats.ap += 20;
        chess.stats.ad += 20;
        chess.stats.physicalResistance += 20;
        chess.stats.magicResistance += 20;
      }
    });
  }

  // Enhanced game over detection with stalemate
  private static checkGameOver(game: Game): Game {
    const poros = game.board.filter(
      (chess) => chess.name === "Poro" && chess.stats.hp > 0
    );

    // Check if a Poro is killed
    if (poros.length === 1) {
      game.status = "finished";
      game.winner = poros[0].ownerId === game.bluePlayer ? "blue" : "red";
      return game;
    }

    // Draw if both sides have only Poro left
    if (poros.length === 2 && game.board.length === 2) {
      game.status = "finished";
      game.winner = null;
    }

    return game;
  }
}
