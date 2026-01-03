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

### Minion Synergy
Minions (Melee Minion, Caster Minion), Poro, Sand Soldiers, and Super Minions benefit from sticking together. For each adjacent ally from this group, they gain:
* **+15 Attack Damage (AD)**
* **+15 Physical Resistance**
* **+15 Magic Resistance**

This encourages maintaining formation and protecting the Poro with surrounding minions.

### Core Stats
* **HP (Health Points):** The amount of damage a piece can sustain before being slain.
* **AD (Attack Damage):** Damage dealt by basic attacks, reduced by Physical Resistance.
* **AP (Ability Power):** Primarily used to scale the power of a Champion's special ability.
* **Physical Resistance:** Reduces incoming damage from AD attacks.
* **Magic Resistance:** Reduces incoming damage from AP attacks.
* **Speed:** The maximum number of squares a piece can move in a single direction per turn. Default is 1.
* **Attack Range:** The maximum number of squares away a piece can attack in a single direction.
* **Gold Value:** The amount of Gold awarded to the opponent upon slaying this piece.
* **HP Regen:** The amount of HP regenerated at the start of each turn. Default is 0.

### Advanced Stats
* **Sunder:** Flat armor penetration. Reduces the target's Physical Resistance by this amount when calculating damage (cannot reduce below 0).
* **Critical Chance:** Percentage chance (0-100%) for basic attacks to deal critical damage.
* **Critical Damage:** The damage multiplier for critical strikes. Default is 150% (dealing 1.5× damage).
* **Lifesteal:** Percentage of AD damage dealt that is converted to HP healing for the attacker.
* **Cooldown Reduction:** Reduces the cooldown of champion abilities. Each point reduces cooldown by 1 turn.
* **Damage Amplification:** Percentage increase to all damage dealt (both physical and magical). Multiplicative with other damage increases.

### Piece Types
#### **Poro (King)**
* **Objective:** You lose the game if your Poro is slain.
* **Movement:** Can move 1 square in any of the 8 directions.
* **Attacks:** Cannot attack.
* **Stats:** 100 HP, 50 Physical Resistance, 50 Magic Resistance.
* **Gold Value:** N/A (Game ends).
* **Stun Immunity:** The Poro is immune to all stun effects. This prevents situations where all pieces are stunned.

#### **Champion (Queen, Bishops, Knights)**
* **Movement:** Speed determines the maximum number of squares it can move in one of the 8 directions. Blocked by any piece in its path.
* **Knight's First Move:** Champions starting at the Knight positions (`b1/b8` and `g1/g8`) can make an L-shaped knight move (2 squares in one direction + 1 square perpendicular) as their **first move only**. This move can jump over pieces. After their first move, they follow standard movement rules.
* **Attacks:** Can attack any piece within its Attack Range. Blocked by any piece in its path.
* **Special Ability:** Each champion has a unique ability that can be activated instead of moving or attacking.
* **Items:** Can be equipped with up to 3 items to enhance stats.
* **Base Stats (default):** 80 HP, 50 AD, 0 AP, 10 Physical Resistance, 10 Magic Resistance, Speed 1, Attack Range 2. Stats vary by champion.
* **Gold Value:** 50

#### **Siege Minion (Rook)**
* **Movement:** Speed of 4 (can move 4 squares horizontally or vertically).
* **Attacks:** Has Attack Range of 8 horizontally and vertically. The attack stops at the first enemy piece it hits. Blocked by any piece (friendly or enemy) in its path.
* **Stats:** 200 HP, 40 AD, 0 AP, 25 Physical Resistance, 10 Magic Resistance.
* **Gold Value:** 40

