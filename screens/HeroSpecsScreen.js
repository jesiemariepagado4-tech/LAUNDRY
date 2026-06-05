import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, useWindowDimensions, 
  Modal, FlatList, TextInput, TouchableWithoutFeedback, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';

// --- ADDED: getDoc to fetch user data ---
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import LogoutModal from '../components/LogoutModal';

export default function HeroSpecsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isDeactivateModalVisible, setIsDeactivateModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- UPDATED: Default states before data loads ---
  const [avatar, setAvatar] = useState('🧑‍🚀');
  const [name, setName] = useState('Loading...');
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isFullViewModalVisible, setIsFullViewModalVisible] = useState(false);
  const availableAvatars = ['🧑‍🚀', '👽', '🤖', '👩‍🚀', '🛸', '☄️', '👨‍🚀', '👾'];

  // --- NEW: Fetch user data on screen load ---
  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.heroName) setName(data.heroName);
            if (data.skin) setAvatar(data.skin);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
    };

    fetchUserData();
  }, []);

  // --- NEW: Save profile edits to Firestore ---
  const handleSaveProfile = async () => {
    setIsEditModalVisible(false);
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        heroName: name,
        skin: avatar
      });
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLogoutModalVisible(false);
      setIsLoading(true); 
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await signOut(auth);
      await AsyncStorage.removeItem('@user_session');
      
      setIsLoading(false); 
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      setIsLoading(false);
      console.error("Logout Error", error.message);
    }
  };

  const handleDeactivateProfile = async () => {
    if (!auth.currentUser) return;
    
    setIsDeactivateModalVisible(false);
    setIsLoading(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        status: 'deactivated',
        isActive: false,
        deactivatedAt: new Date()
      });

      await handleLogout();

    } catch (error) {
      setIsLoading(false);
      console.error("Deactivation Error", error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }}>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: isSmallPhone ? 26 : 30, fontWeight: '900', color: '#00FFED', letterSpacing: 1 }}>
            Hero Specs
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setIsFullViewModalVisible(true)}
            style={{
              width: isSmallPhone ? 120 : 140,
              height: isSmallPhone ? 120 : 140,
              borderRadius: 999,
              borderWidth: 8,
              borderColor: '#00FFED',
              backgroundColor: '#FF1493',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <Text style={{ fontSize: isSmallPhone ? 52 : 62 }}>{avatar}</Text>
            
            <View style={{ position: 'absolute', bottom: -15, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ backgroundColor: '#00FFED', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999, borderWidth: 4, borderColor: '#1A0D3A' }}>
                <Text style={{ color: '#1A0D3A', fontWeight: '900', fontSize: 13 }}>LVL 12</Text>
              </View>

              <TouchableOpacity 
                onPress={(e) => { e.stopPropagation(); setIsEditModalVisible(true); }}
                style={{ backgroundColor: '#FF1493', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 3, borderColor: '#1A0D3A' }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: 10 }}>EDIT</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 26 : 30, fontWeight: '900', letterSpacing: 1, textAlign: 'center' }}>{name}</Text>
          <Text style={{ color: '#FFFFFF', opacity: 0.6, fontSize: 14, marginTop: 4 }}>Member ID: LDR-73-WH</Text>
        </View>

        <View style={{ gap: 12, marginBottom: 40 }}>
          <TouchableOpacity onPress={() => navigation.navigate('MissionHistory')} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: 'rgba(0,255,237,0.25)', borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Mission History</Text>
            <Text style={{ color: '#00FFED', fontSize: 22 }}>▶</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsDeactivateModalVisible(true)} style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: 'rgba(248,113,113,0.3)', borderRadius: 20, padding: 20 }}>
            <Text style={{ color: '#F87171', fontSize: 17, fontWeight: '700' }}>Deactivate Profile</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={{ backgroundColor: '#1A0D3A', borderWidth: 2, borderColor: 'rgba(255,20,147,0.4)', paddingVertical: 14, borderRadius: 999, alignItems: 'center', marginHorizontal: 'auto', width: isSmallPhone ? '70%' : '60%' }}
          onPress={() => setIsLogoutModalVisible(true)}
        >
          <Text style={{ color: '#FF1493', fontWeight: '900', fontSize: 17, letterSpacing: 1 }}>LOGOUT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Loading Modal */}
      <Modal visible={isLoading} transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(45,26,91,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#00FFED" />
          <Text style={{ color: '#00FFED', marginTop: 15, fontSize: 18, fontWeight: 'bold' }}>PROCESSING...</Text>
        </View>
      </Modal>

      {/* Full Picture Modal */}
      <Modal visible={isFullViewModalVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsFullViewModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}><Text style={{ fontSize: 200 }}>{avatar}</Text></View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalVisible} transparent={true} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(45,26,91,0.98)', justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: '#00FFED', fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>EDIT PROFILE</Text>
          <Text style={{ color: '#fff', marginBottom: 10 }}>Display Name</Text>
          <TextInput value={name} onChangeText={setName} style={{ backgroundColor: '#1A0D3A', color: '#fff', padding: 15, borderRadius: 10, marginBottom: 20 }} />
          <Text style={{ color: '#fff', marginBottom: 10 }}>Select Avatar</Text>
          <FlatList 
            data={availableAvatars} numColumns={4}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setAvatar(item)} style={{ padding: 10, backgroundColor: avatar === item ? 'rgba(0,255,237,0.2)' : 'transparent', borderRadius: 10 }}>
                <Text style={{ fontSize: 30 }}>{item}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
          />
          {/* --- UPDATED: Connected to Firestore update function --- */}
          <TouchableOpacity onPress={handleSaveProfile} style={{ marginTop: 30, backgroundColor: '#00FFED', padding: 15, borderRadius: 20, alignItems: 'center' }}>
            <Text style={{ color: '#1A0D3A', fontWeight: 'bold' }}>SAVE CHANGES</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal visible={isDeactivateModalVisible} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#111820', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#F87171' }}>
            <Text style={{ color: '#F87171', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 15 }}>⚠️ DEACTIVATE PROFILE?</Text>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 24, fontSize: 15, lineHeight: 22 }}>
              Are you sure you want to deactivate your account? You will be logged out and your profile will be hidden from active missions.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 14, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' }} 
                onPress={() => setIsDeactivateModalVisible(false)}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: '#F87171', alignItems: 'center' }} 
                onPress={handleDeactivateProfile}
              >
                <Text style={{ color: '#FFF', fontWeight: '900' }}>DEACTIVATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <LogoutModal 
        visible={isLogoutModalVisible} 
        onCancel={() => setIsLogoutModalVisible(false)} 
        onConfirm={handleLogout} 
      />
    </SafeAreaView>
  );
}