import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar,
  Alert, ActivityIndicator, Modal, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function AdminServicesScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Tab State: 'active', 'inactive', 'archived'
  const [activeTab, setActiveTab] = useState('active');

  // Edit/Create Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  // Form State
  const [icon, setIcon] = useState('');
  const [label, setLabel] = useState('');
  const [priceText, setPriceText] = useState('');
  const [desc, setDesc] = useState('');

  // Deactivate Modal State
  const [isDeactivateModalVisible, setIsDeactivateModalVisible] = useState(false);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [targetService, setTargetService] = useState(null);

  // --- NEW: Custom Action Modal State (Replaces ugly native alerts) ---
  const [actionModal, setActionModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'default', // 'archive' | 'delete'
    onConfirm: null
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'services'), 
      (snapshot) => {
        const servicesData = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          servicesData.push({ id: docSnap.id, status: 'active', ...data });
        });
        
        servicesData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeA - timeB; 
        });

        setServices(servicesData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching services:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const displayedServices = services.filter(svc => svc.status === activeTab);

  const openModal = (service = null) => {
    if (service) {
      setEditingId(service.id);
      setIcon(service.icon || '👕');
      setLabel(service.label || '');
      setPriceText(service.priceText || '');
      setDesc(service.desc || '');
    } else {
      setEditingId(null);
      setIcon('👕');
      setLabel('');
      setPriceText('');
      setDesc('');
    }
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    if (!label.trim() || !priceText.trim()) {
      Alert.alert("Error", "Service Name and Price Text are required.");
      return;
    }

    setIsUpdating(true);
    const serviceData = { icon: icon || '👕', label, priceText, desc };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), serviceData);
      } else {
        await addDoc(collection(db, 'services'), {
          ...serviceData,
          status: 'active', 
          inactiveReason: null,
          createdAt: serverTimestamp()
        });
      }
      setIsModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to save service.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await updateDoc(doc(db, 'services', id), { status: 'active', inactiveReason: null });
    } catch (error) {
      Alert.alert("Error", "Could not activate service.");
    }
  };

  const executeDeactivate = async () => {
    if (!deactivateReason.trim()) {
      Alert.alert("Error", "Please provide a reason for the users.");
      return;
    }
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'services', targetService.id), { 
        status: 'inactive', 
        inactiveReason: deactivateReason 
      });
      setIsDeactivateModalVisible(false);
      setDeactivateReason('');
      setTargetService(null);
    } catch (error) {
      Alert.alert("Error", "Could not deactivate service.");
    } finally {
      setIsUpdating(false);
    }
  };

  // --- UPDATED: Triggers Custom Modal instead of Native Alert ---
  const handleArchive = (id) => {
    setActionModal({
      visible: true,
      title: '📦 ARCHIVE SERVICE',
      message: 'This will hide the service from users completely. You can restore it later from the Archived tab.',
      type: 'archive',
      onConfirm: async () => {
        setIsUpdating(true);
        try {
          await updateDoc(doc(db, 'services', id), { status: 'archived' });
        } catch (error) {
          Alert.alert("Error", "Failed to archive the service.");
        } finally {
          setIsUpdating(false);
          setActionModal({ ...actionModal, visible: false });
        }
      }
    });
  };

  // --- UPDATED: Triggers Custom Modal instead of Native Alert ---
  const handlePermanentDelete = (id) => {
    setActionModal({
      visible: true,
      title: '⚠️ PERMANENT DELETE',
      message: 'Are you absolutely sure? This will erase the service forever and cannot be undone.',
      type: 'delete',
      onConfirm: async () => {
        setIsUpdating(true);
        try {
          await deleteDoc(doc(db, 'services', id));
        } catch (error) {
          Alert.alert("Error", "Failed to delete the service.");
        } finally {
          setIsUpdating(false);
          setActionModal({ ...actionModal, visible: false });
        }
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Config</Text>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 }}>
        <TouchableOpacity style={styles.addButton} onPress={() => openModal(null)}>
          <Text style={styles.addButtonText}>+ CREATE NEW LAUNDRY SERVICE</Text>
        </TouchableOpacity>
      </View>

      {/* TABS */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.activeTabBtn]} onPress={() => setActiveTab('active')}>
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>ACTIVE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'inactive' && styles.activeTabBtn]} onPress={() => setActiveTab('inactive')}>
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.activeTabText]}>INACTIVE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'archived' && styles.activeTabBtn]} onPress={() => setActiveTab('archived')}>
          <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>ARCHIVED</Text>
        </TouchableOpacity>
      </View>

      {/* SERVICE LIST */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color="#00FFED" size="large" style={{ marginTop: 50 }} />
        ) : displayedServices.length > 0 ? (
          displayedServices.map((svc) => (
            <View key={svc.id} style={[styles.serviceCard, svc.status === 'archived' && { borderColor: '#475569', opacity: 0.7 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <Text style={{ fontSize: 40, marginRight: 15 }}>{svc.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 18 }}>{svc.label}</Text>
                  <Text style={{ color: '#00FFED', fontWeight: 'bold', fontSize: 13, marginTop: 4 }}>{svc.priceText}</Text>
                  <Text style={{ color: '#8d85b1', fontSize: 12, marginTop: 4 }}>{svc.desc}</Text>
                  
                  {svc.status === 'inactive' && (
                    <Text style={{ color: '#F87171', fontSize: 11, marginTop: 8, fontWeight: 'bold' }}>
                      Reason: {svc.inactiveReason}
                    </Text>
                  )}
                </View>
              </View>
              
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15, gap: 10 }}>
                {activeTab === 'active' && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#475569' }]} onPress={() => openModal(svc)}><Text style={styles.actionBtnText}>EDIT</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FBBF24' }]} onPress={() => { setTargetService(svc); setIsDeactivateModalVisible(true); }}><Text style={[styles.actionBtnText, { color: '#FBBF24' }]}>DEACTIVATE</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F87171' }]} onPress={() => handleArchive(svc.id)}><Text style={[styles.actionBtnText, { color: '#F87171' }]}>ARCHIVE</Text></TouchableOpacity>
                  </>
                )}
                {activeTab === 'inactive' && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#475569' }]} onPress={() => openModal(svc)}><Text style={styles.actionBtnText}>EDIT</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#00FFED' }]} onPress={() => handleActivate(svc.id)}><Text style={[styles.actionBtnText, { color: '#00FFED' }]}>ACTIVATE</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F87171' }]} onPress={() => handleArchive(svc.id)}><Text style={[styles.actionBtnText, { color: '#F87171' }]}>ARCHIVE</Text></TouchableOpacity>
                  </>
                )}
                {activeTab === 'archived' && (
                  <>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#00FFED' }]} onPress={() => handleActivate(svc.id)}><Text style={[styles.actionBtnText, { color: '#00FFED' }]}>RESTORE</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.1)' }]} onPress={() => handlePermanentDelete(svc.id)}><Text style={[styles.actionBtnText, { color: '#F87171' }]}>DELETE FOREVER</Text></TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        ) : (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>🗂️</Text>
            <Text style={{ color: '#00FFED', fontSize: 16, fontWeight: 'bold' }}>No {activeTab} services.</Text>
          </View>
        )}
      </ScrollView>

      {/* EDIT/CREATE MODAL */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        {/* ... (Existing Edit Modal code remains exactly the same) ... */}
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{editingId ? '⚡ EDIT SERVICE' : '✨ NEW SERVICE'}</Text>
            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>EMOJI ICON</Text>
                <TextInput style={[styles.textInput, { fontSize: 24, textAlign: 'center' }]} value={icon} onChangeText={setIcon} maxLength={2}/>
              </View>
              <View style={{ flex: 3 }}>
                <Text style={styles.inputLabel}>SERVICE NAME</Text>
                <TextInput style={styles.textInput} value={label} onChangeText={setLabel} placeholder="e.g. Wash & Fold" placeholderTextColor="#475569"/>
              </View>
            </View>
            <Text style={styles.inputLabel}>PRICING TEXT (SHOWN TO USER)</Text>
            <TextInput style={styles.textInput} value={priceText} onChangeText={setPriceText} placeholder="e.g. Base Rate: ₱150.00 / kg" placeholderTextColor="#475569"/>
            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]} value={desc} onChangeText={setDesc} multiline placeholder="e.g. Final price calculated after weigh-in." placeholderTextColor="#475569"/>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}><Text style={styles.cancelBtnText}>DISCARD</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isUpdating}>{isUpdating ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>SAVE SERVICE</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DEACTIVATE MODAL */}
      <Modal visible={isDeactivateModalVisible} animationType="fade" transparent={true}>
        {/* ... (Existing Deactivate Modal code remains exactly the same) ... */}
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalContainer, { borderBottomWidth: 2, borderRadius: 24 }]}>
            <Text style={[styles.modalTitle, { color: '#FBBF24', textAlign: 'center' }]}>⚠️ DEACTIVATE SERVICE</Text>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 20 }}>Why is "{targetService?.label}" unavailable? This will be shown to users.</Text>
            
            <TextInput 
              style={styles.textInput} 
              value={deactivateReason} onChangeText={setDeactivateReason} 
              placeholder="e.g. Machine under maintenance" placeholderTextColor="#475569"
            />
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsDeactivateModalVisible(false)}><Text style={styles.cancelBtnText}>CANCEL</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#FBBF24' }]} onPress={executeDeactivate} disabled={isUpdating}>{isUpdating ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>DEACTIVATE</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- NEW: CUSTOM BEAUTIFUL ACTION MODAL (Archive / Delete) --- */}
      <Modal visible={actionModal.visible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={[
            styles.modalContainer, 
            { 
              borderBottomWidth: 2, 
              borderRadius: 24,
              borderColor: actionModal.type === 'delete' ? '#EF4444' : '#F97316' 
            }
          ]}>
            <Text style={[
              styles.modalTitle, 
              { textAlign: 'center', color: actionModal.type === 'delete' ? '#EF4444' : '#F97316' }
            ]}>
              {actionModal.title}
            </Text>
            
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 24, fontSize: 16, lineHeight: 24 }}>
              {actionModal.message}
            </Text>
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setActionModal({ ...actionModal, visible: false })}
                disabled={isUpdating}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.saveBtn, 
                  { backgroundColor: actionModal.type === 'delete' ? '#EF4444' : '#F97316' }
                ]} 
                onPress={actionModal.onConfirm} 
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color={actionModal.type === 'delete' ? '#FFF' : '#000'} />
                ) : (
                  <Text style={[
                    styles.saveBtnText, 
                    { color: actionModal.type === 'delete' ? '#FFF' : '#000' }
                  ]}>
                    CONFIRM
                  </Text>
                )}
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
  addButton: { backgroundColor: '#FF1493', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  addButtonText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 14 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabBtn: { borderBottomColor: '#00FFED' },
  tabText: { color: '#8d85b1', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  activeTabText: { color: '#00FFED' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  serviceCard: { backgroundColor: '#111820', borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.4)', borderRadius: 20, padding: 20, marginBottom: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 11, letterSpacing: 0.5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#111820', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 2, borderColor: '#00FFED', borderBottomWidth: 0 },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20 },
  inputLabel: { color: '#FF1493', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});