#### **Melee Minion (Pawn)**
* **Movement:** Can only move 1 square forward (towards the opponent's side). Speed of 1.
* **First Move Bonus:** On their first move, Melee Minions gain +1 speed, allowing them to move up to 2 squares forward.
* **Attacks:** Attack Range of 1. Can attack any of the 8 squares immediately surrounding it.
* **Promotion:** If a Melee Minion reaches the opponent's back rank (rank 8 for Blue, rank 1 for Red), it is immediately promoted to a **Super Minion**.
* **Stats:** 100 HP, 25 AD, 0 AP, 20 Physical Resistance, 5 Magic Resistance.
* **Gold Value:** 20

#### **Caster Minion (Pawn)**
* **Movement:** Can only move 1 square forward (towards the opponent's side). Speed of 1.
* **First Move Bonus:** On their first move, Caster Minions gain +1 speed, allowing them to move up to 2 squares forward.
* **Attacks:** Attack Range of 2. Can attack any of the 8 squares immediately surrounding it.
* **Stats:** 50 HP, 35 AD, 0 AP, 15 Physical Resistance, 5 Magic Resistance.
* **Gold Value:** 25

#### **Super Minion (Promoted Pawn)**
* A stronger version of the Melee Minion created when a Melee Minion reaches the opponent's back rank.
* **Movement:** Can move in any of the 8 directions with Speed of 5. No longer restricted to forward movement only.
* **Attacks:** Attack Range of 1. Can attack any of the 8 squares immediately surrounding it.
* **Stats:** 300 HP (upon promotion), 100 AD, 100 AP, 50 Physical Resistance, 50 Magic Resistance.
* **Gold Value:** 50

## 5. GAMEPLAY & TURN STRUCTURE
Blue Side always moves first. On your turn:

### Optional: Buy Item (Before Board Action)
At the **start of your turn**, you may purchase **one** item from the shop for a champion. Once you buy an item or perform any board action, you cannot buy more items until your next turn.

### Required: Board Action
You must perform **one** of the following actions with **one** of your pieces:
* **Move:** Move a piece to a valid empty square according to its movement rules.
* **Castle:** If the piece is a Poro and it has not moved before, it can castle with a Siege Minion. The Siege Minion must be in the same rank as the Poro and not have moved before. The Poro can move 2 squares horizontally and the Siege Minion will move to the other side of the Poro. **Upon castling, the Poro gains a permanent shield equal to 25% of its max HP.**
* **Attack:** Use a piece to attack an opponent's piece according to its attack rules. It can only attack pieces that are in its Attack Range. Cannot attack pieces behind a blocker.
* **Use Ability:** Champions can use their special ability instead of moving or attacking (subject to cooldown).

### Combat
When a piece attacks another, damage is calculated.
* **Critical Strike:** A critical strike deals 125% damage (or the attacker's Critical Damage percentage if modified).
* **Damage Calculation:** 
  1. Base damage is determined (AD for basic attacks, varies for abilities)
  2. Critical strike is rolled if applicable
  3. Damage Amplification is applied if any
  4. Resistance is applied (Physical Resistance for AD damage, Magic Resistance for AP damage), reduced by Sunder if applicable
  5. Final damage is subtracted from defender's HP
* **Lifesteal:** If the attacker has lifesteal, they heal for a percentage of the AD damage dealt (after resistances).

The damage is subtracted from the defender's HP. If a piece's HP drops to 0 or below, it is slain and removed from the board. The attacking player gains Gold equal to the slain piece's Gold Value. The defending piece does not deal damage back unless a special ability is involved.

### Status Effects (Debuffs)
Status effects can be applied by champion abilities and items. Multiple instances of the same debuff do not stack unless specified.

* **Burn:** Deals magic damage at the start of the affected piece's owner's turn. Duration and damage vary by source.
* **Wound:** Reduces healing received by a percentage. Affects HP regeneration and lifesteal.
* **Slow:** Reduces the affected piece's Speed by a fixed amount or percentage. Cannot reduce Speed below 1.
* **Venom:** Reduce the shield of the affected piece by 50%.
* **Stun:** The affected piece cannot move, attack, or use abilities for the duration.
* **Root:** The affected piece cannot move but can still attack and use abilities.

## 6. NEUTRAL MONSTERS: BARON & DRAKE
* **Spawning:**
    * **Drake:** Spawns at square `i4` at the end of Red's 5th turn. (HP: 250)
    * **Baron Nashor:** Spawns at square `z5` at the end of Red's 10th turn. (HP: 500)
* **Behavior:** These are neutral pieces. They do not move or attack on their own. They can be attacked by any piece from either side that has them in range.
* **Rewards:** The player who lands the killing blow on a neutral monster receives Gold and a powerful team-wide buff.
    * **Drake Kill:** +50 Gold. **Drake Soul Buff:** All your pieces gain +20 AD.
    * **Baron Kill:** +250 Gold. **Hand of Baron Buff:** All your Minions and Siege Minions gain +40 AD and +40 Physical Resistance. All your Champions gain +20 AP, +20 AD, +20 Physical Resistance, +20 Magic Resistance.
* **Respawning:** If slain, monsters will respawn 10 turns after they were killed.

## 7. GOLD & ITEM SHOP
* **Earning Gold:**
    * Slaying an enemy piece (Gold Value of the slain piece).
    * Slaying a neutral monster.
    * **Passive Income:** Each player gains 5 Gold at the start of their turn.
    * **Round Bonus:** Both players gain +50 Gold every 20 rounds (rounds 20, 40, 60, etc.).
* **Item Refund on Death:** When a champion dies, 50% of the total value of their equipped items is refunded to the owner.
* **The Shop:**
    * At the start of your turn, you may purchase **one** item before performing your board action. After buying an item or performing any board action, you cannot buy more items until your next turn.
    * You can spend your accumulated Gold to buy basic items. Items provide stat bonuses.
    * **Item Combining:** When a champion has two basic items, they automatically combine into a more powerful combined item (TFT-style crafting).
    * Purchased items can be equipped onto any of your Champions that have an open item slot (max 3 items per champion). Only champions can equip items (not minions, Poro, or neutral monsters).

## 8. WINNING & DRAW CONDITIONS
* **Victory:** You win the game instantly when you slay the opponent's Poro. A player can also **resign**, resulting in a loss.
* **Draw:** A draw is declared under the following conditions:
    * **Stalemate:** It is a player's turn to move, their Poro is not under attack, but they cannot make any legal move, attack, or use an ability with any of their pieces.
    * **Agreement:** Both players agree to a draw.
    * **Repetition:** The exact same board position is repeated three times with the same player to move.

---