import { ChessObject } from './chess';
import { Chess, Game, Shield, ChessStats, Square, AttackRange } from '../types';

describe('ChessObject - Shield Calculation', () => {
    let mockGame: Game;
    let attackerChess: Chess;
    let targetChess: Chess;
    let attacker: ChessObject;
    let target: ChessObject;

    beforeEach(() => {
        // Create a mock game
        mockGame = {
            name: 'Test Game',
            status: 'in_progress',
            phase: 'gameplay',
            currentRound: 1,
            maxPlayers: 2,
            gameSettings: {
                roundTime: 60,
                startingGold: 100,
            },
            players: [
                {
                    id: 'p1',
                    userId: 'player1',
                    username: 'Player 1',
                    gold: 100,
                    position: 0,
                    board: [],
                    bench: [],
                    isEliminated: false,
                    lastRoundDamage: 0,
                    side: 'blue',
                    selectedChampions: [],
                    bannedChampions: [],
                },
                {
                    id: 'p2',
                    userId: 'player2',
                    username: 'Player 2',
                    gold: 100,
                    position: 1,
                    board: [],
                    bench: [],
                    isEliminated: false,
                    lastRoundDamage: 0,
                    side: 'red',
                    selectedChampions: [],
                    bannedChampions: [],
                },
            ],
            board: [],
            winner: null,
            bluePlayer: 'player1',
            redPlayer: 'player2',
        } as Game;

        // Create attacker chess piece
        attackerChess = {
            id: 'attacker',
            name: 'Attacker',
            position: { x: 0, y: 0 } as Square,
            ownerId: 'player1',
            blue: true,
            stats: {
                hp: 100,
                maxHp: 100,
                ad: 50,
                ap: 0,
                physicalResistance: 20,
                magicResistance: 20,
                speed: 5,
                attackRange: {
                    range: 1,
                    diagonal: true,
                    horizontal: true,
                    vertical: true,
                },
            } as ChessStats,
            items: [],
            debuffs: [],
            auras: [],
            shields: [],
            cannotMoveBackward: false,
            canOnlyMoveVertically: false,
            hasMovedBefore: false,
            cannotAttack: false,
        } as Chess;

        // Create target chess piece
        targetChess = {
            id: 'target',
            name: 'Target',
            position: { x: 1, y: 0 } as Square,
            ownerId: 'player2',
            blue: false,
            stats: {
                hp: 100,
                maxHp: 100,
                ad: 30,
                ap: 0,
                physicalResistance: 20,
                magicResistance: 20,
                speed: 5,
                attackRange: {
                    range: 1,
                    diagonal: true,
                    horizontal: true,
                    vertical: true,
                },
            } as ChessStats,
            items: [],
            debuffs: [],
            auras: [],
            shields: [],
            cannotMoveBackward: false,
            canOnlyMoveVertically: false,
            hasMovedBefore: false,
            cannotAttack: false,
        } as Chess;

        attacker = new ChessObject(attackerChess, mockGame);
        target = new ChessObject(targetChess, mockGame);

        // Add both pieces to the game board
        mockGame.board = [attackerChess, targetChess];
    });

    describe('Shield absorption', () => {
        it('should absorb all damage when shield is larger than damage', () => {
            // Arrange: Give target a shield of 100
            target.chess.shields = [
                { id: 'test-shield', amount: 100, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 30 damage
            const damage = 30;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield should absorb all damage, HP unchanged
            expect(target.chess.stats.hp).toBe(initialHp);
            expect(target.chess.shields.length).toBe(1);
            expect(target.chess.shields[0].amount).toBe(70); // 100 - 30
        });

        it('should break through shield when damage exceeds shield amount', () => {
            // Arrange: Give target a shield of 20
            target.chess.shields = [
                { id: 'test-shield', amount: 20, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 50 damage
            const damage = 50;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield should be broken, remaining damage goes to HP
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(initialHp - 30); // 50 - 20 = 30 damage to HP
        });

        it('should exactly break shield when damage equals shield amount', () => {
            // Arrange: Give target a shield of 50
            target.chess.shields = [
                { id: 'test-shield', amount: 50, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 50 damage
            const damage = 50;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield should be completely consumed, HP unchanged
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(initialHp);
        });
    });

    describe('Multiple shields', () => {
        it('should absorb damage through multiple shields in order', () => {
            // Arrange: Give target multiple shields
            target.chess.shields = [
                { id: 'shield-1', amount: 20, duration: 2 } as Shield,
                { id: 'shield-2', amount: 30, duration: 2 } as Shield,
                { id: 'shield-3', amount: 40, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 60 damage (breaks first two shields)
            const damage = 60;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: First two shields broken, third shield reduced
            expect(target.chess.shields.length).toBe(1);
            expect(target.chess.shields[0].id).toBe('shield-3');
            expect(target.chess.shields[0].amount).toBe(30); // 40 - 10 (remaining from 60 - 20 - 30)
            expect(target.chess.stats.hp).toBe(initialHp);
        });

        it('should break all shields and damage HP when damage exceeds total shield amount', () => {
            // Arrange: Give target multiple shields totaling 60
            target.chess.shields = [
                { id: 'shield-1', amount: 20, duration: 2 } as Shield,
                { id: 'shield-2', amount: 40, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 100 damage
            const damage = 100;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: All shields broken, remaining damage goes to HP
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(initialHp - 40); // 100 - 60 = 40 damage to HP
        });

        it('should consume all shields when damage exactly equals total shield amount', () => {
            // Arrange: Give target multiple shields totaling 80
            target.chess.shields = [
                { id: 'shield-1', amount: 30, duration: 2 } as Shield,
                { id: 'shield-2', amount: 25, duration: 2 } as Shield,
                { id: 'shield-3', amount: 25, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 80 damage
            const damage = 80;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: All shields consumed, HP unchanged
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(initialHp);
        });
    });

    describe('Serpent\'s Fang interaction', () => {
        it('should reduce shield effectiveness by 50% when attacker has Serpent\'s Fang', () => {
            // Arrange: Give attacker Serpent's Fang
            attacker.chess.items = [
                {
                    id: 'serpents_fang',
                    name: 'Serpent\'s Fang',
                    description: 'Reduces enemy shields by 50%',
                    unique: true,
                    payload: {},
                    cooldown: 0,
                    currentCooldown: 0,
                },
            ];

            // Give target a shield of 100
            target.chess.shields = [
                { id: 'test-shield', amount: 100, duration: 2 } as Shield,
            ];

            // Act: Deal 30 damage
            const damage = 30;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield reduced to 50, then 30 damage absorbed
            // Shield should be at 50 - 30 = 20
            expect(target.chess.shields.length).toBe(1);
            expect(target.chess.shields[0].amount).toBe(20);
        });

        it('should break reduced shield and damage HP when damage exceeds reduced shield', () => {
            // Arrange: Give attacker Serpent's Fang
            attacker.chess.items = [
                {
                    id: 'serpents_fang',
                    name: 'Serpent\'s Fang',
                    description: 'Reduces enemy shields by 50%',
                    unique: true,
                    payload: {},
                    cooldown: 0,
                    currentCooldown: 0,
                },
            ];

            // Give target a shield of 60 (will be reduced to 30)
            target.chess.shields = [
                { id: 'test-shield', amount: 60, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 50 damage
            const damage = 50;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield reduced to 30, breaks, remaining 20 damage goes to HP
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(initialHp - 20); // 50 - 30 = 20 damage to HP
        });

        it('should reduce multiple shields by 50% when attacker has Serpent\'s Fang', () => {
            // Arrange: Give attacker Serpent's Fang
            attacker.chess.items = [
                {
                    id: 'serpents_fang',
                    name: 'Serpent\'s Fang',
                    description: 'Reduces enemy shields by 50%',
                    unique: true,
                    payload: {},
                    cooldown: 0,
                    currentCooldown: 0,
                },
            ];

            // Give target multiple shields
            target.chess.shields = [
                { id: 'shield-1', amount: 40, duration: 2 } as Shield, // Reduced to 20
                { id: 'shield-2', amount: 60, duration: 2 } as Shield, // Reduced to 30
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 30 damage
            const damage = 30;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: First shield (20) breaks, second shield reduced by 10
            expect(target.chess.shields.length).toBe(1);
            expect(target.chess.shields[0].id).toBe('shield-2');
            expect(target.chess.shields[0].amount).toBe(20); // 30 - 10
            expect(target.chess.stats.hp).toBe(initialHp);
        });
    });

    describe('Edge cases', () => {
        it('should handle no shields correctly', () => {
            // Arrange: No shields
            target.chess.shields = [];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 30 damage
            const damage = 30;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Full damage goes to HP
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(initialHp - 30);
        });

        it('should handle undefined shields array', () => {
            // Arrange: Undefined shields
            target.chess.shields = undefined as any;
            const initialHp = target.chess.stats.hp;

            // Act: Deal 30 damage
            const damage = 30;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Full damage goes to HP (shields initialized as empty array)
            expect(target.chess.stats.hp).toBe(initialHp - 30);
        });

        it('should handle zero damage (minimum 1 for true damage)', () => {
            // Arrange: Give target a shield
            target.chess.shields = [
                { id: 'test-shield', amount: 50, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 0 damage (true damage has minimum 1)
            const damage = 0;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: True damage has minimum 1, so shield reduced by 1
            expect(target.chess.shields.length).toBe(1);
            expect(target.chess.shields[0].amount).toBe(49); // 50 - 1 (minimum damage)
            expect(target.chess.stats.hp).toBe(initialHp);
        });

        it('should handle very small damage amounts', () => {
            // Arrange: Give target a large shield
            target.chess.shields = [
                { id: 'test-shield', amount: 1000, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 1 damage
            const damage = 1;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield reduced by 1, HP unchanged
            expect(target.chess.shields.length).toBe(1);
            expect(target.chess.shields[0].amount).toBe(999);
            expect(target.chess.stats.hp).toBe(initialHp);
        });

        it('should handle shields with zero amount', () => {
            // Arrange: Give target a shield with 0 amount
            target.chess.shields = [
                { id: 'empty-shield', amount: 0, duration: 2 } as Shield,
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 30 damage
            const damage = 30;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Empty shield should be removed, damage goes to HP
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(initialHp - 30);
        });
    });

    describe('Shield calculation precision', () => {
        it('should properly floor shield reduction with Serpent\'s Fang', () => {
            // Arrange: Give attacker Serpent's Fang
            attacker.chess.items = [
                {
                    id: 'serpents_fang',
                    name: 'Serpent\'s Fang',
                    description: 'Reduces enemy shields by 50%',
                    unique: true,
                    payload: {},
                    cooldown: 0,
                    currentCooldown: 0,
                },
            ];

            // Give target a shield with odd number (will floor to integer)
            target.chess.shields = [
                { id: 'test-shield', amount: 51, duration: 2 } as Shield, // 51 * 0.5 = 25.5, floored to 25
            ];
            const initialHp = target.chess.stats.hp;

            // Act: Deal 20 damage
            const damage = 20;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield reduced to 25 (floored), then 20 damage absorbed
            expect(target.chess.shields.length).toBe(1);
            expect(target.chess.shields[0].amount).toBe(5); // 25 - 20
            expect(target.chess.stats.hp).toBe(initialHp);
        });

        it('should handle damage that kills the target through shields', () => {
            // Arrange: Give target low HP and a small shield
            target.chess.stats.hp = 20;
            target.chess.shields = [
                { id: 'test-shield', amount: 10, duration: 2 } as Shield,
            ];

            // Act: Deal 50 damage (breaks shield and kills target)
            const damage = 50;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: Shield broken, target dead (HP = 0)
            expect(target.chess.shields.length).toBe(0);
            expect(target.chess.stats.hp).toBe(0); // 20 - (50 - 10) = -20, clamped to 0
        });
    });

    describe('Shield priority and ordering', () => {
        it('should consume shields in FIFO order (first in, first out)', () => {
            // Arrange: Add shields in specific order
            target.chess.shields = [
                { id: 'first', amount: 10, duration: 3 } as Shield,
                { id: 'second', amount: 20, duration: 2 } as Shield,
                { id: 'third', amount: 30, duration: 1 } as Shield,
            ];

            // Act: Deal 15 damage (should break first shield and partially consume second)
            const damage = 15;
            (attacker as any).damage(target, damage, 'true', attacker, 0);

            // Assert: First shield removed, second shield reduced
            expect(target.chess.shields.length).toBe(2);
            expect(target.chess.shields[0].id).toBe('second');
            expect(target.chess.shields[0].amount).toBe(15); // 20 - 5
            expect(target.chess.shields[1].id).toBe('third');
            expect(target.chess.shields[1].amount).toBe(30); // Untouched
        });
    });
});

