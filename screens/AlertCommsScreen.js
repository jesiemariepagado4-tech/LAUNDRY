import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { collection, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';

export default function AlertCommsScreen({ navigation }) {
  const [broadcasts, setBroadcasts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load the list of dismissed notifications when the screen opens
  useEffect(() => {
    const loadDismissedAlerts = async () => {
      try {
        const stored = await AsyncStorage.getItem('@dismissed_alerts');
        if (stored) {
          setDismissedAlerts(JSON.parse(stored));
        }
      } catch (error) {
        console.error("Error loading dismissed alerts:", error);
      }
    };
    loadDismissedAlerts();
  }, []);

  useEffect(() => {
    // Listen for live updates from HQ
    const unsubscribe = onSnapshot(collection(db, 'broadcasts'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort newest to oldest
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

  // Handle removing a notification locally
  const handleDismiss = async (id) => {
    const updatedDismissed = [...dismissedAlerts, id];
    setDismissedAlerts(updatedDismissed);
    
    try {
      await AsyncStorage.setItem('@dismissed_alerts', JSON.stringify(updatedDismissed));
    } catch (error) {
      console.error("Error saving dismissed alert:", error);
    }
  };

  // Filter out the alerts the user has already dismissed
  const visibleBroadcasts = broadcasts.filter(item => !dismissedAlerts.includes(item.id));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
          <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
            <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Comms</Text>
      </View>

      {/* Broadcast List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#00FFED" style={{ marginTop: 40 }} />
        ) : visibleBroadcasts.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60, opacity: 0.5 }}>
            <Text style={{ fontSize: 40, marginBottom: 10 }}>📡</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>All clear, Captain.</Text>
            <Text style={{ color: '#8d85b1', marginTop: 5 }}>No new transmissions from HQ.</Text>
          </View>
        ) : (
          visibleBroadcasts.map((item) => {
            // Determine colors based on the type you selected in the Admin panel
            const isAlert = item.type === 'alert';
            const themeColor = isAlert ? '#FF1493' : '#00FFED';

            return (
              <View key={item.id} style={styles.cardContainer}>
                {/* Colored Left Border */}
                <View style={[styles.colorBar, { backgroundColor: themeColor }]} />
                
                <View style={styles.cardContent}>
                  
                  {/* Title & Dismiss Button Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={[styles.cardTitle, { color: themeColor, flex: 1, paddingRight: 10 }]}>
                      {item.title}
                    </Text>
                    
                    <TouchableOpacity 
                      onPress={() => handleDismiss(item.id)} 
                      style={styles.dismissButton}
                    >
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M18 6L6 18M6 6L18 18" stroke="#8d85b1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </Svg>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.cardMessage}>
                    {item.message}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D1A5B', 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    color: '#00FFED',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#392B66', 
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden', 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  colorBar: {
    width: 10,
    height: '100%',
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardMessage: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  }
});