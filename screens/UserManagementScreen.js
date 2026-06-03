import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, 
  Modal, ActivityIndicator, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

// 1. ADDED setDoc for custom IDs
import { 
  collection, onSnapshot, doc, updateDoc, deleteDoc, query, where, getDocs, setDoc
} from 'firebase/firestore';

// 2. ADDED Firebase App and Auth imports for the Secondary App Trick
import { initializeApp, getApps } from 'firebase/app';
import { sendPasswordResetEmail, getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../config/firebase';

export default function UserManagementScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('active');

  // 3. ADDED 'password' to the form state
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userForm, setUserForm] = useState({ email: '', password: '', heroName: '', skin: '🧑‍🚀' });

  // View Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState({ totalSpent: 0, activeTickets: 0, historyCount: 0 });
  const [isFetchingStats, setIsFetchingStats] = useState(false);

  // Custom Action Modal State
  const [actionModal, setActionModal] = useState({
    visible: false, title: '', message: '', type: 'default', onConfirm: null
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(userList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const displayedUsers = users.filter(user => {
    let currentStatus = user.status || 'active';
    if (user.banned === true) currentStatus = 'banned';

    if (activeTab === 'active') return currentStatus === 'active';
    if (activeTab === 'inactive') return currentStatus === 'inactive' || currentStatus === 'banned' || currentStatus === 'deactivated';
    if (activeTab === 'archived') return currentStatus === 'archived';
    return false;
  });

  const openFormModal = (user = null) => {
    if (user) {
      setEditingUserId(user.id);
      // We don't load the password when editing for security
      setUserForm({ email: user.email || '', password: '', heroName: user.heroName || '', skin: user.skin || '🧑‍🚀' });
    } else {
      setEditingUserId(null);
      setUserForm({ email: '', password: '', heroName: '', skin: '🧑‍🚀' }); 
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.email || !userForm.heroName) return;
    setIsProcessing(true);

    try {
      if (editingUserId) {
        // UPDATE EXISTING USER
        await updateDoc(doc(db, 'users', editingUserId), {
          heroName: userForm.heroName,
          email: userForm.email,
          skin: userForm.skin
        });
      } else {
        // CREATE NEW USER (The Secondary App Trick)
        if (!userForm.password || userForm.password.length < 6) {
          alert("Password must be at least 6 characters.");
          setIsProcessing(false);
          return;
        }

        // Steal the config from your main app instance
        const firebaseConfig = auth.app.options; 
        
        // Check if we already made a secondary app, if not, initialize one
        const secondaryApp = getApps().length > 1 ? getApps() : initializeApp(firebaseConfig, "SecondaryApp");
        const secondaryAuth = getAuth(secondaryApp);

        // Create the user in Firebase Auth without logging the Admin out
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, userForm.email, userForm.password);
        const newUid = userCredential.user.uid;

        // Save to Firestore using their exact new UID via setDoc (not addDoc)
        await setDoc(doc(db, 'users', newUid), {
          email: userForm.email,
          heroName: userForm.heroName,
          skin: userForm.skin,
          status: 'active',
          isOnline: false,
          isWalkIn: true,
          createdAt: new Date().toISOString(),
          xp: 0
        });
      }
      setShowUserModal(false);
    } catch (error) {
      console.error("Error saving user:", error);
      alert(error.message); // Helpful to see if email is already in use!
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordReset = async (email) => {
    if (!email) return;
    setIsProcessing(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setActionModal({
        visible: true, title: '📧 EMAIL SENT', message: `A password reset link has been sent to ${email}.`, type: 'activate',
        onConfirm: () => setActionModal({ ...actionModal, visible: false })
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewDetails = async (user) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
    setIsFetchingStats(true);

    try {
      const q = query(collection(db, 'missions'), where('userId', '==', user.id));
      const snap = await getDocs(q);
      
      let spent = 0;
      let active = 0;
      let history = 0;

      snap.forEach(doc => {
        const data = doc.data();
        history++;
        if (['pending_pickup', 'in_progress', 'ready_for_delivery'].includes(data.status)) active++;
        if (data.paymentStatus === 'paid' && data.totalPrice) spent += data.totalPrice;
      });

      setUserStats({ totalSpent: spent, activeTickets: active, historyCount: history });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsFetchingStats(false);
    }
  };

  const handleToggleStatus = (userId, currentStatus) => {
    const isActive = currentStatus === 'active' || !currentStatus;
    const newStatus = isActive ? 'banned' : 'active';
    
    setActionModal({
      visible: true,
      title: isActive ? '🔨 BAN USER' : '✨ RESTORE USER',
      message: isActive 
        ? 'This will ban the user, instantly logging them out and preventing them from booking fake missions.' 
        : 'This will restore the user\'s access to the application.',
      type: isActive ? 'deactivate' : 'activate',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await updateDoc(doc(db, 'users', userId), { status: newStatus });
        } finally {
          setIsProcessing(false);
          setActionModal({ ...actionModal, visible: false });
        }
      }
    });
  };

  const handleArchiveUser = (userId) => {
    setActionModal({
      visible: true, title: '📦 ARCHIVE USER', message: 'This will soft-delete the user profile from the active database.', type: 'archive',
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await updateDoc(doc(db, 'users', userId), { status: 'archived' });
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

      {/* HEADER & TABS */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"><Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>USER CONFIG</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => openFormModal(null)}>
          <Text style={styles.addButtonText}>+ REGISTER WALK-IN CUSTOMER</Text>
        </TouchableOpacity>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'active' && styles.activeTabBtn]} onPress={() => setActiveTab('active')}>
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>ACTIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'inactive' && styles.activeTabBtn]} onPress={() => setActiveTab('inactive')}>
            <Text style={[styles.tabText, activeTab === 'inactive' && styles.activeTabText]}>BANNED / INACTIVE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'archived' && styles.activeTabBtn]} onPress={() => setActiveTab('archived')}>
            <Text style={[styles.tabText, activeTab === 'archived' && styles.activeTabText]}>ARCHIVED</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* USER LIST */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#00FFED" style={{ marginTop: 50 }} />
        ) : displayedUsers.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
             <Text style={{ color: '#8d85b1', fontSize: 16, fontWeight: 'bold' }}>No users found in this category.</Text>
          </View>
        ) : (
          displayedUsers.map((user) => (
            <View key={user.id} style={[styles.userCard, user.status === 'archived' && { opacity: 0.5, borderColor: '#475569' }]}>
              
              <View style={styles.userInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                  <View style={styles.skinContainer}>
                    <Text style={{ fontSize: 32 }}>{user.skin || '🧑‍🚀'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{user.heroName || 'Unnamed'}</Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, alignItems: 'center' }}>
                      <Text style={styles.userId}>ID: {user.id.slice(0, 8)}...</Text>
                      <Text style={styles.userXp}>XP: {user.xp || 0}</Text>
                      <Text style={[styles.userId, { color: user.status === 'banned' ? '#FBBF24' : user.status === 'archived' ? '#F87171' : '#00FFED' }]}>
                        [{user.status || 'active'}]
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: '#00FFED' }]} onPress={() => handleViewDetails(user)}>
                  <Text style={[styles.actionBtnText, { color: '#00FFED' }]}>VIEW</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.actionBtn, { borderColor: '#475569' }]} onPress={() => openFormModal(user)}>
                  <Text style={styles.actionBtnText}>EDIT</Text>
                </TouchableOpacity>

                {activeTab !== 'archived' && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, { borderColor: activeTab === 'active' ? '#FBBF24' : '#00FFED' }]}
                    onPress={() => handleToggleStatus(user.id, user.status)}
                  >
                    <Text style={[styles.actionBtnText, { color: activeTab === 'active' ? '#FBBF24' : '#00FFED' }]}>
                      {activeTab === 'active' ? "BAN" : "RESTORE"}
                    </Text>
                  </TouchableOpacity>
                )}

                {activeTab !== 'archived' && (
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: '#F87171' }]} onPress={() => handleArchiveUser(user.id)}>
                    <Text style={[styles.actionBtnText, { color: '#F87171' }]}>ARCHIVE</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* CREATE / EDIT USER MODAL */}
      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingUserId ? '⚡ UPDATE USER INFO' : '✨ REGISTER WALK-IN'}</Text>
            
            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 15 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>SKIN EMOJI</Text>
                <TextInput
                  value={userForm.skin} onChangeText={(text) => setUserForm({...userForm, skin: text})}
                  style={[styles.input, { textAlign: 'center', fontSize: 24, marginBottom: 0 }]} maxLength={2}
                />
              </View>
              <View style={{ flex: 3 }}>
                <Text style={styles.inputLabel}>HERO NAME</Text>
                <TextInput
                  placeholder="e.g. Captain Wash" placeholderTextColor="#475569"
                  value={userForm.heroName} onChangeText={(text) => setUserForm({...userForm, heroName: text})}
                  style={[styles.input, { marginBottom: 0 }]}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              placeholder="user@example.com" placeholderTextColor="#475569"
              value={userForm.email} onChangeText={(text) => setUserForm({...userForm, email: text})}
              style={styles.input} autoCapitalize="none" keyboardType="email-address"
            />

            {/* ONLY SHOW PASSWORD IF WE ARE CREATING A NEW USER */}
            {!editingUserId && (
              <>
                <Text style={styles.inputLabel}>PASSWORD (Min 6 chars)</Text>
                <TextInput
                  placeholder="••••••••" placeholderTextColor="#475569"
                  value={userForm.password} onChangeText={(text) => setUserForm({...userForm, password: text})}
                  style={styles.input} secureTextEntry
                />
              </>
            )}

            {/* ONLY SHOW RESET BUTTON IF WE ARE EDITING AN EXISTING USER */}
            {editingUserId && (
              <TouchableOpacity 
                style={{ backgroundColor: 'rgba(0,255,237,0.1)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#00FFED', marginBottom: 15, alignItems: 'center' }}
                onPress={() => handlePasswordReset(userForm.email)}
              >
                <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>SEND PASSWORD RESET EMAIL</Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUserModal(false)}>
                <Text style={styles.cancelBtnText}>DISCARD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createBtn} onPress={handleSaveUser} disabled={isProcessing}>
                {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={styles.createBtnText}>SAVE</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal visible={showDetailsModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalActionContainer, { borderColor: '#00FFED', width: '90%' }]}>
            
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>USER DOSSIER</Text>
            
            {selectedUser && (
              <View style={{ marginBottom: 20 }}>
                <View style={{ alignItems: 'center', marginBottom: 15 }}>
                  <Text style={{ fontSize: 60, backgroundColor: '#FF1493', borderRadius: 999, borderWidth: 4, borderColor: '#00FFED', width: 90, height: 90, textAlign: 'center', lineHeight: 82 }}>
                    {selectedUser.skin || '🧑‍🚀'}
                  </Text>
                </View>
                <Text style={{ color: '#FF1493', fontWeight: '900', fontSize: 22, textAlign: 'center' }}>{selectedUser.heroName}</Text>
                <Text style={{ color: '#8d85b1', textAlign: 'center', marginBottom: 20 }}>{selectedUser.email}</Text>
                
                {isFetchingStats ? (
                   <ActivityIndicator color="#00FFED" style={{ marginVertical: 20 }} />
                ) : (
                  <View style={{ gap: 12 }}>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>ACTIVE TICKETS</Text>
                      <Text style={styles.statValue}>{userStats.activeTickets}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>LIFETIME MISSIONS</Text>
                      <Text style={styles.statValue}>{userStats.historyCount}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statLabel}>LIFETIME SPENDING</Text>
                      <Text style={styles.statValue}>₱{userStats.totalSpent.toFixed(2)}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
            
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDetailsModal(false)}>
              <Text style={styles.cancelBtnText}>CLOSE DOSSIER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CUSTOM ACTION MODAL (Ban / Restore / Archive) */}
      <Modal visible={actionModal.visible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlayCenter}>
          <View style={[
            styles.modalActionContainer, 
            { borderColor: actionModal.type === 'archive' ? '#F87171' : actionModal.type === 'activate' ? '#00FFED' : '#FBBF24' }
          ]}>
            <Text style={[
              styles.modalTitle, 
              { color: actionModal.type === 'archive' ? '#F87171' : actionModal.type === 'activate' ? '#00FFED' : '#FBBF24', textAlign: 'center' }
            ]}>
              {actionModal.title}
            </Text>
            
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 24, fontSize: 16, lineHeight: 24 }}>{actionModal.message}</Text>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setActionModal({ ...actionModal, visible: false })} disabled={isProcessing}>
                <Text style={styles.cancelBtnText}>CLOSE</Text>
              </TouchableOpacity>
              
              {actionModal.type !== 'activate' || actionModal.title !== '📧 EMAIL SENT' ? (
                <TouchableOpacity 
                  style={[
                    styles.confirmBtn, 
                    { backgroundColor: actionModal.type === 'archive' ? '#F87171' : actionModal.type === 'activate' ? '#00FFED' : '#FBBF24' }
                  ]} 
                  onPress={actionModal.onConfirm} disabled={isProcessing}
                >
                  {isProcessing ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: '900' }}>CONFIRM</Text>}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },

  addButton: { backgroundColor: '#FF1493', padding: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  addButtonText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 14 },

  tabContainer: { flexDirection: 'row', marginBottom: 15, gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabBtn: { borderBottomColor: '#00FFED' },
  tabText: { color: '#8d85b1', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  activeTabText: { color: '#00FFED' },

  userCard: { backgroundColor: '#111820', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: 'rgba(0, 255, 237, 0.4)' },
  userInfo: { marginBottom: 15 },
  
  skinContainer: { backgroundColor: '#FF1493', width: 60, height: 60, borderRadius: 999, borderWidth: 2, borderColor: '#00FFED', alignItems: 'center', justifyContent: 'center' },
  userName: { color: '#fff', fontSize: 18, fontWeight: '900' },
  userEmail: { color: '#8d85b1', fontSize: 13, marginTop: 4 },
  userId: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
  userXp: { color: '#FF1493', fontSize: 11, fontWeight: '900' },

  actionButtons: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 15, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 10, letterSpacing: 0.5 },

  statBox: { backgroundColor: '#1A0D3A', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#475569' },
  statLabel: { color: '#fff', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  statValue: { color: '#00FFED', fontSize: 20, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20, alignItems: 'center' },
  
  modalContent: { backgroundColor: '#111820', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 2, borderColor: '#00FFED', borderBottomWidth: 0 },
  modalActionContainer: { backgroundColor: '#111820', borderRadius: 24, padding: 24, borderWidth: 2, width: '100%' },
  
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20 },
  inputLabel: { color: '#FF1493', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  
  createBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  createBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 },
  confirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }
});