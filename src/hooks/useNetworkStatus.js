// hooks/useNetworkStatus.js
import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      if (!online) setWasOffline(true);
      setIsOnline(online);
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOnline(online);
    });

    return () => unsubscribe();
  }, []);

  const resetOfflineFlag = useCallback(() => setWasOffline(false), []);

  return { isOnline, wasOffline, resetOfflineFlag };
}