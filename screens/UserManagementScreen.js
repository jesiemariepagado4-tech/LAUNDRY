import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, 
  Modal, ActivityIndicator, TextInput, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { 
  collection, onSnapshot, doc, updateDoc, deleteDoc, addDoc 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export default function UserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    heroName: '',
    recruitId: '',
  });

  // Fetch all users in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Ban User
  const handleBanUser = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    try {
      await updateDoc(doc(db, 'users', userId), {
        banned: newStatus,
        banReason: newStatus ? "Violation of rules" : "",
        bannedAt: newStatus ? new Date() : null
      });
      Alert.alert(newStatus ? "User Banned" : "User Unbanned");
    } catch (error) {
      Alert.alert("Error", "Failed to update user status");
    }
  };

  // Delete User
  const handleDeleteUser = (userId) => {
    Alert.alert(
      "Delete User",
      "Are you sure you want to permanently delete this user?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', userId));
              Alert.alert("User Deleted");
            } catch (error) {
              Alert.alert("Error", "Failed to delete user");
            }
          }
        }
      ]
    );
  };

  // Add New User
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.heroName) {
      Alert.alert("Please fill Email and Hero Name");
      return;
    }

    try {
      await addDoc(collection(db, 'users'), {
        ...newUser,
        banned: false,
        isOnline: false,
        createdAt: new Date(),
        xp: 0
      });
      setNewUser({ email: '', heroName: '', recruitId: '' });
      setShowAddModal(false);
      Alert.alert("User Created Successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to create user");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>USER MANAGEMENT</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Text style={styles.addButtonText}>+ CREATE NEW USER</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#00FFED" style={{ marginTop: 50 }} />
        ) : (
          users.map((user) => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.heroName || 'Unnamed'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                <Text style={styles.userId}>ID: {user.id.slice(0, 8)}...</Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionBtn, user.banned ? styles.unbanBtn : styles.banBtn]}
                  onPress={() => handleBanUser(user.id, user.banned)}
                >
                  <Text style={styles.actionBtnText}>
                    {user.banned ? "UNBAN" : "BAN"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteUser(user.id)}
                >
                  <Text style={styles.deleteBtnText}>DELETE</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add User Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New User</Text>
            
            <TextInput
              placeholder="Email"
              placeholderTextColor="#8d85b1"
              value={newUser.email}
              onChangeText={(text) => setNewUser({...newUser, email: text})}
              style={styles.input}
            />
            <TextInput
              placeholder="Hero Name"
              placeholderTextColor="#8d85b1"
              value={newUser.heroName}
              onChangeText={(text) => setNewUser({...newUser, heroName: text})}
              style={styles.input}
            />
            <TextInput
              placeholder="Recruit ID (Optional)"
              placeholderTextColor="#8d85b1"
              value={newUser.recruitId}
              onChangeText={(text) => setNewUser({...newUser, recruitId: text})}
              style={styles.input}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleAddUser}>
                <Text style={styles.createBtnText}>CREATE USER</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },

  addButton: {
    backgroundColor: '#00FFED',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: { color: '#000', fontWeight: '900', fontSize: 16 },

  userCard: {
    backgroundColor: '#111820',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,255,237,0.2)'
  },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  userEmail: { color: '#8d85b1', fontSize: 13, marginTop: 2 },
  userId: { color: '#555', fontSize: 12 },

  actionButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  banBtn: { backgroundColor: '#FF1493' },
  unbanBtn: { backgroundColor: '#00CC66' },
  deleteBtn: { backgroundColor: '#991b1b', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },

  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  deleteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a2333',
    padding: 24,
    borderRadius: 20,
    width: '90%',
  },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  input: {
    backgroundColor: '#2a3449',
    color: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#475569'
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelBtn: { padding: 14, borderRadius: 12, backgroundColor: '#334155', flex: 1, marginRight: 8, alignItems: 'center' },
  createBtn: { padding: 14, borderRadius: 12, backgroundColor: '#00FFED', flex: 1, marginLeft: 8, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontWeight: 'bold' },
  createBtnText: { color: '#000', fontWeight: 'bold' },
});