import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

export default function MissionHistoryScreen({ navigation }) {
  // Mock data for mission logs
  const missionLogs = [
    { id: 1, name: 'Nebula Recon', status: 'Completed', date: '2026-05-20' },
    { id: 2, name: 'Asteroid Belt Run', status: 'Completed', date: '2026-05-18' },
    { id: 3, name: 'Star-Gate Repair', status: 'Failed', date: '2026-05-15' },
    { id: 4, name: 'Data Relay', status: 'Completed', date: '2026-05-12' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#00FFED' }}>Mission History</Text>
        </View>

        {/* Mission List */}
        <View style={{ gap: 16 }}>
          {missionLogs.map((log) => (
            <View key={log.id} style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 2,
              borderColor: log.status === 'Completed' ? 'rgba(0,255,237,0.25)' : 'rgba(248,113,113,0.3)',
              borderRadius: 20,
              padding: 20,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>{log.name}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }}>{log.date}</Text>
              </View>
              <Text style={{ 
                color: log.status === 'Completed' ? '#00FFED' : '#F87171', 
                fontWeight: '800', 
                fontSize: 14 
              }}>
                {log.status.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}