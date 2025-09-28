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
  status: "waiting" | "in_progress" | "finished";
  players: any[];
  maxPlayers: number;
  createdAt: string;
}

interface GameState {
  currentGame: Game | null;
  availableGames: Game[];
  loading: boolean;
  error: string | null;
  connected: boolean;
  queue: QueueState;
}

const initialState: GameState = {
  currentGame: null,
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
  async (gameId: string) => {
    const token = localStorage.getItem("token");
    const response = await axios.post(
      `${API_URL}/games/${gameId}/reset-gameplay`,
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
} = gameSlice.actions;

export default gameSlice.reducer;
