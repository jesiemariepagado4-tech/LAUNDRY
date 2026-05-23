import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';

export default function AchievementBadgesScreen({ navigation }) {
  // Mock data for badges
  const badges = [
    { id: 1, title: 'First Orbit', desc: 'Completed your first mission', icon: '🚀' },
    { id: 2, title: 'Speed Demon', desc: 'Finished mission under 2 mins', icon: '⚡' },
    { id: 3, title: 'Veteran', desc: 'Reached Level 10', icon: '🎖️' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView style={{ flex: 1, padding: 24 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#00FFED' }}>Badges</Text>
        </View>

        {/* Badge List */}
        <View style={{ gap: 16 }}>
          {badges.map((badge) => (
            <View key={badge.id} style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderWidth: 2,
              borderColor: 'rgba(0,255,237,0.25)',
              borderRadius: 20,
              padding: 20,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 40, marginRight: 20 }}>{badge.icon}</Text>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>{badge.title}</Text>
                <Text style={{ color: '#00FFED', fontSize: 14, opacity: 0.8 }}>{badge.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}