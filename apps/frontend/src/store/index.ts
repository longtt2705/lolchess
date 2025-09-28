import { configureStore } from '@reduxjs/toolkit'
import authSlice from './authSlice'
import gameSlice from './gameSlice'
import uiSlice from './uiSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    game: gameSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
