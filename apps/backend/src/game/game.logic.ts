import { ChessFactory } from "./class/chessFactory";
import { ChampionData } from "./data/champion";
import {
  GameEvent,
  EventPayload,
  Chess,
  Square,
  ActionDetails,
} from "./game.schema";
import { Game } from "./game.schema";
import { champions } from "./data/champion";
import { ItemData } from "./data/items";
import { ChessObject } from "./class/chess";

export class GameLogic {
  public static processGame(game: Game, event: EventPayload): Game {
    if (!game) {
      throw new Error("Game not found");
    }

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

    switch (event.event) {
      case GameEvent.MOVE_CHESS:
        this.processMoveChess(
          game,
          isBlue,
          casterChess,
          event.targetPosition,
          actionDetails
        );
        break;
      case GameEvent.ATTACK_CHESS: {
        this.processAttackChess(
          game,
          isBlue,
          casterChess,
          event.targetPosition,
          actionDetails
        );
        break;
      }
      case GameEvent.SKILL: {
        this.processSkill(
          game,
          casterChess,
          event.targetPosition,
          actionDetails
        );
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

    // Assign action details to game
    game.lastAction = actionDetails;

    this.applyAuraDebuffs(game);

    this.postProcessGame(game);
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

  public static getAdjacentSquares(square: Square): Square[] {
    return [
      { x: square.x - 1, y: square.y - 1 }, // Northwest
      { x: square.x - 1, y: square.y }, // West
      { x: square.x - 1, y: square.y + 1 }, // Southwest
      { x: square.x, y: square.y - 1 }, // North
      { x: square.x, y: square.y + 1 }, // South
      { x: square.x + 1, y: square.y - 1 }, // Northeast (was missing!)
      { x: square.x + 1, y: square.y }, // East
      { x: square.x + 1, y: square.y + 1 }, // Southeast
    ];
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

    const hpBefore = targetChess.stats.hp;

    const chessObject = ChessFactory.createChess(casterChess, game);
    const targetChessObject = ChessFactory.createChess(targetChess, game);
    chessObject.executeAttack(targetChessObject);

    const hpAfter = targetChess.stats.hp;
    actionDetails.damage = Math.max(0, hpBefore - hpAfter);

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

    // After executing the skill, check if there's a pulledToPosition in the payload
    // This is used by Blitzcrank's Rocket Grab to communicate the final pull position
    if (actionDetails && casterChess.skill?.payload?.pulledToPosition) {
      actionDetails.pulledToPosition =
        casterChess.skill.payload.pulledToPosition;
    }

    return game;
  }

  private static isBlueTurn(game: Game): boolean {
    return game.currentRound % 2 !== 0;
  }

  private static startNextRound(game: Game): Game {
    // Now increment the round for the next player
    game.currentRound++;

    const currentPlayerId = this.isBlueTurn(game)
      ? game.bluePlayer
      : game.redPlayer;

    // Find the player by index to ensure proper mutation
    const playerIndex = game.players.findIndex(
      (p) => p.userId === currentPlayerId
    );
    if (playerIndex !== -1) {
      game.players[playerIndex].gold += 3;
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
    minion.stats.maxHp = 200;
    minion.stats.hp = 200; // Full health on promotion
    minion.stats.ad = 50;
    minion.stats.physicalResistance = 25;
    minion.stats.magicResistance = 15;
    minion.stats.goldValue = 40;

    console.log(
      `${minion.blue ? "Blue" : "Red"} Melee Minion promoted to Super Minion at ${minion.position.x},${minion.position.y}!`
    );
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

    // Initialize player gold (starting gold from game settings)
    const bluePlayerIndex = game.players.findIndex(
      (p) => p.userId === game.bluePlayer
    );
    const redPlayerIndex = game.players.findIndex(
      (p) => p.userId === game.redPlayer
    );
    const isDevelopment = process.env.NODE_ENV === "development";
    if (bluePlayerIndex !== -1) {
      game.players[bluePlayerIndex].gold = isDevelopment
        ? 1000
        : game.gameSettings?.startingGold || 0;
    }
    if (redPlayerIndex !== -1) {
      game.players[redPlayerIndex].gold = isDevelopment
        ? 1000
        : game.gameSettings?.startingGold || 0;
    }
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
      console.log("sfsf", champion.skill);
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

    return {
      id: pieceId,
      name: type,
      position,
      cannotMoveBackward: type === "Melee Minion" || type === "Caster Minion",
      canOnlyMoveVertically:
        type === "Melee Minion" || type === "Caster Minion",
      hasMovedBefore: false,
      cannotAttack: type === "Poro",
      ownerId,
      blue: isBlue,
      stats: {
        ...baseStats,
        hp: baseStats.maxHp, // Start with full HP
      },
      skill:
        type !== "Poro" && !type.includes("Minion")
          ? this.getDefaultSkill(type)
          : undefined,
      items: [],
      debuffs: [],
      auras: [],
    } as Chess;
  }

  private static getPieceBaseStats(type: string): any {
    const stats: { [key: string]: any } = {
      Poro: {
        maxHp: 100,
        ad: 0,
        ap: 0,
        physicalResistance: 0,
        magicResistance: 0,
        speed: 1,
        attackRange: {
          range: 0,
          diagonal: false,
          horizontal: false,
          vertical: false,
        },
        goldValue: 0, // Game ends if killed
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
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
        },
        goldValue: 50,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
      },
      "Siege Minion": {
        maxHp: 250,
        ad: 40,
        ap: 0,
        physicalResistance: 10,
        magicResistance: 10,
        speed: 1,
        attackRange: {
          range: 8,
          diagonal: false,
          horizontal: true,
          vertical: true,
        },
        goldValue: 30,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
      },
      "Melee Minion": {
        maxHp: 100,
        ad: 25,
        ap: 0,
        physicalResistance: 5,
        magicResistance: 0,
        speed: 1,
        attackRange: {
          range: 1,
          diagonal: true,
          horizontal: true,
          vertical: true,
        },
        goldValue: 10,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
      },
      "Caster Minion": {
        maxHp: 50,
        ad: 35,
        ap: 0,
        physicalResistance: 0,
        magicResistance: 0,
        speed: 1,
        attackRange: {
          range: 2,
          diagonal: true,
          horizontal: true,
          vertical: true,
        },
        goldValue: 15,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
      },
      "Super Minion": {
        maxHp: 500,
        ad: 50,
        ap: 0,
        physicalResistance: 30,
        magicResistance: 30,
        speed: 2,
        attackRange: {
          range: 1,
          diagonal: true,
          horizontal: true,
          vertical: true,
        },
        goldValue: 40,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
        hpRegen: 0,
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
      console.log(
        `WARNING: Champion data not found for ${championName}, using fallback`
      );
      // Fallback to default champion
      return this.createPiece("Champion", position, ownerId, isBlue);
    }

    console.log(
      `Creating champion ${championName} with skill data:`,
      championData.skill
    );

    const pieceId = `${championName.toLowerCase().replace(/\s+/g, "_")}_${position.x}_${position.y}_${Date.now()}`;

    const result = {
      id: pieceId,
      name: championName,
      position,
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
        },
        goldValue: championData.stats.goldValue ?? 50,
        sunder: championData.stats.sunder ?? 0,
        criticalChance: championData.stats.criticalChance ?? 15,
        criticalDamage: championData.stats.criticalDamage ?? 150,
        damageAmplification: championData.stats.damageAmplification ?? 0,
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
    } as Chess;

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
      console.log(
        `Drake spawn position (${drakePosition.x},${drakePosition.y}) is occupied by ${occupiedByPiece.name}. Waiting...`
      );
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
        hp: 1000,
        maxHp: 1000,
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
        },
        goldValue: 10,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
      },
      skill: undefined,
      items: [],
      debuffs: [],
      auras: [],
    } as Chess;

    console.log(
      `Drake spawned at position (${drakePosition.x},${drakePosition.y})`
    );
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
      console.log(
        `Baron spawn position (${baronPosition.x},${baronPosition.y}) is occupied by ${occupiedByPiece.name}. Waiting...`
      );
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
        hp: 2500,
        maxHp: 2500,
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
        },
        goldValue: 50,
        sunder: 0,
        criticalChance: 0,
        criticalDamage: 150,
        damageAmplification: 0,
      },
      skill: undefined,
      items: [],
      debuffs: [],
      auras: [],
    } as Chess;

    console.log(
      `Baron Nashor spawned at position (${baronPosition.x},${baronPosition.y})`
    );
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
    if (actionDetails) {
      actionDetails.itemId = itemId;
      actionDetails.targetId = championId;
    }
    const playerIndex = game.players.findIndex((p) => p.userId === playerId);
    if (playerIndex === -1) {
      throw new Error("Player not found");
    }
    const player = game.players[playerIndex];

    // Import item system
    const { getItemById } = require("./data/items");
    const itemData = getItemById(itemId);

    if (!itemData) {
      throw new Error("Item not found");
    }

    // Only basic items can be purchased
    if (!itemData.isBasic) {
      throw new Error(
        "Can only purchase basic items. Combined items are created automatically."
      );
    }

    if (player.gold < itemData.cost) {
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
    };

    const championObject = ChessFactory.createChess(champion, game);
    let maxHpBefore = championObject.maxHp;
    championObject.acquireItem(newItem);
    // Check for item combining (TFT-style)
    this.checkAndCombineItems(championObject);
    // After combining, check if champion has more than 3 items
    if (championObject.chess.items.length > 3) {
      throw new Error("Champion already has maximum items (3)");
    }

    let maxHpAfter = championObject.maxHp;
    let hpIncrease = maxHpAfter - maxHpBefore;
    championObject.chess.stats.hp += hpIncrease;

    // Deduct gold
    game.players[playerIndex].gold -= itemData.cost;
    return game;
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

    const { getItemById, findCombinedItem } = require("./data/items");
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
      // Award Drake Soul Buff: All pieces gain +10 AD
      game.players[playerIndex].gold += 10;
      this.applyDrakeSoulBuff(game, killerPlayerId);
    } else if (monsterName === "Baron Nashor") {
      // Award Hand of Baron Buff: All Minions and Siege Minions gain +20 AD and +20 Physical Resistance
      game.players[playerIndex].gold += 50;
      this.applyHandOfBaronBuff(game, killerPlayerId);
    }
  }

  private static applyDrakeSoulBuff(game: Game, playerId: string): void {
    const playerPieces = game.board.filter(
      (chess) => chess.ownerId === playerId
    );
    playerPieces.forEach((chess) => {
      chess.stats.ad += 10;
    });
  }

  private static applyHandOfBaronBuff(game: Game, playerId: string): void {
    const playerMinions = game.board.filter(
      (chess) =>
        chess.ownerId === playerId &&
        (chess.name === "Melee Minion" ||
          chess.name === "Caster Minion" ||
          chess.name === "Siege Minion" ||
          chess.name === "Super Minion")
    );
    playerMinions.forEach((chess) => {
      chess.stats.ad += 20;
      chess.stats.physicalResistance += 20;
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
