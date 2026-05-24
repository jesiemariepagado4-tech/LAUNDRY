import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path, Circle } from 'react-native-svg';

// --- FIREBASE IMPORTS ---
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; 
import { db, auth } from '../config/firebase';

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = (width || 800) < 390;

  const [myMissions, setMyMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Track user email for the display
  const [userEmail, setUserEmail] = useState("Agent Offline");

  // --- FETCH REAL-TIME MISSIONS BASED ON USER ID ---
  useEffect(() => {
    let unsubscribeSnapshot;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserEmail(user.email);
        
        const q = query(
          collection(db, 'missions'),
          where('userId', '==', user.uid)
        );

        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const missionsData = [];
          snapshot.forEach((doc) => {
            if (doc.exists()) {
              missionsData.push({ id: doc.id, ...doc.data() });
            }
          });
          
          const visibleMissions = missionsData
            .filter(mission => !mission.userCleared && mission.status !== 'cancelled')
            .sort((a, b) => {
              const timeA = (a.createdAt && typeof a.createdAt.toMillis === 'function') ? a.createdAt.toMillis() : 0;
              const timeB = (b.createdAt && typeof b.createdAt.toMillis === 'function') ? b.createdAt.toMillis() : 0;
              return timeB - timeA;
            });
          
          setMyMissions(visibleMissions);
          setIsLoading(false);
        }, (error) => {
          console.error("Dashboard Listener Error: ", error);
          setIsLoading(false);
        });
      } else {
        setUserEmail("Agent Offline");
        setMyMissions([]);
        setIsLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const getStatusDisplay = (status) => {
    const safeStatus = String(status || '').toLowerCase();
    switch (safeStatus) {
      case 'pending_pickup':
      case 'pending': 
        return { text: 'AWAITING PICKUP (10%)', width: '10%', color: '#FBBF24' };
      case 'weigh_in': 
        return { text: 'AT HQ: WEIGH-IN (30%)', width: '30%', color: '#00FFED' };
      case 'awaiting_payment': 
        return { text: 'AWAITING FUNDS (50%)', width: '50%', color: '#FF1493' };
      case 'cleaning': 
        return { text: 'CLEANING OPS (80%)', width: '80%', color: '#00FFED' };
      case 'completed': 
        return { text: 'MISSION COMPLETE (100%)', width: '100%', color: '#34D399' };
      case 'cancelled': 
        return { text: 'MISSION ABORTED', width: '0%', color: '#F87171' };
      default: 
        return { text: 'UNKNOWN STATUS', width: '0%', color: '#8d85b1' };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      {/* Top Header */}
      <View style={{
        backgroundColor: '#1A0D3A', padding: isSmallPhone ? 18 : 24, paddingTop: isSmallPhone ? 50 : 48,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: '#00FFED'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: isSmallPhone ? 48 : 52, height: isSmallPhone ? 48 : 52, borderRadius: 999,
            borderWidth: 4, borderColor: '#00FFED', backgroundColor: '#FF1493',
            alignItems: 'center', justifyContent: 'center', marginRight: isSmallPhone ? 12 : 16,
          }}>
            <Text style={{ fontSize: isSmallPhone ? 26 : 28 }}>🧑‍🚀</Text>
          </View>
          <View>
            {/* Hardcoded Hero Name as requested */}
            <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 17.5 : 19, fontWeight: '900', letterSpacing: 0.5 }}>
              Welcome, CAPTAIN_WASH!
            </Text>
            
            <Text style={{ color: '#00FFED', fontSize: 11, marginTop: 2, fontWeight: '700', letterSpacing: 0.5 }}>
              {userEmail}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#FF1493', fontSize: isSmallPhone ? 11.5 : 12.5, fontWeight: '700' }}>Lvl 12</Text>
              <View style={{ width: isSmallPhone ? 68 : 75, height: 5, backgroundColor: '#334155', borderRadius: 999, marginLeft: 10, overflow: 'hidden' }}>
                <View style={{ width: '48%', height: '100%', backgroundColor: '#FF1493' }} />
              </View>
              <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: isSmallPhone ? 10.5 : 11.5, marginLeft: 8 }}>
                1.2K / 2.5K XP
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('AlertComms')}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M12 22C13.1046 22 14 21.1046 14 20H10C10 21.1046 10.8954 22 12 22Z" fill="#00FFED" stroke="#00FFED" strokeWidth="2" strokeLinejoin="round"/>
            <Path d="M18 16V11C18 7.93297 16.3668 5.3644 13.5 4.68185V4C13.5 3.17157 12.8284 2.5 12 2.5C11.1716 2.5 10.5 3.17157 10.5 4V4.68185C7.6332 5.3644 6 7.93297 6 11V16L4 18H20L18 16Z" stroke="#00FFED" strokeWidth="2" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 16 : 24, paddingTop: 24, paddingBottom: 110 }}>
        
        <Text style={{ color: '#00FFED', fontSize: isSmallPhone ? 19 : 20, fontWeight: '900', letterSpacing: 1, marginBottom: 14 }}>
          Active Missions
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginVertical: 30 }} />
        ) : myMissions.length === 0 ? (
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: '#475569', borderStyle: 'dashed',
            borderRadius: 20, padding: 30, alignItems: 'center', marginBottom: 32
          }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
            <Text style={{ color: '#00FFED', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }}>
              NO ACTIVE MISSIONS
            </Text>
            <Text style={{ color: '#8d85b1', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
              Your quest log is empty, Captain! Deploy a new pickup to start earning XP and credits.
            </Text>
          </View>
        ) : (
          myMissions.map((mission) => {
            const safeMissionId = mission?.missionId ? String(mission.missionId) : '#---';
            const safeService = mission?.serviceType ? String(mission.serviceType) : 'Unknown Protocol';
            const safeTime = mission?.displayDateTime ? String(mission.displayDateTime) : 'Awaiting Time Data';
            const statusStyle = getStatusDisplay(mission?.status);

            return (
              <TouchableOpacity 
                key={mission.id}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 2,
                  borderColor: statusStyle.width === '0%' ? '#F87171' : 'rgba(0,255,237,0.3)',
                  borderRadius: 20,
                  padding: isSmallPhone ? 16 : 20,
                  marginBottom: 32
                }}
                onPress={() => navigation.navigate('MissionProgress', { 
                  bookingId: safeMissionId, 
                  service: safeService, 
                  address: mission?.address || 'Unknown Base'
                })}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 16 : 18, fontWeight: '900' }}>
                    Mission: {safeService}
                  </Text>
                  <Text style={{ 
                    backgroundColor: statusStyle.width === '0%' ? '#F87171' : '#FF1493', 
                    color: '#FFFFFF', fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999 
                  }}>
                    {safeMissionId}
                  </Text>
                </View>
                <Text style={{ color: '#FFFFFF', opacity: 0.75, marginBottom: 12 }}>
                  Time: {safeTime}
                </Text>
                
                <View style={{ height: 7, backgroundColor: '#334155', borderRadius: 999, overflow: 'hidden' }}>
                  <View style={{ width: statusStyle.width, height: '100%', backgroundColor: statusStyle.color }} />
                </View>
                <Text style={{ color: statusStyle.color, fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
                  {statusStyle.text}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={{ color: '#FF1493', fontSize: isSmallPhone ? 19 : 20, fontWeight: '900', letterSpacing: 1, marginBottom: 14 }}>
          Daily Quest
        </Text>

        <View style={{
          backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,20,147,0.3)',
          borderRadius: 20, padding: isSmallPhone ? 16 : 20, flexDirection: 'row', alignItems: 'center'
        }}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" style={{ marginRight: 18 }}>
            <Path d="M12 15C15.3137 15 18 12.3137 18 9V6C18 5.44772 17.5523 5 17 5H7C6.44772 5 6 5.44772 6 6V9C6 12.3137 8.68629 15 12 15Z" stroke="#FF1493" strokeWidth="2" strokeLinejoin="round"/>
            <Path d="M8 19H16" stroke="#FF1493" strokeWidth="2" strokeLinecap="round"/>
            <Path d="M12 15V19" stroke="#FF1493" strokeWidth="2" strokeLinecap="round"/>
            <Path d="M18 9H20C20.5523 9 21 8.55228 21 8V7C21 6.44772 20.5523 6 20 6H18" stroke="#FF1493" strokeWidth="2" strokeLinejoin="round"/>
            <Path d="M6 9H4C3.44772 9 3 8.55228 3 8V7C3 6.44772 3.44772 6 4 6H6" stroke="#FF1493" strokeWidth="2" strokeLinejoin="round"/>
          </Svg>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 16 : 17, fontWeight: '700' }}>
              Wash 5 full loads
            </Text>
            <Text style={{ color: '#FFFFFF', opacity: 0.65, fontSize: 14 }}>Rewards: Super Scent Bonus!</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={{
            marginTop: 36, backgroundColor: '#00FFED', paddingVertical: isSmallPhone ? 16 : 20,
            borderRadius: 999, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: '#00C2B4'
          }}
          onPress={() => navigation.navigate('PickupQuest')}
        >
          <Text style={{ color: '#1A0D3A', fontSize: isSmallPhone ? 18 : 20, fontWeight: '900', letterSpacing: 1 }}>
            NEW PICKUP QUEST
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={{
        position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: '#1A0D3A',
        borderWidth: 2, borderColor: 'rgba(0,255,237,0.6)', borderRadius: 999, padding: 10,
        flexDirection: 'row', justifyContent: 'space-around',
      }}>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => navigation.navigate('Dashboard')}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <Path d="M9 22V12H15V22" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
          <Text style={{ color: '#00FFED', fontSize: 10, fontWeight: '700', marginTop: 2 }}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('PickupQuest')}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M19 11H5M19 11C20.1046 11 21 11.8954 21 13V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V13C3 11.8954 3.89543 11 5 11M19 11V9C19 7.89543 18.1046 7 17 7H7C5.89543 7 5 7.89543 5 9V11" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>QUEST</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('CommandCenter')}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M13 2L3 14H11L10 22L20 10H12L13 2Z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>HQ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('HeroSpecs')}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <Circle cx="12" cy="7" r="4" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>SPECS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}