import {
  champions,
  Chess,
  Game,
  getItemById,
  getPlayerPieces,
  combinedItems,
} from "@lolchess/game-engine";

type GamePhase = "early" | "mid" | "late";

/**
 * Strategy for item purchases
 */
export class ItemStrategy {
  // Item recipe mapping (combined item -> [basic, basic])
  private static readonly ITEM_RECIPES: Record<string, [string, string]> = {
    // B.F. Sword Combinations
    infinity_edge: ["bf_sword", "sparring_gloves"],
    giant_slayer: ["bf_sword", "recurve_bow"],
    hextech_gunblade: ["bf_sword", "needlessly_rod"],
    bloodthirster: ["bf_sword", "negatron_cloak"],
    deaths_dance: ["bf_sword", "chain_vest"],
    sterak_gage: ["bf_sword", "giants_belt"],
    spear_of_shojin: ["bf_sword", "tear"],
    deathblade: ["bf_sword", "bf_sword"],

    // Recurve Bow Combinations
    rapid_firecannon: ["recurve_bow", "recurve_bow"],
    guinsoo_rageblade: ["recurve_bow", "needlessly_rod"],
    titans_resolve: ["recurve_bow", "chain_vest"],
    wit_s_end: ["recurve_bow", "negatron_cloak"],
    void_staff: ["recurve_bow", "tear"],
    last_whisper: ["recurve_bow", "sparring_gloves"],
    nashors_tooth: ["recurve_bow", "giants_belt"],

    // Needlessly Large Rod Combinations
    rabadon_deathcap: ["needlessly_rod", "needlessly_rod"],
    archangel_staff: ["needlessly_rod", "tear"],
    crownguard: ["needlessly_rod", "chain_vest"],
    ionic_spark: ["needlessly_rod", "negatron_cloak"],
    morellonomicon: ["needlessly_rod", "giants_belt"],
    jeweled_gauntlet: ["needlessly_rod", "sparring_gloves"],

    // Chain Vest Combinations
    bramble_vest: ["chain_vest", "chain_vest"],
    gargoyle_stoneplate: ["chain_vest", "negatron_cloak"],
    sunfire_cape: ["chain_vest", "giants_belt"],
    steadfast_heart: ["chain_vest", "sparring_gloves"],

    // Negatron Cloak Combinations
    dragon_claw: ["negatron_cloak", "negatron_cloak"],
    evenshroud: ["giants_belt", "negatron_cloak"],
    quicksilver: ["sparring_gloves", "negatron_cloak"],

    // Giant's Belt Combinations
    warmog_armor: ["giants_belt", "giants_belt"],
    strikers_flail: ["giants_belt", "sparring_gloves"],

    // Tear Combinations
    blue_buff: ["tear", "tear"],
    protectors_vow: ["tear", "chain_vest"],
    hand_of_justice: ["tear", "sparring_gloves"],
    adaptive_helm: ["tear", "negatron_cloak"],
    spirit_visage: ["tear", "giants_belt"],

    // Sparring Gloves
    serpents_fang: ["sparring_gloves", "sparring_gloves"],
  };

  // Role-based fallback priorities with correct item IDs
  private static readonly ROLE_ITEM_PRIORITY: Record<string, string[]> = {
    // Assassin: High burst damage (AD + crit for early power)
    assassin: ["bf_sword", "sparring_gloves", "needlessly_rod"],

    // Marksman: Sustained damage (sunder + AD + crit)
    marksman: ["recurve_bow", "bf_sword", "sparring_gloves"],

    // Mage: Ability damage (AP + cooldown)
    mage: ["needlessly_rod", "tear", "giants_belt"],

    // Fighter: Hybrid (AD + HP + survivability)
    fighter: ["bf_sword", "giants_belt", "chain_vest"],

    // Tank: Pure survivability (HP + resistances)
    tank: ["giants_belt", "chain_vest", "negatron_cloak"],

    // Support: Utility (AP for shields/heals + survivability)
    support: ["needlessly_rod", "tear", "giants_belt"],
  };

