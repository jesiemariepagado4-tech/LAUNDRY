import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';

export default function CodAlertModal({ visible, onClose, onConfirm, price, isUpdating }) {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 15 }}>💵</Text>
          <Text style={styles.modalTitle}>CASH ON DELIVERY</Text>
          
          <Text style={styles.messageText}>
            Proceed with Cash on Delivery for <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>₱{price || '0.00'}</Text>?
          </Text>
          
          <Text style={styles.subText}>
            Please prepare the exact amount for the rider upon delivery.
          </Text>

          <View style={styles.modalButtonRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isUpdating}>
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={onConfirm} disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.saveBtnText}>CONFIRM C.O.D.</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#1A0D3A', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED' },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 15, textAlign: 'center' },
  messageText: { color: '#fff', textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 10 },
  subText: { color: '#8d85b1', textAlign: 'center', fontSize: 12, marginBottom: 25 },
  
  modalButtonRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 1.5, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});