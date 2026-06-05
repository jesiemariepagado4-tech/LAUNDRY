import React, { useState, useEffect } from 'react';
import { 
  View, Text, SafeAreaView, TouchableOpacity, ScrollView, 
  ActivityIndicator, StyleSheet, Platform, StatusBar // ADDED: Platform and StatusBar
} from 'react-native';
import { Svg, Path } from 'react-native-svg';

// --- FIREBASE IMPORTS ---
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function MissionHistoryScreen({ navigation }) {
  const [historyMissions, setHistoryMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('delivered'); // 'delivered' or 'cancelled'

  // --- FETCH USER'S MISSION HISTORY ---
  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoading(false);
      return;
    }

    // Query all missions for this user
    const q = query(
      collection(db, 'missions'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionsData = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only keep missions that are completely finished or aborted
        if (data.status === 'delivered' || data.status === 'completed' || data.status === 'cancelled') {
          missionsData.push({ id: docSnap.id, ...data });
        }
      });
      
      // Indestructible sort: newest first
      missionsData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      setHistoryMissions(missionsData);
      setIsLoading(false);
    }, (error) => {
      console.error("History Fetch Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter the list based on the active tab
  const displayedMissions = historyMissions.filter(mission => {
    if (activeTab === 'delivered') {
      return mission.status === 'delivered' || mission.status === 'completed';
    }
    return mission.status === 'cancelled';
  });

  return (
    <SafeAreaView style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission History</Text>
      </View>

      {/* --- TAB NAVIGATION --- */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'delivered' && styles.tabButtonActiveDelivered]}
          onPress={() => setActiveTab('delivered')}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && { color: '#00FFED' }]}>
            DELIVERED
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'cancelled' && styles.tabButtonActiveCancelled]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text style={[styles.tabText, activeTab === 'cancelled' && { color: '#F87171' }]}>
            ABORTED
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginTop: 50 }} />
        ) : displayedMissions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 50, marginBottom: 15 }}>
              {activeTab === 'delivered' ? '📦' : '🗑️'}
            </Text>
            <Text style={styles.emptyTitle}>NO MISSIONS FOUND</Text>
            <Text style={styles.emptySub}>
              {activeTab === 'delivered' 
                ? "You haven't completed any laundry missions yet." 
                : "You have zero cancelled missions. Great job!"}
            </Text>
          </View>
        ) : (
          displayedMissions.map((mission) => {
            const isCancelled = mission.status === 'cancelled';
            const displayId = mission.missionId || `#${mission.id.substring(0,4)}`;
            
            return (
              <View key={mission.id} style={[
                styles.missionCard, 
                { borderColor: isCancelled ? 'rgba(248,113,113,0.3)' : 'rgba(0,255,237,0.3)' }
              ]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.missionId, { color: isCancelled ? '#F87171' : '#FF1493' }]}>
                      {displayId}
                    </Text>
                    <Text style={styles.missionService} numberOfLines={1}>
                      {mission.serviceType || 'Standard Mission'}
                    </Text>
                  </View>
                  
                  <Text style={styles.missionDate}>
                    {mission.displayDateTime || 'Unknown Date'}
                  </Text>
                  
                  {/* Price Tag (Only for Delivered) */}
                  {!isCancelled && mission.finalPrice && (
                    <Text style={styles.missionPrice}>Final Cost: ₱{mission.finalPrice}</Text>
                  )}
                </View>

                <View style={[styles.statusBadge, { backgroundColor: isCancelled ? 'rgba(248,113,113,0.1)' : 'rgba(0,255,237,0.1)' }]}>
                  <Text style={[styles.statusText, { color: isCancelled ? '#F87171' : '#00FFED' }]}>
                    {isCancelled ? 'ABORTED' : 'CLEARED'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D1A5B' },
  
  // ADDED: dynamic marginTop for Android status bar clearance
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingBottom: 20,
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 20 
  },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 20, gap: 10 },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#475569', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 8 },
  tabButtonActiveDelivered: { borderBottomColor: '#00FFED', backgroundColor: 'rgba(0,255,237,0.05)' },
  tabButtonActiveCancelled: { borderBottomColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.05)' },
  tabText: { color: '#8d85b1', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
  
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  
  missionCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderRadius: 20, padding: 20, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  missionId: { fontSize: 14, fontWeight: '900', marginRight: 10, letterSpacing: 1 },
  missionService: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', flex: 1 },
  missionDate: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 },
  missionPrice: { color: '#00FF88', fontWeight: 'bold', fontSize: 12, marginTop: 6 },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontWeight: '900', fontSize: 11, letterSpacing: 1 },

  emptyState: { alignItems: 'center', marginTop: 60, padding: 30, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, borderWidth: 1, borderColor: '#475569', borderStyle: 'dashed' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  emptySub: { color: '#8d85b1', textAlign: 'center', fontSize: 13, lineHeight: 20 }
});