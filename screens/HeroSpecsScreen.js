import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- ADDED IMPORTS FOR LOGOUT ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import LogoutModal from '../components/LogoutModal'; // <-- IMPORTED MODAL

export default function HeroSpecsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  // <-- ADDED STATE -->
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false); 

  // --- ADDED LOGOUT FUNCTION ---
  const handleLogout = async () => {
    try {
      setIsLogoutModalVisible(false); // Close modal before transitioning
      // 1. Tell Firebase to sign out
      await signOut(auth);
      // 2. Erase the saved session from the phone's memory
      await AsyncStorage.removeItem('@user_session');
      // 3. Reset the navigation stack so they can't swipe back into the app
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert("Logout Error", error.message);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ 
            fontSize: isSmallPhone ? 26 : 30, 
            fontWeight: '900', 
            color: '#00FFED', 
            letterSpacing: 1 
          }}>
            Hero Specs
          </Text>
        </View>

        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{
            width: isSmallPhone ? 120 : 140,
            height: isSmallPhone ? 120 : 140,
            borderRadius: 999,
            borderWidth: 8,
            borderColor: '#00FFED',
            backgroundColor: '#FF1493',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            position: 'relative'
          }}>
            <Text style={{ fontSize: isSmallPhone ? 52 : 62 }}>🧑‍🚀</Text>
            
            {/* LVL Badge */}
            <View style={{
              position: 'absolute',
              bottom: -12,
              right: -8,
              backgroundColor: '#00FFED',
              paddingHorizontal: 14,
              paddingVertical: 4,
              borderRadius: 999,
              borderWidth: 4,
              borderColor: '#1A0D3A'
            }}>
              <Text style={{ color: '#1A0D3A', fontWeight: '900', fontSize: 13 }}>LVL 12</Text>
            </View>
          </View>
        </View>

        {/* User Info */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: isSmallPhone ? 26 : 30, 
            fontWeight: '900', 
            letterSpacing: 1,
            textAlign: 'center'
          }}>
            Captain_Wash
          </Text>
          <Text style={{ 
            color: '#FFFFFF', 
            opacity: 0.6, 
            fontSize: 14, 
            marginTop: 4 
          }}>
            Member ID: LDR-73-WH
          </Text>
        </View>

        {/* Menu Items */}
        <View style={{ gap: 12, marginBottom: 40 }}>
          <TouchableOpacity style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 2,
            borderColor: 'rgba(0,255,237,0.25)',
            borderRadius: 20,
            padding: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Achievement Badges</Text>
            <Text style={{ color: '#00FFED', fontSize: 22 }}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 2,
            borderColor: 'rgba(0,255,237,0.25)',
            borderRadius: 20,
            padding: 20,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Mission History</Text>
            <Text style={{ color: '#00FFED', fontSize: 22 }}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 2,
            borderColor: 'rgba(248,113,113,0.3)',
            borderRadius: 20,
            padding: 20,
          }}>
            <Text style={{ color: '#F87171', fontSize: 17, fontWeight: '700' }}>Deactivate Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={{
            backgroundColor: '#1A0D3A',
            borderWidth: 2,
            borderColor: 'rgba(255,20,147,0.4)',
            paddingVertical: 14,
            borderRadius: 999,
            alignItems: 'center',
            marginHorizontal: 'auto',
            width: isSmallPhone ? '70%' : '60%'
          }}
          onPress={() => setIsLogoutModalVisible(true)} // <-- TRIGGERS MODAL
        >
          <Text style={{ color: '#FF1493', fontWeight: '900', fontSize: 17, letterSpacing: 1 }}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* <-- MODAL COMPONENT RENDERED HERE --> */}
      <LogoutModal 
        visible={isLogoutModalVisible} 
        onCancel={() => setIsLogoutModalVisible(false)} 
        onConfirm={handleLogout} 
      />
    </SafeAreaView>
  );
}