import { getItemById } from "../data/items";
import {
  AttackRange,
  Aura,
  AuraEffect,
  Chess,
  Debuff,
  Game,
  Item,
  Shield,
  Skill,
  Square,
} from "../game.schema";
import { ChessFactory } from "./chessFactory";

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
    if (chess.chess.items.some((item) => item.id === "strikers_flail")) {
      chess.applyDebuff(chess, {
        id: "strikers_flail",
        name: "Strikers Flail",
        description:
          "Critical Strike increases Damage Amplification by 10 for 2 turns.",
        duration: 2,
        maxDuration: 2,
        effects: [
          {
            stat: "damageAmplification",
            modifier: 10,
            type: "add",
          },
        ],
        damagePerTurn: 0,
        damageType: "physical",
        healPerTurn: 0,
        unique: false,
        appliedAt: Date.now(),
        casterPlayerId: chess.chess.ownerId,
        casterName: chess.chess.name,
        currentStacks: 1,
        maximumStacks: 99,
      });
    }
  }

  protected activeSkillDamage(
    chess: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true",
    attacker: ChessObject,
    sunder: number = 0
  ): number {
    let updatedDamage = damage;
    if (this.chess.items.some((item) => item.id === "jeweled_gauntlet")) {
      this.willCrit = Math.random() < this.criticalChance / 100;

      if (this.willCrit) {
        updatedDamage = (updatedDamage * this.criticalDamage) / 100; // 150% damage
        this.postCritDamage(chess, updatedDamage);
      }
    }
    const damageDealt = this.damage(
      chess,
      updatedDamage,
      damageType,
      attacker,
      sunder
    );
    if (
      this.chess.items.some(
        (item) =>
          item.id === "hextech_gunblade" || item.id === "hand_of_justice"
      )
    ) {
      this.heal(chess, damageDealt * 0.15);
    }
    return damageDealt;
  }

  private static damageReductionPercentage(protectionFactor: number): number {
    if (protectionFactor <= 0) {
      return 0;
    }
    return protectionFactor / (protectionFactor + 50);
  }

  private calculateDamage(
    target: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true",
    sunder: number = 0
  ): number {
    if (damageType === "physical") {
      let physicalResistance = target.physicalResistance;
      if (this.chess.items.some((item) => item.id === "last_whisper")) {
        physicalResistance *= 0.7;
      }
      const reducePercentage = ChessObject.damageReductionPercentage(
        physicalResistance - sunder
      );
      return damage * (1 - reducePercentage);
    } else if (damageType === "magic") {
      let magicResistance = target.magicResistance;
      if (this.chess.items.some((item) => item.id === "void_staff")) {
        magicResistance *= 0.7;
      }
      const reducePercentage = ChessObject.damageReductionPercentage(
        magicResistance - sunder
      );
      return damage * (1 - reducePercentage);
    } else if (damageType === "true") {
      return Math.max(damage, 1);
    }
  }

  protected damage(
    chess: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true",
    attacker: ChessObject,
    sunder: number = 0
  ): number {
    let damageAmplification = this.damageAmplification;
    if (
      chess.chess.stats.hp > 200 &&
      this.chess.items.some((item) => item.id === "giant_slayer")
    ) {
      damageAmplification += 15;
    }
    let calDamage = (damage * (damageAmplification + 100)) / 100;
    calDamage = this.calculateDamage(chess, calDamage, damageType, sunder);
    const wasAlive = chess.chess.stats.hp > 0;

    // Check if the target has a shield
    const shields = chess.chess.shields || [];
    if (this.chess.items.some((item) => item.id === "serpents_fang")) {
      shields.forEach((shield) => {
        shield.amount = Math.floor(shield.amount * 0.5);
      });
    }
    while (shields.length > 0 && calDamage > 0) {
      const shield = shields[0] || { amount: 0, duration: 0 };
      if (shield.amount > calDamage) {
        shield.amount -= calDamage;
        calDamage = 0;
      } else {
        calDamage -= shield.amount;
        shield.amount = 0;
        shields.shift();
      }
    }

    const finalDamage = Math.floor(chess.preTakenDamage(this, calDamage));
    chess.chess.stats.hp -= finalDamage;
    chess.postTakenDamage(this, finalDamage, damageType);

    if (chess.chess.stats.hp <= 0) {
      chess.chess.stats.hp = 0;

      // Award gold to the killer if the target was alive before this damage
      if (wasAlive) {
        this.awardGoldForKill(chess);
        chess.chess.deadAtRound = this.game.currentRound;

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

  protected preTakenDamage(attacker: ChessObject, damage: number): number {
    if (this.chess.items.some((item) => item.id === "steadfast_heart")) {
      if (this.chess.stats.hp > this.chess.stats.maxHp * 0.5) {
        return damage * 0.82;
      }
      return damage * 0.9;
    }
    return damage;
  }

  protected postTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true"
  ): void {
    if (
      this.chess.items.some((item) => item.id === "edge_of_night") &&
      this.chess.stats.hp <= 0
    ) {
      const edgeOfNight = this.chess.items.find(
        (item) => item.id === "edge_of_night"
      );
      if (edgeOfNight && !edgeOfNight.payload?.hasUsedEdgeOfNight) {
        edgeOfNight.payload = {
          hasUsedEdgeOfNight: true,
        };
        this.chess.stats.hp = 1;
      }
    }
    if (
      this.chess.items.some((item) => item.id === "sterak_gage") &&
      this.chess.stats.hp <= this.maxHp * 0.4
    ) {
      const sterakGage = this.chess.items.find(
        (item) => item.id === "sterak_gage"
      );
      if (sterakGage && !sterakGage.payload?.hasUsedSterakGage) {
        const shieldDuration = sterakGage.payload?.shieldDuration || 3;
        sterakGage.payload = {
          hasUsedSterakGage: true,
          shieldDuration: shieldDuration,
        };
        this.applyShield(this.maxHp * 0.5, shieldDuration);
      }
    }
    if (
      attacker.chess.items.some(
        (item) => item.id === "red_buff" || item.id === "morellonomicon"
      )
    ) {
      this.applyDebuff(this, this.createBurnedDebuff(3, attacker));
      this.applyDebuff(this, this.createWoundedDebuff(3, attacker));
    }
    if (attacker.chess.items.some((item) => item.id === "serpents_fang")) {
      this.applyDebuff(this, this.createVenomDebuff(3, attacker));
    }
    if (this.chess.items.some((item) => item.id === "adaptive_helm")) {
      if (damageType === "physical") {
        this.applyDebuff(this, {
          id: "adaptive_helm_armor",
          name: "Adaptive Helm - Armor",
          description: "Gain 20 Armor for 3 turns.",
          duration: 3,
          maxDuration: 3,
          effects: [{ stat: "physicalResistance", modifier: 20, type: "add" }],
          damagePerTurn: 0,
          damageType: "physical",
          healPerTurn: 0,
          unique: true,
          appliedAt: Date.now(),
          casterPlayerId: this.chess.ownerId,
          casterName: this.chess.name,
        } as Debuff);
      } else if (damageType === "magic") {
        this.applyDebuff(this, {
          id: "adaptive_helm_mr",
          name: "Adaptive Helm - Magic Resist",
          description: "Gain 20 Magic Resist for 3 turns.",
          duration: 3,
          maxDuration: 3,
          effects: [{ stat: "magicResistance", modifier: 20, type: "add" }],
          damagePerTurn: 0,
          damageType: "physical",
          healPerTurn: 0,
          unique: true,
          appliedAt: Date.now(),
          casterPlayerId: this.chess.ownerId,
          casterName: this.chess.name,
        } as Debuff);
      }
    }
  }

  public applyShield(amount: number, duration: number, id?: string): void {
    if (!this.chess.shields) {
      this.chess.shields = [];
    }
    if (id && this.chess.shields.some((shield) => shield.id === id)) {
      this.chess.shields.forEach((shield) => {
        if (shield.id === id) {
          shield.amount = Math.floor(amount);
          shield.duration = duration;
        }
      });
      return;
    }
    this.chess.shields.push({
      id:
        id || `shield_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: Math.floor(amount),
      duration: duration,
    } as Shield);
  }

  // Award gold to the player who killed an enemy chess piece
  protected awardGoldForKill(killedChess: ChessObject): void {
    // Find the player who owns the killer chess piece
    const killerPlayerIndex = this.game.players.findIndex(
      (player) => player.userId === this.chess.ownerId
    );
    if (killerPlayerIndex !== -1) {
      const baseGold = killedChess.chess.stats.goldValue || 30; // Default 30 gold if no goldValue set
      let totalGold = baseGold;

      // Check if killer is Twisted Fate for bonus gold
      if (this.chess.name === "Twisted Fate") {
        const bonusGold = this.chess.skill?.payload?.goldBonus || 10;
        totalGold += bonusGold;
      }

      this.game.players[killerPlayerIndex].gold += totalGold;
    }
  }

  private createWoundedDebuff(turn: number, owner: ChessObject): Debuff {
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
      casterPlayerId: owner.chess.ownerId,
      casterName: owner.chess.name,
    } as Debuff;
  }

  private createBurnedDebuff(turn: number, owner: ChessObject): Debuff {
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
      casterPlayerId: owner.chess.ownerId,
      casterName: owner.chess.name,
    } as Debuff;
  }

  private createVenomDebuff(turn: number, owner: ChessObject): Debuff {
    return {
      id: "venom",
      name: "Venom",
      description: "Reduces all of a unit's shields received by 50%.",
      duration: turn,
      maxDuration: turn,
      effects: [],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: owner.chess.ownerId,
      casterName: owner.chess.name,
    } as Debuff;
  }

  private createDamageAmplificationDebuff(
    turn: number,
    owner: ChessObject
  ): Debuff {
    return {
      id: "damage_amplification",
      name: "Damage Amplification",
      description: "Increase all damage dealt by 10% for 2 turns.",
      duration: turn,
      maxDuration: turn,
      effects: [
        {
          stat: "damageAmplification",
          modifier: 10,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "physical",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: owner.chess.ownerId,
      casterName: owner.chess.name,
      currentStacks: 1,
      maximumStacks: 1,
    } as Debuff;
  }

  protected heal(chess: ChessObject, heal: number): void {
    let healAmount = heal;
    let healFactor = 1;
    if (chess.chess.debuffs.some((debuff) => debuff.id === "wounded")) {
      healFactor -= 0.5;
    }
    if (chess.chess.items.some((item) => item.id === "spirit_visage")) {
      healFactor += 0.3;
    }
    healAmount = Math.floor(heal * healFactor);
    chess.chess.stats.hp = Math.min(
      chess.chess.stats.hp + healAmount,
      chess.maxHp
    );
  }

  public preEnterTurn(isBlueTurn: boolean): void {
    if (this.chess.stats.hp <= 0) {
      return;
    }
    if (this.chess.blue === isBlueTurn) {
      this.refreshCooldown(this);
      this.processDebuffs(this);
      this.processShields(this);

      // Apply HP Regeneration
      const hpRegen = this.getEffectiveStat(this.chess, "hpRegen");
      if (hpRegen > 0) {
        this.heal(this, hpRegen);
      }

      if (this.chess.items.some((item) => item.id === "spirit_visage")) {
        const missingHp = this.maxHp - this.chess.stats.hp;
        this.heal(this, missingHp * 0.05);
      }

      // Apply Sunfire Cape effect
      if (this.chess.items.some((item) => item.id === "sunfire_cape")) {
        const { GameLogic } = require("../game.logic");
        GameLogic.getAdjacentSquares(this.chess.position).forEach((square) => {
          const targetChess = GameLogic.getChess(
            this.game,
            !this.chess.blue,
            square
          );
          if (targetChess) {
            const targetObj = ChessFactory.createChess(targetChess, this.game);
            targetObj.applyDebuff(targetObj, this.createBurnedDebuff(3, this));
            targetObj.applyDebuff(targetObj, this.createWoundedDebuff(3, this));
          }
        });
      }
    }
  }

  get skillCooldown(): number {
    if (this.chess.skill) {
      return Math.max(
        this.chess.skill.cooldown -
          this.getEffectiveStat(this.chess, "cooldownReduction") / 10,
        0
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
        duration: 5,
        maxDuration: 5,
        effects: [],
        damagePerTurn: 0,
        damageType: "physical",
        healPerTurn: 0,
        unique: true,
        appliedAt: Date.now(),
        casterPlayerId: this.chess.ownerId,
        casterName: this.chess.name,
        currentStacks: 1,
        maximumStacks: 1,
      });
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
          chess.chess.debuffs.splice(
            chess.chess.debuffs.indexOf(existingDebuff),
            1
          );
          chess.chess.debuffs.push({ ...debuff, currentStacks: 1 });
          return true;
        }
        return false; // Can't apply unique debuff twice
      }
    }
    if (
      chess.chess.debuffs.some((d) => d.id === debuff.id && d.maximumStacks > 1)
    ) {
      const existingDebuff = chess.chess.debuffs.find(
        (d) => d.id === debuff.id
      );
      if (
        existingDebuff &&
        existingDebuff.currentStacks < existingDebuff.maximumStacks
      ) {
        existingDebuff.duration = debuff.duration;
        existingDebuff.currentStacks++;
        return true;
      }
      return false;
    }
    chess.chess.debuffs.push({ ...debuff, currentStacks: 1 });
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
    if (chess.chess.stats.hp <= 0) {
      return;
    }
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
        this.damage(
          chess,
          debuff.damagePerTurn * debuff.currentStacks,
          debuff.damageType,
          this,
          0
        );
      }

      // Apply heal per turn
      if (debuff.healPerTurn > 0) {
        this.heal(chess, debuff.healPerTurn * debuff.currentStacks);
      }

      // Reduce duration
      debuff.duration--;

      // Remove expired debuffs
      if (debuff.duration <= 0) {
        chess.chess.debuffs.splice(i, 1);
      }
    }
  }
  processShields(chess: ChessObject): void {
    if (chess.chess.stats.hp <= 0) {
      return;
    }
    if (!chess.chess.shields || chess.chess.shields.length === 0) {
      return;
    }
    for (let i = chess.chess.shields.length - 1; i >= 0; i--) {
      const shield = chess.chess.shields[i];
      if (shield.duration === Number.MAX_SAFE_INTEGER) {
        continue;
      }
      shield.duration--;
      if (shield.duration <= 0) {
        chess.chess.shields.splice(i, 1);
      }
    }
  }

  get attackRange(): AttackRange {
    return {
      ...this.chess.stats.attackRange,
      range: this.range,
    };
  }

  get hpRegen(): number {
    return this.getEffectiveStat(this.chess, "hpRegen");
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

  get range(): number {
    return this.chess.stats.attackRange.range;
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

    // Collect all modifiers from items and debuffs
    const modifiers: Array<{ value: number; type: string }> = [];

    // Collect item bonuses
    chess.items.forEach((item) => {
      const itemData = getItemById(item.id);
      const listEffect =
        itemData?.effects.filter((effect) => effect.stat === stat) || [];
      listEffect.forEach((effect) => {
        if (
          effect.condition &&
          !effect.condition(ChessFactory.createChess(chess, this.game))
        ) {
          return;
        }
        modifiers.push({ value: effect.value, type: effect.type });
      });
    });

    // Collect debuff effects (auras now apply debuffs instead of direct modification)
    chess.debuffs.forEach((debuff) => {
      debuff.effects.forEach((effect) => {
        if (effect.stat === stat) {
          modifiers.push({ value: effect.modifier, type: effect.type });
        }
      });
    });

    // Sort modifiers: "add" first, then "multiply", then "set"
    const sortOrder = { add: 0, multiply: 1, set: 2 };
    modifiers.sort((a, b) => {
      const orderA = sortOrder[a.type] ?? 999;
      const orderB = sortOrder[b.type] ?? 999;
      return orderA - orderB;
    });

    // Apply modifiers in sorted order
    modifiers.forEach((modifier) => {
      statValue = this.applyStatModifier(
        statValue,
        modifier.value,
        modifier.type
      );
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
              const targetChessObject = ChessFactory.createChess(
                targetChess,
                this.game
              );
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

  // Check if this champion's passive is disabled by Evenshroud debuff
  isPassiveDisabled(): boolean {
    return this.chess.debuffs.some(
      (debuff) => debuff.id === "aura_evenshroud_passive_disable"
    );
  }

  move(position: Square, customSpeed?: number): void {
    // Check if this is a castling move (Poro moving 2 squares horizontally)
    if (this.chess.name === "Poro" && !this.chess.hasMovedBefore) {
      const deltaX = position.x - this.chess.position.x;
      if (Math.abs(deltaX) === 2 && position.y === this.chess.position.y) {
        // This is a castling attempt
        this.executeCastling(position);
        return;
      }
    }

    // Calculate effective speed with first move bonus for minions
    let effectiveSpeed = customSpeed ?? this.speed;

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

  /**
   * Check if castling is valid
   */
  canCastle(targetPosition: Square): {
    valid: boolean;
    rookPosition?: Square;
    rookNewPosition?: Square;
  } {
    // Only Poro (king) can castle
    if (this.chess.name !== "Poro") {
      return { valid: false };
    }

    // King must not have moved
    if (this.chess.hasMovedBefore) {
      return { valid: false };
    }

    // Must be moving 2 squares horizontally on the same rank
    const deltaX = targetPosition.x - this.chess.position.x;
    const deltaY = targetPosition.y - this.chess.position.y;

    if (deltaY !== 0 || Math.abs(deltaX) !== 2) {
      return { valid: false };
    }

    // Determine which rook (kingside or queenside)
    const direction = deltaX > 0 ? 1 : -1; // 1 for kingside (right), -1 for queenside (left)
    const rookX = direction > 0 ? 7 : 0; // Rook at h-file (7) or a-file (0)
    const rookPosition: Square = { x: rookX, y: this.chess.position.y };

    // Find the rook
    const rook = this.game.board.find(
      (piece) =>
        piece.position.x === rookX &&
        piece.position.y === this.chess.position.y &&
        piece.name === "Siege Minion" &&
        piece.blue === this.chess.blue &&
        piece.stats.hp > 0
    );

    if (!rook || rook.hasMovedBefore) {
      return { valid: false };
    }

    // Check if path between king and rook is clear
    const minX = Math.min(this.chess.position.x, rookX);
    const maxX = Math.max(this.chess.position.x, rookX);

    for (let x = minX + 1; x < maxX; x++) {
      const blockingPiece = this.game.board.find(
        (piece) =>
          piece.position.x === x &&
          piece.position.y === this.chess.position.y &&
          piece.stats.hp > 0
      );
      if (blockingPiece) {
        return { valid: false };
      }
    }

    // Calculate rook's new position (next to the king on the other side)
    const rookNewPosition: Square = {
      x: this.chess.position.x + direction,
      y: this.chess.position.y,
    };

    return { valid: true, rookPosition, rookNewPosition };
  }

  /**
   * Execute castling move
   */
  executeCastling(targetPosition: Square): void {
    const castlingResult = this.canCastle(targetPosition);

    if (!castlingResult.valid) {
      throw new Error("Invalid castling move");
    }

    // Find the rook
    const rook = this.game.board.find(
      (piece) =>
        piece.position.x === castlingResult.rookPosition.x &&
        piece.position.y === castlingResult.rookPosition.y &&
        piece.name === "Siege Minion" &&
        piece.blue === this.chess.blue &&
        piece.stats.hp > 0
    );

    if (!rook) {
      throw new Error("Rook not found for castling");
    }

    // Move the king
    this.chess.position = targetPosition;
    this.chess.hasMovedBefore = true;

    // Move the rook
    rook.position = castlingResult.rookNewPosition;
    rook.hasMovedBefore = true;
  }

  public executeAttack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1
  ): void {
    if (chess.chess.items.some((item) => item.id === "bramble_vest")) {
      damageMultiplier -= 0.08;
    }
    const damage = this.attack(chess, forceCritical, damageMultiplier);
    this.postAttack(chess, damage);
  }

  protected postAttack(chess: ChessObject, damage: number): void {
    if (this.chess.items.some((item) => item.id === "spear_of_shojin")) {
      const numberOfShojin = this.chess.items.filter(
        (item) => item.id === "spear_of_shojin"
      ).length;
      if (this.chess.skill?.currentCooldown > 0) {
        this.chess.skill.currentCooldown -= 0.5 * numberOfShojin;
        if (this.chess.skill.currentCooldown < 0) {
          this.chess.skill.currentCooldown = 0;
        }
      }
    }

    if (this.chess.items.some((item) => item.id === "nashors_tooth")) {
      this.damage(chess, 10 + this.ap * 0.2, "magic", this, this.sunder);
    }
    if (this.chess.items.some((item) => item.id === "guinsoo_rageblade")) {
      this.chess.stats.sunder += 2;
    }
    if (chess.chess.items.some((item) => item.id === "titans_resolve")) {
      chess.applyDebuff(chess, {
        id: "titans_resolve",
        name: "Titan's Resolve",
        description:
          "Each times being attacked, grant 5 damage amplification + armor + magic resistance for 3 turns. (Max 4 times)",
        duration: 3,
        maxDuration: 3,
        effects: [
          {
            stat: "damageAmplification",
            modifier: 5,
            type: "add",
          },
          {
            stat: "physicalResistance",
            modifier: 5,
            type: "add",
          },
          {
            stat: "magicResistance",
            modifier: 5,
            type: "add",
          },
        ],
        damagePerTurn: 0,
        damageType: "physical",
        healPerTurn: 0,
        appliedAt: Date.now(),
        casterPlayerId: this.chess.ownerId,
        casterName: this.chess.name,
        unique: false,
        maximumStacks: 4,
      } as Debuff);
    }
    if (this.chess.items.some((item) => item.id === "wit_s_end")) {
      this.chess.stats.magicResistance += 3;
    }
    if (this.chess.items.some((item) => item.id === "thiefs_gloves")) {
      const stats = [
        "ad",
        "ap",
        "physicalResistance",
        "magicResistance",
      ] as const;
      const values = stats
        .map((stat) => ({ stat, value: chess.chess.stats[stat] }))
        .filter((value) => value.value > 1);
      if (values.length === 0) {
        return;
      }
      const randomStat = values[Math.floor(Math.random() * values.length)].stat;
      chess.chess.stats[randomStat] -= 2;
      this.chess.stats[randomStat] += 2;
    }

    if (
      chess.chess.items.some((item) => item.id === "bramble_vest") &&
      chess.chess.stats.hp > 0
    ) {
      const { GameLogic } = require("../game.logic");
      GameLogic.getAdjacentSquares(chess.chess.position).forEach((square) => {
        const targetChess = GameLogic.getChess(
          this.game,
          !chess.chess.blue,
          square
        );
        if (targetChess) {
          chess.damage(
            ChessFactory.createChess(targetChess, this.game),
            8 + chess.physicalResistance * 0.1,
            "magic",
            chess,
            this.sunder
          );
        }
      });
    }

    // Apply lifesteal: heal for a percentage of physical damage dealt
    if (this.lifesteal > 0) {
      const healAmount = (damage * this.lifesteal) / 100;
      this.heal(this, Math.floor(healAmount));
    }
  }

  protected attack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1
  ): number {
    if (!this.validateAttack(chess.chess.position, this.attackRange)) {
      throw new Error("Invalid attack");
    }

    // Critical strike system from RULE.md: 20% chance, 150% damage
    const criticalChance = this.criticalChance / 100;
    const randomChance = Math.random();
    this.willCrit = forceCritical || randomChance < criticalChance;
    let damage = this.ad;

    if (this.willCrit) {
      damage = (damage * this.criticalDamage) / 100; // 150% damage
      this.postCritDamage(chess, damage);
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
    if (this.chess.items.some((item) => item.id === "blue_buff")) {
      this.chess.skill.currentCooldown -= 1;
      if (this.chess.skill.currentCooldown < 0) {
        this.chess.skill.currentCooldown = 0;
      }
    }
    if (this.chess.items.some((item) => item.id === "archangel_staff")) {
      this.chess.stats.ap += 5;
    }
    if (this.chess.items.some((item) => item.id === "nashors_tooth")) {
      this.applyDebuff(this, this.createDamageAmplificationDebuff(2, this));
    }
    if (this.chess.items.some((item) => item.id === "protectors_vow")) {
      this.applyShield(this.maxHp * 0.15, 2);
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

  acquireItem(item: Item): void {
    this.chess.items.push(item);
    if (item.id === "crownguard") {
      this.applyShield(
        this.maxHp * 0.25,
        Number.MAX_SAFE_INTEGER,
        "crownguard_shield"
      );
    }
    if (item.id === "evenshroud") {
      // Create aura that disables enemy passives
      const evenshroudAura = this.createAura(
        "evenshroud_passive_disable",
        "Evenshroud",
        "This champion's passive skills are disabled.",
        1, // Adjacent squares only
        [
          {
            stat: "speed",
            modifier: 0,
            type: "add",
            target: "enemies",
          },
        ],
        {
          active: true,
          requiresAlive: true,
          duration: "permanent",
        }
      );
      if (!this.chess.auras) {
        this.chess.auras = [];
      }
      this.chess.auras.push(evenshroudAura);
    }
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
