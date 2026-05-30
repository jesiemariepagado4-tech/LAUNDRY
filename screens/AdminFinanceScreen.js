import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
  Alert, ActivityIndicator, Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

// --- FIREBASE IMPORTS ---
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function AdminFinanceScreen({ navigation }) {
  const [financeMissions, setFinanceMissions] = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // --- ADMIN MODAL STATE ---
  const [selectedMission, setSelectedMission] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // --- FETCH FINANCIAL MISSIONS ---
  useEffect(() => {
    const q = query(collection(db, 'missions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionsData = [];
      let revenueCalc = 0;

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        // Only care about missions that have a price set and aren't cancelled
        if (data.finalPrice && data.status !== 'cancelled') {
          missionsData.push({ id: docSnap.id, ...data });
          
          // Calculate total revenue from PAID missions
          if (data.paymentStatus === 'paid') {
            revenueCalc += Number(data.finalPrice);
          }
        }
      });
      
      // Sort: Unpaid first (needs attention), then by newest
      missionsData.sort((a, b) => {
        if (a.paymentStatus === 'paid' && b.paymentStatus !== 'paid') return 1;
        if (a.paymentStatus !== 'paid' && b.paymentStatus === 'paid') return -1;
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA; 
      });

      setFinanceMissions(missionsData);
      setTotalRevenue(revenueCalc);
      setIsLoading(false);
    }, (error) => {
      console.error("Finance Fetch Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- ADMIN ACTIONS ---
  const openPaymentModal = (mission) => {
    if (mission.paymentStatus === 'paid') {
      Alert.alert("Already Paid", "This mission's funds have already been secured.");
      return;
    }
    setSelectedMission(mission);
    setIsModalVisible(true);
  };

  const handleVerifyPayment = async () => {
    if (!selectedMission) return;
    setIsUpdating(true);

    try {
      // Mark as paid and push status to 'cleaning' to keep the workflow moving
      await updateDoc(doc(db, 'missions', selectedMission.id), {
        paymentStatus: 'paid',
        status: 'cleaning' 
      });
      
      Alert.alert("Funds Secured 💳", "Payment verified. Mission moved to Cleaning Ops.");
      setIsModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Update Failed", "Could not verify payment in database.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Ledger</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* REVENUE DASHBOARD */}
        <View style={styles.revenueBox}>
          <Text style={{ color: '#8d85b1', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 }}>SECURED REVENUE</Text>
          <Text style={{ color: '#00FFED', fontSize: 40, fontWeight: '900', marginVertical: 8 }}>₱{totalRevenue.toFixed(2)}</Text>
          <Text style={{ color: '#FFF', fontSize: 11, opacity: 0.7 }}>From all completed payments</Text>
        </View>

        <Text style={styles.sectionTitle}>PENDING & CLEARED BILLS</Text>

        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginTop: 50 }} />
        ) : financeMissions.length > 0 ? (
          financeMissions.map((mission) => {
            const isPaid = mission.paymentStatus === 'paid';
            
            return (
              <View key={mission.id} style={[styles.missionCard, { borderColor: isPaid ? 'rgba(0,255,136,0.3)' : 'rgba(255,20,147,0.4)' }]}>
                <View style={styles.missionInfo}>
                  <Text style={styles.missionIdName}>{mission.missionId || mission.id}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>₱{mission.finalPrice}</Text>
                    <Text style={[styles.statusBadge, { 
                      color: isPaid ? '#00FF88' : '#FF1493', 
                      backgroundColor: isPaid ? 'rgba(0,255,136,0.1)' : 'rgba(255,20,147,0.1)',
                      borderColor: isPaid ? '#00FF88' : '#FF1493'
                    }]}>
                      {isPaid ? 'PAID' : 'UNPAID'}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={[styles.updateButton, { backgroundColor: isPaid ? '#334155' : '#00FFED' }]} 
                  onPress={() => openPaymentModal(mission)}
                  disabled={isPaid}
                >
                  <Text style={[styles.updateButtonText, { color: isPaid ? '#8d85b1' : '#000' }]}>
                    {isPaid ? 'CLEARED' : 'VERIFY'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        ) : (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ fontSize: 50, marginBottom: 10 }}>🧾</Text>
            <Text style={{ color: '#00FFED', fontSize: 18, fontWeight: 'bold' }}>Ledger is empty.</Text>
            <Text style={{ color: '#8d85b1', marginTop: 5 }}>Set prices in Active Ops to see bills here.</Text>
          </View>
        )}
      </ScrollView>

      {/* --- PAYMENT VERIFICATION MODAL --- */}
      <Modal visible={isModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 15 }}>💳</Text>
            <Text style={styles.modalTitle}>VERIFY PAYMENT?</Text>
            
            {selectedMission && (
              <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 25, fontSize: 15, opacity: 0.9, lineHeight: 22 }}>
                Confirm receipt of <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>₱{selectedMission.finalPrice}</Text> for mission <Text style={{ fontWeight: 'bold' }}>{selectedMission.missionId}</Text>?{"\n\n"}This will lock the transaction and push the mission to Cleaning Ops.
              </Text>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleVerifyPayment} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>CONFIRM FUNDS</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  
  revenueBox: { backgroundColor: '#111820', borderWidth: 1, borderColor: '#00FFED', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 30 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1, marginBottom: 16 },

  missionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111820', borderWidth: 2, borderRadius: 20, padding: 20, marginBottom: 16 },
  missionInfo: { flex: 1, paddingRight: 15 },
  missionIdName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1, fontFamily: 'monospace' },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 10, fontWeight: '900', marginLeft: 10, letterSpacing: 0.5 },
  
  updateButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  updateButtonText: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#111820', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED' },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});