import { getItemById } from "../data/items";
import {
  AttackRange,
  Chess,
  Game,
  Skill,
  Square,
  Debuff,
  Aura,
  AuraEffect,
  Shield,
} from "../game.schema";

export class ChessObject {
  public chess: Chess;
  public game: Game;
  protected willCrit: boolean = false;

  constructor(chess: Chess, game: Game) {
    if (!chess) {
      throw new Error("Invalid chess");
    }
    this.chess = chess;
    this.game = game;
  }

  protected postCritDamage(chess: ChessObject, damage: number): void {
    // Do nothing by default
  }

  protected damage(
    chess: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true",
    attacker: ChessObject,
    sunder: number = 0
  ): number {
    if (damageType === "physical") {
      damage = Math.max(
        damage - Math.max(chess.physicalResistance - sunder, 0),
        1
      );
    } else if (damageType === "magic") {
      damage = Math.max(
        damage - Math.max(chess.magicResistance - sunder, 0),
        1
      );
    } else if (damageType === "true") {
      damage = Math.max(damage, 1);
    }

    let damageAmplification = this.damageAmplification;
    if (
      chess.chess.stats.hp > 200 &&
      this.chess.items.some((item) => item.id === "giant_slayer")
    ) {
      damageAmplification += 15;
    }
    let floorDamage = Math.floor(
      (damage * (damageAmplification + 100)) / 100
    );

    const wasAlive = chess.chess.stats.hp > 0;

    // Check if the target has a shield
    const shields = chess.chess.shields || [];
    while (shields.length > 0 || floorDamage > 0) {
      const shield = shields[0] || { amount: 0, duration: 0 };
      if (shield.amount > floorDamage) {
        shield.amount -= floorDamage;
        floorDamage = 0;
      }
      else {
        floorDamage -= shield.amount;
        shield.amount = 0;
        shields.shift();
      }
    }

    chess.chess.stats.hp -= floorDamage;
    chess.postTakenDamage(this, floorDamage);

    if (chess.chess.stats.hp <= 0) {
      chess.chess.stats.hp = 0;

      // Award gold to the killer if the target was alive before this damage
      if (wasAlive) {
        this.awardGoldForKill(chess);
        chess.chess.deadAtRound = this.game.currentRound;
        console.log("chess.chess.deadAtRound", chess.chess.deadAtRound);

        // Check if killed monster was neutral for special rewards
        if (
          chess.chess.name === "Drake" ||
          chess.chess.name === "Baron Nashor"
        ) {
          // Import GameLogic to award monster kill rewards
          const { GameLogic } = require("../game.logic");
          GameLogic.awardMonsterKillReward(
            this.game,
            this.chess.ownerId,
            chess.chess.name
          );
        }
      }
    }

    return damage; // Return the actual damage dealt
  }

  protected postTakenDamage(attacker: ChessObject, damage: number): void {
    if (
      this.chess.items.some((item) => item.id === "edge_of_night") &&
      this.chess.stats.hp <= 0
    ) {
      const edgeOfNight = this.chess.items.find(
        (item) => item.id === "edge_of_night"
      );
      if (edgeOfNight && !edgeOfNight.payload.hasUsedEdgeOfNight) {
        edgeOfNight.payload = {
          hasUsedEdgeOfNight: true,
        };
      }
      this.chess.stats.hp = 1;
    }
    if (
      this.chess.items.some((item) => item.id === "sterak_gage") &&
      this.chess.stats.hp <= this.chess.stats.maxHp * 0.4
    ) {
      const sterakGage = this.chess.items.find(
        (item) => item.id === "sterak_gage"
      );
      if (sterakGage && !sterakGage.payload.hasUsedSterakGage) {
        const shieldDuration = sterakGage.payload.shieldDuration || 3;
        sterakGage.payload = {
          hasUsedSterakGage: true,
          shieldDuration: shieldDuration,
        };
        this.applyShield(this.chess.stats.maxHp * 0.5, shieldDuration);
      }
    }
    if (this.chess.items.some((item) => item.id === "red_buff")) {
      if (damage > 0) {
        this.applyDebuff(this, this.createBurnedDebuff(3));
        this.applyDebuff(this, this.createWoundedDebuff(3));
      }
    }
  }