  // Role priority by game phase (higher index = higher priority)
  private static readonly ROLE_PRIORITY_BY_PHASE: Record<GamePhase, Record<string, number>> = {
    early: {
      assassin: 5,    // Strongest early
      fighter: 4,
      marksman: 3,
      mage: 2,
      support: 3,
      tank: 1,        // Weakest early (don't need items)
    },
    mid: {
      fighter: 5,     // Strongest mid-game
      assassin: 4,
      marksman: 4,
      mage: 3,
      support: 3,
      tank: 1,
    },
    late: {
      marksman: 5,    // Strongest late (carries)
      mage: 5,
      fighter: 3,
      assassin: 2,    // Falls off late
      support: 3,
      tank: 1,
    },
  };

  // Default item priority
  private static readonly DEFAULT_PRIORITY = [
    "bf_sword",
    "giants_belt",
    "needlessly_rod",
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

    const availableItemIds = availableItems.map((i) => i!.id);
    const gamePhase = this.getGamePhase(game);

    // Rank champions by who should get items first
    const rankedChampions = this.rankChampionsForItems(eligibleChampions, gamePhase);
    console.log(`[ItemStrategy] Ranked champions: ${rankedChampions.map(c => c.name).join(", ")}`);

    for (const champion of rankedChampions) {
      // Try to find best item based on champion's suggestions
      let bestItem = this.findRecipeCompletion(champion, availableItemIds);

      if (!bestItem) {
        bestItem = this.findBestComponentToBuy(champion, availableItemIds);
      }

      // Fallback to role-based priority
      if (!bestItem) {
        const role = this.getChampionRole(champion.name);
        bestItem = this.getBestItemForRole(role, availableItemIds, champion);
      }

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
   * Get available suggestions (filters out items champion already owns)
   */
  private getAvailableSuggestions(champion: Chess): string[] {
    const championData = champions.find((c) => c.name === champion.name);
    if (!championData?.items_suggestions) return [];

    const existingCombinedItemIds = (champion.items || [])
      .filter((item) => {
        const itemData = getItemById(item.id);
        return itemData?.isBasic === false;
      })
      .map((item) => item.id);

    // Filter out items the champion already owns
    return championData.items_suggestions.filter(
      (itemId) => !existingCombinedItemIds.includes(itemId)
    );
  }

  /**
   * Find best basic item to complete a recipe
   * Returns the component needed to complete a recipe if champion has one component
   */
  private findRecipeCompletion(
    champion: Chess,
    availableItemIds: string[]
  ): string | null {
    const existingBasicItems = (champion.items || [])
      .map((item) => item.id)
      .filter((itemId) => {
        const itemData = getItemById(itemId);
        return itemData?.isBasic === true;
      });

    if (existingBasicItems.length === 0) return null;

    const availableSuggestions = this.getAvailableSuggestions(champion);

    // Iterate in priority order (index 0 = highest priority)
    for (const suggestedItemId of availableSuggestions) {
      const recipe = ItemStrategy.ITEM_RECIPES[suggestedItemId];
      if (!recipe) continue;

      const [component1, component2] = recipe;

      // Check if champion has one component
      if (existingBasicItems.includes(component1)) {
        if (availableItemIds.includes(component2)) {
          return component2; // Complete the recipe!
        }
      } else if (existingBasicItems.includes(component2)) {
        if (availableItemIds.includes(component1)) {
          return component1; // Complete the recipe!
        }
      }
    }

    return null;
  }

  /**
   * Find best basic item to start building toward a suggested item
   */
  private findBestComponentToBuy(
    champion: Chess,
    availableItemIds: string[]
  ): string | null {
    const availableSuggestions = this.getAvailableSuggestions(champion);
    const existingBasicItemIds = (champion.items || [])
      .map((item) => item.id)
      .filter((itemId) => {
        const itemData = getItemById(itemId);
        return itemData?.isBasic === true;
      });

    // Iterate in priority order (index 0 = highest priority)
    for (const suggestedItemId of availableSuggestions) {
      const recipe = ItemStrategy.ITEM_RECIPES[suggestedItemId];
      if (!recipe) continue;

      // Try to buy first available component of this item
      for (const component of recipe) {
        if (
          availableItemIds.includes(component) &&
          !existingBasicItemIds.includes(component)
        ) {
          return component;
        }
      }
    }

    return null;
  }

  /**
   * Get game phase based on average items per champion
   */
  private getGamePhase(game: Game): GamePhase {
    const allChampions: Chess[] = [];

    for (const player of game.players) {
      const pieces = getPlayerPieces(game, player.userId);
      const champions = this.getEligibleChampions(pieces);
      allChampions.push(...champions);
    }

    if (allChampions.length === 0) return "early";

    // Count total combined items (not basic items)
    const totalCombinedItems = allChampions.reduce((sum, champ) => {
      const combinedCount = (champ.items || []).filter((item) => {
        const itemData = getItemById(item.id);
        return itemData?.isBasic === false;
      }).length;
      return sum + combinedCount;
    }, 0);

    const avgCombinedItems = totalCombinedItems / allChampions.length;

    if (avgCombinedItems < 0.5) return "early";   // 0-0.5 combined items avg
    if (avgCombinedItems < 1.5) return "mid";     // 0.5-1.5 combined items avg
    return "late";                                 // 1.5+ combined items avg
  }

  /**
   * Rank champions by who should get items first
   */
  private rankChampionsForItems(championList: Chess[], gamePhase: GamePhase): Chess[] {
    return [...championList].sort((a, b) => {
      // First priority: Champions with incomplete recipes (can complete a combined item)
      const canCompleteA = this.canCompleteRecipe(a);
      const canCompleteB = this.canCompleteRecipe(b);
      if (canCompleteA && !canCompleteB) return -1;
      if (!canCompleteA && canCompleteB) return 1;

      // Second priority: By role priority based on game phase
      const roleA = this.getChampionRole(a.name);
      const roleB = this.getChampionRole(b.name);
      const priorityA = ItemStrategy.ROLE_PRIORITY_BY_PHASE[gamePhase][roleA] || 2;
      const priorityB = ItemStrategy.ROLE_PRIORITY_BY_PHASE[gamePhase][roleB] || 2;
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }

      // Third priority: Champions with fewer items
      const itemCountA = a.items?.length || 0;
      const itemCountB = b.items?.length || 0;
      if (itemCountA !== itemCountB) {
        return itemCountA - itemCountB;
      }

      // Final priority: Higher stat champions (carries)
      const statsA = (a.stats.ad || 0) + (a.stats.ap || 0);
      const statsB = (b.stats.ad || 0) + (b.stats.ap || 0);
      return statsB - statsA;
    });
  }

  /**
   * Check if champion can complete a recipe with one more component
   */
  private canCompleteRecipe(champion: Chess): boolean {
    const existingBasicItems = (champion.items || [])
      .map((item) => item.id)
      .filter((itemId) => {
        const itemData = getItemById(itemId);
        return itemData?.isBasic === true;
      });

    if (existingBasicItems.length === 0) return false;

    const availableSuggestions = this.getAvailableSuggestions(champion);

    for (const suggestedItemId of availableSuggestions) {
      const recipe = ItemStrategy.ITEM_RECIPES[suggestedItemId];
      if (!recipe) continue;

      const [component1, component2] = recipe;

      // Check if champion has one component (and not the other)
      if (existingBasicItems.includes(component1) && !existingBasicItems.includes(component2)) {
        return true;
      }
      if (existingBasicItems.includes(component2) && !existingBasicItems.includes(component1)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get champion's role
   */
  private getChampionRole(championName: string): string {
    const data = champions.find((c) => c.name === championName);
    return data?.role || "fighter";
  }

  /**
   * Get best item for a role (fallback when no suggestions available)
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
    currentItemPrice: number,
    minGoldThreshold: number = 0,
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
      .filter((item) => item && item.isBasic && player.gold >= currentItemPrice);

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

    // Bonus synergy if item is in champion's suggestions
    const championData = champions.find((c) => c.name === champion.name);
    if (item.isBasic && championData?.items_suggestions) {
      // Check if this basic item is a component of any suggested item
      for (const suggestedItemId of championData.items_suggestions) {
        const recipe = ItemStrategy.ITEM_RECIPES[suggestedItemId];
        if (recipe && (recipe[0] === itemId || recipe[1] === itemId)) {
          synergy += 20; // Bonus for being in champion's optimal build path
          break;
        }
      }
    }

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
        case "sunder":
          // Sunder is better for marksmen and fighters
          synergy +=
            role === "marksman" || role === "fighter"
              ? effect.value * 1.5
              : effect.value;
          break;
        case "cooldownReduction":
          // CDR is better for mages and supports
          synergy +=
            role === "mage" || role === "support"
              ? effect.value * 2
              : effect.value;
          break;
      }
    }

    return synergy;
  }
}
