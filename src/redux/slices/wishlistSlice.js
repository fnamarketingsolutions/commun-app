// src/redux/slices/wishlistSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { api } from '../service/api';

const initialState = { ids: [] };

// Helper to deduplicate IDs
const uniqueIds = (arr) => {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(id => String(id)))];
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    setWishlist: (state, { payload }) => {
      state.ids = uniqueIds(payload);
    },
    clearWishlist: (state) => { state.ids = []; },
  },
  extraReducers: (builder) => {
    // checkAuth → user.wishlist is an array of ObjectIds (strings)
    builder.addMatcher(
      api.endpoints.checkAuth.matchFulfilled,
      (state, { payload }) => {
        const wishlist = payload?.user?.wishlist;
        state.ids = uniqueIds(wishlist);
      },
    );

    // addToWishlist → backend returns { wishlist: ServiceOffering[] }
    builder.addMatcher(
      api.endpoints.addToWishlist.matchFulfilled,
      (state, { payload }) => {
        const items = Array.isArray(payload?.wishlist) ? payload.wishlist : [];
        state.ids = uniqueIds(items.map(s => s._id));
      },
    );

    // removeFromWishlist → same shape
    builder.addMatcher(
      api.endpoints.removeFromWishlist.matchFulfilled,
      (state, { payload }) => {
        const items = Array.isArray(payload?.wishlist) ? payload.wishlist : [];
        state.ids = uniqueIds(items.map(s => s._id));
      },
    );

    // logout → clear
    builder.addMatcher(
      api.endpoints.logout.matchFulfilled,
      (state) => { state.ids = []; },
    );
  },
});

export const { setWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;