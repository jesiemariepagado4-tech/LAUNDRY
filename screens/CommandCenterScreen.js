import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Modal, ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

// --- FIREBASE & STORAGE IMPORTS ---
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; 
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, auth } from '../config/firebase';

export default function CommandCenterScreen({ navigation }) {
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [bannedCount, setBannedCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
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

  // --- FETCH BANNED USERS COUNT ---
  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      let count = 0;
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.banned === true || userData.status === 'banned') {
          count++;
        }
      });
      setBannedCount(count);
    });

    return () => unsubscribeUsers();
  }, []);

  // --- FETCH CURRENTLY LOGGED-IN USERS ---
  useEffect(() => {
    const unsubscribeOnline = onSnapshot(collection(db, 'users'), (snapshot) => {
      const online = [];
      snapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        if (userData.isOnline === true) {
          online.push({
            id: docSnap.id,
            ...userData
          });
        }
      });
      setOnlineUsers(online);
    });

    return () => unsubscribeOnline();
  }, []);

  // --- BAN USER FUNCTION ---
  const banUser = async (userId, reason = "Violation") => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        banned: true,
        banReason: reason,
        bannedAt: new Date()
      });
      alert(`User ${userId} has been banned.`);
    } catch (error) {
      console.error("Ban Error:", error);
      alert("Failed to ban user.");
    }
  };

  // --- IMPROVED LOGOUT FUNCTION ---
  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const user = auth.currentUser;
      
      // Set user as offline in Firestore
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), { 
          isOnline: false 
        });
      }

      // Sign out from Firebase
      await signOut(auth);
      
      // Clear local session
      await AsyncStorage.removeItem('@user_session');

      // Reset navigation to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });

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
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M2 17L12 22L22 17" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M2 12L12 17L22 12" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>Active Ops</Text>
            <Text style={styles.cardDesc}>Manage & update ongoing missions</Text>
          </TouchableOpacity>

          {/* 2. Financials */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => navigation.navigate('AdminFinance')}
          >
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M17 21V19C17 17.8954 16.1046 17 15 17H9C7.89543 17 7 17.8954 7 19V21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M3 7H21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M3 11H21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M12 3V7" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M7 21H17" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>Financials</Text>
            <Text style={styles.cardDesc}>Process billing and verify payments</Text>
          </TouchableOpacity>

          {/* 3. User Management */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => navigation.navigate('UserManagement')}
          >
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4Z" stroke="#00FFED" strokeWidth="2"/>
              <Path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="#00FFED" strokeWidth="2"/>
              <Path d="M19 8L21 10L19 12" stroke="#FF1493" strokeWidth="2" strokeLinecap="round"/>
            </Svg>
            <Text style={styles.cardTitle}>User Management</Text>
            <Text style={styles.cardDesc}>Create, Read, Ban, Delete, Edit</Text>
          </TouchableOpacity>

          {/* 4. Archives */}
          <TouchableOpacity 
            style={styles.gridCard}
            onPress={() => navigation.navigate('AdminArchives')}
          >
            <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12 }}>
              <Path d="M4 6H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M4 10H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M4 14H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M4 18H20" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M14 3V21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <Path d="M10 3V21" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={styles.cardTitle}>Mission Archives</Text>
            <Text style={styles.cardDesc}>View historical data of completed and aborted deployments</Text>
          </TouchableOpacity>
        </View>

        {/* CURRENTLY LOGGED-IN USERS */}
        <Text style={styles.sectionTitle}>CURRENTLY ONLINE ({onlineUsers.length})</Text>
        <View style={styles.onlineContainer}>
          {onlineUsers.length > 0 ? (
            onlineUsers.map((user) => (
              <View key={user.id} style={styles.onlineUserCard}>
                <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>
                  {user.heroName || user.displayName || user.email || 'Anonymous User'}
                </Text>
                <Text style={{ color: '#8d85b1', fontSize: 12 }}>
                  ID: {user.id?.slice(0,8)}...
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#8d85b1', textAlign: 'center', padding: 20 }}>
              No users currently online
            </Text>
          )}
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

  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  gridCard: { 
    width: '48%', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderWidth: 1, 
    borderColor: '#475569', 
    borderRadius: 20, 
    padding: 16, 
    marginBottom: 16, 
    alignItems: 'center' 
  },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  cardDesc: { color: '#8d85b1', fontSize: 11, lineHeight: 16 },

  onlineContainer: {
    backgroundColor: '#111820',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 237, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
  },
  onlineUserCard: {
    backgroundColor: 'rgba(0, 255, 237, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },

  loadingOverlay: { flex: 1, backgroundColor: '#2D1A5B', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#00FFED', marginTop: 15, fontSize: 16, fontWeight: '700', letterSpacing: 1 }
});