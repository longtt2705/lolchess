import { ChessFactory } from "./class/chessFactory";
import { ChampionData } from "./data/champion";
import { GameEvent, EventPayload, Chess, Square } from "./game.schema";
import { Game } from "./game.schema";
import { champions } from "./data/champion";

export class GameLogic {
  public static processGame(game: Game, event: EventPayload): Game {
    if (!game) {
      throw new Error("Game not found");
    }

    const isBlue = event.playerId === game.bluePlayer;

    const casterChess = this.getChess(game, isBlue, event.casterPosition);
    if (!casterChess) {
      throw new Error("Caster not found");
    }

    switch (event.event) {
      case GameEvent.MOVE_CHESS:
        this.processMoveChess(game, isBlue, casterChess, event.targetPosition);
        break;
      case GameEvent.ATTACK_CHESS: {
        this.processAttackChess(
          game,
          isBlue,
          casterChess,
          event.targetPosition
        );
        break;
      }
      case GameEvent.SKILL: {
        this.processSkill(game, casterChess, event.targetPosition);
        break;
      }
      case GameEvent.BUY_ITEM: {
        this.processBuyItem(
          game,
          event.playerId,
          event.itemId!,
          event.targetChampionId
        );
        break;
      }
      default:
        break;
    }

    this.postProcessGame(game);
    return game;
  }

  private static clearDeadChess(game: Game): Game {
    game.board = game.board.filter((chess) => chess.stats.hp > 0);
    return game;
  }

  private static postProcessGame(game: Game): Game {
    this.clearDeadChess(game);
    this.checkPawnPromotion(game);
    this.checkGameOver(game);
    this.spawnNeutralMonsters(game);
    this.startNextRound(game);
    return game;
  }

  public static getChess(
    game: Game,
    isBlue: boolean,
    square: Square
  ): Chess | null {
    const chess = game.board.find(
      (chess) => chess.position.x === square.x && chess.position.y === square.y
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
      { x: square.x - 1, y: square.y - 1 },
      { x: square.x - 1, y: square.y },
      { x: square.x - 1, y: square.y + 1 },
      { x: square.x, y: square.y - 1 },
      { x: square.x + 1, y: square.y },
      { x: square.x + 1, y: square.y + 1 },
      { x: square.x, y: square.y + 1 },
    ];
  }

  private static processMoveChess(
    game: Game,
    isBlue: boolean,
    casterChess: Chess,
    targetPosition: Square
  ): Game {
    const targetChess = this.getChess(game, isBlue, targetPosition);
    if (targetChess) {
      throw new Error("Target is already occupied");
    }
    const chessObject = ChessFactory.createChess(casterChess, game);
    chessObject.move(targetPosition);

    return game;
  }

  private static processAttackChess(
    game: Game,
    isBlue: boolean,
    casterChess: Chess,
    targetPosition: Square
  ): Game {
    const targetChess = this.getChess(game, !isBlue, targetPosition);
    if (!targetChess) {
      throw new Error("Target not found");
    }

    const chessObject = ChessFactory.createChess(casterChess, game);
    const targetChessObject = ChessFactory.createChess(targetChess, game);
    chessObject.attack(targetChessObject);

    return game;
  }

  private static processSkill(
    game: Game,
    casterChess: Chess,
    skillPosition?: Square
  ): Game {
    const chessObject = ChessFactory.createChess(casterChess, game);
    chessObject.skill(skillPosition);

    return game;
  }

  private static isBlueTurn(game: Game): boolean {
    return game.currentRound % 2 === 0;
  }

