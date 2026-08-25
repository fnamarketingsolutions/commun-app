import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
  },
  reducers: {
    addNotification: (state, action) => {
      // Prevent duplicates by id
      const exists = state.items.find((n) => n.id === action.payload.id);
      if (!exists) {
        state.items.unshift(action.payload); // newest first
      }
    },
    markAllAsRead: (state) => {
      state.items = state.items.map((n) => ({ ...n, isRead: true }));
    },
    // ── NEW: mark a single notification as read ──
    markAsRead: (state, action) => {
      const id = action.payload;
      const item = state.items.find((n) => n.id === id);
      if (item) {
        item.isRead = true;
      }
    },
    removeNotification: (state, action) => {
      state.items = state.items.filter((n) => n.id !== action.payload);
    },
    clearAllNotifications: (state) => {
      state.items = [];
    },
  },
});

// ── Export all actions ──
export const {
  addNotification,
  markAllAsRead,
  markAsRead,          // <-- exported for use in components
  removeNotification,
  clearAllNotifications,
} = notificationSlice.actions;

export default notificationSlice.reducer;