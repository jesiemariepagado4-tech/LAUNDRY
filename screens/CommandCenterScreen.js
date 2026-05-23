import React, { useState } from 'react'; // <-- Added useState
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- ADDED IMPORTS ---
import AsyncStorage from '@react-native-async-storage/async-storage';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import LogoutModal from '../components/LogoutModal';

export default function CommandCenterScreen({ navigation }) {
  // --- ADDED MODAL STATE ---
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const [pendingPickups, setPendingPickups] = useState([
    { id: '#882', name: 'ALEX J.', zone: 'Zone A', service: 'Wash & Fold' }
  ]);

  // --- LOGOUT LOGIC ---
  const handleConfirmLogout = async () => {
    try {
      setIsLogoutModalVisible(false);
      await signOut(auth);
      await AsyncStorage.removeItem('@user_session');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert("Logout Error", error.message);
    }
  };

  const handleUpdateStatus = (missionId) => {
    Alert.alert("Mission Update", `Updating status for mission ${missionId}...`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>COMMAND CENTER</Text>
          <Text style={{ fontSize: 24 }}>📊</Text> 
        </View>

        {/* --- STATS ROW --- */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>ACTIVE MSSNS</Text>
            <Text style={styles.statValueCyan}>24</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>CREDITS GAINED</Text>
            <Text style={styles.statValuePink}>$1.2K</Text>
          </View>
        </View>

        {/* --- PENDING PICKUPS --- */}
        <Text style={styles.sectionTitle}>PENDING PICKUPS</Text>
        {pendingPickups.map((mission, index) => (
          <View key={index} style={styles.missionCard}>
            <View style={styles.missionInfo}>
              <Text style={styles.missionIdName}>{mission.id} - {mission.name}</Text>
              <Text style={styles.missionDetails}>{mission.zone} • {mission.service}</Text>
            </View>
            <TouchableOpacity style={styles.updateButton} onPress={() => handleUpdateStatus(mission.id)}>
              <Text style={styles.updateButtonText}>UPDATE</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* --- LOGOUT BUTTON --- */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={() => setIsLogoutModalVisible(true)}
        >
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* --- MODAL --- */}
      <LogoutModal 
        visible={isLogoutModalVisible} 
        onCancel={() => setIsLogoutModalVisible(false)} 
        onConfirm={handleConfirmLogout} 
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 20 },
  headerTitle: { color: '#00FFED', fontSize: 28, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, gap: 16 },
  statCard: { flex: 1, backgroundColor: '#0A0A0A', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.3)', borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'center' },
  statLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 10 },
  statValueCyan: { color: '#00FFED', fontSize: 36, fontWeight: '900', fontFamily: 'monospace' },
  statValuePink: { color: '#FF1493', fontSize: 36, fontWeight: '900', fontFamily: 'monospace' },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginBottom: 16 },
  missionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111820', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.4)', borderRadius: 20, padding: 20, marginBottom: 16 },
  missionInfo: { flex: 1 },
  missionIdName: { color: '#00FFED', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 6, fontFamily: 'monospace' },
  missionDetails: { color: '#8d85b1', fontSize: 14 },
  updateButton: { backgroundColor: '#FF1493', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  updateButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  // --- ADDED LOGOUT BUTTON STYLE ---
  logoutButton: { marginTop: 30, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FF1493', borderRadius: 16 },
  logoutText: { color: '#FF1493', fontWeight: '900', letterSpacing: 1 }
});