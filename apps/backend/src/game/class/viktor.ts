import { GameLogic } from "../game.logic";
import { Square, Debuff } from "../game.schema";
import { ChessObject } from "./chess";
import { ChessFactory } from "./chessFactory";

export class Viktor extends ChessObject {
  // Check if Viktor has a specific module (modules are stored as items)
  private hasModule(moduleId: string): boolean {
    return this.chess.items.some((item) => item.id === moduleId);
  }

  // Update the count of unlocked modules based on damage thresholds
  private updateUnlockedModulesCount(): void {
    if (!this.chess.skill?.payload) return;

    const damage = this.chess.skill.payload.cumulativeDamage || 0;
    const damageThresholds = [40, 120, 260];

    let unlocked = 0;
    for (const threshold of damageThresholds) {
      if (damage >= threshold) {
        unlocked++;
      }
    }

    this.chess.skill.payload.unlockedModulesCount = unlocked;
  }

  // Create empowered attack debuff for Superconductive Coil module
  private createEmpoweredAttackDebuff(): Debuff {
    return {
      id: "viktor_empowered",
      name: "Empowered Attack",
      description: `Viktor's next attack deals bonus (10 + 50% of AP) magic damage`,
      duration: 3,
      maxDuration: 3,
      effects: [
        {
          stat: "ad",
          modifier: 10 + this.ap * 0.5,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "magic",
      healPerTurn: 0,
      unique: true,
      currentStacks: 1,
      maximumStacks: 1,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  // Create stun debuff for Neutralizing Bolt module
  private createStunDebuff(): Debuff {
    return {
      id: "viktor_stun",
      name: "Stunned",
      description: "Stunned by Viktor's Neutralizing Bolt",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: 0,
          type: "set",
        },
      ],
      damagePerTurn: 0,
      damageType: "magic",
      healPerTurn: 0,
      unique: true,
      currentStacks: 1,
      maximumStacks: 1,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
      stun: true,
    } as Debuff;
  }

  // Create speed buff debuff for Energy Capacitor module
  private createSpeedBuffDebuff(): Debuff {
    return {
      id: "viktor_speed_buff",
      name: "Energy Surge",
      description: "Gained +1 speed from Energy Capacitor",
      duration: 2,
      maxDuration: 2,
      effects: [
        {
          stat: "speed",
          modifier: 1,
          type: "add",
        },
      ],
      damagePerTurn: 0,
      damageType: "magic",
      healPerTurn: 0,
      unique: true,
      currentStacks: 1,
      maximumStacks: 1,
      appliedAt: Date.now(),
      casterPlayerId: this.chess.ownerId,
      casterName: this.chess.name,
    } as Debuff;
  }

  // Get adjacent enemies for Electrical Overload
  private getAdjacentEnemies(position: Square): ChessObject[] {
    const adjacentPositions: Square[] = [
      { x: position.x - 1, y: position.y - 1 },
      { x: position.x, y: position.y - 1 },
      { x: position.x + 1, y: position.y - 1 },
      { x: position.x - 1, y: position.y },
      { x: position.x + 1, y: position.y },
      { x: position.x - 1, y: position.y + 1 },
      { x: position.x, y: position.y + 1 },
      { x: position.x + 1, y: position.y + 1 },
    ];

    const enemies: ChessObject[] = [];
    for (const pos of adjacentPositions) {
      // Check bounds
      if (pos.x < 0 || pos.x > 7 || pos.y < 0 || pos.y > 7) continue;

      const chess = GameLogic.getChess(this.game, !this.chess.blue, pos);
      if (chess) {
        enemies.push(ChessFactory.createChess(chess, this.game));
      }
    }
    return enemies;
  }

  skill(position?: Square): void {
    // Find the target enemy chess piece
    const targetChess = GameLogic.getChess(
      this.game,
      !this.chess.blue,
      position
    );

    if (!targetChess) return;

    const targetChessObject = ChessFactory.createChess(targetChess, this.game);

    // Initialize module data in skill.payload if not present
    if (!this.chess.skill.payload) {
      this.chess.skill.payload = {
        currentModuleIndex: 0,
        cumulativeDamage: 0,
        unlockedModulesCount: 0,
      };
    }

    // Initialize animation data for this skill cast
    this.chess.skill.payload.viktorModules = {
      stunProc: false,
      empowered: false,
      shielded: false,
      executed: false,
      aoeTargets: [] as Array<{ targetId: string; targetPosition: Square }>,
    };

    // MODULE 4: Disruptor - Execute if target below 5% HP (check BEFORE damage)
    if (this.hasModule("viktor_module_4")) {
      const targetHpPercent =
        (targetChessObject.chess.stats.hp /
          targetChessObject.chess.stats.maxHp) *
        100;
      if (targetHpPercent < 5) {
        // Execute the target instantly - track as full HP damage for module unlock
        const executeDamage = targetChessObject.chess.stats.hp;
        this.chess.skill.payload.cumulativeDamage += executeDamage;
        this.updateUnlockedModulesCount();

        // Mark execute for animation
        this.chess.skill.payload.viktorModules.executed = true;

        targetChessObject.chess.stats.hp = 0;
        // Remove from board
        const targetIndex = this.game.board.findIndex(
          (c) => c.id === targetChess.id
        );
        if (targetIndex !== -1) {
          this.game.board.splice(targetIndex, 1);
        }
        return; // Skill ends after execute
      }
    }

    // Base skill damage: (10 + 50% of AP) magic damage
    let baseDamage = 10 + this.ap * 0.5;

    // MODULE 1: Neutralizing Bolt - 25% chance for bonus damage + stun
    if (this.hasModule("viktor_module_1")) {
      // Bonus damage: (15 + 10% of AP)% of current target's HP
      const bonusDamage =
        (15 + this.ap * 0.1) * (targetChessObject.chess.stats.hp / 100);
      baseDamage += bonusDamage;

      const roll = Math.random() * 100;
      if (roll < 25) {
        // Apply stun
        this.applyDebuff(targetChessObject, this.createStunDebuff());

        // Mark stun proc for animation
        this.chess.skill.payload.viktorModules.stunProc = true;
      }
    }

    // Track HP before damage to calculate actual damage dealt
    const hpBefore = targetChessObject.chess.stats.hp;

    // Deal the main skill damage
    this.activeSkillDamage(
      targetChessObject,
      baseDamage,
      "magic",
      this,
      this.sunder
    );

    // Calculate actual damage dealt and add to cumulative
    const hpAfter = Math.max(0, targetChessObject.chess.stats.hp);
    const actualDamage = hpBefore - hpAfter;
    this.chess.skill.payload.cumulativeDamage += actualDamage;
    this.updateUnlockedModulesCount();

    // MODULE 2: Superconductive Coil - Empower next basic attack
    if (this.hasModule("viktor_module_2")) {
      const empowermentDebuff = this.createEmpoweredAttackDebuff();
      this.applyDebuff(this, empowermentDebuff);

      // Store empowerment state in skill payload
      this.chess.skill.payload.nextAttackEmpowered = true;

      // Mark empowerment for animation
      this.chess.skill.payload.viktorModules.empowered = true;
    }

    // MODULE 3: Energy Capacitor - Gain shield and speed buff
    if (this.hasModule("viktor_module_3")) {
      // Shield: (10 + 30% of AP)
      const shieldAmount = Math.floor(10 + this.ap * 0.3);
      this.applyShield(shieldAmount, 2, "viktor_energy_shield");

      // Speed buff: +1 speed for 2 turns
      this.applyDebuff(this, this.createSpeedBuffDebuff());

      // Mark shield for animation
      this.chess.skill.payload.viktorModules.shielded = true;
    }

    // MODULE 5: Electrical Overload - AOE damage to adjacent enemies
    if (this.hasModule("viktor_module_5") && position) {
      const aoeDamage = 5 + this.ap * 0.25;
      const adjacentEnemies = this.getAdjacentEnemies(position);

      for (const enemy of adjacentEnemies) {
        // Don't double-damage the main target
        if (enemy.chess.id === targetChess.id) continue;

        this.activeSkillDamage(enemy, aoeDamage, "magic", this, this.sunder);

        // Track AOE target for animation
        this.chess.skill.payload.viktorModules.aoeTargets.push({
          targetId: enemy.chess.id,
          targetPosition: { ...enemy.chess.position },
        });
      }
    }
  }

  attack(chess: ChessObject): number {
    const baseDamage = super.attack(chess);

    // Reset empowerment after attack (for Module 2)
    if (this.chess.skill?.payload?.nextAttackEmpowered) {
      this.chess.skill.payload.nextAttackEmpowered = false;
      this.removeDebuff(this, "viktor_empowered");
    }
    return baseDamage;
  }
}
