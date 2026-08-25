// src/redux/slices/adminSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../service/api'; // 👈 import your existing axios instance

// ─── Async Thunk: Fetch Active Categories ──────────────────
export const getActiveCategories = createAsyncThunk(
  'admin/getActiveCategories',
  async (_, { rejectWithValue }) => {
    try {
      // Your API instance already has baseURL and credentials
      const response = await api.get('/categories'); // adjust endpoint as needed
      // If your endpoint is /api/categories, make sure the baseURL already includes /api
      // Or use full path like '/categories' if baseURL includes /api
      const categories = response.data.categories || response.data || [];
      return categories;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to load categories'
      );
    }
  }
);

// ─── Slice ──────────────────────────────────────────────────
const initialState = {
  activeCategories: [],
  isLoading: false,
  error: null,
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearCategories: (state) => {
      state.activeCategories = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getActiveCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getActiveCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeCategories = action.payload;
      })
      .addCase(getActiveCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCategories } = adminSlice.actions;
export default adminSlice.reducer;