import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, 
  Modal, ActivityIndicator, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function AdminCommsScreen({ navigation }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });

  // Custom Action Modal State for Deletion
  const [actionModal, setActionModal] = useState({
    visible: false, title: '', message: '', onConfirm: null
  });

  // Fetch Broadcasts
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'broadcasts'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by newest first
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA; 
      });
      setBroadcasts(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openForm = (item = null) => {
    if (item) {
      setEditingId(item.id);
      setForm({ title: item.title, message: item.message, type: item.type || 'info' });
    } else {
      setEditingId(null);
      setForm({ title: '', message: '', type: 'info' });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.message) return;
    
    setIsProcessing(true);

    try {
      if (editingId) {
        // UPDATE
        await updateDoc(doc(db, 'broadcasts', editingId), {
          title: form.title,
          message: form.message,
          type: form.type,
          updatedAt: serverTimestamp()
        });
      } else {
        // CREATE
        await addDoc(collection(db, 'broadcasts'), {
          ...form,
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving broadcast:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Replaced native Alert with Custom Action Modal
  const handleDelete = (id) => {
    setActionModal({
      visible: true,
      title: '⚠️ DELETE BROADCAST',
      message: 'This will immediately remove the transmission from all user devices. Proceed?',
      onConfirm: async () => {
        setIsProcessing(true);
        try { 
          await deleteDoc(doc(db, 'broadcasts', id)); 
        } catch (e) { 
          console.error("Failed to delete", e); 
        } finally {
          setIsProcessing(false);
          setActionModal({ ...actionModal, visible: false });
        }
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HQ COMM-LINK</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => openForm(null)}>
          <Text style={styles.addButtonText}>+ TRANSMIT NEW BROADCAST</Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#00FFED" style={{ marginTop: 50 }} />
        ) : broadcasts.length === 0 ? (
          <Text style={{ color: '#8d85b1', textAlign: 'center', marginTop: 50 }}>No active broadcasts.</Text>
        ) : (
          broadcasts.map((b) => (
            <View key={b.id} style={[styles.card, { borderLeftColor: b.type === 'alert' ? '#FF1493' : '#00FFED' }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.cardTitle, { color: b.type === 'alert' ? '#FF1493' : '#00FFED' }]}>{b.title}</Text>
                <Text style={styles.cardMessage}>{b.message}</Text>
              </View>
              <View style={{ gap: 10 }}>
                <TouchableOpacity onPress={() => openForm(b)} style={[styles.actionBtn, { borderColor: '#00FFED' }]}>
                  <Text style={{ color: '#00FFED', fontSize: 10, fontWeight: 'bold' }}>EDIT</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(b.id)} style={[styles.actionBtn, { borderColor: '#F87171' }]}>
                  <Text style={{ color: '#F87171', fontSize: 10, fontWeight: 'bold' }}>DEL</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* CREATE / EDIT MODAL */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? '⚡ EDIT BROADCAST' : '📡 NEW TRANSMISSION'}</Text>
            
            <Text style={styles.inputLabel}>TRANSMISSION TYPE</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <TouchableOpacity 
                style={[styles.typeBtn, form.type === 'info' && { backgroundColor: 'rgba(0,255,237,0.2)', borderColor: '#00FFED' }]}
                onPress={() => setForm({...form, type: 'info'})}
              >
                <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>STANDARD (Cyan)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, form.type === 'alert' && { backgroundColor: 'rgba(255,20,147,0.2)', borderColor: '#FF1493' }]}
                onPress={() => setForm({...form, type: 'alert'})}
              >
                <Text style={{ color: '#FF1493', fontWeight: 'bold' }}>URGENT (Pink)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>HEADLINE</Text>
            <TextInput
              placeholder="e.g. !! WEATHER DELAY !!" placeholderTextColor="#475569"
              value={form.title} onChangeText={(text) => setForm({...form, title: text})}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>MESSAGE BODY</Text>
            <TextInput
              placeholder="e.g. All riders are delayed by 30 mins today..." placeholderTextColor="#475569"
              value={form.message} onChangeText={(text) => setForm({...form, message: text})}
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelBtnText}>ABORT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleSave} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={styles.createBtnText}>TRANSMIT</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CUSTOM ACTION MODAL FOR DELETION */}
      <Modal visible={actionModal.visible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalActionContainer, { borderColor: '#F87171' }]}>
            <Text style={[styles.modalTitle, { color: '#F87171', textAlign: 'center' }]}>
              {actionModal.title}
            </Text>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 24, fontSize: 16, lineHeight: 24 }}>
              {actionModal.message}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setActionModal({ ...actionModal, visible: false })} 
                disabled={isProcessing}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.createBtn, { backgroundColor: '#F87171' }]} 
                onPress={actionModal.onConfirm} 
                disabled={isProcessing}
              >
                {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '900' }}>CONFIRM</Text>}
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
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },
  
  addButton: { backgroundColor: '#FF1493', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  addButtonText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 14 },

  card: { backgroundColor: '#111820', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#475569', borderLeftWidth: 6, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
  cardMessage: { color: '#fff', fontSize: 14, lineHeight: 20 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#111820', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 2, borderColor: '#00FFED', borderBottomWidth: 0 },
  modalActionContainer: { backgroundColor: '#111820', borderRadius: 24, padding: 24, borderWidth: 2 },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20 },
  
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#475569', alignItems: 'center' },
  inputLabel: { color: '#FF1493', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, marginBottom: 15 },
  
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5 },
  createBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  createBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5 },
});