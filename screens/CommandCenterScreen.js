import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Modal, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../config/firebase';

export default function CommandCenterScreen({ navigation }) {
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, revenue: 0 });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'missions'), (snapshot) => {
      let total = 0;
      let active = 0;
      let completed = 0;
      let revenue = 0;

      snapshot.forEach((doc) => {
        total++;
        const data = doc.data();
        const status = data.status || '';

        if (status === 'completed' || status === 'delivered' || status === 'archived') {
          completed++;
        }
        else if (['pending_pickup', 'in_progress', 'ready_for_delivery'].includes(status)) {
          active++;
        }

        if (data.paymentStatus === 'paid' && data.finalPrice) {
          revenue += Number(data.finalPrice);
        }
      });

      setStats({ total, active, completed, revenue });
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid), { isOnline: false }, { merge: true });
      }
      await signOut(auth);
      await AsyncStorage.removeItem('@user_session');
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (error) {
      console.error("Logout Error:", error);
      alert("Logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <Modal visible={isLoggingOut} transparent={true} animationType="fade">
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00FFED" />
          <Text style={styles.loadingText}>Terminating Session...</Text>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {/* BACK BUTTON HAS BEEN REMOVED FROM HERE */}
            <Text style={styles.headerTitle}>HQ Command Center</Text>
          </View>
          
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="#FF1493" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M16 17L21 12L16 7" stroke="#FF1493" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M21 12H9" stroke="#FF1493" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
        </View>

        {/* ANALYTICS OVERVIEW */}
        <Text style={styles.sectionTitle}>SYSTEM OVERVIEW</Text>
        <View style={styles.analyticsBox}>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.active}</Text>
              <Text style={styles.statLabel}>ACTIVE</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FF1493' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>CLEARED</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#FFF' }]}>{stats.total}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
          </View>

          <View style={styles.revenueRow}>
            <Text style={styles.statLabel}>LIFETIME REVENUE</Text>
            <Text style={styles.revenueNumber}>₱{stats.revenue.toFixed(2)}</Text>
          </View>

        </View>

        {/* NAVIGATION GRID */}
        <Text style={styles.sectionTitle}>ADMIN DIRECTIVES</Text>
        <View style={styles.gridContainer}>
          <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate('AdminActiveMissions')}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M2 17L12 22L22 17" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M2 12L12 17L22 12" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>Active Ops</Text>
            <Text style={styles.cardDesc}>Manage ongoing missions</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate('AdminFinance')}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M17 21V19C17 17.8954 16.1046 17 15 17H9C7.89543 17 7 17.8954 7 19V21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M3 7H21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M3 11H21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M12 3V7" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M7 21H17" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>Financials</Text>
            <Text style={styles.cardDesc}>Process billing & payments</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate('UserManagement')}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4Z" stroke="#00FFED" strokeWidth="2"/>
              <Path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="#00FFED" strokeWidth="2"/>
              <Path d="M19 8L21 10L19 12" stroke="#FF1493" strokeWidth="2" strokeLinecap="round"/>
            </Svg>
            <Text style={styles.cardTitle}>User Management</Text>
            <Text style={styles.cardDesc}>Create, Ban, Delete, Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate('AdminArchives')}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M4 6H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M4 10H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M4 14H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M4 18H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M14 3V21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M10 3V21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>Mission Archives</Text>
            <Text style={styles.cardDesc}>Historical completed data</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate('AdminServices')}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M9 3H15V7H9V3Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M9 14H15" stroke="#FF1493" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M9 17H15" stroke="#FF1493" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M9 11H15" stroke="#FF1493" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>Service Config</Text>
            <Text style={styles.cardDesc}>Add & adjust pricing</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.gridCard} onPress={() => navigation.navigate('AdminComms')}>
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M15.54 8.46C16.4774 9.39764 17.004 10.6692 17.004 11.995C17.004 13.3208 16.4774 14.5924 15.54 15.53" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M19.07 4.93005C20.9447 6.80528 21.9979 9.34836 21.9979 12C21.9979 14.6517 20.9447 17.1948 19.07 19.07" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>HQ Comms</Text>
            <Text style={styles.cardDesc}>Broadcast alerts to users</Text>
          </TouchableOpacity>
          
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 20 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  logoutButton: { backgroundColor: 'rgba(255,20,147,0.1)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,20,147,0.3)' },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginBottom: 16 },
  
  analyticsBox: { backgroundColor: '#111820', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.3)', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 30 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 15 },
  statItem: { alignItems: 'center' },
  statNumber: { color: '#00FFED', fontSize: 28, fontWeight: '900' },
  statLabel: { color: '#8d85b1', fontSize: 11, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
  
  revenueRow: { width: '100%', marginTop: 15, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  revenueNumber: { color: '#00FFED', fontSize: 32, fontWeight: '900', marginTop: 8 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#475569', borderRadius: 20, padding: 16, marginBottom: 16, alignItems: 'center' },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { color: '#8d85b1', fontSize: 11, lineHeight: 16, textAlign: 'center' },

  loadingOverlay: { flex: 1, backgroundColor: '#2D1A5B', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00FFED', marginTop: 15, fontSize: 16, fontWeight: '700', letterSpacing: 1 }
});