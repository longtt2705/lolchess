import {
  Chess,
  Game,
  GameEngine,
  getPlayerPieces,
  getCurrentPlayerId,
  ChessFactory,
  Square,
} from '@lolchess/game-engine';

/**
 * Monster info for evaluation
 */
interface MonsterInfo {
  piece: Chess;
  type: 'drake' | 'baron' | 'elder';
  hpPercent: number;
}

/**
 * Evaluates neutral monster control (Drake, Baron)
 * Helps bot make strategic decisions about contesting objectives
 */
export class NeutralMonsterEvaluator {
  // Monster positions (from game code)
  private static readonly DRAKE_POSITION: Square = { x: 8, y: 3 }; // i4
  private static readonly BARON_POSITION: Square = { x: -1, y: 4 }; // z5

  // Drake type names for identification
  private static readonly DRAKE_TYPES = [
    'Infernal Drake',
    'Cloud Drake',
    'Mountain Drake',
    'Hextech Drake',
    'Ocean Drake',
    'Chemtech Drake',
    'Elder Dragon',
  ];

  // Base buff values for different monster types
  private static readonly BUFF_VALUES: Record<string, number> = {
    'Infernal Drake': 1.4, // +15% AD/AP is strong
    'Cloud Drake': 1.2, // +1 speed is useful
    'Mountain Drake': 1.3, // +25 PR/MR is good for defense
    'Hextech Drake': 1.3, // +10 CDR is great for skills
    'Ocean Drake': 1.1, // +5 HP regen is moderate
    'Chemtech Drake': 1.1, // +10 durability is moderate
    'Elder Dragon': 2.0, // Execute mechanic is extremely valuable
    'Baron Nashor': 1.5, // Team-wide buff is very strong
  };

  // Control scoring weights
  private static readonly WEIGHTS = {
    pieceInRange: 15, // Per piece that can attack monster
    damagePerHp: 0.5, // Score per damage point relative to monster HP
    smiteBonus: 60, // Bonus for having smite ready
    killPotential: 100, // Bonus if can secure kill
    turnAdvantage: 50, // Bonus if it's player's turn
  };

  constructor(private gameEngine: GameEngine) {}

  /**
   * Main evaluation method
   * Returns positive if player has better monster control, negative if opponent
   */
  evaluate(game: Game, playerId: string, opponentId: string): number {
    const monsters = this.findMonsters(game);

    if (monsters.length === 0) {
      return 0; // No monsters on board
    }

    // Derive whose turn it actually is from the real game state so that
    // evaluate(game, A, B) === -evaluate(game, B, A) (symmetry invariant).
    const currentTurnPlayerId = getCurrentPlayerId(game);
    let totalScore = 0;

    for (const monster of monsters) {
      const playerControl = this.evaluateControlScore(
        game,
        monster,
        playerId,
        currentTurnPlayerId === playerId,
      );
      const opponentControl = this.evaluateControlScore(
        game,
        monster,
        opponentId,
        currentTurnPlayerId === opponentId,
      );

      const controlDiff = playerControl - opponentControl;
      const buffValue = this.getBuffValue(monster.piece.name);

      // Proximity factor: prioritize low HP monsters (closer to securing)
      const proximityFactor = monster.hpPercent < 0.5 ? 1.0 : 0.5;

      totalScore += controlDiff * buffValue * proximityFactor;
    }

    return Math.floor(totalScore);
  }

  /**
   * Find all neutral monsters on the board
   */
  private findMonsters(game: Game): MonsterInfo[] {
    const monsters: MonsterInfo[] = [];

    for (const piece of game.board) {
      if (piece.stats.hp <= 0) continue;

      if (NeutralMonsterEvaluator.DRAKE_TYPES.includes(piece.name)) {
        monsters.push({
          piece,
          type: piece.name === 'Elder Dragon' ? 'elder' : 'drake',
          hpPercent: piece.stats.hp / piece.stats.maxHp,
        });
      } else if (piece.name === 'Baron Nashor') {
        monsters.push({
          piece,
          type: 'baron',
          hpPercent: piece.stats.hp / piece.stats.maxHp,
        });
      }
    }

    return monsters;
  }

