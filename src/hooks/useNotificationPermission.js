import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { request, check, RESULTS } from 'react-native-permissions';

// Use the raw string — PERMISSIONS.ANDROID.POST_NOTIFICATIONS is undefined in v5.6.0
const POST_NOTIFICATIONS = 'android.permission.POST_NOTIFICATIONS';

async function requestNotificationPermission() {
  if (Platform.OS !== 'android') return false;

  const androidVersion = parseInt(Platform.Version, 10);
  if (androidVersion < 33) {
    // Android 12 and below — granted automatically, no dialog needed
    return true;
  }

  const status = await check(POST_NOTIFICATIONS);

  if (status === RESULTS.GRANTED) {
    return true;
  }

  if (status === RESULTS.BLOCKED) {
    return false;
  }

  if (status === RESULTS.UNAVAILABLE) {
    return false;
  }

  // RESULTS.DENIED = never asked yet on Android — show popup now
  const result = await request(POST_NOTIFICATIONS);
  return result === RESULTS.GRANTED;
}

export function useNotificationPermission() {
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) return;
    asked.current = true;

    const timer = setTimeout(() => {
      requestNotificationPermission().then((granted) => {
      }).catch((err) => {
        console.error('[Permission] Error:', err);
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
}