import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from '../slices/authSlice';
import adminReducer from '../slices/adminSlice';
import providerReducer from '../slices/providerSlice';
import wishlistReducer from '../slices/wishlistSlice';
import notificationReducer from '../slices/notificationSlice'; 
import { api } from '../service/api';
import { secretaryApi } from '../service/secretaryApi';
import { providerApi } from '../service/providerApi';
import { adminApi } from '../service/adminApi';
import { serviceOfferingApi } from '../service/serviceOfferingApi';
import { interestCommunityApi } from '../service/interestCommunityApi';
import { commentApi } from '../service/commentApi';
import { bannerApi } from '../service/bannerApi';
import { localBusinessMemberApi } from '../service/localBusinessMemberApi';

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'notifications'], // ✅ persist notifications across app restarts
};

const rootReducer = combineReducers({
  auth: authReducer,
  admin: adminReducer,
  provider: providerReducer,
  wishlist: wishlistReducer,
  notifications: notificationReducer,
   // ✅ NEW
  [api.reducerPath]: api.reducer,
  [secretaryApi.reducerPath]: secretaryApi.reducer,
  [providerApi.reducerPath]: providerApi.reducer,
  [adminApi.reducerPath]: adminApi.reducer,
  [serviceOfferingApi.reducerPath]: serviceOfferingApi.reducer,
  [interestCommunityApi.reducerPath]: interestCommunityApi.reducer,
  [commentApi.reducerPath]: commentApi.reducer,
   [bannerApi.reducerPath]: bannerApi.reducer,
   [localBusinessMemberApi.reducerPath]: localBusinessMemberApi.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      api.middleware,
      secretaryApi.middleware,
      providerApi.middleware,
      adminApi.middleware,
      serviceOfferingApi.middleware,
      interestCommunityApi.middleware,
      commentApi.middleware,
       bannerApi.middleware,
       localBusinessMemberApi.middleware,
    ),
});

export const persistor = persistStore(store);