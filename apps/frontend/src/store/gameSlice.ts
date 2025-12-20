import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface QueueState {
  inQueue: boolean;
  position: number | null;
  queueSize: number;
  matchFound: boolean;
  opponent: {
    id: string;
    username: string;
  } | null;
}

interface Game {
  id: string;
  name: string;
  status: "waiting" | "ban_pick" | "in_progress" | "finished";
  phase?: "ban_phase" | "pick_phase" | "gameplay";
  players: any[];
  maxPlayers: number;
  createdAt: string;
}

export interface ChampionData {
  name: string;
  stats: any;
  skill: any;
  aura?: any;
}

export interface ItemData {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon?: string;
  effects: any[];
  isBasic: boolean;
  recipe?: [string, string];
  unique?: boolean;
}

interface GameState {
  currentGame: Game | null;
  activeGame: Game | null;
  availableGames: Game[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  queue: QueueState;
  champions: ChampionData[];
  basicItems: ItemData[];
  combinedItems: ItemData[];
  databaseLoading: boolean;
  databaseError: string | null;
}

const initialState: GameState = {
  currentGame: null,
  activeGame: null,
  availableGames: [],
  loading: false,
  error: null,
  connected: false,
  queue: {
    inQueue: false,
    position: null,
    queueSize: 0,
    matchFound: false,
    opponent: null,
  },
  champions: [],
  basicItems: [],
  combinedItems: [],
  databaseLoading: false,
  databaseError: null,
};

// Async thunks
export const fetchGames = createAsyncThunk("game/fetchGames", async () => {
  const token = localStorage.getItem("token");
  const response = await axios.get(`${API_URL}/games`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
});

export const createGame = createAsyncThunk(
  "game/createGame",
  async (gameData: { name: string; maxPlayers: number }) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(`${API_URL}/games`, gameData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
);

export const joinGame = createAsyncThunk(
  "game/joinGame",
  async (gameId: string) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/games/${gameId}/join`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
);

export const resetGameplay = createAsyncThunk(
  "game/resetGameplay",
  async ({
    gameId,
    blueChampions,
    redChampions,
  }: {
    gameId: string;
    blueChampions?: string[];
    redChampions?: string[];
  }) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/games/${gameId}/reset-gameplay`,
      { blueChampions, redChampions },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
);

export const restoreHp = createAsyncThunk(
  "game/restoreHp",
  async (gameId: string) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/games/${gameId}/restore-hp`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
);

export const restoreCooldown = createAsyncThunk(
  "game/restoreCooldown",
  async (gameId: string) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/games/${gameId}/restore-cooldown`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
);

export const resetBanPick = createAsyncThunk(
  "game/resetBanPick",
  async (gameId: string) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/games/${gameId}/reset-ban-pick`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
);

export const fetchActiveGame = createAsyncThunk(
  "game/fetchActiveGame",
  async (userId: string) => {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/games/active-game`, {
      params: { userId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  }
);

export const buyItem = createAsyncThunk(
  "game/buyItem",
  async ({
    gameId,
    itemId,
    championId,
  }: {
    gameId: string;
    itemId: string;
    championId: string;
  }) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/games/${gameId}/buy-item`,
      { itemId, championId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
);

export const fetchChampions = createAsyncThunk(
  "game/fetchChampions",
  async () => {
    const response = await axios.get(`${API_URL}/games/champions`);
    return response.data;
  }
);

export const fetchBasicItems = createAsyncThunk(
  "game/fetchBasicItems",
  async () => {
    const response = await axios.get(`${API_URL}/games/items?type=basic`);
    return response.data;
  }
);

export const fetchCombinedItems = createAsyncThunk(
  "game/fetchCombinedItems",
  async () => {
    const response = await axios.get(`${API_URL}/games/items?type=combined`);
    return response.data;
  }
);

export const fetchDatabaseData = createAsyncThunk(
  "game/fetchDatabaseData",
  async (_, { dispatch }) => {
    await Promise.all([
      dispatch(fetchChampions()),
      dispatch(fetchBasicItems()),
      dispatch(fetchCombinedItems()),
    ]);
  }
);

const gameSlice = createSlice({
  name: "game",
  initialState,
  reducers: {
    setCurrentGame: (state, action: PayloadAction<Game>) => {
      state.currentGame = action.payload;
    },
    clearCurrentGame: (state) => {
      state.currentGame = null;
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
    },
    updateGameStatus: (
      state,
      action: PayloadAction<{ gameId: string; status: string }>
    ) => {
      if (state.currentGame && state.currentGame.id === action.payload.gameId) {
        state.currentGame.status = action.payload.status as any;
      }
    },
    addPlayerToCurrentGame: (state, action: PayloadAction<any>) => {
      if (state.currentGame) {
        state.currentGame.players.push(action.payload);
      }
    },
    removePlayerFromCurrentGame: (state, action: PayloadAction<string>) => {
      if (state.currentGame) {
        state.currentGame.players = state.currentGame.players.filter(
          (player) => player.id !== action.payload
        );
      }
    },
    // Queue-related reducers
    setQueueStatus: (state, action: PayloadAction<Partial<QueueState>>) => {
      state.queue = { ...state.queue, ...action.payload };
    },
    joinQueue: (state) => {
      state.queue.inQueue = true;
      state.queue.matchFound = false;
      state.queue.opponent = null;
    },
    leaveQueue: (state) => {
      state.queue.inQueue = false;
      state.queue.position = null;
      state.queue.queueSize = 0;
      state.queue.matchFound = false;
      state.queue.opponent = null;
    },
    setMatchFound: (
      state,
      action: PayloadAction<{
        game: any;
        opponent: { id: string; username: string };
      }>
    ) => {
      state.queue.matchFound = true;
      state.queue.inQueue = false;
      state.queue.opponent = action.payload.opponent;
      state.currentGame = action.payload.game;
      state.activeGame = action.payload.game;
    },
    setActiveGame: (state, action: PayloadAction<Game | null>) => {
      state.activeGame = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch games
      .addCase(fetchGames.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        state.loading = false;
        state.availableGames = action.payload.games || [];
      })
      .addCase(fetchGames.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch games";
      })
      // Create game
      .addCase(createGame.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGame.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGame = action.payload.game;
        state.availableGames.push(action.payload.game);
      })
      .addCase(createGame.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to create game";
      })
      // Join game
      .addCase(joinGame.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(joinGame.fulfilled, (state, action) => {
        state.loading = false;
        state.currentGame = action.payload.game;
      })
      .addCase(joinGame.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to join game";
      })
      // Reset gameplay
      .addCase(resetGameplay.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetGameplay.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.game) {
          state.currentGame = action.payload.game;
        }
      })
      .addCase(resetGameplay.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to reset gameplay";
      })
      // Restore HP
      .addCase(restoreHp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreHp.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.game) {
          state.currentGame = action.payload.game;
        }
      })
      .addCase(restoreHp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to restore HP";
      })
      // Restore Cooldown
      .addCase(restoreCooldown.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreCooldown.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.game) {
          state.currentGame = action.payload.game;
        }
      })
      .addCase(restoreCooldown.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to restore cooldowns";
      })
      // Reset ban/pick
      .addCase(resetBanPick.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetBanPick.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.game) {
          state.currentGame = action.payload.game;
        }
      })
      .addCase(resetBanPick.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to reset ban/pick";
      })
      // Fetch active game
      .addCase(fetchActiveGame.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchActiveGame.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.hasActiveGame) {
          state.activeGame = action.payload.game;
        } else {
          state.activeGame = null;
        }
      })
      .addCase(fetchActiveGame.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch active game";
      })
      // Buy item
      .addCase(buyItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(buyItem.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(buyItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to buy item";
      })
      // Fetch champions
      .addCase(fetchChampions.pending, (state) => {
        state.databaseLoading = true;
        state.databaseError = null;
      })
      .addCase(fetchChampions.fulfilled, (state, action) => {
        state.champions = action.payload;
      })
      .addCase(fetchChampions.rejected, (state, action) => {
        state.databaseError =
          action.error.message || "Failed to fetch champions";
      })
      // Fetch basic items
      .addCase(fetchBasicItems.pending, (state) => {
        state.databaseLoading = true;
        state.databaseError = null;
      })
      .addCase(fetchBasicItems.fulfilled, (state, action) => {
        state.basicItems = action.payload.items || [];
      })
      .addCase(fetchBasicItems.rejected, (state, action) => {
        state.databaseError =
          action.error.message || "Failed to fetch basic items";
      })
      // Fetch combined items
      .addCase(fetchCombinedItems.pending, (state) => {
        state.databaseLoading = true;
        state.databaseError = null;
      })
      .addCase(fetchCombinedItems.fulfilled, (state, action) => {
        state.combinedItems = action.payload.items || [];
      })
      .addCase(fetchCombinedItems.rejected, (state, action) => {
        state.databaseError =
          action.error.message || "Failed to fetch combined items";
      })
      // Fetch all database data
      .addCase(fetchDatabaseData.pending, (state) => {
        state.databaseLoading = true;
        state.databaseError = null;
      })
      .addCase(fetchDatabaseData.fulfilled, (state) => {
        state.databaseLoading = false;
      })
      .addCase(fetchDatabaseData.rejected, (state, action) => {
        state.databaseLoading = false;
        state.databaseError = action.error.message || "Failed to load database";
      });
  },
});

export const {
  setCurrentGame,
  clearCurrentGame,
  setConnected,
  updateGameStatus,
  addPlayerToCurrentGame,
  removePlayerFromCurrentGame,
  setQueueStatus,
  joinQueue,
  leaveQueue,
  setMatchFound,
  setActiveGame,
} = gameSlice.actions;

export default gameSlice.reducer;
