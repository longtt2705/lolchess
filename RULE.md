# League of Legends Chess - Official Rulebook

## 1. GAME OBJECTIVE
The primary objective of League of Legends Chess is to defeat the opponent's **Poro**. The player who successfully slays the opposing Poro wins the game.

## 2. THE BOARD & SETUP
* **The Board:** The game is played on a 10x10 grid. The standard 8x8 chessboard (files 'a' through 'h' and ranks 1 through 8) is used for standard piece setup. Two additional files, 'z' and 'i', are added to the left and right of the standard board, respectively.
* **Special Squares:**
    * `z5`: The **Baron Nashor** pit.
    * `i4`: The **Drake** pit.
* **Sides:** Instead of White and Black, the players are designated as the **Blue Side** (starting on ranks 1 & 2) and the **Red Side** (starting on ranks 7 & 8).
* **Initial Piece Setup:**
    * **Rank 1 (Blue) / Rank 8 (Red):**
        * `a1/a8` & `h1/h8`: Siege Minion (Rook)
        * `b1/b8` & `g1/g8`: Champion 1 & 2 (Knight positions)
        * `c1/c8` & `f1/f8`: Champion 3 & 4 (Bishop positions)
        * `d1/d8`: Champion 5 (Queen position)
        * `e1/e8`: Poro (King position)
    * **Rank 2 (Blue) / Rank 7 (Red):** 6 Melee Minions (b2->g2 & b7->g7) + 2 Caster Minions (a2/a7 & h2/h7)

## 3. PHASE 1: BAN & PICK
Before the game begins, players engage in a champion selection phase.
1.  **Ban Phase:** Starting with the Blue Side, each player bans one champion, alternating until a total of 4 champions are banned (2 per player). Banned champions cannot be picked.
2.  **Pick Phase:** Starting with the Blue Side, players pick champions one by one in a snake draft format (Blue-Red-Red-Blue-Blue-Red, etc.) until each player has selected 5 champions. These 5 champions will take the place of the traditional Knights, Bishops, and Queen pieces.

## 4. THE PIECES & CHARACTERISTICS
All pieces in the game have the following attributes:

* **HP (Health Points):** The amount of damage a piece can sustain before being slain.
* **AD (Attack Damage):** Damage dealt by basic attacks, reduced by Physical Resistance.
* **AP (Ability Power):** Primarily used to scale the power of a Champion's special ability.
* **Physical Resistance:** Reduces incoming damage from AD attacks.
* **Magic Resistance:** Reduces incoming damage from AP attacks.
* **Speed:** The maximum number of squares a piece can move in a single direction per turn. Default is 1.
* **Attack Range:** The maximum number of squares away a piece can attack in a single direction.
* **Gold Value:** The amount of Gold awarded to the opponent upon slaying this piece.

### Piece Types
#### **Poro (King)**
* **Objective:** You lose the game if your Poro is slain.
* **Movement:** Can move 1 square in any of the 8 directions.
* **Attacks:** Cannot attack.
* **Stats:** 100 HP, 0 Physical Resistance, 0 Magic Resistance.
* **Gold Value:** N/A (Game ends).

#### **Champion (Queen, Bishops, Knights)**
* **Movement:** Speed determines the maximum number of squares it can move in one of the 8 directions. Blocked by any piece in its path.
* **Attacks:** Can attack any piece within its Attack Range. Blocked by any piece in its path.
* **Special Ability:** Each champion has a unique ability that can be activated instead of moving or attacking.
* **Items:** Can be equipped with up to 3 items to enhance stats.
* **Base Stats (default):** 80 HP, 50 AD, 0 AP, 10 Physical Resistance, 10 Magic Resistance, Speed 1, Attack Range 2. Stats vary by champion.
* **Gold Value:** 50

#### **Siege Minion (Rook)**
* **Movement:** Speed of 1 (can move 1 square horizontally or vertically).
* **Attacks:** Has Attack Range of 8 horizontally and vertically. The attack stops at the first enemy piece it hits. Blocked by any piece (friendly or enemy) in its path.
* **Stats:** 250 HP, 40 AD, 0 AP, 10 Physical Resistance, 10 Magic Resistance.
* **Gold Value:** 30

