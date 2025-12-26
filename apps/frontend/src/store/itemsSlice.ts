import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ItemData {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon?: string;
  effects: Array<{
    stat: string;
    value: number;
    type: string;
    conditional: boolean;
  }>;
  isBasic: boolean;
  recipe?: [string, string];
  unique?: boolean;
  cooldown?: number;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  unique: boolean;
  cooldown: number;
  currentCooldown: number;
}

interface ItemsState {
  basicItems: ItemData[];
  allItems: ItemData[];
  viktorModules: ItemData[];
  loading: boolean;
  error: string | null;
}

const initialState: ItemsState = {
  basicItems: [],
  allItems: [],
  viktorModules: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchBasicItems = createAsyncThunk(
  "items/fetchBasicItems",
  async () => {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/games/items/basic`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.items;
  }
);

export const fetchAllItems = createAsyncThunk(
  "items/fetchAllItems",
  async () => {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/games/items`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.items;
  }
);

export const fetchViktorModules = createAsyncThunk(
  "items/fetchViktorModules",
  async () => {
    const token = localStorage.getItem("token");
    const response = await axios.get(`${API_URL}/games/items/viktor-modules`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.modules;
  }
);

const itemsSlice = createSlice({
  name: "items",
  initialState,
  reducers: {
    clearItems: (state) => {
      state.basicItems = [];
      state.allItems = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch basic items
      .addCase(fetchBasicItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBasicItems.fulfilled, (state, action) => {
        state.loading = false;
        state.basicItems = action.payload;
      })
      .addCase(fetchBasicItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch basic items";
      })
      // Fetch all items
      .addCase(fetchAllItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllItems.fulfilled, (state, action) => {
        state.loading = false;
        state.allItems = action.payload;
      })
      .addCase(fetchAllItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch all items";
      })
      // Fetch Viktor modules
      .addCase(fetchViktorModules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchViktorModules.fulfilled, (state, action) => {
        state.loading = false;
        state.viktorModules = action.payload;
      })
      .addCase(fetchViktorModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch Viktor modules";
      });
  },
});

export const { clearItems } = itemsSlice.actions;

export default itemsSlice.reducer;
