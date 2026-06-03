import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './config/firebase'; 

// Screens
import LoginScreen from './screens/LoginScreen';
import AvatarScreen from './screens/AvatarScreen';
import DashboardScreen from './screens/DashboardScreen';
import PickupQuestScreen from './screens/PickupQuestScreen';
import MissionProgressScreen from './screens/MissionProgressScreen';
import HeroSpecsScreen from './screens/HeroSpecsScreen';
import CommandCenterScreen from './screens/CommandCenterScreen';
import AlertCommsScreen from './screens/AlertCommsScreen';

// --- IMPORTS FOR NEW SCREENS ---
import AchievementBadgesScreen from './screens/AchievementBadgesScreen';
import MissionHistoryScreen from './screens/MissionHistoryScreen';
import DeactivateProfileScreen from './screens/DeactivateProfileScreen';
import AdminActiveMissionsScreen from './screens/AdminActiveMissionsScreen';
import AdminFinanceScreen from './screens/AdminFinanceScreen';
import AdminRewardsScreen from './screens/AdminRewardsScreen';
import UserManagementScreen from './screens/UserManagementScreen';   // ← Added
import AdminServicesScreen from './screens/AdminServicesScreen';
import AdminArchivesScreen from './screens/AdminArchivesScreen';
import AdminCommsScreen from './screens/AdminCommsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState('Login');
  const [isReady, setIsReady] = useState(false);

  // ✅ Administrative Authorization Email
  const ADMIN_EMAIL = "admin@gmail.com";

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedSession = await AsyncStorage.getItem('@user_session');
        
        if (storedSession) {
          const userData = JSON.parse(storedSession);
          
          if (userData.email === ADMIN_EMAIL) {
            setInitialRoute('CommandCenter');
          } else {
            setInitialRoute('Dashboard');
          }
        }
      } catch (error) {
        console.error("Error reading session:", error);
      } finally {
        setIsReady(true);
      }
    };

    checkAuthStatus();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await AsyncStorage.setItem('@user_session', JSON.stringify(firebaseUser));
      } else {
        await AsyncStorage.removeItem('@user_session');
      }
    });

    return () => unsubscribe();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#2D1A5B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00FFED" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Avatar" component={AvatarScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="PickupQuest" component={PickupQuestScreen} />
          <Stack.Screen name="MissionProgress" component={MissionProgressScreen} />
          <Stack.Screen name="HeroSpecs" component={HeroSpecsScreen} />
          <Stack.Screen name="CommandCenter" component={CommandCenterScreen} />
          <Stack.Screen name="AlertComms" component={AlertCommsScreen} />
          
          <Stack.Screen name="AchievementBadgesScreen" component={AchievementBadgesScreen} />
          <Stack.Screen name="MissionHistory" component={MissionHistoryScreen} />
          <Stack.Screen name="DeactivateProfile" component={DeactivateProfileScreen} />

          <Stack.Screen name="AdminActiveMissions" component={AdminActiveMissionsScreen} />
          <Stack.Screen name="AdminFinance" component={AdminFinanceScreen} />
          <Stack.Screen name="AdminRewards" component={AdminRewardsScreen} />
          <Stack.Screen name="AdminServices" component={AdminServicesScreen} />
          <Stack.Screen name="AdminArchives" component={AdminArchivesScreen} />
          <Stack.Screen name="AdminComms" component={AdminCommsScreen} />
            
          
          {/* ✅ Added User Management Screen */}
          <Stack.Screen name="UserManagement" component={UserManagementScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}