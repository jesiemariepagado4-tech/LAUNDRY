import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
  Alert, ActivityIndicator, Modal, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

// --- FIREBASE IMPORTS ---
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function AdminActiveMissionsScreen({ navigation }) {
  const [activeMissions, setActiveMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ADMIN MODAL STATE ---
  const [selectedMission, setSelectedMission] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // --- FETCH ONLY ACTIVE MISSIONS ---
  useEffect(() => {
    const q = query(collection(db, 'missions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionsData = [];
      snapshot.forEach((docSnap) => {
        missionsData.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Filter out completed and cancelled missions, then sort
      const filteredMissions = missionsData
        .filter(m => m.status !== 'completed' && m.status !== 'cancelled')
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA; // Oldest first (needs most attention)
        });

      setActiveMissions(filteredMissions);
      setIsLoading(false);
    }, (error) => {
      console.error("Admin Fetch Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- ADMIN ACTIONS ---
  const openAdminModal = (mission) => {
    setSelectedMission(mission);
    setEditStatus(mission.status || 'pending_pickup');
    setEditPrice(mission.finalPrice ? String(mission.finalPrice) : '');
    setIsModalVisible(true);
  };

  const handleAdminUpdate = async () => {
    if (!selectedMission) return;
    setIsUpdating(true);

    try {
      await updateDoc(doc(db, 'missions', selectedMission.id), {
        status: editStatus,
        finalPrice: editPrice ? parseFloat(editPrice) : null
      });
      
      Alert.alert("Override Successful", "Mission workflow updated.");
      setIsModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert("Override Failed", "Could not patch database.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Status mapping for UI clarity
  const STATUS_OPTIONS = [
    { id: 'pending_pickup', label: '1. Pending Pickup' },
    { id: 'weigh_in', label: '2. Weigh-In' },
    { id: 'awaiting_payment', label: '3. Awaiting Payment' },
    { id: 'cleaning', label: '4. Cleaning Ops' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Operations</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginTop: 50 }} />
        ) : activeMissions.length > 0 ? (
          activeMissions.map((mission) => (
            <View key={mission.id} style={styles.missionCard}>
              <View style={styles.missionInfo}>
                <Text style={styles.missionIdName}>{mission.missionId || mission.id}</Text>
                <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4, fontSize: 16 }}>
                  {mission.serviceType || 'Standard'}
                </Text>
                <Text style={styles.missionDetails} numberOfLines={2}>📍 {mission.address || 'Zone Unknown'}</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
                  <Text style={[styles.statusBadge, { color: mission.status === 'awaiting_payment' ? '#FF1493' : '#00FFED', borderColor: mission.status === 'awaiting_payment' ? 'rgba(255,20,147,0.4)' : 'rgba(0,255,237,0.4)' }]}>
                    {String(mission.status || 'pending').replace('_', ' ').toUpperCase()}
                  </Text>
                  {mission.finalPrice && (
                    <Text style={{ color: '#00FF88', fontWeight: 'bold', fontSize: 13 }}>
                      ₱{mission.finalPrice}
                    </Text>
                  )}
                </View>
              </View>
              
              <TouchableOpacity style={styles.updateButton} onPress={() => openAdminModal(mission)}>
                <Text style={styles.updateButtonText}>UPDATE</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ fontSize: 50, marginBottom: 10 }}>🧘</Text>
            <Text style={{ color: '#00FFED', fontSize: 18, fontWeight: 'bold' }}>All clear, Captain.</Text>
            <Text style={{ color: '#8d85b1', marginTop: 5 }}>No active missions requiring attention.</Text>
          </View>
        )}
      </ScrollView>

      {/* --- ADMIN CRUD MODAL --- */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>⚡ MISSION OVERRIDE</Text>
            
            {selectedMission && (
              <View style={{ marginBottom: 20, padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: '#475569' }}>
                <Text style={{ color: '#00FFED', fontWeight: 'bold', marginBottom: 4 }}>{selectedMission.missionId}</Text>
                <Text style={{ color: '#fff', fontSize: 13, marginBottom: 4 }}>User: {selectedMission.userEmail || 'Unknown'}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>SET BILLING PRICE (PHP)</Text>
            <TextInput 
              style={styles.textInput} 
              value={editPrice} 
              onChangeText={setEditPrice} 
              placeholder="e.g. 450.00"
              placeholderTextColor="#475569"
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>UPDATE WORKFLOW STATUS</Text>
            <View style={{ gap: 8, marginBottom: 24 }}>
              {STATUS_OPTIONS.map((opt) => (
                <TouchableOpacity 
                  key={opt.id}
                  style={[
                    styles.statusBtn, 
                    editStatus === opt.id && styles.statusBtnActive
                  ]}
                  onPress={() => setEditStatus(opt.id)}
                >
                  <Text style={[
                    styles.statusBtnText, 
                    editStatus === opt.id && { color: '#00FFED' }
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelBtnText}>DISCARD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdminUpdate} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>COMMIT CHANGES</Text>}
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
  
  missionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111820', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.4)', borderRadius: 20, padding: 20, marginBottom: 16 },
  missionInfo: { flex: 1, paddingRight: 15 },
  missionIdName: { color: '#FF1493', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 6, fontFamily: 'monospace' },
  missionDetails: { color: '#8d85b1', fontSize: 13, lineHeight: 18 },
  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.05)' },
  
  updateButton: { backgroundColor: '#FF1493', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  updateButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111820', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 2, borderColor: '#00FFED', borderBottomWidth: 0 },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20 },
  inputLabel: { color: '#FF1493', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, marginBottom: 20, fontWeight: 'bold' },
  statusBtn: { padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#475569', backgroundColor: 'rgba(255,255,255,0.03)' },
  statusBtnActive: { borderColor: '#00FFED', backgroundColor: 'rgba(0,255,237,0.1)' },
  statusBtnText: { color: '#8d85b1', fontWeight: 'bold', fontSize: 14 },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});