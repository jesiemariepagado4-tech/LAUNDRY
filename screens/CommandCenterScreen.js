import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { Svg, Path } from 'react-native-svg';

// --- FIREBASE IMPORTS ---
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function CommandCenterScreen({ navigation }) {
  const [pendingPickups, setPendingPickups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH REAL-TIME MISSIONS ---
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'missions'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionsData = [];
      snapshot.forEach((doc) => {
        missionsData.push({ id: doc.id, ...doc.data() });
      });
      // Filter for active missions only
      setPendingPickups(missionsData.filter(m => !m.userCleared && m.status !== 'cancelled'));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- MOVING GRAPH STATE ---
  const [dataPoints, setDataPoints] = useState([2, 5, 3, 8, 4, 10, 7]);
  useEffect(() => {
    const interval = setInterval(() => {
      setDataPoints(prev => [...prev.slice(0, 6), Math.floor(Math.random() * 10) + 1]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const screenWidth = Dimensions.get("window").width - 48;
  const chartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ data: dataPoints }]
  };

  // --- UPDATED NAVIGATION LOGIC ---
  const handleUpdateStatus = (mission) => {
    navigation.navigate('MissionProgress', { 
      bookingId: mission.missionId || mission.id, 
      service: mission.serviceType || 'Standard', 
      address: mission.address || 'Unknown Base'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hero Status Hub</Text>
          {/* Replaced 📊 with SVG */}
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M18 20V10M12 20V4M6 20V14" stroke="#00FFED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </View>

        <Text style={styles.sectionTitle}>WEEKLY PICKUPS</Text>
        <LineChart
          data={chartData}
          width={screenWidth}
          height={220}
          chartConfig={{
            backgroundColor: "#000000",
            backgroundGradientFrom: "#0A0A0A",
            backgroundGradientTo: "#0A0A0A",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 255, 237, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: { r: "6", strokeWidth: "2", stroke: "#FF1493" }
          }}
          bezier
          style={styles.chartStyle}
        />

        <Text style={styles.sectionTitle}>PENDING PICKUPS</Text>
        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginTop: 20 }} />
        ) : pendingPickups.length > 0 ? (
          pendingPickups.map((mission) => (
            <TouchableOpacity 
              key={mission.id} 
              style={styles.missionCard}
              onPress={() => handleUpdateStatus(mission)}
            >
              <View style={styles.missionInfo}>
                <Text style={styles.missionIdName}>{mission.missionId || mission.id} - {mission.name || 'AGENT'}</Text>
                <Text style={styles.missionDetails}>{mission.zone || 'Zone Unknown'} • {mission.serviceType || 'Standard'}</Text>
              </View>
              <View style={styles.updateButton}>
                <Text style={styles.updateButtonText}>VIEW</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ color: '#8d85b1', textAlign: 'center', marginTop: 20 }}>No pending missions.</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 20 },
  backButton: { marginRight: 10 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, flex: 1 },
  sectionTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginBottom: 16 },
  chartStyle: { marginVertical: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 255, 237, 0.2)' },
  missionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111820', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.4)', borderRadius: 20, padding: 20, marginBottom: 16 },
  missionInfo: { flex: 1 },
  missionIdName: { color: '#00FFED', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 6, fontFamily: 'monospace' },
  missionDetails: { color: '#8d85b1', fontSize: 14 },
  updateButton: { backgroundColor: '#FF1493', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  updateButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});