/**
 * @format
 */
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  // background/killed message received
});

AppRegistry.registerComponent(appName, () => App);