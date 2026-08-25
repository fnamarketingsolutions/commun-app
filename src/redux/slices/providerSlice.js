// src/redux/slices/providerSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../service/api';

// ─── Thunks ──────────────────────────────────────────────────

/**
 * Fetch the logged-in provider's own profile (protected)
 * GET /api/provider-profile/my-profile
 */
export const getMyProviderProfile = createAsyncThunk(
  'provider/getMyProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/provider-profile/my-profile');
      return response.data.provider;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch provider profile'
      );
    }
  }
);

/**
 * Fetch dashboard statistics for the logged-in provider
 * GET /api/provider-profile/dashboard/stats
 */
export const getProviderDashboardStats = createAsyncThunk(
  'provider/getDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/provider-profile/dashboard/stats');
      return response.data.data; // Adjust based on actual response structure
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch dashboard stats'
      );
    }
  }
);

/**
 * Fetch all providers (public)
 * GET /api/provider-profile/
 */
export const getAllProviders = createAsyncThunk(
  'provider/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/provider-profile');
      return response.data.providers;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch providers'
      );
    }
  }
);

/**
 * Fetch a single provider by profile ID (public)
 * GET /api/provider-profile/:id
 */
export const getProviderById = createAsyncThunk(
  'provider/getById',
  async (providerProfileId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/provider-profile/${providerProfileId}`);
      return response.data.provider;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Provider not found'
      );
    }
  }
);

// ─── Initial State ──────────────────────────────────────────

const initialState = {
  // List of all providers (public)
  allProviders: [],
  // Currently selected provider detail
  selectedProvider: null,
  // Logged-in provider's own profile
  myProviderProfile: null,
  // Dashboard statistics
  dashboardStats: null,

  // Loading states
  isFetchingAll: false,
  isFetchingSelected: false,
  isFetchingMyProfile: false,
  isFetchingDashboard: false,

  // Errors
  error: null,
  dashboardError: null,
};

// ─── Slice ──────────────────────────────────────────────────

const providerSlice = createSlice({
  name: 'provider',
  initialState,
  reducers: {
    clearSelectedProvider: (state) => {
      state.selectedProvider = null;
      state.error = null;
    },
    clearMyProviderProfile: (state) => {
      state.myProviderProfile = null;
    },
    clearDashboardStats: (state) => {
      state.dashboardStats = null;
      state.dashboardError = null;
    },
  },
  extraReducers: (builder) => {
    // ── getAllProviders ──
    builder
      .addCase(getAllProviders.pending, (state) => {
        state.isFetchingAll = true;
        state.error = null;
      })
      .addCase(getAllProviders.fulfilled, (state, action) => {
        state.isFetchingAll = false;
        state.allProviders = action.payload;
      })
      .addCase(getAllProviders.rejected, (state, action) => {
        state.isFetchingAll = false;
        state.error = action.payload;
      })

      // ── getProviderById ──
      .addCase(getProviderById.pending, (state) => {
        state.isFetchingSelected = true;
        state.error = null;
      })
      .addCase(getProviderById.fulfilled, (state, action) => {
        state.isFetchingSelected = false;
        state.selectedProvider = action.payload;
      })
      .addCase(getProviderById.rejected, (state, action) => {
        state.isFetchingSelected = false;
        state.error = action.payload;
      })

      // ── getMyProviderProfile ──
      .addCase(getMyProviderProfile.pending, (state) => {
        state.isFetchingMyProfile = true;
        state.error = null;
      })
      .addCase(getMyProviderProfile.fulfilled, (state, action) => {
        state.isFetchingMyProfile = false;
        state.myProviderProfile = action.payload;
      })
      .addCase(getMyProviderProfile.rejected, (state, action) => {
        state.isFetchingMyProfile = false;
        state.error = action.payload;
      })

      // ── getProviderDashboardStats ──
      .addCase(getProviderDashboardStats.pending, (state) => {
        state.isFetchingDashboard = true;
        state.dashboardError = null;
      })
      .addCase(getProviderDashboardStats.fulfilled, (state, action) => {
        state.isFetchingDashboard = false;
        state.dashboardStats = action.payload;
      })
      .addCase(getProviderDashboardStats.rejected, (state, action) => {
        state.isFetchingDashboard = false;
        state.dashboardError = action.payload;
      });
  },
});

export const {
  clearSelectedProvider,
  clearMyProviderProfile,
  clearDashboardStats,
} = providerSlice.actions;

export default providerSlice.reducer;