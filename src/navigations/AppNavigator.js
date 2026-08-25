// navigation/AppNavigator.jsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createNavigationContainerRef } from '@react-navigation/native';
import BottomTabNavigator from './BottomTabNavigator.js';

// ── Re-export ROUTES from routes.js so any file that already imports
//    from AppNavigator keeps working without changes.
export { ROUTES } from './routes';
export const navigationRef = createNavigationContainerRef();
// ── Auth screens ──────────────────────────────────────────────────────────
import SplashScreen from '../screens/auth/SplashScreen';
import OnboardingScreen from '../screens/auth/Onboardingscreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// ── App / tab screens ─────────────────────────────────────────────────────
import HomeScreen from '../screens/app/HomeScreen';
import ServicesScreen from '../screens/app/ServicesScreen';
import ServiceDetailScreen from '../screens/app/ServiceDetailScreen.js';
import AllServicesScreen from '../screens/app/AllServicesScreen.js';
import CategoriesScreen from '../screens/app/CategoriesScreen.js';
import CategoryServicesScreen from '../screens/app/CategoryServicesScreen.js';
import ProfileScreen from '../screens/app/ProfileScreen';
import Settingsscreen from '../screens/app/Settingsscreen.js';
import PendingApprovalScreen from '../screens/app/PendingApprovalScreen.js';
import CommunityServices from '../screens/app/CommunityServices.js';
import DirectoryHub from '../screens/Directory/MembersScreen.js';

// ── Profile sub-screens ───────────────────────────────────────────────────
import EditProfileScreen from '../screens/Profile/EditProfileScreen.js';
import profileInfoScreen from '../screens/Profile/ProfileInfoScreen.js';
import securityScreen from '../screens/Profile/SecurityScreen.js';
import SavedServicesScreen from '../screens/Profile/SavedServicesScreen.js';

// ── Provider screens ──────────────────────────────────────────────────────
import ProvidersScreen from '../screens/provider/ProvidersScreen';
import ProviderProfileScreen from '../screens/provider/Providerprofilescreen.js';
import AllProvidersScreen from '../screens/provider/AllProvidersScreen';
import ProviderAllServicesScreen from '../screens/provider/ProviderAllServicesScreen';
import BecomeProviderScreen from '../screens/provider/BecomeProviderScreen';
import ProviderHubScreen from '../screens/provider/ProviderHubScreen.js';
import ProviderDashboardScreen from '../screens/provider/Providerdashboardscreen.js';
import ManageServicesScreen from '../screens/provider/ManageServicesScreen.js';
import AddServiceScreen from '../screens/provider/AddServiceScreen.js';
import EditServiceScreen from '../screens/provider/EditServiceScreen.js';
import UpdateProviderProfile from '../screens/provider/UpdateProviderProfile.js';
import ProviderBroadcastScreen from '../screens/provider/ProviderBroadcastScreen.js';
import ProviderEventsScreen from '../screens/provider/ProviderEventsScreen.js';
import ProviderRequestDetail from '../screens/provider/ProviderRequestDetailScreen.js';

// ── Secretary screens ─────────────────────────────────────────────────────
import CommunityManagementScreen from '../screens/secretary/Communitymanagementscreen.js';
import CommunityMembers from '../screens/secretary/Membersscreen.js';
import ApproveProviders from '../screens/secretary/Approveprovidersscreen.js';
import BroadcastMessage from '../screens/secretary/Broadcastscreen.js';
import CommunityEvents from '../screens/secretary/Eventsscreen.js';
import DashboardScreen from '../screens/secretary/Dashboardscreen.js';
import MemberDetailScreen from '../screens/secretary/MemberDetailScreen.js';
import CreateEventScreen from '../screens/secretary/CreateEventScreen.js';
import AllBroadcastsScreen from '../screens/secretary/AllBroadcastsScreen.js';
import SecretaryServices from '../screens/secretary/SecretaryService.js';
// ── NEW: Secretary Directory screens ──────────────────────────────────────
import SecretaryVendorsScreen from '../screens/secretary/SecretaryVendorsScreen.js';
import SecretaryEmergencyContactsScreen from '../screens/secretary/SecretaryEmergencyContactsScreen.js';



import SecretaryLocalBusinessesScreen from '../screens/localBussines/SecretaryLocalBusinessesScreen.js';
import AddLocalBusinessScreen from '../screens/localBussines/Addlocalbusinessscreen.js';
import EditLocalBusinessScreen from '../screens/localBussines/Editlocalbusinessscreen.js';