#### **Melee Minion (Pawn)**
* **Movement:** Can only move 1 square forward (towards the opponent's side).
* **Attacks:** Attack Range of 1. Can attack any of the 8 squares immediately surrounding it.
* **Promotion:** If a Melee Minion reaches the opponent's back rank (rank 8 for Blue, rank 1 for Red), it is immediately promoted to a **Super Minion**.
* **Stats:** 100 HP, 25 AD, 0 AP, 5 Physical Resistance, 0 Magic Resistance.
* **Gold Value:** 10

#### **Caster Minion (Pawn)**
* **Movement:** Can only move 1 square forward (towards the opponent's side).
* **Attacks:** Attack Range of 2. Can attack any of the 8 squares immediately surrounding it.
* **Stats:** 50 HP, 35 AD, 0 AP, 0 Physical Resistance, 0 Magic Resistance.
* **Gold Value:** 15

#### **Super Minion (Promoted Pawn)**
* A stronger version of the Melee Minion with significantly increased stats.
* **Movement & Attack:** Same as Melee Minion (moves 1 forward, attacks all 8 adjacent squares). Speed of 2.
* **Stats:** 200 HP (upon promotion), 50 AD, 0 AP, 25 Physical Resistance, 15 Magic Resistance.
* **Gold Value:** 40

## 5. GAMEPLAY & TURN STRUCTURE
Blue Side always moves first. On your turn, you must perform **one** of the following actions with **one** of your pieces:
* **Move:** Move a piece to a valid empty square according to its movement rules.
* **Castle:** If the piece is a Poro and it has not moved before, it can castle with a Siege Minion. The Siege Minion must be in the same rank as the Poro and not have moved before. The Poro can move 2 squares horizontally and the Siege Minion will move to the other side of the Poro.
* **Attack:** Use a piece to attack an opponent's piece according to its attack rules. It can only attack pieces that are in its Attack Range. And cannot attack pieces behind the blocker.
* **Use Ability:** Champions can use their special ability instead of moving or attacking (subject to cooldown).
* **Buy Items:** Forgo any action on the board to purchase items from the shop for a champion.

### Combat
When a piece attacks another, damage is calculated.
* **Critical Strike:** A critical strike deals 150% damage.
* **Critical Strike Damage:** 150%

The damage is subtracted from the defender's HP. If a piece's HP drops to 0 or below, it is slain and removed from the board. The attacking player gains Gold equal to the slain piece's Gold Value. The defending piece does not deal damage back unless a special ability is involved.

## 6. NEUTRAL MONSTERS: BARON & DRAKE
* **Spawning:**
    * **Drake:** Spawns at square `i4` at the end of Red's 5th turn. (HP: 1000)
    * **Baron Nashor:** Spawns at square `z5` at the end of Red's 10th turn. (HP: 2500)
* **Behavior:** These are neutral pieces. They do not move or attack on their own. They can be attacked by any piece from either side that has them in range.
* **Rewards:** The player who lands the killing blow on a neutral monster receives Gold and a powerful team-wide buff.
    * **Drake Kill:** +10 Gold. **Drake Soul Buff:** All your pieces gain +10 AD.
    * **Baron Kill:** +50 Gold. **Hand of Baron Buff:** All your Minions and Siege Minions gain +20 AD and +20 Physical Resistance.
* **Respawning:** If slain, monsters will respawn 10 turns after they were killed.

## 7. GOLD & ITEM SHOP
* **Earning Gold:**
    * Slaying an enemy piece.
    * Slaying a neutral monster.
    * **Passive Income:** Each player gains 3 Gold at the start of their turn.
* **The Shop:**
    * On your turn, you may choose to open the shop instead of performing a board action.
    * You can spend your accumulated Gold to buy items. Items provide stat bonuses.
    * Purchased items can be equipped onto any of your Champions that have an open item slot (max 3 items per champion).

## 8. WINNING & DRAW CONDITIONS
* **Victory:** You win the game instantly when you slay the opponent's Poro. A player can also **resign**, resulting in a loss.
* **Draw:** A draw is declared under the following conditions:
    * **Stalemate:** It is a player's turn to move, their Poro is not under attack, but they cannot make any legal move, attack, or use an ability with any of their pieces.
    * **Agreement:** Both players agree to a draw.
    * **Repetition:** The exact same board position is repeated three times with the same player to move.

---