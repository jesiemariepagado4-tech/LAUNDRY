// components/LogoutModal.js
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';

export default function LogoutModal({ visible, onCancel, onConfirm }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel} // Handles the android hardware back button
    >
      {/* Dark semi-transparent background overlay */}
      <View style={styles.overlay}>
        
        {/* The Warning Card */}
        <View style={[styles.card, { width: isSmallPhone ? '90%' : '80%' }]}>
          
          <Text style={styles.icon}>⚠️</Text>
          <Text style={styles.title}>LEAVE SQUAD?</Text>
          <Text style={styles.subtitle}>
            Are you sure you want to log out and pause your current mission?
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmText}>YES, LOGOUT</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)', // Darkens the screen behind the modal
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#1A0D3A', // Matches your deep theme
    borderWidth: 2,
    borderColor: '#FF1493', // Neon Pink border
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#FF1493',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  icon: {
    fontSize: 40,
    marginBottom: 10,
  },
  title: {
    color: '#00FFED', // Neon Cyan
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.8,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#FF1493', // Solid Pink for primary action
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});