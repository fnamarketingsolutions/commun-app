import React from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AppNavigator, { navigationRef } from './src/navigations/AppNavigator';
import { store, persistor } from './src/redux/store/store';
import { useFCM } from './src/hooks/useFCM';

const AppContent = () => {
  useFCM(navigationRef);
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