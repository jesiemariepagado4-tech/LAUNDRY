import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LoginScreen from './screens/LoginScreen';
import AvatarScreen from './screens/AvatarScreen';
import DashboardScreen from './screens/DashboardScreen';
import PickupQuestScreen from './screens/PickupQuestScreen';
import MissionProgressScreen from './screens/MissionProgressScreen';
import HeroSpecsScreen from './screens/HeroSpecsScreen';
import CommandCenterScreen from './screens/CommandCenterScreen';
import AlertCommsScreen from './screens/AlertCommsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Avatar" component={AvatarScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="PickupQuest" component={PickupQuestScreen} />
          <Stack.Screen name="MissionProgress" component={MissionProgressScreen} />
          <Stack.Screen name="HeroSpecs" component={HeroSpecsScreen} />
          <Stack.Screen name="CommandCenter" component={CommandCenterScreen} />
          <Stack.Screen name="AlertComms" component={AlertCommsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}