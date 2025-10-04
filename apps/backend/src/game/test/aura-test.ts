import { Game, Chess, Square } from "../game.schema";
import { ChessFactory } from "../class/chessFactory";
import { GameLogic } from "../game.logic";

// Utility function to create a test game with chess pieces
export function createTestGame(): Game {
  const game: Game = {
    name: "Aura Test Game",
    status: "in_progress",
    phase: "gameplay",
    players: [],
    maxPlayers: 2,
    currentRound: 1,
    gameSettings: {
      roundTime: 60,
      startingGold: 100,
    },
    board: [],
  } as Game;

  // Create Janna (will have speed aura)
  const janna: Chess = {
    id: "janna-1",
    name: "Janna",
    position: { x: 2, y: 2 },
    cannotMoveBackward: false,
    cannotAttack: false,
    ownerId: "player1",
    blue: true,
    stats: {
      hp: 300,
      maxHp: 300,
      ad: 40,
      ap: 80,
      physicalResistance: 25,
      magicResistance: 35,
      speed: 2,
      goldValue: 45,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    items: [],
    debuffs: [],
    auras: [], // Will be populated by Janna class constructor
  } as Chess;

  // Create an ally adjacent to Janna (should get +2 speed)
  const ally: Chess = {
    id: "ally-1",
    name: "Aatrox",
    position: { x: 3, y: 2 }, // Adjacent to Janna
    cannotMoveBackward: false,
    cannotAttack: false,
    ownerId: "player1",
    blue: true,
    stats: {
      hp: 400,
      maxHp: 400,
      ad: 60,
      ap: 20,
      physicalResistance: 30,
      magicResistance: 25,
      speed: 3, // Base speed = 3, should become 5 with Janna's aura
      goldValue: 50,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    items: [],
    debuffs: [],
    auras: [],
  } as Chess;

  // Create an enemy (should not get speed boost)
  const enemy: Chess = {
    id: "enemy-1",
    name: "Garen",
    position: { x: 1, y: 2 }, // Adjacent to Janna but different team
    cannotMoveBackward: false,
    cannotAttack: false,
    ownerId: "player2",
    blue: false, // Different team
    stats: {
      hp: 500,
      maxHp: 500,
      ad: 55,
      ap: 15,
      physicalResistance: 35,
      magicResistance: 30,
      speed: 2, // Should stay 2 (no aura benefit)
      goldValue: 45,
      attackRange: {
        range: 1,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    items: [],
    debuffs: [],
    auras: [],
  } as Chess;

  // Create a distant ally (should not get speed boost due to range)
  const distantAlly: Chess = {
    id: "distant-ally-1",
    name: "Ahri",
    position: { x: 5, y: 2 }, // Too far from Janna
    cannotMoveBackward: false,
    cannotAttack: false,
    ownerId: "player1",
    blue: true,
    stats: {
      hp: 350,
      maxHp: 350,
      ad: 45,
      ap: 75,
      physicalResistance: 20,
      magicResistance: 40,
      speed: 3, // Should stay 3 (out of range)
      goldValue: 50,
      attackRange: {
        range: 2,
        diagonal: true,
        horizontal: true,
        vertical: true,
      },
    },
    items: [],
    debuffs: [],
    auras: [],
  } as Chess;

  game.board = [janna, ally, enemy, distantAlly];

  // Initialize Janna's aura by creating her chess object
  const jannaObject = ChessFactory.createChess(janna, game);

  return game;
}

// Test function to demonstrate aura effects
export function testAuraSystem(): void {
  console.log("=== Testing Aura System ===\n");

  const game = createTestGame();

  // Apply aura debuffs (this is now how auras work)
  game.board.forEach((chess) => {
    const chessObject = ChessFactory.createChess(chess, game);
    chessObject.applyAuraDebuffs();
  });

  // Get all pieces and test their effective speeds
  game.board.forEach((chess) => {
    const chessObject = ChessFactory.createChess(chess, game);
    const baseSpeed = chess.stats.speed;
    const effectiveSpeed = chessObject.speed;

    console.log(
      `${chess.name} (${chess.blue ? "Blue" : "Red"}) at position (${chess.position.x}, ${chess.position.y}):`
    );
    console.log(`  Base Speed: ${baseSpeed}`);
    console.log(`  Effective Speed: ${effectiveSpeed}`);
    console.log(`  Speed Difference: ${effectiveSpeed - baseSpeed}`);
    console.log(
      `  Debuffs: ${chess.debuffs.map((d) => d.name).join(", ") || "None"}\n`
    );
  });

  console.log("=== Active Auras in Game ===");
  const activeAuras = GameLogic.getActiveAuras(game);
  activeAuras.forEach((aura) => {
    console.log(`${aura.chessName} has auras:`);
    aura.auras.forEach((a) => {
      console.log(`  - ${a.name}: ${a.description}`);
      console.log(`    Range: ${a.range}, Effects:`, a.effects);
    });
  });

  console.log("\n=== Aura Targets ===");
  const janna = game.board.find((c) => c.name === "Janna");
  if (janna) {
    const targets = GameLogic.getAuraTargets(game, janna);
    console.log(`Janna's auras affect:`);
    targets.forEach((target) => {
      console.log(
        `  - ${target.targetName} receives ${target.auraName}: ${target.effect.stat} ${target.effect.modifier > 0 ? "+" : ""}${target.effect.modifier}`
      );
    });
  }

  console.log("\n=== Test Janna's Skill ===");
  const jannaObject = ChessFactory.createChess(janna!, game);

  // Test Janna's skill (applies temporary speed boost)
  console.log(
    "Before skill: Janna's aura range =",
    janna!.auras[0]?.range || "No aura"
  );
  try {
    jannaObject.skill();
    console.log(
      "After skill: Applied temporary speed boosts to adjacent allies"
    );

    // Re-apply aura debuffs after skill
    game.board.forEach((chess) => {
      const chessObj = ChessFactory.createChess(chess, game);
      chessObj.applyAuraDebuffs();
    });

    // Check debuffs on ally
    const ally = game.board.find((c) => c.name === "Aatrox");
    if (ally) {
      console.log(`\nAlly (Aatrox) debuffs after skill:`);
      ally.debuffs.forEach((d) => {
        console.log(
          `  - ${d.name}: ${d.description} (duration: ${d.duration})`
        );
      });
    }
  } catch (error) {
    console.log("Skill failed:", error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAuraSystem();
}
