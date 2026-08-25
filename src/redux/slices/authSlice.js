// src/redux/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { api } from '../service/api';

const initialState = {
  user: null,
  isLoggedIn: false,
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isLoggedIn = true;
    },
    clearUser: (state) => {
      state.user = null;
      state.isLoggedIn = false;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Email + password login
    builder.addMatcher(api.endpoints.login.matchFulfilled, (state, { payload }) => {
      state.user = payload.user;
      state.isLoggedIn = true;
    });

    // Phone OTP login — verifyLoginOtp returns { success, user } same as email login
    builder.addMatcher(api.endpoints.verifyLoginOtp.matchFulfilled, (state, { payload }) => {
      state.user = payload.user;
      state.isLoggedIn = true;
    });

    // Registration
    builder.addMatcher(api.endpoints.register.matchFulfilled, (state, { payload }) => {
      state.user = payload.user;
      state.isLoggedIn = true;
    });

    // Check auth
    builder.addMatcher(api.endpoints.checkAuth.matchFulfilled, (state, { payload }) => {
      state.user = payload.user;
      state.isLoggedIn = true;
    });
    builder.addMatcher(api.endpoints.checkAuth.matchRejected, (state) => {
      state.user = null;
      state.isLoggedIn = false;
    });

    // Logout
    builder.addMatcher(api.endpoints.logout.matchFulfilled, (state) => {
      state.user = null;
      state.isLoggedIn = false;
    });
  },
});

export const { setUser, clearUser, setLoading } = authSlice.actions;
export default authSlice.reducer;