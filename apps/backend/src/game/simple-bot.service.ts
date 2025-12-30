import { Injectable, Logger } from "@nestjs/common";
import {
  Game,
  Chess,
  Square,
  GameEvent,
  EventPayload,
  GameEngine,
  getPlayerPieces,
  getPieceAtPosition,
  getCurrentPlayerId,
  getItemById,
  champions,
} from "@lolchess/game-engine";

/**
 * Simple Rule-Based Bot Service
 *
 * Uses priority-based heuristics to select actions:
 * 1. Lethal attacks (can kill enemy)
 * 2. Use skills off cooldown
 * 3. Attack lowest HP enemy
 * 4. Move forward toward enemy
 * 5. Buy items if gold available
 * 6. Fallback: random valid action
 */
@Injectable()
export class SimpleBotService {
  private readonly logger = new Logger(SimpleBotService.name);
  private readonly gameEngine = new GameEngine();

  /**
   * Get the best action for the bot to take
   */
  getAction(game: Game, botPlayerId: string): EventPayload | null {
    const actions = this.getAllPossibleActions(game, botPlayerId);

    if (actions.length === 0) {
      this.logger.warn(`No valid actions available for bot ${botPlayerId}`);
      return null;
    }

    // Priority 1: Lethal attacks (can kill an enemy)
    const lethalAttacks = actions.filter(
      (a) =>
        a.event === GameEvent.ATTACK_CHESS &&
        this.canKillTarget(game, a, botPlayerId)
    );
    if (lethalAttacks.length > 0) {
      const action = this.pickLowestHPTarget(game, lethalAttacks);
      this.logger.debug(
        `Bot choosing lethal attack: ${JSON.stringify(action)}`
      );
      return action;
    }

    // Priority 2: Use skills off cooldown (70% chance to use skill if available)
    const skills = actions.filter((a) => a.event === GameEvent.SKILL);
    if (skills.length > 0 && Math.random() < 0.7) {
      const action = this.pickBestSkillTarget(game, skills, botPlayerId);
      this.logger.debug(`Bot using skill: ${JSON.stringify(action)}`);
      return action;
    }

    // Priority 3: Any attack on lowest HP enemy
    const attacks = actions.filter((a) => a.event === GameEvent.ATTACK_CHESS);
    if (attacks.length > 0) {
      const action = this.pickLowestHPTarget(game, attacks);
      this.logger.debug(`Bot attacking: ${JSON.stringify(action)}`);
      return action;
    }

    // Priority 4: Forward movement (toward enemy)
    const moves = actions.filter((a) => a.event === GameEvent.MOVE_CHESS);
    const forwardMoves = moves.filter((m) =>
      this.isForwardMove(game, m, botPlayerId)
    );
    if (forwardMoves.length > 0) {
      const action = this.pickRandom(forwardMoves);
      this.logger.debug(`Bot moving forward: ${JSON.stringify(action)}`);
      return action;
    }

    // Priority 5: Buy items if gold available and haven't acted yet
    if (!game.hasPerformedActionThisTurn && !game.hasBoughtItemThisTurn) {
      const itemPurchases = actions.filter(
        (a) => a.event === GameEvent.BUY_ITEM
      );
      if (itemPurchases.length > 0) {
        const action = this.pickRandom(itemPurchases);
        this.logger.debug(`Bot buying item: ${JSON.stringify(action)}`);
        return action;
      }
    }

    // Priority 6: Any move (including backward)
    if (moves.length > 0) {
      const action = this.pickRandom(moves);
      this.logger.debug(`Bot moving: ${JSON.stringify(action)}`);
      return action;
    }

    // Fallback: Random valid action
    const action = this.pickRandom(actions);
    this.logger.debug(`Bot fallback action: ${JSON.stringify(action)}`);
    return action;
  }

