/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry, LogBox } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

// Developer notes stay in Metro. They must not cover the app screen.
LogBox.ignoreAllLogs();

try {
  setBackgroundMessageHandler(getMessaging(), async () => {});
} catch (_) {}

AppRegistry.registerComponent(appName, () => App);