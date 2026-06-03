import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, StyleSheet, StatusBar, 
  Modal, ActivityIndicator, TextInput 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function AdminArchivesScreen({ navigation }) {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Search State
  const [activeTab, setActiveTab] = useState('cleared'); // 'cleared' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Details Modal State
  const [selectedMission, setSelectedMission] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'missions'), (snapshot) => {
      const archivedList = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.status || '';
        
        // ONLY pull in missions that are finished (not active)
        if (['completed', 'delivered', 'archived', 'cancelled', 'aborted'].includes(status)) {
          archivedList.push({ id: doc.id, ...data });
        }
      });

      // Sort by newest first using createdAt or fallback to displayDateTime
      archivedList.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA; // Descending
      });

      setArchives(archivedList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter based on Tab AND Search Query
  const displayedArchives = archives.filter(mission => {
    // 1. Tab Filter
    const isCleared = ['completed', 'delivered', 'archived'].includes(mission.status);
    const isCancelled = ['cancelled', 'aborted'].includes(mission.status);
    
    if (activeTab === 'cleared' && !isCleared) return false;
    if (activeTab === 'cancelled' && !isCancelled) return false;

    // 2. Search Filter (by Mission ID or Email)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchId = mission.missionId?.toLowerCase().includes(query);
      const matchEmail = mission.userEmail?.toLowerCase().includes(query);
      if (!matchId && !matchEmail) return false;
    }

    return true;
  });

  const openDetails = (mission) => {
    setSelectedMission(mission);
    setShowDetailsModal(true);
  };

  const renderMissionCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => openDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.missionId}>{item.missionId || '#---'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: activeTab === 'cleared' ? 'rgba(0,255,237,0.1)' : 'rgba(248,113,113,0.1)' }]}>
          <Text style={[styles.statusText, { color: activeTab === 'cleared' ? '#00FFED' : '#F87171' }]}>
            {(item.status || 'UNKNOWN').toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={styles.serviceText}>Service: <Text style={{ color: '#fff' }}>{item.serviceType}</Text></Text>
      <Text style={styles.emailText}>{item.userEmail}</Text>
      
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{item.displayDateTime}</Text>
        {item.finalPrice && (
          <Text style={styles.priceText}>₱{Number(item.finalPrice).toFixed(2)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* HEADER */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MISSION ARCHIVES</Text>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search by Mission ID or Email..."
            placeholderTextColor="#8d85b1"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>

        {/* TABS */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'cleared' && styles.activeTabBtn]} onPress={() => setActiveTab('cleared')}>
            <Text style={[styles.tabText, activeTab === 'cleared' && styles.activeTabText]}>CLEARED</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'cancelled' && styles.activeTabBtn, { borderBottomColor: activeTab === 'cancelled' ? '#F87171' : 'transparent' }]} onPress={() => setActiveTab('cancelled')}>
            <Text style={[styles.tabText, activeTab === 'cancelled' && { color: '#F87171' }]}>CANCELLED</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LIST */}
      {loading ? (
        <ActivityIndicator size="large" color="#00FFED" style={{ marginTop: 50 }} />
      ) : displayedArchives.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ fontSize: 40, marginBottom: 10 }}>🗄️</Text>
          <Text style={styles.emptyText}>No archives found.</Text>
        </View>
      ) : (
        <FlatList 
          data={displayedArchives}
          keyExtractor={(item) => item.id}
          renderItem={renderMissionCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* DETAILS MODAL */}
      <Modal visible={showDetailsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMission && (
              <>
                <Text style={styles.modalTitle}>ARCHIVE RECORD</Text>
                
                <View style={styles.modalBox}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
                    <Text style={{ color: '#00FFED', fontSize: 24, fontWeight: '900' }}>{selectedMission.missionId}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 10 }}>{selectedMission.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.modalLabel}>SERVICE TYPE</Text>
                  <Text style={styles.modalValue}>{selectedMission.serviceType}</Text>

                  <Text style={styles.modalLabel}>USER EMAIL</Text>
                  <Text style={styles.modalValue}>{selectedMission.userEmail}</Text>

                  <Text style={styles.modalLabel}>PICKUP ADDRESS</Text>
                  <Text style={styles.modalValue}>{selectedMission.address}</Text>

                  <Text style={styles.modalLabel}>SCHEDULED TIME</Text>
                  <Text style={styles.modalValue}>{selectedMission.displayDateTime}</Text>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                    <View>
                      <Text style={styles.modalLabel}>PAYMENT STATUS</Text>
                      <Text style={[styles.modalValue, { color: selectedMission.paymentStatus === 'paid' ? '#00FFED' : '#FBBF24' }]}>
                        {(selectedMission.paymentStatus || 'UNKNOWN').toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.modalLabel}>FINAL PRICE</Text>
                      <Text style={[styles.modalValue, { color: '#FF1493', fontSize: 18 }]}>
                        {selectedMission.finalPrice ? `₱${Number(selectedMission.finalPrice).toFixed(2)}` : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  
                  {selectedMission.notes ? (
                    <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
                      <Text style={styles.modalLabel}>NOTES / INSTRUCTIONS</Text>
                      <Text style={{ color: '#fff', fontStyle: 'italic', marginTop: 4 }}>"{selectedMission.notes}"</Text>
                    </View>
                  ) : null}

                </View>

                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowDetailsModal(false)}>
                  <Text style={styles.closeBtnText}>CLOSE RECORD</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#00FFED', fontSize: 24, fontWeight: '900', fontStyle: 'italic' },
  
  searchContainer: { flexDirection: 'row', backgroundColor: '#111820', borderWidth: 1, borderColor: '#475569', borderRadius: 16, paddingHorizontal: 15, alignItems: 'center', marginBottom: 20 },
  searchInput: { flex: 1, paddingVertical: 14, color: '#fff', fontSize: 14 },

  tabContainer: { flexDirection: 'row', marginBottom: 10, gap: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabBtn: { borderBottomColor: '#00FFED' },
  tabText: { color: '#8d85b1', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  activeTabText: { color: '#00FFED' },

  listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  card: { backgroundColor: '#111820', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  missionId: { color: '#00FFED', fontSize: 18, fontWeight: '900' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statusText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  
  serviceText: { color: '#8d85b1', fontSize: 13, marginBottom: 4, fontWeight: 'bold' },
  emailText: { color: '#8d85b1', fontSize: 12, marginBottom: 15 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
  dateText: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
  priceText: { color: '#FF1493', fontSize: 16, fontWeight: '900' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { color: '#8d85b1', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111820', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, borderWidth: 2, borderColor: '#00FFED', borderBottomWidth: 0 },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20, textAlign: 'center' },
  
  modalBox: { backgroundColor: '#1A0D3A', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#475569', marginBottom: 20 },
  modalLabel: { color: '#8d85b1', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4, marginTop: 12 },
  modalValue: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  closeBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 16, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  closeBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
});