  /**
   * Generate all possible actions for a player
   */
  getAllPossibleActions(game: Game, playerId: string): EventPayload[] {
    const actions: EventPayload[] = [];
    const playerPieces = getPlayerPieces(game, playerId);

    for (const piece of playerPieces) {
      // Skip dead pieces
      if (piece.stats.hp <= 0) continue;

      // Check if piece is stunned
      const isStunned = piece.debuffs?.some((d) => d.stun) ?? false;
      if (isStunned) continue;

      // Only generate move/attack/skill if we haven't performed an action yet
      if (!game.hasPerformedActionThisTurn) {
        // Generate move actions
        const validMoves = this.gameEngine.getValidMoves(game, piece.id);
        for (const target of validMoves) {
          actions.push({
            playerId,
            event: GameEvent.MOVE_CHESS,
            casterPosition: { x: piece.position.x, y: piece.position.y },
            targetPosition: target,
          });
        }

        // Generate attack actions (if piece can attack)
        if (!piece.cannotAttack) {
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

        // Generate skill actions
        if (piece.skill && piece.skill.currentCooldown === 0) {
          const validSkillTargets = this.gameEngine.getValidSkillTargets(
            game,
            piece.id
          );

          // Handle self-cast skills (targetTypes === "none")
          if (piece.skill.targetTypes === "none") {
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
      }
    }

    // Generate shop/item purchase actions (only before performing board action)
    if (!game.hasPerformedActionThisTurn && !game.hasBoughtItemThisTurn) {
      const player = game.players.find((p) => p.userId === playerId);
      if (player && player.gold > 0 && game.shopItems) {
        for (const itemId of game.shopItems) {
          const item = getItemById(itemId);
          if (!item) continue;

          // Skip if player can't afford
          if (player.gold < item.cost) continue;

          // Only basic items can be purchased directly
          if (!item.isBasic) continue;

          // Generate purchase action for each eligible champion
          for (const piece of playerPieces) {
            if (piece.stats.hp <= 0) continue;
            // Skip if champion already has 3 items (max)
            if (piece.items && piece.items.length >= 3) continue;

            actions.push({
              playerId,
              event: GameEvent.BUY_ITEM,
              itemId: itemId,
              targetChampionId: piece.id,
            });
          }
        }
      }
    }

    return actions;
  }

  /**
   * Check if an attack can kill the target
   */
  private canKillTarget(
    game: Game,
    action: EventPayload,
    botPlayerId: string
  ): boolean {
    if (!action.targetPosition || !action.casterPosition) return false;

    const target = getPieceAtPosition(game, action.targetPosition);
    const caster = getPieceAtPosition(game, action.casterPosition);

    if (!target || !caster) return false;

    // Simple damage estimation (AD only, ignoring armor for simplicity)
    const estimatedDamage = caster.stats.ad || 0;
    return target.stats.hp <= estimatedDamage;
  }

  /**
   * Pick the attack targeting the lowest HP enemy
   */
  private pickLowestHPTarget(
    game: Game,
    attacks: EventPayload[]
  ): EventPayload {
    let lowestHP = Infinity;
    let bestAction = attacks[0];

    for (const action of attacks) {
      if (!action.targetPosition) continue;
      const target = getPieceAtPosition(game, action.targetPosition);
      if (target && target.stats.hp < lowestHP) {
        lowestHP = target.stats.hp;
        bestAction = action;
      }
    }

    return bestAction;
  }

  /**
   * Pick the best skill target (prioritize low HP enemies for damage skills)
   */
  private pickBestSkillTarget(
    game: Game,
    skills: EventPayload[],
    botPlayerId: string
  ): EventPayload {
    // For simplicity, prefer skills targeting enemies with lowest HP
    const isBlue = game.bluePlayer === botPlayerId;

    // Filter skills targeting enemies
    const enemyTargetSkills = skills.filter((s) => {
      if (!s.targetPosition) return false;
      const target = getPieceAtPosition(game, s.targetPosition);
      if (!target) return false;
      // Target is enemy if their blue status differs from bot's
      return target.blue !== isBlue;
    });

    if (enemyTargetSkills.length > 0) {
      return this.pickLowestHPTarget(game, enemyTargetSkills);
    }

    // Fallback to any skill
    return this.pickRandom(skills);
  }

  /**
   * Check if a move is forward (toward enemy side)
   */
  private isForwardMove(
    game: Game,
    move: EventPayload,
    botPlayerId: string
  ): boolean {
    if (!move.casterPosition || !move.targetPosition) return false;

    const isBlue = game.bluePlayer === botPlayerId;

    // Blue moves forward by increasing X, Red by decreasing X
    if (isBlue) {
      return move.targetPosition.x > move.casterPosition.x;
    } else {
      return move.targetPosition.x < move.casterPosition.x;
    }
  }

  /**
   * Pick a random element from an array
   */
  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Check if a player ID belongs to a bot
   */
  isBotPlayer(playerId: string): boolean {
    return playerId.startsWith("bot-player-");
  }

  /**
   * Get bot's champion ban choice
   * Uses a simple heuristic to ban strong champions
   */
  getBotBanChoice(
    bannedChampions: string[],
    blueBans: string[],
    redBans: string[]
  ): string | null {
    // Get all available champions from the game engine
    const allChampionIds = champions.map((c) => c.name);
    const availableChampions = allChampionIds.filter(
      (champ) => !bannedChampions.includes(champ)
    );

    if (availableChampions.length === 0) {
      // Skip ban if no champions available (shouldn't happen)
      return null;
    }

    // List of strong champions to prioritize banning (if available)
    const strongChampions = [
      "Yasuo",
      "Master Yi",
      "Darius",
      "Zed",
      "Vayne",
      "Fiora",
      "Jax",
      "Kassadin",
      "LeBlanc",
      "Syndra",
    ];

    // Find available strong champions to ban
    const availableStrongChampions = availableChampions.filter((champ) =>
      strongChampions.includes(champ)
    );

    if (availableStrongChampions.length > 0) {
      // Pick a random strong champion to ban
      const randomIndex = Math.floor(
        Math.random() * availableStrongChampions.length
      );
      return availableStrongChampions[randomIndex];
    }

    // If no strong champions available, pick any random available champion
    const randomIndex = Math.floor(Math.random() * availableChampions.length);
    return availableChampions[randomIndex];
  }

  /**
   * Get bot's champion pick choice
   * Builds a balanced team composition
   */
  getBotPickChoice(
    bannedChampions: string[],
    alreadyPicked: string[],
    botPicks: string[]
  ): string | null {
    // Get all available champions from the game engine
    const allUnavailable = [...bannedChampions, ...alreadyPicked];
    const availableChampions = champions.filter(
      (c) => !allUnavailable.includes(c.name)
    );

    if (availableChampions.length === 0) {
      return null;
    }

    // Categorize champions by their stats dynamically
    const tankChampions = availableChampions.filter(
      (c) =>
        (c.stats.maxHp ?? 0) >= 100 && (c.stats.physicalResistance ?? 0) >= 20
    );
    const damageChampions = availableChampions.filter(
      (c) => (c.stats.ad ?? 0) >= 30 || (c.stats.ap ?? 0) >= 25
    );
    const mageChampions = availableChampions.filter(
      (c) =>
        (c.stats.ap ?? 0) >= 20 &&
        (c.stats.ap ?? 0) > (c.stats.ad ?? 0) &&
        (c.stats.maxHp ?? 0) < 100
    );
    const supportChampions = availableChampions.filter(
      (c) =>
        c.skill &&
        (c.skill.name?.toLowerCase().includes("heal") ||
          c.skill.description?.toLowerCase().includes("heal") ||
          c.skill.description?.toLowerCase().includes("shield") ||
          c.skill.description?.toLowerCase().includes("allies"))
    );

    // Pick order priority:
    // 1st pick: Damage dealer
    // 2nd pick: Tank
    // 3rd pick: Mage/Support
    // 4th-5th picks: Fill remaining roles

    let targetPool: typeof availableChampions = [];

    if (botPicks.length === 0) {
      // First pick: strong damage dealer
      targetPool =
        damageChampions.length > 0 ? damageChampions : availableChampions;
    } else if (botPicks.length === 1) {
      // Second pick: tank
      targetPool =
        tankChampions.length > 0 ? tankChampions : availableChampions;
    } else if (botPicks.length === 2) {
      // Third pick: mage or support
      const magesAndSupports = [...mageChampions, ...supportChampions];
      targetPool =
        magesAndSupports.length > 0 ? magesAndSupports : availableChampions;
    } else {
      // Later picks: fill with remaining good champions
      const allRoles = [
        ...damageChampions,
        ...tankChampions,
        ...mageChampions,
        ...supportChampions,
      ];
      // Remove duplicates
      const uniqueRoles = allRoles.filter(
        (champ, index, self) =>
          index === self.findIndex((c) => c.name === champ.name)
      );
      targetPool = uniqueRoles.length > 0 ? uniqueRoles : availableChampions;
    }

    if (targetPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * targetPool.length);
      return targetPool[randomIndex].name;
    }

    // Final fallback: pick any available champion
    const randomIndex = Math.floor(Math.random() * availableChampions.length);
    return availableChampions[randomIndex].name;
  }

  /**
   * Get bot's champion reorder
   * Orders champions for optimal positioning
   */
  getBotChampionOrder(championIds: string[]): string[] {
    // Simple strategy: Put tanks in front, damage dealers in middle, supports in back
    // Categorize champions dynamically based on their stats
    const championData = championIds
      .map((id) => champions.find((c) => c.name === id))
      .filter((c) => c !== undefined);

    const tanks: string[] = [];
    const supports: string[] = [];
    const others: string[] = [];

    for (const champ of championData) {
      const isTank =
        (champ.stats.maxHp ?? 0) >= 100 &&
        (champ.stats.physicalResistance ?? 0) >= 20;
      const isSupport =
        champ.skill &&
        (champ.skill.name?.toLowerCase().includes("heal") ||
          champ.skill.description?.toLowerCase().includes("heal") ||
          champ.skill.description?.toLowerCase().includes("shield") ||
          champ.skill.description?.toLowerCase().includes("allies"));

      if (isTank) {
        tanks.push(champ.name);
      } else if (isSupport) {
        supports.push(champ.name);
      } else {
        others.push(champ.name);
      }
    }

    // Order: Tanks first, then damage dealers/mages, then supports
    return [...tanks, ...others, ...supports];
  }
}
