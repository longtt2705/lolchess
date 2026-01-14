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
  SummonerSpellType,
} from "../types";
import { ChessFactory } from "./ChessFactory";
import {
  getAdjacentSquares,
  getChessAtPosition,
  getChessByName,
} from "../utils/helpers";
import { getGameRng } from "../utils/SeededRandom";

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
    if (chess.hasItem("strikers_flail")) {
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
        stun: false,
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
    damageType: "physical" | "magic" | "true" | "non-lethal",
    attacker: ChessObject,
    sunder: number = 0
  ): number {
    let updatedDamage = damage;
    if (this.hasItem("jeweled_gauntlet")) {
      const rng = getGameRng();
      this.willCrit = rng.chance(this.criticalChance);

      if (this.willCrit) {
        updatedDamage = (updatedDamage * this.criticalDamage) / 100; // 125% damage
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

    return damageDealt;
  }

  private static damageReductionPercentage(protectionFactor: number): number {
    if (protectionFactor <= 0) {
      return 0;
    }
    return protectionFactor / (protectionFactor + 30);
  }

  protected calculateDamage(
    target: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true" | "non-lethal",
    sunder: number = 0
  ): number {
    if (damageType === "physical") {
      let physicalResistance = target.physicalResistance;
      if (this.hasItem("last_whisper")) {
        physicalResistance *= 0.7;
      }
      const reducePercentage = ChessObject.damageReductionPercentage(
        physicalResistance - sunder
      );
      return damage * (1 - reducePercentage);
    } else if (damageType === "magic") {
      let magicResistance = target.magicResistance;
      if (this.hasItem("void_staff")) {
        magicResistance *= 0.7;
      }
      const reducePercentage = ChessObject.damageReductionPercentage(
        magicResistance - sunder
      );
      return damage * (1 - reducePercentage);
    } else if (damageType === "true" || damageType === "non-lethal") {
      return Math.max(damage, 1);
    }
  }

  protected damage(
    chess: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true" | "non-lethal",
    attacker: ChessObject,
    sunder: number = 0,
    fromAttack: boolean = false,
    dontApplyDebuff: boolean = false
  ): number {
    let damageAmplification = this.damageAmplification;
    if (chess.chess.stats.hp > 200 && this.hasItem("giant_slayer")) {
      damageAmplification += 15;
    }
    let calDamage = (damage * (damageAmplification + 100)) / 100;
    calDamage = this.calculateDamage(chess, calDamage, damageType, sunder);
    const wasAlive = chess.chess.stats.hp > 0;

    // Check if the target has a shield
    const shields = chess.chess.shields || [];
    if (this.hasItem("serpents_fang")) {
      shields.forEach((shield) => {
        shield.amount = Math.floor(shield.amount * 0.5);
      });
    }
    while (shields.length > 0 && calDamage > 0) {
      const shield = shields[0] || { id: "none", amount: 0, duration: 0 };
      if (shield.amount > calDamage) {
        shield.amount -= calDamage;
        calDamage = 0;
      } else {
        calDamage -= shield.amount;
        shield.amount = 0;
        if (shield.id === "crownguard") {
          this.chess.stats.ap += 10;
        }
        shields.shift();
      }
    }

    const finalDamage = Math.floor(
      chess.preTakenDamage(this, calDamage, damageType, fromAttack)
    );

    chess.chess.stats.hp -= finalDamage;
    if (damageType === "non-lethal") {
      chess.chess.stats.hp = Math.max(chess.chess.stats.hp, 1);
    }
    chess.postTakenDamage(
      this,
      finalDamage,
      damageType,
      fromAttack,
      dontApplyDebuff
    );

    // Elder Dragon execute: if attacker has Elder buff debuff and target is below 15% HP, execute
    if (
      this.hasDebuff("elder_drake_buff") &&
      chess.chess.stats.hp > 0 &&
      chess.chess.stats.hp < chess.chess.stats.maxHp * 0.15 &&
      damageType !== "non-lethal"
    ) {
      chess.chess.stats.hp = 0;
    }

    if (chess.chess.stats.hp <= 0) {
      chess.chess.stats.hp = 0;

      // Award gold to the killer if the target was alive before this damage
      if (wasAlive) {
        this.awardGoldForKill(chess);
        chess.chess.deadAtRound = this.game.currentRound;

        // Set respawn timer for champions only
        if (this.isChampionByName(chess.chess.name)) {
          const deathTimer = this.getDeathTimer(this.game.currentRound);
          chess.chess.respawnAtRound = this.game.currentRound + deathTimer;
        }

        // Check if killed monster was neutral for special rewards
        if (
          this.isDrake(chess.chess.name) ||
          chess.chess.name === "Baron Nashor"
        ) {
          // Award monster kill rewards (gold and buffs)
          this.awardMonsterKillReward(this.chess.ownerId, chess.chess.name);
        }
      }
    }

    if (this.hasItem("hextech_gunblade", "hand_of_justice")) {
      this.heal(this, damage * 0.15);
    }

    return damage; // Return the actual damage dealt
  }

  /**
   * Public method to deal damage from external sources (e.g., item effects)
   */
  public dealDamage(
    target: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true" | "non-lethal",
    sunder: number = 0,
    isSkillDamage: boolean = false
  ): number {
    if (isSkillDamage) {
      return this.activeSkillDamage(target, damage, damageType, this, sunder);
    }
    return this.damage(target, damage, damageType, this, sunder, false);
  }

  protected preTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true" | "non-lethal",
    fromAttack: boolean = false
  ): number {
    const durability = this.durability;
    let finalDamage = damage;
    if (durability > 0) {
      finalDamage = damage * ((100 - durability) / 100);
    }

    if (
      this.hasItem("deaths_dance") &&
      damageType !== "non-lethal" &&
      damageType !== "true"
    ) {
      finalDamage = Math.floor(finalDamage * 0.5);
      const duration = 2;
      const damagePerTurn = finalDamage / duration;
      const rng = getGameRng();
      this.applyDebuff(this, {
        id: `deaths_dance_${Date.now()}_${rng.nextId(9)}`,
        name: "Death's Dance",
        description:
          "50% of the damage the holder receives is instead dealt over 2 turns as non-lethal damage.",
        duration,
        maxDuration: duration,
        effects: [],
        damagePerTurn: damagePerTurn,
        damageType: "non-lethal",
        healPerTurn: 0,
        unique: false,
        appliedAt: Date.now(),
        casterPlayerId: this.chess.ownerId,
        casterName: this.chess.name,
        currentStacks: 1,
        maximumStacks: 1,
        cause: "deaths_dance",
      } as Debuff);
    }

    return finalDamage;
  }

  protected postTakenDamage(
    attacker: ChessObject,
    damage: number,
    damageType: "physical" | "magic" | "true" | "non-lethal",
    fromAttack: boolean = false,
    dontApplyDebuff: boolean = false
  ): void {
    if (this.hasItem("titans_resolve")) {
      const damageToConvert = Math.floor(damage * 0.25);
      this.applyDebuff(this, {
        id: "titans_resolve",
        name: "Titan's Resolve",
        description: `Gains ${damageToConvert} AD and AP for 3 turns.`,
        duration: 3,
        maxDuration: 3,
        effects: [
          { stat: "ad", modifier: damageToConvert, type: "add" },
          { stat: "ap", modifier: damageToConvert, type: "add" },
        ],
        damagePerTurn: 0,
        damageType: "physical",
        healPerTurn: 0,
        appliedAt: Date.now(),
        casterPlayerId: this.chess.ownerId,
        casterName: this.chess.name,
        unique: false,
        currentStacks: 1,
        maximumStacks: 1,
      } as Debuff);
    }
    if (
      this.hasItem("sterak_gage") &&
      this.chess.stats.hp <= this.maxHp * 0.6
    ) {
      const sterakGage = this.getItem("sterak_gage");
      if (sterakGage && sterakGage.currentCooldown <= 0) {
        this.applyShield(this.maxHp * 0.5, 5);
        this.applyDebuff(this, {
          id: "sterak_gage",
          name: "Sterak's Gage",
          description: "Gain 10% AD for 5 turns.",
          duration: 5,
          maxDuration: 5,
          effects: [{ stat: "ad", modifier: 1.1, type: "multiply" }],
          damagePerTurn: 0,
          damageType: "physical",
          healPerTurn: 0,
          unique: true,
          appliedAt: Date.now(),
          casterPlayerId: this.chess.ownerId,
          casterName: this.chess.name,
        } as Debuff);
        sterakGage.currentCooldown = this.getItemCooldown(sterakGage);
      }
    }
    if (attacker.hasItem("morellonomicon") && !dontApplyDebuff) {
      if (attacker.chess.blue !== this.chess.blue) {
        attacker.applyDebuff(
          this,
          this.createBurnedDebuff(3, attacker, "morellonomicon")
        );
        attacker.applyDebuff(
          this,
          this.createWoundedDebuff(3, attacker, "morellonomicon")
        );
      }
    }
    if (attacker.hasItem("serpents_fang")) {
      if (attacker.chess.blue !== this.chess.blue) {
        attacker.applyDebuff(
          this,
          this.createVenomDebuff(3, attacker, "serpents_fang")
        );
      }
    }
    if (this.hasItem("adaptive_helm")) {
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

    this.handleSunlightDebuff(attacker);
  }

  private handleSunlightDebuff(attacker: ChessObject): void {
    const sunlightDebuff = this.getDebuff("sunlight");
    if (sunlightDebuff) {
      const debuffOwner = getChessByName(
        this.game,
        sunlightDebuff.casterPlayerId,
        sunlightDebuff.casterName
      );
      if (debuffOwner) {
        const debuffOwnerObj = ChessFactory.createChess(debuffOwner, this.game);
        attacker.damage(
          debuffOwnerObj,
          10 +
            debuffOwnerObj.physicalResistance * 0.25 +
            debuffOwnerObj.magicResistance * 0.25,
          "magic",
          attacker,
          this.sunder
        );
      }
      this.removeDebuff(this, "sunlight");
    }
  }

  protected getDebuff(id: string): Debuff | undefined {
    return this.chess.debuffs.find((debuff) => debuff.id === id);
  }

  protected hasDebuff(id: string): boolean {
    return this.getDebuff(id) !== undefined;
  }

  public getItem(...ids: string[]): Item | undefined {
    return this.chess.items.find((item) => ids.includes(item.id));
  }

  public hasItem(...ids: string[]): boolean {
    return this.chess.items.some((item) => ids.includes(item.id));
  }

  public applyShield(amount: number, duration: number, id?: string): void {
    if (!this.chess.shields) {
      this.chess.shields = [];
    }
    if (this.hasDebuff("venom")) {
      amount = Math.floor(amount * 0.5);
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
    const rng = getGameRng();
    this.chess.shields.push({
      id: id || `shield_${Date.now()}_${rng.nextId(9)}`,
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

  private createWoundedDebuff(
    turn: number,
    owner: ChessObject,
    cause: string
  ): Debuff {
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
      cause,
    } as Debuff;
  }

  private createBurnedDebuff(
    turn: number,
    owner: ChessObject,
    cause: string
  ): Debuff {
    return {
      id: "burned",
      name: "Burned",
      description: `Burns enemies for ${5 + Math.floor(owner.game.currentRound / 10)} true damage each turn.`,
      duration: turn,
      maxDuration: turn,
      effects: [],
      damagePerTurn: 5 + Math.floor(owner.game.currentRound / 10),
      damageType: "true",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: owner.chess.ownerId,
      casterName: owner.chess.name,
      cause,
    } as Debuff;
  }

  private createVenomDebuff(
    turn: number,
    owner: ChessObject,
    cause: string
  ): Debuff {
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
      cause,
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
    if (chess.hasItem("spirit_visage")) {
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

      if (this.hasItem("spirit_visage")) {
        const missingHp = this.maxHp - this.chess.stats.hp;
        this.heal(this, missingHp * 0.05);
      }

      // Apply Sunfire Cape effect
      if (this.hasItem("sunfire_cape")) {
        getAdjacentSquares(this.chess.position).forEach((square) => {
          const targetChess = getChessAtPosition(
            this.game,
            !this.chess.blue,
            square
          );
          if (targetChess) {
            const targetObj = ChessFactory.createChess(targetChess, this.game);
            targetObj.applyDebuff(
              targetObj,
              this.createBurnedDebuff(3, this, "sunfire_cape")
            );
            targetObj.applyDebuff(
              targetObj,
              this.createWoundedDebuff(3, this, "sunfire_cape")
            );
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

  getItemCooldown(item: any): number {
    if (item.cooldown) {
      return Math.max(
        item.cooldown -
          this.getEffectiveStat(this.chess, "cooldownReduction") / 10,
        0
      );
    }
    return 0;
  }

  refreshCooldown(chess: ChessObject): void {
    // Refresh skill cooldown
    if (chess.chess.skill) {
      chess.chess.skill.currentCooldown -= 1;
      if (chess.chess.skill.currentCooldown < 0) {
        chess.chess.skill.currentCooldown = 0;
      }
    }

    // Refresh summoner spell cooldown
    if (chess.chess.summonerSpell) {
      chess.chess.summonerSpell.currentCooldown -= 1;
      if (chess.chess.summonerSpell.currentCooldown < 0) {
        chess.chess.summonerSpell.currentCooldown = 0;
      }
    }

    // Refresh item cooldowns
    chess.chess.items.forEach((item) => {
      if (item.currentCooldown > 0) {
        item.currentCooldown -= 1;
        if (item.currentCooldown < 0) {
          item.currentCooldown = 0;
        }
      }
    });
  }

  // Debuff Management
  applyDebuff(chess: ChessObject, debuff: Debuff): boolean {
    // Implement quicksilver item
    const quicksilver = chess.getItem("quicksilver");
    if (quicksilver && quicksilver.currentCooldown <= 0) {
      chess.chess.debuffs.push({
        id: "quicksilver",
        name: "Quicksilver",
        description:
          "Resistance to all active debuffs from opponent for 2 turns.",
        duration: 2,
        maxDuration: 2,
        effects: [],
        damagePerTurn: 0,
        damageType: "physical",
        healPerTurn: 0,
        stun: false,
        unique: true,
        appliedAt: Date.now(),
        casterPlayerId: this.chess.ownerId,
        casterName: this.chess.name,
        currentStacks: 1,
        maximumStacks: 1,
      });
      quicksilver.currentCooldown = this.getItemCooldown(quicksilver);
      return true;
    }

    if (
      chess.chess.debuffs.some((d) => d.id === "quicksilver") &&
      debuff.casterPlayerId !== this.chess.ownerId
    ) {
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
      if (debuff.id.startsWith("aura_") || debuff.duration === -1) {
        continue;
      }

      // Apply damage per turn
      if (debuff.damagePerTurn > 0) {
        const isMorellonomicon = debuff.cause === "morellonomicon";
        this.damage(
          chess,
          debuff.damagePerTurn * debuff.currentStacks,
          debuff.damageType,
          this,
          this.sunder,
          false,
          isMorellonomicon
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
        // Handle transformation expiration with custom logic
        if (debuff.isTransformation && debuff.onExpireId) {
          this.handleTransformationExpire(chess, debuff);
        }
        chess.chess.debuffs.splice(i, 1);
      }
    }
  }

  /**
   * Handle transformation debuff expiration
   * This calculates the HP ratio and adjusts HP based on the original maxHP
   */
  protected handleTransformationExpire(chess: ChessObject, debuff: any): void {
    if (debuff.onExpireId === "nasus_transform") {
      const originalMaxHp = debuff.payload?.originalMaxHp;
      if (originalMaxHp && originalMaxHp > 0) {
        // Get the current maxHP (including the transformation bonus)
        const currentMaxHp = chess.maxHp;
        // Calculate the HP ratio before transformation ends
        const hpRatio = chess.chess.stats.hp / currentMaxHp;
        // Calculate new HP based on original maxHP, maintaining the ratio
        const newHp = Math.floor(hpRatio * originalMaxHp);
        // Clamp HP to valid range [1, originalMaxHp] (don't let it drop to 0)
        chess.chess.stats.hp = Math.max(1, Math.min(newHp, originalMaxHp));
      }
    }
    // Additional transformation handlers can be added here
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

  get durability(): number {
    return this.getEffectiveStat(this.chess, "durability");
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
    if (this.hasItem("rapid_firecannon")) {
      return this.chess.stats.attackRange.range + 1;
    }
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

  get isStunned(): boolean {
    return this.chess.debuffs.some((debuff) => debuff.stun);
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
          modifiers.push({
            value: effect.modifier * debuff.currentStacks,
            type: effect.type,
          });
        }
      });
    });

    // Sort modifiers: "add" first, then "percentAdd", then "multiply", then "set"
    const sortOrder: Record<string, number> = {
      add: 0,
      percentAdd: 1,
      multiply: 2,
      set: 3,
    };
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

    return Math.round(Math.max(0, statValue)); // Stats can't be negative
  }

  private applyStatModifier(
    currentValue: number,
    modifier: number,
    type: string
  ): number {
    if (type === "add") {
      return Math.round(currentValue + modifier);
    } else if (type === "percentAdd") {
      // Percentage increase: +15 means multiply by 1.15
      return Math.round(currentValue * (1 + modifier / 100));
    } else if (type === "multiply") {
      return Math.round(currentValue * modifier);
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
    this.applyShield(
      this.maxHp * 0.25,
      Number.MAX_SAFE_INTEGER,
      "castling_shield"
    );

    // Move the rook
    rook.position = castlingResult.rookNewPosition;
    rook.hasMovedBefore = true;
  }

  public executeAttack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1,
    ignoreValidation: boolean = false
  ): void {
    if (
      !ignoreValidation &&
      !this.validateAttack(chess.chess.position, this.attackRange)
    ) {
      throw new Error("Invalid attack");
    }
    if (chess.hasItem("bramble_vest")) {
      damageMultiplier -= 0.08;
    }
    const damage = this.attack(chess, forceCritical, damageMultiplier);
    this.postAttack(chess, damage);
  }

  public postAttack(chess: ChessObject, damage: number): void {
    if (this.hasItem("spear_of_shojin")) {
      this.chess.skill.currentCooldown -= this.chess.items.filter(
        (item) => item.id === "spear_of_shojin"
      ).length;
      if (this.chess.skill.currentCooldown < 0) {
        this.chess.skill.currentCooldown = 0;
      }
    }

    if (this.hasItem("nashors_tooth")) {
      this.damage(chess, 10 + this.ap * 0.2, "magic", this, this.sunder);
    }
    if (this.hasItem("guinsoo_rageblade")) {
      const guinsooRageblade = this.getItem("guinsoo_rageblade");
      if (guinsooRageblade && guinsooRageblade.currentCooldown <= 0) {
        guinsooRageblade.currentCooldown =
          this.getItemCooldown(guinsooRageblade);
        this.executeAttack(chess, false, 0.5);
      }
    }

    if (this.hasItem("wit_s_end")) {
      const bonusAd = this.ad - this.chess.stats.ad;
      this.damage(chess, 5 + bonusAd * 0.25, "magic", this, this.sunder);
    }

    if (chess.hasItem("bramble_vest") && chess.chess.stats.hp > 0) {
      getAdjacentSquares(chess.chess.position).forEach((square) => {
        const targetChess = getChessAtPosition(
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

  protected isCriticalStrike(forceCritical: boolean = false): boolean {
    if (forceCritical) return true;
    const rng = getGameRng();
    return rng.chance(this.criticalChance);
  }

  protected attack(
    chess: ChessObject,
    forceCritical: boolean = false,
    damageMultiplier: number = 1
  ): number {
    // Critical strike system from RULE.md: 20% chance, 125% damage
    this.willCrit = this.isCriticalStrike(forceCritical);
    let damage = this.ad;

    if (this.willCrit) {
      damage = (damage * this.criticalDamage) / 100; // 125% damage
      this.postCritDamage(chess, damage);
    }

    return this.damage(
      chess,
      damage * damageMultiplier,
      "physical",
      this,
      this.sunder,
      true
    );
  }

  protected postSkill(chess: ChessObject): void {
    // Set skill on cooldown
    this.chess.skill.currentCooldown = this.skillCooldown;
    if (this.hasItem("blue_buff")) {
      this.chess.skill.currentCooldown -= Math.round(this.skillCooldown * 0.25);
      if (this.chess.skill.currentCooldown < 0) {
        this.chess.skill.currentCooldown = 0;
      }
    }
    if (this.hasItem("archangel_staff")) {
      this.chess.stats.ap += 5;
    }
    if (this.hasItem("nashors_tooth")) {
      this.applyDebuff(this, this.createDamageAmplificationDebuff(2, this));
    }
    if (this.hasItem("protectors_vow")) {
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
    if (skill.targetTypes === "squareInRange") {
      return this.validateSquareInRange(position, skill.attackRange);
    }
    if (skill.targetTypes === "allyMinion") {
      return this.validateAllyMinion(position, skill.attackRange);
    }
    return this.validateAttack(position, skill.attackRange);
  }

  validateAllyMinion(position: Square, attackRange: AttackRange): boolean {
    // First validate the range and direction
    if (!this.validateAttack(position, attackRange)) {
      return false;
    }

    // Check if there's an ally at the target position
    const targetChess = getChessAtPosition(
      this.game,
      this.chess.blue,
      position
    );
    if (!targetChess) {
      return false; // No ally at position
    }

    // Check if the target is a Melee Minion or Caster Minion
    if (
      targetChess.name !== "Melee Minion" &&
      targetChess.name !== "Caster Minion"
    ) {
      return false; // Not a minion
    }

    return true;
  }

  validateSquareInRange(position: Square, attackRange: AttackRange): boolean {
    // Check if attackRange is defined
    if (!attackRange) {
      return false;
    }

    // Can't target the same position
    if (
      this.chess.position.x === position.x &&
      this.chess.position.y === position.y
    ) {
      return false;
    }

    // Check if target is within board bounds
    if (position.x < -1 || position.x > 8 || position.y < 0 || position.y > 7) {
      return false;
    }

    // Check if target square is empty
    const occupiedBy = this.game.board.find(
      (piece) =>
        piece.position.x === position.x &&
        piece.position.y === position.y &&
        piece.stats.hp > 0
    );
    if (occupiedBy) {
      return false; // Square must be empty
    }

    // Calculate deltas
    const deltaX = Math.abs(position.x - this.chess.position.x);
    const deltaY = Math.abs(position.y - this.chess.position.y);

    // Check for L-shape pattern (knight-like movement)
    const isLShape =
      (deltaX === 2 && deltaY === 1) || (deltaX === 1 && deltaY === 2);
    if (isLShape && attackRange.lShape) {
      // L-shape targeting ignores range limits and directional restrictions
      return true;
    }

    // Check if target exceeds range limit
    const maxDistance = Math.max(deltaX, deltaY);
    if (attackRange.range && maxDistance > attackRange.range) {
      return false;
    }

    // Determine direction
    const isHorizontal = deltaY === 0 && deltaX > 0;
    const isVertical = deltaX === 0 && deltaY > 0;
    const isDiagonal = deltaX === deltaY && deltaX > 0;

    // Must be in exactly one valid direction
    if (!isHorizontal && !isVertical && !isDiagonal) {
      return false; // Invalid movement pattern
    }

    // Check if the skill can target in the determined direction
    if (isHorizontal && !attackRange.horizontal) {
      return false;
    }
    if (isVertical && !attackRange.vertical) {
      return false;
    }
    if (isDiagonal && !attackRange.diagonal) {
      return false;
    }

    // No line-of-sight check - can target any empty square in range
    return true;
  }

  acquireItem(item: Item): void {
    this.chess.items.push(item);
    if (item.id === "crownguard") {
      this.applyShield(
        this.maxHp * 0.3,
        Number.MAX_SAFE_INTEGER,
        "crownguard_shield"
      );
    }
    if (item.id === "evenshroud") {
      // Create aura that reduces enemy armor and magic resistance
      const evenshroudAura = this.createAura(
        "evenshroud_armor_reduction",
        "Evenshroud",
        "Reduces Physical and Magic Resistance by 10.",
        1, // Adjacent squares only
        [
          {
            stat: "physicalResistance",
            modifier: -10,
            type: "add",
            target: "enemies",
          },
          {
            stat: "magicResistance",
            modifier: -10,
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

    // Check for knight move (only available for pieces in slots 1 and 6 on first move)
    const isKnightSlot =
      this.chess.startingPosition &&
      (this.chess.startingPosition.y === 0 ||
        this.chess.startingPosition.y === 7) &&
      (this.chess.startingPosition.x === 1 ||
        this.chess.startingPosition.x === 6);
    const isKnightMove =
      (deltaX === 2 && deltaY === 1) || (deltaX === 1 && deltaY === 2);

    if (!this.chess.hasMovedBefore && isKnightSlot && isKnightMove) {
      // Knight moves are valid - they can jump over pieces
      // No need to check path or speed restrictions for knight moves
      return true;
    }

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
   * Only ally pieces with Ghost debuff do not block the path
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
        // Check if it's an ally with Ghost debuff - only ally Ghost pieces don't block
        const isAlly = blockingPiece.ownerId === this.chess.ownerId;
        const hasGhost = blockingPiece.debuffs?.some(
          (d) => d.payload?.isGhost === true
        );

        if (!isAlly || !hasGhost) {
          // Enemy piece OR ally without Ghost - path is blocked
          return false;
        }
        // Ally with Ghost - continue checking (doesn't block)
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

    // Check for L-shape pattern (knight-like movement)
    const isLShape =
      (deltaX === 2 && deltaY === 1) || (deltaX === 1 && deltaY === 2);
    if (isLShape && attackRange.lShape) {
      // L-shape attacks ignore range limits and can jump over pieces
      return true;
    }

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

  public isMinion(): boolean {
    return (
      this.chess.name === "Melee Minion" ||
      this.chess.name === "Caster Minion" ||
      this.chess.name === "Siege Minion" ||
      this.chess.name === "Super Minion"
    );
  }

  public isChampion(): boolean {
    return !this.isMinion() && this.chess.name !== "Poro";
  }

  // Check if a chess piece is any type of drake
  protected isDrake(name: string): boolean {
    return (
      name === "Infernal Drake" ||
      name === "Cloud Drake" ||
      name === "Mountain Drake" ||
      name === "Hextech Drake" ||
      name === "Ocean Drake" ||
      name === "Chemtech Drake" ||
      name === "Elder Dragon"
    );
  }

  /**
   * Check if a piece name represents a champion (not minion, poro, or neutral monster)
   */
  protected isChampionByName(name: string): boolean {
    const nonChampions = [
      "Poro",
      "Melee Minion",
      "Caster Minion",
      "Siege Minion",
      "Super Minion",
      "Sand Soldier",
    ];
    return (
      !nonChampions.includes(name) &&
      !this.isDrake(name) &&
      name !== "Baron Nashor"
    );
  }

  /**
   * Calculate death timer based on current round
   * Rounds 1-15: 4 turns
   * Rounds 16-30: 7 turns
   * Rounds 31+: 10 turns
   */
  protected getDeathTimer(currentRound: number): number {
    if (currentRound <= 15) return 4;
    if (currentRound <= 30) return 7;
    return 10;
  }

  protected hasBaronBuff(): boolean {
    return this.chess.debuffs?.some((debuff) => debuff.id === "baron_buff");
  }

  /**
   * Award gold and apply buffs for killing neutral monsters (Drakes, Baron)
   * This method handles monster kill rewards without depending on GameLogic
   */
  protected awardMonsterKillReward(
    killerPlayerId: string,
    monsterName: string
  ): void {
    const playerIndex = this.game.players.findIndex(
      (p) => p.userId === killerPlayerId
    );
    if (playerIndex === -1) return;

    // Check if it's any type of drake
    if (this.isDrake(monsterName)) {
      this.game.players[playerIndex].gold += 50;
      this.game.drakesKilled += 1;
      this.applyDrakeSoulBuff(killerPlayerId, monsterName);
    } else if (monsterName === "Baron Nashor") {
      this.game.players[playerIndex].gold += 100;
      this.applyHandOfBaronBuff(killerPlayerId);
    }
  }

  /**
   * Apply drake soul buffs to all player's pieces
   */
  private applyDrakeSoulBuff(playerId: string, drakeName: string): void {
    const isMinion = (name: string) =>
      name === "Melee Minion" ||
      name === "Caster Minion" ||
      name === "Siege Minion" ||
      name === "Super Minion";

    const playerPieces = this.game.board.filter(
      (chess) => chess.ownerId === playerId && !isMinion(chess.name)
    );

    playerPieces.forEach((chess) => {
      const chessObject = ChessFactory.createChess(chess, this.game);
      let debuff: Debuff | null = null;

      switch (drakeName) {
        case "Infernal Drake":
          // +15% AD and AP (as percentage multiplier)
          debuff = {
            id: "infernal_drake_buff",
            name: "Infernal Dragon Soul",
            description: "+15% AD and AP",
            duration: -1, // Permanent
            maxDuration: -1,
            effects: [
              { stat: "ad", modifier: 15, type: "percentAdd" },
              { stat: "ap", modifier: 15, type: "percentAdd" },
            ],
            damagePerTurn: 0,
            damageType: "physical",
            healPerTurn: 0,
            unique: true,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Infernal Drake",
          } as Debuff;
          break;

        case "Cloud Drake":
          // +1 move speed
          debuff = {
            id: "cloud_drake_buff",
            name: "Cloud Dragon Soul",
            description: "+1 move speed",
            duration: -1, // Permanent
            maxDuration: -1,
            effects: [{ stat: "speed", modifier: 1, type: "add" }],
            damagePerTurn: 0,
            damageType: "physical",
            healPerTurn: 0,
            unique: true,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Cloud Drake",
          } as Debuff;
          break;

        case "Mountain Drake":
          // +25 physical and magic resistance
          debuff = {
            id: "mountain_drake_buff",
            name: "Mountain Dragon Soul",
            description: "+25 physical and magic resistance",
            duration: -1, // Permanent
            maxDuration: -1,
            effects: [
              { stat: "physicalResistance", modifier: 25, type: "add" },
              { stat: "magicResistance", modifier: 25, type: "add" },
            ],
            damagePerTurn: 0,
            damageType: "physical",
            healPerTurn: 0,
            unique: true,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Mountain Drake",
          } as Debuff;
          break;

        case "Hextech Drake":
          // +10 cooldown reduction
          debuff = {
            id: "hextech_drake_buff",
            name: "Hextech Dragon Soul",
            description: "+10 cooldown reduction",
            duration: -1, // Permanent
            maxDuration: -1,
            effects: [{ stat: "cooldownReduction", modifier: 10, type: "add" }],
            damagePerTurn: 0,
            damageType: "physical",
            healPerTurn: 0,
            unique: true,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Hextech Drake",
          } as Debuff;
          break;

        case "Ocean Drake":
          // +5 HP regen
          debuff = {
            id: "ocean_drake_buff",
            name: "Ocean Dragon Soul",
            description: "+5 HP regen per turn",
            duration: -1, // Permanent
            maxDuration: -1,
            effects: [{ stat: "hpRegen", modifier: 5, type: "add" }],
            damagePerTurn: 0,
            damageType: "physical",
            healPerTurn: 0,
            unique: true,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Ocean Drake",
          } as Debuff;
          break;

        case "Chemtech Drake":
          // +10 durability
          debuff = {
            id: "chemtech_drake_buff",
            name: "Chemtech Dragon Soul",
            description: "+10 durability",
            duration: -1, // Permanent
            maxDuration: -1,
            effects: [{ stat: "durability", modifier: 10, type: "add" }],
            damagePerTurn: 0,
            damageType: "physical",
            healPerTurn: 0,
            unique: true,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Chemtech Drake",
          } as Debuff;
          break;

        case "Elder Dragon":
          // Grant Elder buff - execute enemies below 15% HP (6 turns)
          debuff = {
            id: "elder_drake_buff",
            name: "Elder Dragon Buff",
            description: "Execute enemies below 15% HP",
            duration: 6,
            maxDuration: 6,
            effects: [], // No stat effects, execution is handled in damage logic
            damagePerTurn: 0,
            damageType: "physical",
            healPerTurn: 0,
            unique: true,
            appliedAt: Date.now(),
            casterPlayerId: playerId,
            casterName: "Elder Dragon",
          } as Debuff;
          break;
      }

      if (debuff) {
        chessObject.applyDebuff(chessObject, debuff);
      }
    });
  }

  /**
   * Apply Hand of Baron buff to all player's pieces
   */
  private applyHandOfBaronBuff(playerId: string): void {
    // Hand of Baron Buff:
    // - Minions and Siege Minions: +40 AD and +40 Physical Resistance
    // - Champions: +20 AP, +20 AD, +20 Physical Resistance, +20 Magic Resistance
    const playerPieces = this.game.board.filter(
      (chess) => chess.ownerId === playerId
    );

    playerPieces.forEach((chess) => {
      const chessObject = ChessFactory.createChess(chess, this.game);
      const isMinion = chessObject.isMinion();
      const isChampion = chessObject.isChampion();

      if (isMinion) {
        chessObject.applyDebuff(chessObject, {
          id: "baron_buff",
          name: "Baron Buff",
          description:
            "Gain +20 AD and +20 AP, and +20 Physical and Magic Resistance. Minions cannot be affected by diagonal execution.",
          duration: 8,
          maxDuration: 8,
          effects: [
            { stat: "ad", modifier: 20, type: "add" },
            { stat: "ap", modifier: 20, type: "add" },
            { stat: "physicalResistance", modifier: 20, type: "add" },
            { stat: "magicResistance", modifier: 20, type: "add" },
          ],
          damagePerTurn: 0,
          damageType: "physical",
          healPerTurn: 0,
          unique: true,
          appliedAt: Date.now(),
          casterPlayerId: playerId,
          casterName: "Baron",
        } as Debuff);
      } else if (isChampion) {
        chessObject.applyDebuff(chessObject, {
          id: "baron_buff",
          name: "Baron Buff",
          description:
            "Gain +20 AP, +20 AD, +20 Physical and Magic Resistance.",
          duration: 8,
          maxDuration: 8,
          effects: [
            { stat: "ap", modifier: 20, type: "add" },
            { stat: "ad", modifier: 20, type: "add" },
            { stat: "physicalResistance", modifier: 20, type: "add" },
            { stat: "magicResistance", modifier: 20, type: "add" },
          ],
          damagePerTurn: 0,
          damageType: "physical",
          healPerTurn: 0,
          unique: true,
          appliedAt: Date.now(),
          casterPlayerId: playerId,
          casterName: "Baron",
        } as Debuff);
      }
    });
  }

  public useSummonerSpell(
    spell: SummonerSpellType,
    targetPosition?: Square,
    actionDetails?: {
      summonerSpellTargets?: Array<{
        targetId: string;
        targetPosition: Square;
      }>;
      fromPosition?: Square;
      targetPosition?: Square;
      damage?: number;
      targetId?: string;
      killedPieceIds?: string[];
    }
  ): void {
    switch (spell) {
      case "Heal":
        this.useHeal(actionDetails);
        break;
      case "Ghost":
        this.useGhost(actionDetails);
        break;
      case "Barrier":
        this.useBarrier(actionDetails);
        break;
      case "Smite":
        this.useSmite(targetPosition!, actionDetails);
        break;
      case "Flash":
        this.useFlash(targetPosition!, actionDetails);
        break;
      default:
        throw new Error(`Unknown summoner spell type: ${spell}`);
    }
  }

  private useHeal(actionDetails?: {
    summonerSpellTargets?: Array<{ targetId: string; targetPosition: Square }>;
  }): void {
    // Heal: Heal caster and nearby ally with lowest HP
    const healAmount = 30;

    // Heal the caster first
    this.heal(this, healAmount);

    if (actionDetails?.summonerSpellTargets) {
      actionDetails.summonerSpellTargets.push({
        targetId: this.chess.id,
        targetPosition: this.chess.position,
      });
    }

    // Find nearby ally with lowest HP (adjacent squares)
    const adjacentSquares = getAdjacentSquares(this.chess.position);
    const nearbyAllies = this.game.board.filter(
      (p) =>
        p.ownerId === this.chess.ownerId &&
        p.id !== this.chess.id &&
        p.stats.hp > 0 &&
        p.stats.hp < p.stats.maxHp &&
        adjacentSquares.some(
          (sq) => sq.x === p.position.x && sq.y === p.position.y
        )
    );

    if (nearbyAllies.length > 0) {
      // Find ally with lowest HP
      const lowestHpAlly = nearbyAllies.reduce((lowest, ally) =>
        ally.stats.hp < lowest.stats.hp ? ally : lowest
      );

      this.heal(ChessFactory.createChess(lowestHpAlly, this.game), healAmount);

      if (actionDetails?.summonerSpellTargets) {
        actionDetails.summonerSpellTargets.push({
          targetId: lowestHpAlly.id,
          targetPosition: lowestHpAlly.position,
        });
      }
    }
  }

  private useGhost(actionDetails?: {
    summonerSpellTargets?: Array<{ targetId: string; targetPosition: Square }>;
  }): void {
    // Ghost: +1 speed and become ghost for 3 turns
    const rng = getGameRng();
    const ghostDebuff: Debuff = {
      id: `ghost_${this.chess.id}_${Date.now()}_${rng.nextId(9)}`,
      name: "Ghost",
      description: "Increased speed and does not block ally attacks",
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "speed",
          modifier: 1,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "true",
      healPerTurn: 0,
      unique: true,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
      payload: { isGhost: true }, // Mark as ghost for ally attack checks
    };

    // Remove existing ghost debuff if any
    this.applyDebuff(this, ghostDebuff);

    if (actionDetails?.summonerSpellTargets) {
      actionDetails.summonerSpellTargets.push({
        targetId: this.chess.id,
        targetPosition: this.chess.position,
      });
    }
  }

  private useBarrier(actionDetails?: {
    summonerSpellTargets?: Array<{ targetId: string; targetPosition: Square }>;
  }): void {
    // Barrier: Create a shield only on the caster
    const shieldAmount = 50;
    const shieldDuration = 2;

    // Add shield only to caster
    this.applyShield(shieldAmount, shieldDuration, `barrier_${this.chess.id}}`);

    if (actionDetails?.summonerSpellTargets) {
      actionDetails.summonerSpellTargets.push({
        targetId: this.chess.id,
        targetPosition: this.chess.position,
      });
    }
  }

  private useSmite(
    targetPosition: Square,
    actionDetails?: {
      summonerSpellTargets?: Array<{
        targetId: string;
        targetPosition: Square;
      }>;
      damage?: number;
      targetId?: string;
      targetPosition?: Square;
      killedPieceIds?: string[];
    }
  ): void {
    // Smite: Deal 50 true damage to target minion or monster (max range 2)
    if (!targetPosition) {
      throw new Error("Smite requires a target");
    }

    // Check if target is within range 2
    const deltaX = Math.abs(targetPosition.x - this.chess.position.x);
    const deltaY = Math.abs(targetPosition.y - this.chess.position.y);
    const distance = Math.max(deltaX, deltaY);

    if (distance > 2) {
      throw new Error("Smite has a maximum range of 2");
    }

    const target = this.game.board.find(
      (p) =>
        p.position.x === targetPosition.x &&
        p.position.y === targetPosition.y &&
        p.stats.hp > 0
    );

    if (!target) {
      throw new Error("No target found at position");
    }

    // Check if target is a minion or neutral monster
    const isMinion =
      target.name.includes("Minion") || target.name === "Super Minion";
    const isNeutralMonster =
      target.ownerId === "neutral" ||
      target.name.includes("Drake") ||
      target.name === "Baron Nashor" ||
      target.name === "Elder Dragon";

    // Smite can only target enemy minions (not ally minions) or neutral monsters
    const isEnemyMinion = isMinion && target.ownerId !== this.chess.ownerId;

    if (!isEnemyMinion && !isNeutralMonster) {
      throw new Error(
        "Smite can only target enemy minions or neutral monsters"
      );
    }

    // Deal 35-65 true damage
    const rng = getGameRng();
    const smiteDamage = rng.nextInt(35, 65);
    this.damage(
      ChessFactory.createChess(target, this.game),
      smiteDamage,
      "true",
      this
    );

    if (actionDetails) {
      actionDetails.damage = smiteDamage;
      actionDetails.targetId = target.id;
      actionDetails.targetPosition = targetPosition;

      if (actionDetails.summonerSpellTargets) {
        actionDetails.summonerSpellTargets.push({
          targetId: target.id,
          targetPosition: targetPosition,
        });
      }
    }

    // Remove if dead
    if (ChessFactory.createChess(target, this.game).chess.stats.hp <= 0) {
      if (actionDetails?.killedPieceIds) {
        actionDetails.killedPieceIds = actionDetails.killedPieceIds || [];
        actionDetails.killedPieceIds.push(target.id);
      }
    }
  }

  private useFlash(
    targetPosition: Square,
    actionDetails?: {
      fromPosition?: Square;
      targetPosition?: Square;
    }
  ): void {
    // Flash: Teleport to target square (max range 2)
    if (!targetPosition) {
      throw new Error("Flash requires a target position");
    }

    // Check if target is within range 2
    const deltaX = Math.abs(targetPosition.x - this.chess.position.x);
    const deltaY = Math.abs(targetPosition.y - this.chess.position.y);
    const distance = Math.max(deltaX, deltaY);

    if (distance > 2) {
      throw new Error("Flash has a maximum range of 2");
    }

    // Check if target square is empty
    const occupant = this.game.board.find(
      (p) =>
        p.position.x === targetPosition.x &&
        p.position.y === targetPosition.y &&
        p.stats.hp > 0
    );
    if (occupant) {
      throw new Error("Target square is occupied");
    }

    // Check if target is within board bounds
    if (
      targetPosition.x < -1 ||
      targetPosition.x > 8 ||
      targetPosition.y < 0 ||
      targetPosition.y > 7
    ) {
      throw new Error("Target square is out of bounds");
    }

    // Store original position for animation
    if (actionDetails) {
      actionDetails.fromPosition = {
        x: this.chess.position.x,
        y: this.chess.position.y,
      };
      actionDetails.targetPosition = targetPosition;
    }

    // Teleport the caster
    this.chess.position = { x: targetPosition.x, y: targetPosition.y };
  }

  protected isTargetAttackable(target: ChessObject): boolean {
    return this.validateAttack(target.chess.position, this.attackRange);
  }

  protected isTargetSkillable(target: ChessObject): boolean {
    return this.validateSkill(this.chess.skill, target.chess.position);
  }

  protected getActiveSkillDamage?(target: ChessObject): number;

  public calculateDamageAttack(target: ChessObject): number {
    const totalShield =
      target.chess.shields?.reduce((acc, shield) => acc + shield.amount, 0) ||
      0;
    const damageAmplificationFactor = (this.damageAmplification + 100) / 100;
    const criticalDamageFactor =
      this.criticalChance > 50 ? this.criticalDamage / 100 : 1; // 50% chance to crit
    const durabilityFactor =
      this.durability > 0 ? (100 - this.durability) / 100 : 1;
    const damage = this.calculateDamage(
      target,
      Math.floor(
        this.ad *
          damageAmplificationFactor *
          criticalDamageFactor *
          durabilityFactor
      ),
      "physical",
      this.sunder
    );

    return Math.max(damage - totalShield, 0);
  }

  public calculateDamageActiveSkill(target: ChessObject): number {
    const totalShield =
      target.chess.shields?.reduce((acc, shield) => acc + shield.amount, 0) ||
      0;
    const damageAmplificationFactor = (this.damageAmplification + 100) / 100;
    const criticalDamageFactor =
      this.criticalChance > 50 && this.hasItem("jeweled_gauntlet")
        ? this.criticalDamage / 100
        : 1; // 50% chance to crit with jeweled gauntlet
    const durabilityFactor =
      this.durability > 0 ? (100 - this.durability) / 100 : 1;
    const damage = this.calculateDamage(
      target,
      Math.floor(
        this.getActiveSkillDamage(target) *
          damageAmplificationFactor *
          criticalDamageFactor *
          durabilityFactor
      ),
      "physical",
      this.sunder
    );
    return Math.max(damage - totalShield, 0);
  }

  public getMaterialValue(): number {
    let value = 0;
    value += this.chess.stats.goldValue || 0;
    value += (this.ad || 0) * 0.4;
    value += (this.ap || 0) * 0.4;
    value += (this.physicalResistance || 0) * 0.15;
    value += (this.magicResistance || 0) * 0.1;
    value += this.sunder * 0.1;
    value += this.criticalChance * 0.1;
    value += this.criticalDamage * 0.1;
    value += this.damageAmplification * 0.1;
    value += this.lifesteal * 0.1;
    value += this.hpRegen * 1;
    value += this.maxHp * 0.05;
    value += this.durability * 0.1;
    value += this.cooldownReduction * 0.1;
    value += this.chess.skill?.currentCooldown === 0 ? 10 : 0;
    value += this.chess.items?.length || 0 * 10;
    // Speed value for positioning
    const speed = this.chess.stats.speed || 1;
    value += speed * 3;

    // Attack range bonus
    let rangeFactor = this.range || 1;
    const attackRange = this.chess.stats.attackRange;
    if (attackRange.horizontal) {
      rangeFactor += this.range * 2;
    }
    if (attackRange.vertical) {
      rangeFactor += this.range * 2;
    }
    if (attackRange.diagonal) {
      rangeFactor += this.range * 2;
    }
    if (attackRange.lShape) {
      rangeFactor += 4;
    }
    value += rangeFactor * 3;
    return Math.floor(value);
  }
}