// ── Extra / info screens ──────────────────────────────────────────────────
import Aboutscreen from '../screens/extra/Aboutscreen.js';
import ContactScreen from '../screens/extra/Contactscreen.js';
import FAQScreen from '../screens/extra/FAQScreen.js';
import PrivcayPolicyScreen from '../screens/extra/PrivacyPolicyScreen.js';
import CommunityGuidelinesScreen from '../screens/extra/Communityguidelinesscreen.js';
import TermsOfServiceScreen from '../screens/extra/TermsOfServiceScreen.js';

// ── Chat screens ──────────────────────────────────────────────────────────
import ChatRoomScreen from '../screens/Chat/ChatRoomScreen.js';
import CommunityChatSCreen from '../screens/Chat/CommunityChatScreen.js';

import LocationPermission from '../screens/auth/LocationPermissionScreen.js';

import LeaderboardScreen from '../screens/app/LeaderboardScreen.js';

import EmergencyContactsScreen from '../screens/Directory/EmergencyContactsScreen.js';
import VendorsScreen from '../screens/Directory/VendorsScreen.js';

import DirectoryScreen from '../screens/Directory/DirectoryScreen.js';


import CommunityHubScreen from '../screens/app/CommunityHubScreen.js';

import NotificationScreen from '../screens/app/NotificationScreen';
import AllLocalBusinessesScreen from '../screens/localBussines/AllLocalBusinessesScreen.js'; 

import LocalBusinessDetailScreen from '../screens/localBussines/LocalBusinessDetailScreen.js';

import SecretaryReviewsScreen from '../screens/secretary/SecretaryReviewsScreen';

// ── Import ROUTES locally for use in this file ────────────────────────────
import { ROUTES } from './routes';