  /**
   * Calculate control score for a player over a monster
   */
  private evaluateControlScore(
    game: Game,
    monster: MonsterInfo,
    playerId: string,
    isCurrentTurn: boolean,
  ): number {
    let score = 0;
    const pieces = getPlayerPieces(game, playerId);
    const monsterPosition = monster.piece.position;

    let piecesInRange = 0;
    let totalDamagePotential = 0;

    for (const piece of pieces) {
      // Check if piece can attack the monster
      const validAttacks = this.gameEngine.getValidAttacks(game, piece.id);
      const canAttackMonster = validAttacks.some(
        (pos) => pos.x === monsterPosition.x && pos.y === monsterPosition.y,
      );

      if (canAttackMonster) {
        piecesInRange++;

        // Calculate damage this piece can deal to the monster
        const pieceObject = ChessFactory.createChess(piece, game);
        const monsterObject = ChessFactory.createChess(monster.piece, game);
        const damage = pieceObject.calculateDamageAttack(monsterObject);
        totalDamagePotential += damage;
      }
    }

    // Score for pieces in range
    score += piecesInRange * NeutralMonsterEvaluator.WEIGHTS.pieceInRange;

    // Score for damage potential relative to monster HP
    const damageScore =
      (totalDamagePotential / monster.piece.stats.hp) *
      100 *
      NeutralMonsterEvaluator.WEIGHTS.damagePerHp;
    score += damageScore;

    // Smite bonus (if player has smite ready and monster HP is low enough)
    if (this.hasSmiteReady(game, playerId)) {
      // Smite deals 50 true damage
      const smiteThreshold = 50;
      if (monster.piece.stats.hp <= smiteThreshold + totalDamagePotential) {
        score += NeutralMonsterEvaluator.WEIGHTS.smiteBonus;
      }
    }

    // Kill potential bonus
    if (totalDamagePotential >= monster.piece.stats.hp) {
      score += NeutralMonsterEvaluator.WEIGHTS.killPotential;
    }

    // Turn advantage bonus (can secure kill before opponent)
    if (isCurrentTurn && piecesInRange > 0) {
      score += NeutralMonsterEvaluator.WEIGHTS.turnAdvantage;
    }

    return score;
  }

  /**
   * Check if player has smite available on any champion
   */
  private hasSmiteReady(game: Game, playerId: string): boolean {
    const pieces = getPlayerPieces(game, playerId);

    for (const piece of pieces) {
      if (piece.summonerSpell?.type === 'Smite' && piece.summonerSpell.currentCooldown === 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the buff value multiplier for a monster type
   */
  private getBuffValue(monsterName: string): number {
    return NeutralMonsterEvaluator.BUFF_VALUES[monsterName] ?? 1.0;
  }

  /**
   * Check if any monster is currently on the board
   */
  hasMonsterOnBoard(game: Game): boolean {
    return this.findMonsters(game).length > 0;
  }

  /**
   * Get detailed monster information for debugging
   */
  getMonsterDetails(game: Game): MonsterInfo[] {
    return this.findMonsters(game);
  }

  /**
   * Estimate when next monster will spawn based on current round
   */
  getNextMonsterSpawnInfo(game: Game): {
    drakeRound: number | null;
    baronRound: number | null;
  } {
    const currentRound = game.currentRound;

    // Drake spawns at round 5, respawns every 5 turns
    let drakeRound: number | null = null;
    if (currentRound < 5) {
      drakeRound = 5;
    } else {
      // Check if drake exists
      const hasDrake = game.board.some(
        (p) => NeutralMonsterEvaluator.DRAKE_TYPES.includes(p.name) && p.stats.hp > 0,
      );
      if (!hasDrake) {
        // Next respawn is at next multiple of 5 after round 5
        drakeRound = Math.ceil((currentRound + 1) / 5) * 5;
        if (drakeRound <= 5) drakeRound = 10;
      }
    }

    // Baron spawns at round 20, respawns every 10 turns
    let baronRound: number | null = null;
    if (currentRound < 20) {
      baronRound = 20;
    } else {
      // Check if baron exists
      const hasBaron = game.board.some((p) => p.name === 'Baron Nashor' && p.stats.hp > 0);
      if (!hasBaron) {
        // Next respawn is at next multiple of 10 after round 20
        baronRound = Math.ceil((currentRound + 1) / 10) * 10;
        if (baronRound <= 20) baronRound = 30;
      }
    }

    return { drakeRound, baronRound };
  }
}
