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
  
  // --- NEW: TAB FILTERING STATE ---
  const [activeTab, setActiveTab] = useState('All');

  // --- ADMIN MODAL STATE ---
  const [selectedMission, setSelectedMission] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPrice, setEditPrice] = useState(''); // Admin types BASE price here
  const [editWeight, setEditWeight] = useState(''); 
  const [isUpdating, setIsUpdating] = useState(false);

  // --- FETCH ONLY ACTIVE MISSIONS ---
  useEffect(() => {
    const q = query(collection(db, 'missions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionsData = [];
      snapshot.forEach((docSnap) => {
        missionsData.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Filter out delivered and cancelled missions
      const filteredMissions = missionsData
        .filter(m => m.status !== 'delivered' && m.status !== 'completed' && m.status !== 'cancelled')
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA; 
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
    // Load base price if it exists, otherwise leave blank
    setEditPrice(mission.basePrice ? String(mission.basePrice) : '');
    setEditWeight(mission.weight ? String(mission.weight) : '');
    setIsModalVisible(true);
  };

  // --- REWARDS MATH INTEGRATION ---
  const handleAdminUpdate = async () => {
    if (!selectedMission) return;
    setIsUpdating(true);

    let base = editPrice ? parseFloat(editPrice) : null;
    let finalCalculated = base;

    // If the mission has an applied discount ticket from the user, auto-calculate it!
    if (base && selectedMission.appliedDiscount) {
      const discountAmount = base * (selectedMission.appliedDiscount / 100);
      finalCalculated = base - discountAmount;
    }

    try {
      await updateDoc(doc(db, 'missions', selectedMission.id), {
        status: editStatus,
        basePrice: base,                  // What the admin typed
        finalPrice: finalCalculated,      // What the user actually pays
        weight: editWeight ? parseFloat(editWeight) : null
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

  // --- TAB & WORKFLOW OPTIONS ---
  const FILTER_TABS = [
    { id: 'All', label: 'ALL OPS' },
    { id: 'pending_pickup', label: 'PENDING' },
    { id: 'weigh_in', label: 'WEIGH-IN' },
    { id: 'washing', label: 'WASHING' },
    { id: 'ready_for_delivery', label: 'READY' },
    { id: 'otw', label: 'ON THE WAY' }
  ];

  const STATUS_OPTIONS = [
    { id: 'pending_pickup', label: '1. Pending Pickup' },
    { id: 'weigh_in', label: '2. HQ Weigh-In & Bill' },
    { id: 'washing', label: '3. Washing Ops' },
    { id: 'ready_for_delivery', label: '4. Folded & Ready' },
    { id: 'otw', label: '5. On The Way (OTW)' },
    { id: 'delivered', label: '6. Delivered (Archives)' }
  ];

  // Apply the selected tab filter
  const displayedMissions = activeMissions.filter(m => {
    if (activeTab === 'All') return true;
    if (activeTab === 'pending_pickup') return m.status === 'pending_pickup' || m.status === 'pending';
    return m.status === activeTab;
  });

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

      {/* --- SCROLLABLE FILTER TABS --- */}
      <View style={{ paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {FILTER_TABS.map((tab) => (
            <TouchableOpacity 
              key={tab.id}
              style={[
                styles.tabButton, 
                activeTab === tab.id && styles.tabButtonActive
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && { color: '#00FFED' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginTop: 50 }} />
        ) : displayedMissions.length > 0 ? (
          displayedMissions.map((mission) => (
            <View key={mission.id} style={styles.missionCard}>
              <View style={styles.missionInfo}>
                <Text style={styles.missionIdName}>{mission.missionId || mission.id}</Text>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4, fontSize: 16, marginRight: 8 }}>
                    {mission.serviceType || 'Standard'}
                  </Text>
                  {/* Shows Admin if a discount is attached */}
                  {mission.appliedDiscount && (
                    <Text style={{ backgroundColor: '#FF1493', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 4 }}>
                      -{mission.appliedDiscount}% REWARD
                    </Text>
                  )}
                </View>

                <Text style={styles.missionDetails} numberOfLines={2}>📍 {mission.address || 'Zone Unknown'}</Text>
                
                {/* --- ADDED: USER SPECIAL INSTRUCTIONS / NOTES --- */}
                {mission.notes ? (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>SPECIAL INSTRUCTIONS:</Text>
                    <Text style={styles.notesText}>{mission.notes}</Text>
                  </View>
                ) : null}
                
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10, flexWrap: 'wrap' }}>
                  <Text style={[styles.statusBadge, { color: mission.status === 'weigh_in' ? '#FF1493' : '#00FFED', borderColor: mission.status === 'weigh_in' ? 'rgba(255,20,147,0.4)' : 'rgba(0,255,237,0.4)' }]}>
                    {String(mission.status || 'pending').replace(/_/g, ' ').toUpperCase()}
                  </Text>
                  
                  {mission.weight && (
                     <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, opacity: 0.8 }}>⚖️ {mission.weight}kg</Text>
                  )}
                  {mission.finalPrice && (
                    <Text style={{ color: '#00FF88', fontWeight: 'bold', fontSize: 12 }}>₱{mission.finalPrice}</Text>
                  )}
                  {mission.paymentMethod && (
                    <Text style={{ color: '#FFD700', fontWeight: 'bold', fontSize: 12 }}>({mission.paymentMethod.toUpperCase()})</Text>
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
            <Text style={{ fontSize: 50, marginBottom: 10 }}>📭</Text>
            <Text style={{ color: '#00FFED', fontSize: 18, fontWeight: 'bold' }}>No operations found.</Text>
            <Text style={{ color: '#8d85b1', marginTop: 5 }}>There are no missions in this category.</Text>
          </View>
        )}
      </ScrollView>

      {/* --- ADMIN CRUD MODAL --- */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>⚡ MISSION OVERRIDE</Text>

            {/* NEW: NOTIFY ADMIN OF DISCOUNT */}
            {selectedMission?.appliedDiscount && (
              <View style={{ backgroundColor: 'rgba(255,20,147,0.1)', padding: 12, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#FF1493' }}>
                <Text style={{ color: '#FF1493', fontWeight: 'bold', textAlign: 'center', fontSize: 12, letterSpacing: 0.5 }}>
                  🎟️ AGENT HAS A {selectedMission.appliedDiscount}% DISCOUNT TICKET
                </Text>
                <Text style={{ color: '#fff', opacity: 0.7, textAlign: 'center', fontSize: 11, marginTop: 4 }}>
                  Enter the normal base price below. The system will auto-calculate the final discounted bill.
                </Text>
              </View>
            )}
            
            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 20 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>WEIGHT (KG)</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={editWeight} 
                  onChangeText={setEditWeight} 
                  placeholder="e.g. 5.2"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>BASE PRICE (₱)</Text>
                <TextInput 
                  style={styles.textInput} 
                  value={editPrice} 
                  onChangeText={setEditPrice} 
                  placeholder="e.g. 450"
                  placeholderTextColor="#475569"
                  keyboardType="numeric"
                />
              </View>
            </View>

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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 15 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic', letterSpacing: 1 },
  
  // Tab Styles
  tabButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#475569', backgroundColor: 'rgba(255,255,255,0.05)' },
  tabButtonActive: { borderColor: '#00FFED', backgroundColor: 'rgba(0,255,237,0.1)' },
  tabText: { color: '#8d85b1', fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  
  missionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111820', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.4)', borderRadius: 20, padding: 20, marginBottom: 16 },
  missionInfo: { flex: 1, paddingRight: 15 },
  missionIdName: { color: '#FF1493', fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 6, fontFamily: 'monospace' },
  missionDetails: { color: '#8d85b1', fontSize: 13, lineHeight: 18 },
  
  // --- ADDED: Notes Styles ---
  notesContainer: { marginTop: 8, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#FFD700' },
  notesLabel: { color: '#FFD700', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  notesText: { color: '#FFFFFF', fontSize: 12, opacity: 0.9, lineHeight: 18 },

  statusBadge: { borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 10, fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.05)' },
  
  updateButton: { backgroundColor: '#FF1493', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  updateButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111820', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 2, borderColor: '#00FFED', borderBottomWidth: 0 },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20 },
  inputLabel: { color: '#FF1493', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusBtn: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#475569', backgroundColor: 'rgba(255,255,255,0.03)' },
  statusBtnActive: { borderColor: '#00FFED', backgroundColor: 'rgba(0,255,237,0.1)' },
  statusBtnText: { color: '#8d85b1', fontWeight: 'bold', fontSize: 14 },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});