  protected applyShield(amount: number, duration: number): void {
    this.chess.shields.push({
      amount: amount,
      duration: duration,
    } as Shield);
  }

  // Award gold to the player who killed an enemy chess piece
  protected awardGoldForKill(killedChess: ChessObject): void {
    // Find the player who owns the killer chess piece
    const killerPlayer = this.game.players.find(
      (player) => player.userId === this.chess.ownerId
    );
    if (killerPlayer) {
      const baseGold = killedChess.chess.stats.goldValue || 30; // Default 30 gold if no goldValue set
      let totalGold = baseGold;

      // Check if killer is Twisted Fate for bonus gold
      if (this.chess.name === "Twisted Fate") {
        const bonusGold = this.chess.skill?.payload?.goldBonus || 10;
        totalGold += bonusGold;
      }

      killerPlayer.gold += totalGold;
    }
  }

  createWoundedDebuff(turn: number): Debuff {
    return {
      id: "wounded",
      name: "Wounded",
      description: "Reduces all of a unit's healing received by 50%.",
      duration: turn,
      maxDuration: turn,
      effects: [],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  createBurnedDebuff(turn: number): Debuff {
    return {
      id: "burned",
      name: "Burned",
      description: "Burns enemies for 5 true damage each turn.",
      duration: turn,
      maxDuration: turn,
      effects: [],
      damagePerTurn: 5,
      damageType: "true",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  protected heal(chess: ChessObject, heal: number): void {
    let healAmount = heal;
    if (chess.chess.debuffs.some((debuff) => debuff.id === "wounded")) {
      healAmount = Math.floor(heal * 0.5);
    }
    chess.chess.stats.hp = Math.min(
      chess.chess.stats.hp + Math.floor(healAmount),
      chess.maxHp
    );
  }

  public preEnterTurn(isBlueTurn: boolean): void {
    if (this.chess.blue === isBlueTurn) {
      this.refreshCooldown(this);
      this.processDebuffs(this);
    }
  }

  get skillCooldown(): number {
    if (this.chess.skill) {
      return (Math.max(
        this.chess.skill.cooldown -
        this.getEffectiveStat(this.chess, "cooldownReduction") / 10,
        0
      )
      );
    }
    return 0;
  }

  refreshCooldown(chess: ChessObject): void {
    if (!chess.chess.skill) {
      return;
    }
    chess.chess.skill.currentCooldown -= 1;
    if (chess.chess.skill.currentCooldown < 0) {
      chess.chess.skill.currentCooldown = 0;
    }
  }

  // Debuff Management
  applyDebuff(chess: ChessObject, debuff: Debuff): boolean {
    // Implement quicksilver item
    const quicksilver = chess.chess.items.find(
      (item) => item.id === "quicksilver"
    );
    if (quicksilver && !quicksilver.payload.hasUsedQuicksilver) {
      quicksilver.payload.hasUsedQuicksilver = true;
      chess.chess.debuffs.push({
        id: "quicksilver",
        name: "Quicksilver",
        description: "Resistance to all active debuffs for 3 turns.",
        duration: 3,
        maxDuration: 3,
        effects: [],
        damagePerTurn: 0,
        damageType: "physical",
        healPerTurn: 0,
        unique: true,
        appliedAt: Date.now(),
        casterPlayerId: this.chess.ownerId,
        casterName: this.chess.name,
      } as Debuff);
      return true;
    }

    if (chess.chess.debuffs.some((d) => d.id === "quicksilver")) {
      return false;
    }
    // Check if debuff is unique and already exists
    if (debuff.unique) {
      const existingDebuff = chess.chess.debuffs.find(
        (d) => d.id === debuff.id
      );
      if (existingDebuff) {
        // If the debuff is already applied, check if the new debuff has a longer duration
        if (debuff.duration > existingDebuff.duration) {
          chess.chess.debuffs.splice(chess.chess.debuffs.indexOf(existingDebuff), 1);
          chess.chess.debuffs.push(debuff);
          return true;
        }
        return false; // Can't apply unique debuff twice
      }
    }

    chess.chess.debuffs.push(debuff);
    return true;
  }

  removeDebuff(chess: ChessObject, debuffId: string): boolean {
    const index = chess.chess.debuffs.findIndex((d) => d.id === debuffId);
    if (index !== -1) {
      chess.chess.debuffs.splice(index, 1);
      return true;
    }
    return false;
  }

  processDebuffs(chess: ChessObject): void {
    if (!chess.chess.debuffs || chess.chess.debuffs.length === 0) {
      return;
    }
    for (let i = chess.chess.debuffs.length - 1; i >= 0; i--) {
      const debuff = chess.chess.debuffs[i];

      // Skip aura debuffs - they are managed by cleanupExpiredAuraDebuffs()
      if (debuff.id.startsWith("aura_")) {
        continue;
      }

      // Apply damage per turn
      if (debuff.damagePerTurn > 0) {
        this.damage(chess, debuff.damagePerTurn, debuff.damageType, this, 0);
      }

      // Apply heal per turn
      if (debuff.healPerTurn > 0) {
        this.heal(chess, debuff.healPerTurn);
      }

      // Reduce duration
      debuff.duration--;

      // Remove expired debuffs
      if (debuff.duration <= 0) {
        chess.chess.debuffs.splice(i, 1);
      }
    }
  }

  get speed(): number {
    return this.getEffectiveStat(this.chess, "speed");
  }

  get ad(): number {
    return this.getEffectiveStat(this.chess, "ad");
  }

  get ap(): number {
    return this.getEffectiveStat(this.chess, "ap");
  }

  get physicalResistance(): number {
    return this.getEffectiveStat(this.chess, "physicalResistance");
  }

  get magicResistance(): number {
    return this.getEffectiveStat(this.chess, "magicResistance");
  }

  get maxHp(): number {
    return this.getEffectiveStat(this.chess, "maxHp");
  }

  get criticalChance(): number {
    return this.getEffectiveStat(this.chess, "criticalChance");
  }

  get criticalDamage(): number {
    return this.getEffectiveStat(this.chess, "criticalDamage");
  }

  get sunder(): number {
    return this.getEffectiveStat(this.chess, "sunder");
  }

  get cooldownReduction(): number {
    return this.getEffectiveStat(this.chess, "cooldownReduction");
  }

  get lifesteal(): number {
    return this.getEffectiveStat(this.chess, "lifesteal");
  }

  get damageAmplification(): number {
    return this.getEffectiveStat(this.chess, "damageAmplification");
  }

  getEffectiveStat(chess: Chess, stat: string): number {
    let statValue = chess.stats[stat] || 0;

    // Apply item bonuses
    chess.items.forEach((item) => {
      const itemData = getItemById(item.id);
      const listEffect =
        itemData?.effects.filter((effect) => effect.stat === stat) || [];
      listEffect.forEach((effect) => {
        if (
          effect.condition &&
          !effect.condition(new ChessObject(chess, this.game))
        ) {
          return;
        }
        statValue = this.applyStatModifier(
          statValue,
          effect.value,
          effect.type
        );
      });
    });

    // Apply debuff effects (auras now apply debuffs instead of direct modification)
    chess.debuffs.forEach((debuff) => {
      debuff.effects.forEach((effect) => {
        if (effect.stat === stat) {
          statValue = this.applyStatModifier(
            statValue,
            effect.modifier,
            effect.type
          );
        }
      });
    });

    return Math.floor(Math.max(0, statValue)); // Stats can't be negative
  }

  private applyStatModifier(
    currentValue: number,
    modifier: number,
    type: string
  ): number {
    if (type === "add") {
      return currentValue + modifier;
    } else if (type === "multiply") {
      return currentValue * modifier;
    } else if (type === "set") {
      return modifier;
    }
    return currentValue;
  }

  // Create an aura debuff from an aura
  createAuraDebuff(aura: any, casterPlayerId: string): Debuff {
    return {
      id: `aura_${aura.id}`,
      name: aura.name,
      description: aura.description,
      duration: -1, // Infinite - persists until out of range (not processed by processDebuffs)
      maxDuration: -1,
      effects: aura.effects.map((effect: AuraEffect) => ({
        stat: effect.stat,
        modifier: effect.modifier,
        type: effect.type,
      })),
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true, // Each aura can only be applied once
      appliedAt: Date.now(),
      casterPlayerId: casterPlayerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  // Apply aura debuffs to all units in range
  applyAuraDebuffs(): void {
    if (!this.chess.auras || this.chess.auras.length === 0) return;
    if (this.chess.stats.hp <= 0) return; // Dead pieces don't provide auras

    this.chess.auras.forEach((aura) => {
      if (!aura.active) return;
      if (aura.requiresAlive && this.chess.stats.hp <= 0) return;

      // Find all targets in range
      this.game.board.forEach((targetChess: any) => {
        if (!targetChess) return;
        if (targetChess.stats.hp <= 0) return;

        // Check if target is in range
        if (this.isInAuraRange(this.chess, targetChess, aura.range)) {
          // Check if this aura should affect the target based on effect targets
          aura.effects.forEach((effect: any) => {
            if (
              this.shouldAuraAffectTarget(
                this.chess,
                targetChess,
                effect.target
              )
            ) {
              const targetChessObject = new ChessObject(targetChess, this.game);
              const auraDebuff = this.createAuraDebuff(
                aura,
                this.chess.ownerId
              );

              // Remove old aura debuff and apply new one to refresh duration
              this.removeDebuff(targetChessObject, auraDebuff.id);
              this.applyDebuff(targetChessObject, auraDebuff);
            }
          });
        }
      });
    });
  }

  // Clean up aura debuffs that are no longer in range
  cleanupExpiredAuraDebuffs(): void {
    if (!this.chess.debuffs || this.chess.debuffs.length === 0) return;

    // Get all current aura debuff IDs that should be affecting this piece
    const activeAuraDebuffIds = new Set<string>();

    this.game.board.forEach((sourceChess: any) => {
      if (!sourceChess || sourceChess === this.chess) return;
      if (sourceChess.stats.hp <= 0) return;

      sourceChess.auras?.forEach((aura: any) => {
        if (!aura.active) return;
        if (aura.requiresAlive && sourceChess.stats.hp <= 0) return;

        if (this.isInAuraRange(sourceChess, this.chess, aura.range)) {
          aura.effects.forEach((effect: any) => {
            if (
              this.shouldAuraAffectTarget(
                sourceChess,
                this.chess,
                effect.target
              )
            ) {
              activeAuraDebuffIds.add(`aura_${aura.id}`);
            }
          });
        }
      });
    });

    // Remove aura debuffs that are no longer active
    for (let i = this.chess.debuffs.length - 1; i >= 0; i--) {
      const debuff = this.chess.debuffs[i];
      if (
        debuff.id.startsWith("aura_") &&
        !activeAuraDebuffIds.has(debuff.id)
      ) {
        this.chess.debuffs.splice(i, 1);
      }
    }
  }

  // Check if target chess is in aura range of source chess
  isInAuraRange(
    sourceChess: Chess,
    targetChess: Chess,
    range: number
  ): boolean {
    const deltaX = Math.abs(sourceChess.position.x - targetChess.position.x);
    const deltaY = Math.abs(sourceChess.position.y - targetChess.position.y);
    const distance = Math.max(deltaX, deltaY); // Chebyshev distance (considers diagonals as 1)

    return distance <= range;
  }

  // Check if aura should affect target based on target type (allies, enemies, all)
  shouldAuraAffectTarget(
    sourceChess: Chess,
    targetChess: Chess,
    targetType: string
  ): boolean {
    const sameTeam = sourceChess.blue === targetChess.blue;

    switch (targetType) {
      case "allies":
        return sameTeam;
      case "enemies":
        return !sameTeam;
      case "all":
        return true;
      default:
        return false;
    }
  }

  // Create an aura for a chess piece
  createAura(
    id: string,
    name: string,
    description: string,
    range: number,
    effects: AuraEffect[],
    options: {
      active?: boolean;
      requiresAlive?: boolean;
      duration?: string;
    } = {}
  ): Aura {
    return {
      id,
      name,
      description,
      range,
      effects,
      active: options.active ?? true,
      requiresAlive: options.requiresAlive ?? false,
      duration: options.duration ?? "permanent",
    } as Aura;
  }

  move(position: Square): void {
    // Calculate effective speed with first move bonus for minions
    let effectiveSpeed = this.speed;

    // First move bonus: Minions get +1 speed on their first move
    if (
      !this.chess.hasMovedBefore &&
      (this.chess.name === "Melee Minion" ||
        this.chess.name === "Caster Minion")
    ) {
      effectiveSpeed += 1;
    }

    if (!this.validateMove(position, effectiveSpeed)) {
      throw new Error("Invalid move");
    }

    this.chess.position = position;
    this.chess.hasMovedBefore = true; // Mark as moved after successful move
  }

  public executeAttack(chess: ChessObject, forceCritical: boolean = false, damageMultiplier: number = 1): void {
    const damage = this.attack(chess, forceCritical, damageMultiplier);
    this.postAttack(chess, damage);
  }

  protected postAttack(chess: ChessObject, damage: number): void {
    // Apply lifesteal: heal for a percentage of physical damage dealt
    if (this.lifesteal > 0) {
      const healAmount = (damage * this.lifesteal) / 100;
      this.heal(this, Math.floor(healAmount));
    }
  }

  protected attack(chess: ChessObject, forceCritical: boolean = false, damageMultiplier: number = 1): number {
    if (
      !this.validateAttack(chess.chess.position, this.chess.stats.attackRange)
    ) {
      throw new Error("Invalid attack");
    }

    // Critical strike system from RULE.md: 20% chance, 150% damage
    this.willCrit = forceCritical || Math.random() < this.criticalChance / 100;
    let damage = this.ad;

    if (this.willCrit) {
      damage = (damage * this.criticalDamage) / 100; // 150% damage
      this.postCritDamage(chess, damage);
    }

    if (this.chess.items.some((item) => item.id === "spear_of_shojin")) {
      if (chess.chess.skill?.currentCooldown > 0) {
        chess.chess.skill.currentCooldown -= 0.5;
      }
    }

    return this.damage(
      chess,
      damage * damageMultiplier,
      "physical",
      this,
      this.sunder
    );
  }

  protected postSkill(chess: ChessObject): void {
    // Set skill on cooldown
    this.chess.skill.currentCooldown = this.skillCooldown;
    if (this.chess.items.some((item) => item.id === "archangel_staff")) {
      this.chess.stats.ap += 5;
    }
  }

  executeSkill(position?: Square): void {
    if (!this.validateSkill(this.chess.skill, position)) {
      throw new Error("Invalid skill");
    }
    this.skill(position);
    this.postSkill(this);
  }

  protected skill(position?: Square): void {
    if (!this.validateSkill(this.chess.skill, position)) {
      throw new Error("Invalid skill");
    }
  }

  validateSkill(skill?: Skill, position?: Square): boolean {
    if (!skill) {
      return false;
    }
    if (skill.type === "passive") {
      return false;
    }
    if (skill.currentCooldown > 0) {
      return false;
    }
    if (skill.targetTypes === "none") {
      return true;
    }
    if (skill.targetTypes === "square") {
      return this.validateMove(position, skill.attackRange.range);
    }
    return this.validateAttack(position, skill.attackRange);
  }

  validateMove(position: Square, speed: number): boolean {
    // Can't move to the same position
    if (
      this.chess.position.x === position.x &&
      this.chess.position.y === position.y
    ) {
      return false;
    }

    // Check backward movement restriction
    if (this.chess.cannotMoveBackward) {
      if (this.chess.blue && position.y < this.chess.position.y) {
        return false;
      }
      if (!this.chess.blue && position.y > this.chess.position.y) {
        return false;
      }
    }

    // Calculate movement deltas
    const deltaX = Math.abs(position.x - this.chess.position.x);
    const deltaY = Math.abs(position.y - this.chess.position.y);

    // Check vertical-only movement restriction
    if (this.chess.canOnlyMoveVertically) {
      // Vertical-only pieces can only move in Y direction (forward/backward)
      // They cannot move horizontally (deltaX must be 0)
      if (deltaX > 0) {
        return false;
      }
    }

    // Check if movement exceeds speed limit
    const maxDistance = Math.max(deltaX, deltaY);
    if (speed && maxDistance > speed) {
      return false;
    }

    // Determine movement direction
    const isHorizontal = deltaY === 0 && deltaX > 0;
    const isVertical = deltaX === 0 && deltaY > 0;
    const isDiagonal = deltaX === deltaY && deltaX > 0;

    // Must move in exactly one valid direction
    if (!isHorizontal && !isVertical && !isDiagonal) {
      return false; // Invalid movement pattern
    }

    // Check if the path is clear (no pieces blocking)
    if (!this.isPathClear(this.chess.position, position)) {
      return false;
    }

    return true;
  }

  /**
   * Check if the path between two positions is clear of pieces
   */
  private isPathClear(from: Square, to: Square): boolean {
    const deltaX = to.x - from.x;
    const deltaY = to.y - from.y;

    // Determine step direction
    const stepX = deltaX === 0 ? 0 : deltaX / Math.abs(deltaX);
    const stepY = deltaY === 0 ? 0 : deltaY / Math.abs(deltaY);

    // Check each square along the path (excluding start and end)
    let currentX = from.x + stepX;
    let currentY = from.y + stepY;

    while (currentX !== to.x || currentY !== to.y) {
      // Check if there's a piece at this position
      const blockingPiece = this.game.board.find(
        (piece) =>
          piece.position.x === currentX &&
          piece.position.y === currentY &&
          piece.stats.hp > 0
      );

      if (blockingPiece) {
        return false; // Path is blocked
      }

      currentX += stepX;
      currentY += stepY;
    }

    return true; // Path is clear
  }
  validateAttack(position: Square, attackRange: AttackRange): boolean {
    // Check if attackRange is defined
    if (!attackRange) {
      return false;
    }

    // Can't attack the same position
    if (
      this.chess.position.x === position.x &&
      this.chess.position.y === position.y
    ) {
      return false;
    }

    // Calculate attack deltas
    const deltaX = Math.abs(position.x - this.chess.position.x);
    const deltaY = Math.abs(position.y - this.chess.position.y);

    // Check if attack exceeds range limit
    const maxDistance = Math.max(deltaX, deltaY);
    if (attackRange.range && maxDistance > attackRange.range) {
      return false;
    }

    // Determine attack direction
    const isHorizontal = deltaY === 0 && deltaX > 0;
    const isVertical = deltaX === 0 && deltaY > 0;
    const isDiagonal = deltaX === deltaY && deltaX > 0;

    // Must attack in exactly one valid direction
    if (!isHorizontal && !isVertical && !isDiagonal) {
      return false; // Invalid attack pattern
    }

    // Check if the piece can attack in the determined direction
    if (isHorizontal && !attackRange.horizontal) {
      return false;
    }
    if (isVertical && !attackRange.vertical) {
      return false;
    }
    if (isDiagonal && !attackRange.diagonal) {
      return false;
    }

    // For ranged attacks (distance > 1), check if path is clear
    if (maxDistance > 1 && !this.isPathClear(this.chess.position, position)) {
      return false;
    }

    return true;
  }
}
