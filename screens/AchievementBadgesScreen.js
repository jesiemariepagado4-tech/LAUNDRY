import React, { useState, useEffect } from 'react';
// ADDED: Platform and StatusBar to handle device notches properly
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Pressable, ActivityIndicator, Modal, StyleSheet, Platform, StatusBar } from 'react-native';

// --- FIREBASE IMPORTS ---
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function AchievementBadgesScreen({ navigation }) {
  const [userXp, setUserXp] = useState(0);
  const [activeDiscount, setActiveDiscount] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // --- MODAL STATES ---
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [pendingReward, setPendingReward] = useState(null);
  
  // NEW: Custom Info/Alert Modal State
  const [infoModal, setInfoModal] = useState({ visible: false, title: '', message: '', type: 'info' });

  // --- FETCH REAL-TIME USER XP & DISCOUNT ---
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserXp(data.xpBalance || 0);
        setActiveDiscount(data.activeDiscount || null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- DISCOUNT TIERS ---
  const rewardTiers = [
    { id: 1, cost: 200, title: '10% Discount', desc: 'Get 10% off your entire next laundry pickup.', icon: '🎟️', value: 10 },
    { id: 2, cost: 400, title: '20% Discount', desc: 'Get 20% off your entire next laundry pickup.', icon: '🎫', value: 20 },
    { id: 3, cost: 1000, title: '50% Discount', desc: 'Half price! Get 50% off your next laundry pickup.', icon: '💎', value: 50, premium: true }
  ];

  // --- BEAUTIFUL CUSTOM ALERT HELPER ---
  const showMessage = (title, message, type = 'info') => {
    setInfoModal({ visible: true, title, message, type });
  };

  const closeInfoModal = () => {
    setInfoModal({ ...infoModal, visible: false });
  };

  const handleUseCoins = () => {
    if (userXp <= 0) {
      showMessage("No XP Left", "Complete more laundry missions to earn XP!", "warning");
      return;
    }
    showMessage("Your Armory Funds", `You currently have ${userXp} XP.\n\nTap on any of the discount badges below to unlock them and save on your next pickup!`, "info");
  };

  const handleRewardClick = (cost, value, title) => {
    if (activeDiscount) {
      showMessage("Armory Locked", `You already have a ${activeDiscount}% discount active! Use it on a mission before buying another.`, "warning");
      return;
    }
    if (userXp < cost) {
      showMessage("Not Enough XP", `You need ${cost} XP to unlock this. You currently have ${userXp}.`, "error");
      return;
    }

    // Open the custom Confirmation modal
    setPendingReward({ cost, value, title });
    setIsConfirmModalVisible(true);
  };

  // --- EXECUTE THE PURCHASE ---
  const executeUnlock = async () => {
    if (!pendingReward) return;
    setIsRedeeming(true);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        xpBalance: increment(-pendingReward.cost), 
        activeDiscount: pendingReward.value 
      });
      setIsConfirmModalVisible(false);
      
      // Delay slightly so modals don't overlap awkwardly
      setTimeout(() => {
        showMessage("Success!", `${pendingReward.title} Unlocked! It will automatically apply to your next booking.`, "success");
      }, 300);

    } catch (error) {
      console.error(error);
      setIsConfirmModalVisible(false);
      setTimeout(() => {
        showMessage("Error", "Transaction failed. Please check your connection.", "error");
      }, 300);
    } finally {
      setIsRedeeming(false);
      setPendingReward(null);
    }
  };

  // --- HELPER TO GET MODAL ICONS ---
  const getModalIcon = (type) => {
    switch(type) {
      case 'success': return '✨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '💡';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={{ flex: 1, padding: 24 }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" bounces={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rewards Armory</Text>
        </View>

        {/* User XP Wallet */}
        <Pressable onPress={handleUseCoins} style={({ pressed }) => ([styles.fundsBox, { opacity: pressed ? 0.8 : 1, marginBottom: activeDiscount ? 16 : 24 }])}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isLoading ? <ActivityIndicator color="#FF1493" style={{ marginRight: 15 }} /> : <Text style={{ fontSize: 28, marginRight: 10 }}>🎁</Text>}
            <View>
              <Text style={{ color: '#FF1493', fontSize: 18, fontWeight: '700' }}>Available Funds</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>{userXp} XP</Text>
            </View>
          </View>
          <Text style={{ color: '#FF1493', fontSize: 16, fontWeight: '600' }}>HOW TO USE →</Text>
        </Pressable>

        {/* ACTIVE TICKET WARNING */}
        {activeDiscount && (
          <View style={styles.activeTicketBox}>
            <Text style={{ color: '#00FFED', fontWeight: 'bold', textAlign: 'center' }}>
              ⚠️ You have a {activeDiscount}% Discount ready for your next deployment!
            </Text>
          </View>
        )}

        {/* Reward Tiers List */}
        <View style={{ gap: 16 }}>
          {rewardTiers.map((reward) => {
            const isAffordable = userXp >= reward.cost;
            const isLocked = !isAffordable || activeDiscount !== null; 
            
            return (
              <Pressable 
                key={reward.id}
                onPress={() => handleRewardClick(reward.cost, reward.value, reward.title)}
                disabled={isRedeeming} 
                style={({ pressed }) => ([styles.rewardCard, {
                  borderColor: !isLocked ? '#00FFED' : 'rgba(255,255,255,0.1)',
                  opacity: pressed ? 0.8 : (!isLocked ? 1 : 0.5),
                }])}
              >
                <Text style={{ fontSize: 40, marginRight: 20, opacity: !isLocked ? 1 : 0.5 }}>{reward.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                    {reward.title} {reward.premium && <Text style={{ color: '#FFD700' }}>★</Text>}
                  </Text>
                  <Text style={{ color: '#00FFED', fontSize: 14, opacity: 0.8 }}>{reward.desc}</Text>
                  
                  {!isLocked ? (
                    <Text style={{ color: '#00FF88', fontSize: 13, marginTop: 6, fontWeight: 'bold' }}>Tap to unlock for {reward.cost} XP</Text>
                  ) : activeDiscount ? (
                    <Text style={{ color: '#8d85b1', fontSize: 13, marginTop: 6 }}>Armory currently locked</Text>
                  ) : (
                    <Text style={{ color: '#FF6666', fontSize: 13, marginTop: 6 }}>Need {reward.cost - userXp} more XP</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* --- CONFIRMATION MODAL (Unlock Action) --- */}
      <Modal visible={isConfirmModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 15 }}>{pendingReward?.cost === 1000 ? '💎' : '🎫'}</Text>
            <Text style={styles.modalTitle}>UNLOCK DISCOUNT?</Text>
            
            <Text style={styles.messageText}>
              Spend <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>{pendingReward?.cost} XP</Text> to acquire the <Text style={{ color: '#FF1493', fontWeight: 'bold' }}>{pendingReward?.title}</Text>?
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsConfirmModalVisible(false)} disabled={isRedeeming}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={executeUnlock} disabled={isRedeeming}>
                {isRedeeming ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>UNLOCK NOW</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- BEAUTIFUL INFO/ALERT MODAL (Replaces window.alert) --- */}
      <Modal visible={infoModal.visible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, infoModal.type === 'error' && { borderColor: '#FF1493' }]}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 15 }}>
              {getModalIcon(infoModal.type)}
            </Text>
            <Text style={[styles.modalTitle, infoModal.type === 'error' && { color: '#FF1493' }]}>
              {infoModal.title.toUpperCase()}
            </Text>
            
            <Text style={[styles.messageText, { marginBottom: 30 }]}>
              {infoModal.message}
            </Text>

            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.saveBtn, { flex: 1, backgroundColor: infoModal.type === 'error' ? '#FF1493' : '#00FFED' }]} 
                onPress={closeInfoModal}
              >
                <Text style={styles.saveBtnText}>UNDERSTOOD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2D1A5B' },
  // ADDED: marginTop dynamic check to safely push the header down on Android
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 30, 
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight + 15 : 15 
  },
  headerTitle: { color: '#00FFED', fontSize: 30, fontWeight: '900' },
  
  fundsBox: { backgroundColor: 'rgba(255, 20, 147, 0.15)', borderWidth: 2, borderColor: '#FF1493', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeTicketBox: { backgroundColor: 'rgba(0,255,237,0.1)', borderWidth: 1, borderColor: '#00FFED', borderRadius: 12, padding: 15 },
  rewardCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center' },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#1A0D3A', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED' },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 15, textAlign: 'center' },
  messageText: { color: '#fff', textAlign: 'center', fontSize: 16, lineHeight: 24, marginBottom: 25 },
  
  modalButtonRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 1.5, paddingVertical: 16, borderRadius: 999, backgroundColor: '#00FFED', alignItems: 'center' },
  saveBtnText: { color: '#000', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});