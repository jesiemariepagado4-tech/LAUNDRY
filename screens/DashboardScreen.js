import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator, Modal, TouchableWithoutFeedback, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path, Circle } from 'react-native-svg';

// --- FIREBASE & STORAGE IMPORTS ---
// FIXED: Added updateDoc to the imports so we can update the mission status
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../config/firebase';

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = (width || 800) < 390;

  const [myMissions, setMyMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("Agent Offline");
  
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userXp, setUserXp] = useState(0);

  const handleLogout = async () => {
    setIsDropdownVisible(false);
    setIsLoggingOut(true); 

    setTimeout(async () => {
      try {
        await signOut(auth);
        await AsyncStorage.removeItem('@user_session');
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error) {
        console.error("Logout Error:", error);
        setIsLoggingOut(false);
      }
    }, 3000);
  };

  useEffect(() => {
    let unsubscribeSnapshot;
    let unsubscribeUser;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
        
        try {
          const q = query(collection(db, 'missions'), where('userId', '==', user.uid));
          unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
            const missionsData = [];
            snapshot.forEach((docSnap) => {
              if (docSnap.exists()) {
                missionsData.push({ id: docSnap.id, ...docSnap.data() });
              }
            });
            
            // The filter already checks for !mission.userCleared!
            const visibleMissions = missionsData
              .filter(mission => !mission.userCleared && mission.status !== 'cancelled')
              .sort((a, b) => {
                const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
                const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
              });
            
            setMyMissions(visibleMissions);
            setIsLoading(false);
          });

          const userRef = doc(db, 'users', user.uid);
          unsubscribeUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
              setUserXp(docSnap.data().xpBalance || 0);
            } else {
              setDoc(userRef, { xpBalance: 0, lifetimeXp: 0, activeDiscounts: [] }, { merge: true });
              setUserXp(0);
            }
          });

        } catch (err) {
          setIsLoading(false);
        }
      } else {
        setUserEmail("Agent Offline");
        setMyMissions([]);
        setUserXp(0);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // --- NEW: FUNCTION TO HIDE DELIVERED MISSIONS FROM DASHBOARD ---
  const handleClearMission = async (missionId) => {
    try {
      await updateDoc(doc(db, 'missions', missionId), {
        userCleared: true // This will hide it from the Dashboard but keep it in History
      });
    } catch (error) {
      console.error("Error clearing mission:", error);
      Alert.alert("Error", "Could not clear the mission from your dashboard.");
    }
  };

  const getStatusDisplay = (status) => {
    const safeStatus = String(status || '').toLowerCase();
    switch (safeStatus) {
      case 'pending_pickup':
      case 'pending': return { text: '1. MISSION DEPLOYED (15%)', width: '15%', color: '#FBBF24' };
      case 'weigh_in': return { text: '2. HQ WEIGH-IN (30%)', width: '30%', color: '#FF1493' };
      case 'cleaning':
      case 'washing': return { text: '3. WASHING OPS (50%)', width: '50%', color: '#00FFED' };
      case 'ready_for_delivery': return { text: '4. FOLDED & READY (70%)', width: '70%', color: '#00FFED' };
      case 'otw': return { text: '5. ON THE WAY (85%)', width: '85%', color: '#00FFED' };
      case 'delivered': 
      case 'completed': return { text: '6. DELIVERED (100%)', width: '100%', color: '#34D399' };
      case 'cancelled': return { text: 'MISSION ABORTED', width: '0%', color: '#F87171' };
      default: return { text: 'UNKNOWN STATUS', width: '0%', color: '#8d85b1' };
    }
  };

  let userName = "CAPTAIN_WASH";
  try {
    if (userEmail && userEmail !== "Agent Offline") {
      const emailString = String(userEmail);
      const atIndex = emailString.indexOf('@');
      if (atIndex > 0) userName = emailString.substring(0, atIndex).toUpperCase();
    }
  } catch (err) {
    userName = "CAPTAIN_WASH";
  }

  const userLevel = Math.floor(userXp / 500) + 1;
  const nextLevelXp = userLevel * 500;
  const progressPercent = Math.min((userXp / nextLevelXp) * 100, 100);

  const rewardTiers = [
    { cost: 200, name: '10% Discount', icon: '🎟️' },
    { cost: 400, name: '20% Discount', icon: '🎫' },
    { cost: 1000, name: '50% Discount', icon: '💎' }
  ];
  const nextRewardTarget = rewardTiers.find(tier => userXp < tier.cost) || rewardTiers[rewardTiers.length - 1];
  const isMaxedOut = userXp >= rewardTiers[rewardTiers.length - 1].cost;
  const rewardProgressPercent = isMaxedOut ? 100 : Math.min((userXp / nextRewardTarget.cost) * 100, 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <Modal visible={isLoggingOut} transparent={true}>
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00FFED" />
          <Text style={styles.loadingText}>Terminating Session...</Text>
        </View>
      </Modal>

      <View style={{ backgroundColor: '#1A0D3A', padding: isSmallPhone ? 18 : 24, paddingTop: isSmallPhone ? 50 : 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#00FFED' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setIsDropdownVisible(true)} style={{ width: isSmallPhone ? 48 : 52, height: isSmallPhone ? 48 : 52, borderRadius: 999, borderWidth: 4, borderColor: '#00FFED', backgroundColor: '#FF1493', alignItems: 'center', justifyContent: 'center', marginRight: isSmallPhone ? 12 : 16 }}>
            <Text style={{ fontSize: isSmallPhone ? 26 : 28 }}>🧑‍🚀</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 17.5 : 19, fontWeight: '650', letterSpacing: 0.1 }}>Welcome, {userName}!</Text>
            <Text style={{ color: '#00FFED', fontSize: 11, marginTop: 2, fontWeight: '700', letterSpacing: 0.5 }}>{userEmail}</Text>
            
            <TouchableOpacity onPress={() => navigation.navigate('AchievementBadgesScreen')} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingVertical: 4 }}>
              <Text style={{ color: '#FF1493', fontSize: isSmallPhone ? 11.5 : 12.5, fontWeight: '700' }}>Lvl {userLevel}</Text>
              <View style={{ width: isSmallPhone ? 68 : 75, height: 5, backgroundColor: '#334155', borderRadius: 999, marginLeft: 10, overflow: 'hidden' }}>
                <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#FF1493' }} />
              </View>
              <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: isSmallPhone ? 10.5 : 11.5, marginLeft: 8 }}>{userXp} XP 🎁</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('AlertComms')}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22Z" fill="#00FFED" stroke="#00FFED" strokeWidth="2" strokeLinejoin="round"/>
            <Path d="M18 16V11C18 7.93297 16.3668 5.3644 13.5 4.68185V4C13.5 3.17157 12.8284 2.5 12 2.5C11.1716 2.5 10.5 3.17157 10.5 4V4.68185C7.6332 5.3644 6 7.93297 6 11V16L4 18H20L18 16Z" stroke="#00FFED" strokeWidth="2" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
      </View>

      <Modal visible={isDropdownVisible} transparent={true} animationType="fade">
        <TouchableWithoutFeedback onPress={() => setIsDropdownVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setIsDropdownVisible(false); navigation.navigate('HeroSpecs'); }}><Text style={styles.menuText}>Hero Specs</Text></TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}><Text style={[styles.menuText, { color: '#FF1493' }]}>Logout</Text></TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 16 : 24, paddingTop: 24, paddingBottom: 110 }}>
        <Text style={{ color: '#00FFED', fontSize: isSmallPhone ? 19 : 20, fontWeight: '900', letterSpacing: 1, marginBottom: 14 }}>Active Missions</Text>
        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginVertical: 30 }} />
        ) : myMissions.length === 0 ? (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: '#475569', borderStyle: 'dashed', borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
            <Text style={{ color: '#00FFED', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>NO ACTIVE MISSIONS</Text>
            <Text style={{ color: '#8d85b1', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>Your quest log is empty, Captain! Deploy a new pickup to start earning XP and credits.</Text>
          </View>
        ) : (
          myMissions.map((mission) => {
            const safeMissionId = mission?.missionId ? String(mission.missionId) : '#---';
            const safeService = mission?.serviceType ? String(mission.serviceType) : 'Unknown Protocol';
            const safeTime = mission?.displayDateTime ? String(mission.displayDateTime) : 'Awaiting Time Data';
            const statusStyle = getStatusDisplay(mission?.status);
            
            // Check if the mission is fully completed/delivered
            const isDelivered = mission?.status === 'delivered' || mission?.status === 'completed';
            
            return (
              <TouchableOpacity 
                key={mission.id} 
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: statusStyle.width === '0%' ? '#F87171' : 'rgba(0,255,237,0.3)', borderRadius: 20, padding: isSmallPhone ? 16 : 20, marginBottom: 32 }} 
                onPress={() => navigation.navigate('MissionProgress', { 
                  missionDocId: mission.id, 
                  displayId: safeMissionId, 
                  service: safeService, 
                  address: mission?.address || 'Unknown Base' 
                })}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 16 : 18, fontWeight: '900' }}>Mission: {safeService}</Text>
                  <Text style={{ backgroundColor: statusStyle.width === '0%' ? '#F87171' : '#FF1493', color: '#FFFFFF', fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999 }}>{safeMissionId}</Text>
                </View>
                <Text style={{ color: '#FFFFFF', opacity: 0.75, marginBottom: 12 }}>Time: {safeTime}</Text>
                
                <View style={{ height: 7, backgroundColor: '#334155', borderRadius: 999, overflow: 'hidden' }}>
                  <View style={{ width: statusStyle.width, height: '100%', backgroundColor: statusStyle.color }} />
                </View>
                <Text style={{ color: statusStyle.color, fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>{statusStyle.text}</Text>

                {/* --- NEW: REMOVE FROM DASHBOARD BUTTON (ONLY SHOWS IF DELIVERED) --- */}
                {isDelivered && (
                  <TouchableOpacity 
                    style={{ marginTop: 20, backgroundColor: 'rgba(0,255,237,0.1)', borderWidth: 1, borderColor: '#00FFED', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
                    onPress={() => handleClearMission(mission.id)}
                  >
                    <Text style={{ color: '#00FFED', fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>REMOVE FROM ACTIVE DASHBOARD</Text>
                  </TouchableOpacity>
                )}
                
              </TouchableOpacity>
            );
          })
        )}

        <Text style={{ color: '#FF1493', fontSize: isSmallPhone ? 19 : 20, fontWeight: '900', letterSpacing: 1, marginBottom: 14 }}>Next Reward</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AchievementBadgesScreen')}
          style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,20,147,0.3)', borderRadius: 20, padding: isSmallPhone ? 16 : 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
            <View style={{ backgroundColor: 'rgba(255,20,147,0.1)', padding: 12, borderRadius: 16, marginRight: 15, borderWidth: 1, borderColor: 'rgba(255,20,147,0.3)' }}>
              <Text style={{ fontSize: 28 }}>{nextRewardTarget.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 16 : 17, fontWeight: '800' }}>{nextRewardTarget.name}</Text>
              <Text style={{ color: '#00FFED', opacity: 0.9, fontSize: 13, marginTop: 4, fontWeight: '700' }}>{isMaxedOut ? "All base discounts affordable!" : `${nextRewardTarget.cost - userXp} XP to unlock`}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ width: `${rewardProgressPercent}%`, height: '100%', backgroundColor: '#FF1493' }} />
            </View>
            <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: 12, marginLeft: 12, fontWeight: '700' }}>{userXp} / {nextRewardTarget.cost}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 36, backgroundColor: '#00FFED', paddingVertical: isSmallPhone ? 16 : 20, borderRadius: 999, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: '#00C2B4' }} onPress={() => navigation.navigate('PickupQuest')}>
          <Text style={{ color: '#1A0D3A', fontSize: isSmallPhone ? 18 : 20, fontWeight: '900', letterSpacing: 1 }}>NEW PICKUP QUEST</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={{ position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: '#1A0D3A', borderWidth: 2, borderColor: 'rgba(0,255,237,0.6)', borderRadius: 999, padding: 10, flexDirection: 'row', justifyContent: 'space-around' }}>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => navigation.navigate('Dashboard')}><Svg width={28} height={28} viewBox="0 0 24 24" fill="none"><Path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><Path d="M9 22V12H15V22" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></Svg><Text style={{ color: '#00FFED', fontSize: 10, fontWeight: '700', marginTop: 2 }}>HOME</Text></TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('PickupQuest')}><Svg width={28} height={28} viewBox="0 0 24 24" fill="none"><Path d="M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7H7C5.89543 7 5 7.89543 5 9V11" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></Svg><Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>QUEST</Text></TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('AchievementBadgesScreen')}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>REWARDS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('HeroSpecs')}><Svg width={28} height={28} viewBox="0 0 24 24" fill="none"><Path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><Circle cx="12" cy="7" r="4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></Svg><Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>SPECS</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  dropdownContainer: { position: 'absolute', top: 100, left: 20, backgroundColor: '#1A0D3A', borderRadius: 15, padding: 10, width: 160, borderWidth: 1, borderColor: '#00FFED' },
  menuItem: { paddingVertical: 10, paddingHorizontal: 5 },
  menuText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(0,255,237,0.2)' },
  loadingOverlay: { flex: 1, backgroundColor: '#2D1A5B', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00FFED', marginTop: 15, fontSize: 16, fontWeight: '700', letterSpacing: 1 }
});