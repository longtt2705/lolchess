import {
  champions,
  Chess,
  Game,
  getItemById,
  getPlayerPieces,
} from "@lolchess/game-engine";

/**
 * Strategy for item purchases
 */
export class ItemStrategy {
  // Item priority by champion role
  private static readonly ROLE_ITEM_PRIORITY: Record<string, string[]> = {
    assassin: ["bf_sword", "pickaxe", "sparring_gloves"], // AD + crit
    marksman: ["bf_sword", "recurve_bow", "pickaxe"], // AD + attack speed
    mage: ["needlessly_large_rod", "tear_of_the_goddess", "chain_vest"], // AP + mana + survivability
    fighter: ["giants_belt", "bf_sword", "chain_vest"], // HP + AD + armor
    tank: ["giants_belt", "chain_vest", "negatron_cloak"], // HP + resistances
    support: ["needlessly_large_rod", "giants_belt", "tear_of_the_goddess"], // AP + HP
  };

  // Default item priority
  private static readonly DEFAULT_PRIORITY = [
    "bf_sword",
    "giants_belt",
    "needlessly_large_rod",
  ];

  /**
   * Recommend an item purchase
   */
  recommendPurchase(
    game: Game,
    playerId: string
  ): { itemId: string; championId: string } | null {
    const player = game.players.find((p) => p.userId === playerId);
    if (!player) return null;

    const playerPieces = getPlayerPieces(game, playerId);
    const eligibleChampions = this.getEligibleChampions(playerPieces);

    if (eligibleChampions.length === 0) return null;

    // Get available shop items
    const availableItems = (game.shopItems || [])
      .map((id) => getItemById(id))
      .filter((item) => item && item.isBasic && player.gold >= item.cost);

    if (availableItems.length === 0) return null;

    // Find best champion to give item to
    const rankedChampions = this.rankChampionsForItems(eligibleChampions);

    for (const champion of rankedChampions) {
      const role = this.getChampionRole(champion.name);
      const bestItem = this.getBestItemForRole(
        role,
        availableItems.map((i) => i!.id),
        champion
      );

      if (bestItem) {
        return {
          itemId: bestItem,
          championId: champion.id,
        };
      }
    }

    // Fallback: give any item to the best champion
    if (rankedChampions.length > 0 && availableItems.length > 0) {
      return {
        itemId: availableItems[0]!.id,
        championId: rankedChampions[0].id,
      };
    }

    return null;
  }

  /**
   * Get champions that can receive items
   */
  private getEligibleChampions(pieces: Chess[]): Chess[] {
    const nonChampionTypes = [
      "Poro",
      "Melee Minion",
      "Caster Minion",
      "Siege Minion",
      "Super Minion",
      "Drake",
      "Baron Nashor",
      "Sand Soldier",
    ];

    return pieces.filter(
      (p) =>
        p.stats.hp > 0 &&
        !nonChampionTypes.includes(p.name) &&
        (!p.items || p.items.length < 3)
    );
  }

  /**
   * Rank champions by who should get items first
   */
  private rankChampionsForItems(championList: Chess[]): Chess[] {
    return [...championList].sort((a, b) => {
      // Champions with fewer items get priority
      const itemCountA = a.items?.length || 0;
      const itemCountB = b.items?.length || 0;
      if (itemCountA !== itemCountB) {
        return itemCountA - itemCountB;
      }

      // Higher stat champions get priority (carries)
      const statsA = (a.stats.ad || 0) + (a.stats.ap || 0);
      const statsB = (b.stats.ad || 0) + (b.stats.ap || 0);
      return statsB - statsA;
    });
  }

  /**
   * Get champion's role
   */
  private getChampionRole(championName: string): string {
    const data = champions.find((c) => c.name === championName);
    return data?.role || "fighter";
  }

  /**
   * Get best item for a role
   */
  private getBestItemForRole(
    role: string,
    availableItemIds: string[],
    champion: Chess
  ): string | null {
    const priority =
      ItemStrategy.ROLE_ITEM_PRIORITY[role] || ItemStrategy.DEFAULT_PRIORITY;

    // Check existing items to avoid duplicates
    const existingItemIds = (champion.items || []).map((i) => i.id);

    for (const itemId of priority) {
      if (
        availableItemIds.includes(itemId) &&
        !existingItemIds.includes(itemId)
      ) {
        return itemId;
      }
    }

    // Return any available item
    for (const itemId of availableItemIds) {
      if (!existingItemIds.includes(itemId)) {
        return itemId;
      }
    }

    return null;
  }

  /**
   * Check if buying an item is worthwhile
   */
  shouldBuyItem(
    game: Game,
    playerId: string,
    minGoldThreshold: number = 0
  ): boolean {
    const player = game.players.find((p) => p.userId === playerId);
    if (!player) return false;

    // Don't spend last gold
    if (player.gold <= minGoldThreshold) return false;

    // Check if there are eligible champions
    const playerPieces = getPlayerPieces(game, playerId);
    const eligible = this.getEligibleChampions(playerPieces);
    if (eligible.length === 0) return false;

    // Check if there are affordable items
    const affordable = (game.shopItems || [])
      .map((id) => getItemById(id))
      .filter((item) => item && item.isBasic && player.gold >= item.cost);

    return affordable.length > 0;
  }

  /**
   * Evaluate item synergy with a champion
   */
  evaluateItemSynergy(itemId: string, champion: Chess): number {
    const item = getItemById(itemId);
    if (!item) return 0;

    let synergy = 0;
    const role = this.getChampionRole(champion.name);

    for (const effect of item.effects) {
      if (effect.type !== "add") continue;

      switch (effect.stat) {
        case "ad":
          // AD is better for physical damage dealers
          synergy +=
            role === "marksman" || role === "fighter" || role === "assassin"
              ? effect.value * 1.5
              : effect.value;
          break;
        case "ap":
          // AP is better for mages and supports
          synergy +=
            role === "mage" || role === "support"
              ? effect.value * 1.5
              : effect.value;
          break;
        case "maxHp":
          // HP is better for tanks and fighters
          synergy +=
            role === "tank" || role === "fighter"
              ? effect.value * 0.5
              : effect.value * 0.3;
          break;
        case "physicalResistance":
        case "magicResistance":
          // Resistances are better for tanks
          synergy += role === "tank" ? effect.value * 2 : effect.value;
          break;
        case "criticalChance":
          // Crit is better for AD carries
          synergy +=
            role === "marksman" || role === "assassin"
              ? effect.value * 2
              : effect.value;
          break;
      }
    }

    return synergy;
  }
}