// ─────────────────────────────────────────────────────────────────────────────
const TabsScreen = () => (
  <BottomTabNavigator
    Home={HomeScreen}
    Community={CommunityHubScreen}
    Services={ServicesScreen}
    Directory={DirectoryScreen}
    Profile={ProfileScreen}
  />
);

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <NavigationContainer ref={navigationRef}>
    <Stack.Navigator
      initialRouteName={ROUTES.SPLASH}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F0EEFF' },
      }}
    >
      {/* ── Pre-auth ──────────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.SPLASH} component={SplashScreen} options={{ animation: 'none' }} />
      <Stack.Screen name={ROUTES.ONBOARDING} component={OnboardingScreen} options={{ animation: 'fade' }} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
      <Stack.Screen name={ROUTES.REGISTER} component={RegisterScreen} />
      <Stack.Screen name={ROUTES.FORGOT_PASSWORD} component={ForgotPasswordScreen} />

      {/* ── Main app ──────────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.TABS} component={TabsScreen} options={{ animation: 'fade' }} />

      {/* ── Services ──────────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.SERVICES} component={ServicesScreen} />
      <Stack.Screen name={ROUTES.SERVICE_DETAIL} component={ServiceDetailScreen} />
      <Stack.Screen name={ROUTES.ALL_SERVICES} component={AllServicesScreen} />
      <Stack.Screen name={ROUTES.CATEGORIES} component={CategoriesScreen} />
      <Stack.Screen name={ROUTES.CATEGORY_SERVICES} component={CategoryServicesScreen} />

      {/* ── Providers ─────────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.PROVIDERS} component={ProvidersScreen} />
      <Stack.Screen name={ROUTES.PROVIDER_DETAIL} component={ProviderProfileScreen} />
      <Stack.Screen name={ROUTES.ALL_PROVIDERS_LIST} component={AllProvidersScreen} />
      <Stack.Screen name={ROUTES.PROVIDER_ALL_SERVICES} component={ProviderAllServicesScreen} />
      <Stack.Screen name={ROUTES.BECOME_PROVIDER} component={BecomeProviderScreen} />

      {/* ── Profile / Account ─────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.SETTINGS} component={Settingsscreen} />
      <Stack.Screen name={ROUTES.PROFILE_INFO} component={profileInfoScreen} />
      <Stack.Screen name={ROUTES.EDIT_PROFILE} component={EditProfileScreen} />
      <Stack.Screen name={ROUTES.EDIT_PASSWORD} component={securityScreen} />
      <Stack.Screen name={ROUTES.SAVED_SERVICES} component={SavedServicesScreen} />
      <Stack.Screen name={ROUTES.PENDING} component={PendingApprovalScreen} />

      {/* ── Provider Hub ──────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.PROVIDER_DASHBOARD_HUB} component={ProviderHubScreen} />
      <Stack.Screen name={ROUTES.PROVIDER_DASHBOARD} component={ProviderDashboardScreen} />
      <Stack.Screen name={ROUTES.MANAGE_SERVICE} component={ManageServicesScreen} />
      <Stack.Screen name={ROUTES.ADD_SERVICE} component={AddServiceScreen} />
      <Stack.Screen name={ROUTES.EDIT_SERVICE} component={EditServiceScreen} />
      <Stack.Screen name={ROUTES.EDIT_PROVIDER_PROFILE} component={UpdateProviderProfile} />
      <Stack.Screen name={ROUTES.PROVIDER_BROADCAST} component={ProviderBroadcastScreen} />
      <Stack.Screen name={ROUTES.PROVIDER_EVENTS} component={ProviderEventsScreen} />
      <Stack.Screen name={ROUTES.PENDING_PROVIDER_REQUESTS} component={ProviderRequestDetail} />

      {/* ── Secretary ─────────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.COMMUNITY_MANAGEMENT} component={CommunityManagementScreen} />
      <Stack.Screen name={ROUTES.COMMUNITY_MEMBERS} component={CommunityMembers} />
      <Stack.Screen name={ROUTES.APPROVE_PROVIDER} component={ApproveProviders} />
      <Stack.Screen name={ROUTES.BROADCAST} component={BroadcastMessage} />
      <Stack.Screen name={ROUTES.COMMUNITY_EVENT} component={CommunityEvents} />
      <Stack.Screen name={ROUTES.COMMUNITY_DASHBORAD} component={DashboardScreen} />
      <Stack.Screen name={ROUTES.MEMBER_DETAIL} component={MemberDetailScreen} />
      <Stack.Screen name={ROUTES.ADD_EVENT} component={CreateEventScreen} />
      <Stack.Screen name={ROUTES.ALL_BROADCAST} component={AllBroadcastsScreen} />
      <Stack.Screen name={ROUTES.SECRETARY_SERVICES} component={SecretaryServices} />
      {/* ── NEW: Secretary Directory ───────────────────────────────────── */}
      <Stack.Screen name={ROUTES.SECRETARY_VENDORS} component={SecretaryVendorsScreen} />
      <Stack.Screen name={ROUTES.SECRETARY_EMERGENCY_CONTACTS} component={SecretaryEmergencyContactsScreen} />

      {/* ── Extra / Info ──────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.ABOUT} component={Aboutscreen} />
      <Stack.Screen name={ROUTES.CONTACT} component={ContactScreen} />
      <Stack.Screen name={ROUTES.FAQ} component={FAQScreen} />
      <Stack.Screen name={ROUTES.PRIVACY} component={PrivcayPolicyScreen} />
      <Stack.Screen name={ROUTES.COMMUNITY_GUIDELINES} component={CommunityGuidelinesScreen} />
      <Stack.Screen name={ROUTES.TERMS_OF_SERVICE} component={TermsOfServiceScreen} />

      {/* ── Chat ──────────────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.CHAT_ROOM} component={ChatRoomScreen} />
      <Stack.Screen name={ROUTES.COMMUNITY_CHAT} component={CommunityChatSCreen} />

      {/* ── Tab routes ────────────────────────────────────────────────── */}
      <Stack.Screen name={ROUTES.COMMUNITY_SERVICES} component={CommunityServices} />
      <Stack.Screen name={ROUTES.DIRECTORY_HUB} component={DirectoryHub} />

      <Stack.Screen name={ROUTES.LOCATION_PERMISSION} component={LocationPermission} />

      <Stack.Screen name={ROUTES.LEADERBOARD} component={LeaderboardScreen} />
      <Stack.Screen name={ROUTES.EMERGENCYCONTACTS} component={EmergencyContactsScreen} />
      <Stack.Screen name={ROUTES.VENDORS} component={VendorsScreen} />
      <Stack.Screen name={ROUTES.DIRECTORY_SCREEN} component={DirectoryScreen} />
      <Stack.Screen name={ROUTES.COMMUNITY_HUB} component={CommunityHubScreen} />
      <Stack.Screen name={ROUTES.NOTIFICATIONS} component={NotificationScreen} />

      <Stack.Screen name={ROUTES.SECRETARY_REVIEWS} component={SecretaryReviewsScreen} />
      <Stack.Screen name={ROUTES.SECRETARY_LOCAL_BUSINESSES} component={SecretaryLocalBusinessesScreen} />
      <Stack.Screen name={ROUTES.SECRETARY_LOCAL_BUSINESS_ADD} component={AddLocalBusinessScreen} />
      <Stack.Screen name={ROUTES.SECRETARY_LOCAL_BUSINESS_EDIT} component={EditLocalBusinessScreen} />

     <Stack.Screen name ={ROUTES.ALL_LOCAL_BUSINESSES} component={AllLocalBusinessesScreen}/>
     <Stack.Screen name={ROUTES.LOCAL_BUSINESS_DETAIL} component={LocalBusinessDetailScreen}/>
    </Stack.Navigator>
  </NavigationContainer>
);

export default AppNavigator;