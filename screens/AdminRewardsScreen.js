import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { collection, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function AdminRewardsScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [bonusXp, setBonusXp] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData = [];
      snapshot.forEach((docSnap) => {
        usersData.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by highest XP
      setUsers(usersData.sort((a, b) => (b.xpBalance || 0) - (a.xpBalance || 0)));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGrantXp = async () => {
    if (!selectedUser || !bonusXp) return;
    try {
      await updateDoc(doc(db, 'users', selectedMission.id), {
        xpBalance: increment(parseInt(bonusXp)),
        lifetimeXp: increment(parseInt(bonusXp))
      });
      Alert.alert("XP Granted", `Successfully added ${bonusXp} XP to Agent.`);
      setIsModalVisible(false);
      setBonusXp('');
    } catch (error) {
      Alert.alert("Error", "Could not grant XP.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agent Roster & XP</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLoading ? <ActivityIndicator color="#00FFED" size="large" /> : users.map((user) => (
          <View key={user.id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>AGENT: {user.id.substring(0, 8).toUpperCase()}</Text>
              <Text style={{ color: '#00FFED', fontSize: 24, fontWeight: '900' }}>{user.xpBalance || 0} XP</Text>
              <Text style={{ color: '#8d85b1', fontSize: 11 }}>Active Discounts: {(user.activeDiscounts || []).length}</Text>
            </View>
            <TouchableOpacity style={styles.grantButton} onPress={() => { setSelectedUser(user); setIsModalVisible(true); }}>
              <Text style={styles.grantButtonText}>+ GRANT XP</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>GRANT BONUS XP</Text>
            <TextInput style={styles.textInput} value={bonusXp} onChangeText={setBonusXp} placeholder="e.g. 500" placeholderTextColor="#475569" keyboardType="numeric" />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsModalVisible(false)}><Text style={{ color: '#fff', fontWeight: 'bold' }}>CANCEL</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleGrantXp}><Text style={{ color: '#000', fontWeight: 'bold' }}>CONFIRM</Text></TouchableOpacity>
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
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  userCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111820', borderWidth: 2, borderColor: '#FF1493', borderRadius: 20, padding: 20, marginBottom: 16 },
  userInfo: { flex: 1 },
  userEmail: { color: '#fff', fontWeight: 'bold', marginBottom: 4, fontFamily: 'monospace' },
  grantButton: { backgroundColor: '#FF1493', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  grantButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#111820', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED' },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  saveBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' }
});