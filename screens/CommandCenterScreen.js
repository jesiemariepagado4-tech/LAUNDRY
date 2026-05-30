import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Modal, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

// --- FIREBASE & STORAGE IMPORTS ---
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../config/firebase';

export default function CommandCenterScreen({ navigation }) {
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // --- FETCH GLOBAL STATS ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'missions'), (snapshot) => {
      let total = 0;
      let active = 0;
      let completed = 0;

      snapshot.forEach((doc) => {
        total++;
        const data = doc.data();
        if (data.status === 'completed') completed++;
        else if (data.status !== 'cancelled') active++;
      });

      setStats({ total, active, completed });
    });

    return () => unsubscribe();
  }, []);

  // --- LOGOUT FUNCTION ---
  const handleLogout = async () => {
    setIsLoggingOut(true); 

    setTimeout(async () => {
      try {
        await signOut(auth);
        await AsyncStorage.removeItem('@user_session');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (error) {
        console.error("Logout Error:", error);
        setIsLoggingOut(false);
      }
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* --- LOGOUT LOADING MODAL --- */}
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
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>HQ Command Center</Text>
          </View>
          
          {/* LOGOUT BUTTON */}
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
          <Text style={{ fontSize: 40, marginBottom: 10 }}>📊</Text>
          <Text style={{ color: '#00FFED', fontWeight: 'bold', fontSize: 16 }}>ANALYTICS MODULE OFFLINE</Text>
          <Text style={{ color: '#8d85b1', fontSize: 12, marginTop: 4 }}>Awaiting deployment of visual graphs.</Text>
          
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
        </View>

        {/* NAVIGATION GRID */}
        <Text style={styles.sectionTitle}>ADMIN DIRECTIVES</Text>
        
        <View style={styles.gridContainer}>
          {/* 1. Active Operations */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => navigation.navigate('AdminActiveMissions')}
          >
            <Text style={styles.cardIcon}>🚀</Text>
            <Text style={styles.cardTitle}>Active Ops</Text>
            <Text style={styles.cardDesc}>Manage & update ongoing missions</Text>
          </TouchableOpacity>

          {/* 2. Financials */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => navigation.navigate('AdminFinance')}
          >
            <Text style={styles.cardIcon}>💳</Text>
            <Text style={styles.cardTitle}>Financials</Text>
            <Text style={styles.cardDesc}>Process billing and verify payments</Text>
          </TouchableOpacity>

          {/* 3. Archives */}
          <TouchableOpacity 
            style={[styles.gridCard, { width: '100%' }]} 
            onPress={() => navigation.navigate('AdminArchives')}
          >
            <Text style={styles.cardIcon}>🗄️</Text>
            <Text style={styles.cardTitle}>Mission Archives</Text>
            <Text style={styles.cardDesc}>View historical data of completed and aborted deployments</Text>
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
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  logoutButton: { backgroundColor: 'rgba(255,20,147,0.1)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,20,147,0.3)' },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginBottom: 16 },
  
  analyticsBox: { backgroundColor: '#111820', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.3)', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 30 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  statItem: { alignItems: 'center' },
  statNumber: { color: '#00FFED', fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#8d85b1', fontSize: 11, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#475569', borderRadius: 20, padding: 16, marginBottom: 16 },
  cardIcon: { fontSize: 32, marginBottom: 12 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { color: '#8d85b1', fontSize: 11, lineHeight: 16 },

  loadingOverlay: { flex: 1, backgroundColor: '#2D1A5B', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00FFED', marginTop: 15, fontSize: 16, fontWeight: '700', letterSpacing: 1 }
});