  private static startNextRound(game: Game): Game {
    game.currentRound++;

    // Award passive gold income (3 gold per turn) to current player
    const currentPlayerId = this.isBlueTurn(game)
      ? game.bluePlayer
      : game.redPlayer;
    const currentPlayer = game.players.find((p) => p.id === currentPlayerId);
    if (currentPlayer) {
      currentPlayer.gold += 3;
    }

    game.board.forEach((chess) => {
      const chessObject = ChessFactory.createChess(chess, game);
      chessObject.preEnterTurn(this.isBlueTurn(game));
    });
    return game;
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
    const bluePlayer = game.players.find((p) => p.id === game.bluePlayer);
    const redPlayer = game.players.find((p) => p.id === game.redPlayer);
    if (bluePlayer) bluePlayer.gold = game.gameSettings?.startingGold || 0;
    if (redPlayer) redPlayer.gold = game.gameSettings?.startingGold || 0;

    console.log(
      "game.board",
      game.board.filter((chess) => chess.skill)
    );

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
        maxHp: 400,
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
        },
        goldValue: 0, // Game ends if killed
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
        ad: championData.stats.ad || 50,
        ap: championData.stats.ap || 0,
        physicalResistance: championData.stats.physicalResistance || 10,
        magicResistance: championData.stats.magicResistance || 10,
        speed: championData.stats.speed || 2,
        attackRange: championData.stats.attackRange || {
          range: 2,
          diagonal: true,
          horizontal: true,
          vertical: true,
        },
        goldValue: championData.stats.goldValue || 50,
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

    console.log(
      `Final champion ${championName} skill:`,
      championData.skill
        ? {
            name: championData.skill.name,
            type: championData.skill.type,
            cooldown: championData.skill.cooldown,
            targetTypes: championData.skill.targetTypes || "none",
            currentCooldown: championData.skill.currentCooldown || 0,
            hasAttackRange: !!(
              championData.skill.attackRange || championData.stats.attackRange
            ),
          }
        : "no skill data"
    );

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

    const drake: Chess = {
      id: `drake_${game.currentRound}`,
      name: "Drake",
      position: { x: 8, y: 3 }, // i4 position (i=8, 4=3 in 0-indexed)
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
      },
      skill: undefined,
      items: [],
      debuffs: [],
      auras: [],
    } as Chess;

    game.board.push(drake);
  }

  private static spawnBaron(game: Game): void {
    // Check if Baron already exists
    const existingBaron = game.board.find(
      (chess) => chess.name === "Baron Nashor"
    );
    if (existingBaron) return;

    const baron: Chess = {
      id: `baron_${game.currentRound}`,
      name: "Baron Nashor",
      position: { x: -1, y: 4 }, // z5 position (z=-1, 5=4 in 0-indexed)
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
      },
      skill: undefined,
      items: [],
      debuffs: [],
      auras: [],
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
    championId?: string
  ): Game {
    const player = game.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Find the item in shop (this would be implemented with an item system)
    const itemCost = this.getItemCost(itemId);
    if (player.gold < itemCost) {
      throw new Error("Insufficient gold");
    }

    if (championId) {
      const champion = game.board.find(
        (chess) => chess.id === championId && chess.ownerId === playerId
      );
      if (!champion) {
        throw new Error("Champion not found or not owned by player");
      }

      if (champion.items.length >= 3) {
        throw new Error("Champion already has maximum items (3)");
      }

      // Add item to champion (simplified - would need full item system)
      champion.items.push({
        id: itemId,
        name: itemId, // Simplified
        stats: this.getItemStats(itemId),
      } as any);
    }

    player.gold -= itemCost;
    return game;
  }

  private static getItemCost(itemId: string): number {
    // Simplified item cost system - would be expanded with full item database
    const itemCosts: { [key: string]: number } = {
      sword: 20,
      shield: 25,
      boots: 15,
      armor: 30,
      // Add more items as needed
    };
    return itemCosts[itemId] || 10;
  }

  private static getItemStats(itemId: string): any {
    // Simplified item stats - would be expanded with full item database
    const itemStats: { [key: string]: any } = {
      sword: { ad: 10 },
      shield: { physicalResistance: 5 },
      boots: { speed: 1 },
      armor: { physicalResistance: 10, magicResistance: 5 },
    };
    return itemStats[itemId] || {};
  }

  // Award buffs for killing neutral monsters
  public static awardMonsterKillReward(
    game: Game,
    killerPlayerId: string,
    monsterName: string
  ): void {
    const player = game.players.find((p) => p.id === killerPlayerId);
    if (!player) return;

    if (monsterName === "Drake") {
      // Award Drake Soul Buff: All pieces gain +10 AD
      player.gold += 10;
      this.applyDrakeSoulBuff(game, killerPlayerId);
    } else if (monsterName === "Baron Nashor") {
      // Award Hand of Baron Buff: All Minions and Siege Minions gain +20 AD and +20 Physical Resistance
      player.gold += 50;
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
    const poros = game.board.filter((chess) => chess.name === "Poro");

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
