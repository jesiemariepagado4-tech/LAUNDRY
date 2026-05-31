
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';

export default function EwalletModal({ visible, onClose, onSuccess, price, isUpdating }) {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  
  // Input States
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [otp, setOtp] = useState('');

  const PROVIDERS = [
    { id: 'gcash', name: 'GCash', icon: '🔵', color: '#007BFF' },
    { id: 'maya', name: 'Maya', icon: '🟢', color: '#00C853' },
    { id: 'grabpay', name: 'GrabPay', icon: '📱', color: '#00B14F' },
    { id: 'card', name: 'Credit/Debit Card', icon: '💳', color: '#FF1493' },
  ];

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setStep(2);
  };

  const handleNext = () => {
    if (step === 2) {
      if (selectedProvider.id === 'card') {
        if (cardNumber.length < 16) { Alert.alert("Invalid Card", "Please enter a valid 16-digit card number."); return; }
        if (cardExpiry.length < 5) { Alert.alert("Invalid Expiry", "Please enter expiry as MM/YY."); return; }
        if (cardCvv.length < 3) { Alert.alert("Invalid CVV", "Please enter a 3 or 4 digit CVV."); return; }
      } else {
        if (phone.length < 10) { Alert.alert("Invalid Number", "Please enter a valid mobile number."); return; }
      }
      setStep(3);
    } else if (step === 3) {
      if (otp.length < 4) { Alert.alert("Invalid OTP", "Please enter the 4-digit code."); return; }
      
      // Pass the selected method back to MissionProgressScreen so it saves in Firebase!
      onSuccess(selectedProvider.id);
      
      // Reset state silently after success
      setTimeout(resetState, 500);
    }
  };

  const resetState = () => {
    setStep(1);
    setSelectedProvider(null);
    setPhone('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setOtp('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.headerRow}>
            <Text style={{ fontSize: 32 }}>{step === 1 ? '🏦' : selectedProvider?.icon}</Text>
            <Text style={styles.modalTitle}>
              {step === 1 ? 'SELECT PAYMENT' : selectedProvider?.name.toUpperCase()}
            </Text>
          </View>
          
          {/* STEP 1: SELECT PROVIDER */}
          {step === 1 && (
            <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
              {PROVIDERS.map((provider) => (
                <TouchableOpacity 
                  key={provider.id} 
                  style={[styles.providerBtn, { borderColor: provider.color }]}
                  onPress={() => handleProviderSelect(provider)}
                >
                  <Text style={{ fontSize: 24, marginRight: 15 }}>{provider.icon}</Text>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{provider.name}</Text>
                    <Text style={{ color: '#8d85b1', fontSize: 11 }}>Instant verification</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* STEP 2: ENTER DETAILS */}
          {step === 2 && (
            <View style={{ marginVertical: 15 }}>
              {selectedProvider.id === 'card' ? (
                <>
                  <Text style={styles.inputLabel}>CARD NUMBER</Text>
                  <TextInput 
                    style={[styles.textInput, { fontSize: 18, letterSpacing: 2 }]} 
                    value={cardNumber} onChangeText={setCardNumber} 
                    placeholder="XXXX XXXX XXXX XXXX" placeholderTextColor="#475569"
                    keyboardType="number-pad" maxLength={16}
                  />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>EXPIRY</Text>
                      <TextInput 
                        style={[styles.textInput, { fontSize: 16, textAlign: 'center' }]} 
                        value={cardExpiry} onChangeText={setCardExpiry} 
                        placeholder="MM/YY" placeholderTextColor="#475569"
                        keyboardType="numbers-and-punctuation" maxLength={5}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput 
                        style={[styles.textInput, { fontSize: 16, textAlign: 'center' }]} 
                        value={cardCvv} onChangeText={setCardCvv} 
                        placeholder="123" placeholderTextColor="#475569"
                        keyboardType="number-pad" maxLength={4} secureTextEntry
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>{selectedProvider.name.toUpperCase()} NUMBER</Text>
                  <TextInput 
                    style={[styles.textInput, { fontSize: 18, letterSpacing: 2 }]} 
                    value={phone} onChangeText={setPhone} 
                    placeholder="09XX XXX XXXX" placeholderTextColor="#475569"
                    keyboardType="phone-pad" maxLength={11}
                  />
                  <Text style={{ color: '#8d85b1', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
                    You will receive a 4-digit code to verify this transaction.
                  </Text>
                </>
              )}
            </View>
          )}

          {/* STEP 3: OTP VERIFICATION */}
          {step === 3 && (
            <View style={{ marginVertical: 15 }}>
              <Text style={styles.inputLabel}>ENTER 4-DIGIT OTP</Text>
              <Text style={{ color: '#8d85b1', fontSize: 12, marginBottom: 20, textAlign: 'center' }}>
                A verification code was sent to {selectedProvider.id === 'card' ? 'your registered bank mobile' : (phone || 'your number')}.
              </Text>
              <TextInput 
                style={[styles.textInput, { fontSize: 24, letterSpacing: 10, textAlign: 'center', borderColor: '#FF1493' }]} 
                value={otp} onChangeText={setOtp} 
                placeholder="••••" placeholderTextColor="#475569"
                keyboardType="number-pad" maxLength={4}
              />
            </View>
          )}

          {/* ACTION BUTTONS */}
          <View style={styles.modalButtonRow}>
            {step > 1 && !isUpdating ? (
               <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep(step - 1)}>
                 <Text style={styles.cancelBtnText}>BACK</Text>
               </TouchableOpacity>
            ) : (
               <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                 <Text style={styles.cancelBtnText}>CANCEL</Text>
               </TouchableOpacity>
            )}

            {step > 1 && (
              <TouchableOpacity style={styles.saveBtn} onPress={handleNext} disabled={isUpdating}>
                {isUpdating ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.saveBtnText}>{step === 2 ? 'CONTINUE' : `PAY ₱${price}`}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#1A0D3A', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15, gap: 10 },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
  
  providerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  
  inputLabel: { color: '#FF1493', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', marginBottom: 15, fontWeight: 'bold' },
  
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});