import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AppNavigator, { navigationRef } from './src/navigations/AppNavigator';
import { store, persistor } from './src/redux/store/store';
import { useFCM } from './src/hooks/useFCM';
import analyticsService from './src/services/AnalyticsService';
import inAppUpdateService from './src/services/InAppUpdateService';

const AppContent = () => {
  useFCM(navigationRef);
  const sessionStartRef = useRef(Date.now());

  useEffect(() => {
    // Non-blocking initialization of Meta SDK
    analyticsService.init();

    // Check Google Play Store for In-App Updates (native "Update" vs "Later" bottom sheet)
    inAppUpdateService.checkAndPromptUpdate();

    // Track session duration on background/active transitions
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background') {
        const elapsedSeconds = (Date.now() - sessionStartRef.current) / 1000;
        analyticsService.logSessionDuration(elapsedSeconds);
        analyticsService.flush();
      } else if (nextAppState === 'active') {
        sessionStartRef.current = Date.now();
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  return <AppNavigator />;
};

const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
};

export default App;