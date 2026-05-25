import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Alert, Pressable } from 'react-native';

export default function AchievementBadgesScreen({ navigation }) {
  // State
  const [userCoinPoints, setUserCoinPoints] = useState(18);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);

  // Mock data for badges
  const badges = [
    { 
      id: 1, 
      title: 'First Orbit', 
      desc: 'Completed your first mission', 
      icon: '🚀',
      action: () => navigation.navigate('MissionProgress', { bookingId: 'FIRST-MISSION' }),
      earned: true 
    },
    { 
      id: 2, 
      title: 'Speed Demon', 
      desc: 'Finished mission under 2 mins', 
      icon: '⚡',
      action: () => Alert.alert("Speed Demon", "You are among the fastest agents!"),
      earned: true 
    },
    { 
      id: 3, 
      title: 'Veteran', 
      desc: 'Reached Level 10', 
      icon: '🎖️',
      action: () => navigation.navigate('HeroSpecs'),
      earned: false 
    },
    { 
      id: 4, 
      title: 'Premium Pioneer', 
      desc: 'Collected 15 coins to unlock Premium', 
      icon: '🌟',
      premium: true 
    },
  ];

  // Handle Coin Usage
  const handleUseCoins = () => {
    if (isPremiumUnlocked) {
      Alert.alert("Cannot Use Coins", "You have already used your coins to unlock Premium Pioneer.");
      return;
    }

    if (userCoinPoints <= 0) {
      Alert.alert("No Coins Left", "You have no coin points remaining.");
      return;
    }

    Alert.alert(
      "Use Your Coins",
      `You have ${userCoinPoints} coin points.\n\nWhat would you like to do?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Spend on Pickups", onPress: () => navigation.navigate('PickupQuest') },
        { text: "Other Rewards", onPress: () => Alert.alert("Rewards", "More spending options coming soon!") },
      ]
    );
  };

  // Handle Premium Unlock
  const handlePremiumUnlock = () => {
    if (isPremiumUnlocked) {
      Alert.alert("Already Used", "You have already unlocked Premium Pioneer with your coins.");
      return;
    }

    if (userCoinPoints >= 15) {
      Alert.alert(
        "Unlock Premium?",
        "Spend 15 coins to unlock Premium Pioneer?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Unlock Now", 
            onPress: () => {
              setUserCoinPoints(prev => prev - 15);
              setIsPremiumUnlocked(true);
              Alert.alert("✅ Success!", "Premium Pioneer Unlocked!");
            }
          }
        ]
      );
    } else {
      Alert.alert("Not Enough Coins", `You need 15 coins. You currently have ${userCoinPoints}.`);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView 
        style={{ flex: 1, padding: 24 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#00FFED' }}>Badges</Text>
        </View>

        <Pressable 
          onPress={handleUseCoins}
          style={({ pressed }) => ({
            backgroundColor: 'rgba(255, 215, 0, 0.15)',
            borderWidth: 2,
            borderColor: '#FFD700',
            borderRadius: 16,
            padding: 16,
            marginBottom: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginRight: 10 }}>🪙</Text>
            <View>
              <Text style={{ color: '#FFD700', fontSize: 18, fontWeight: '700' }}>Coin Points</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>{userCoinPoints}</Text>
            </View>
          </View>
          <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '600' }}>TAP TO USE →</Text>
        </Pressable>

        <View style={{ gap: 16 }}>
          {badges.map((badge) => {
            const isUnlocked = badge.premium ? isPremiumUnlocked : badge.earned;
            
            return (
              <Pressable 
                key={badge.id}
                onPress={badge.premium ? handlePremiumUnlock : badge.action}
                style={({ pressed }) => ({
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 2,
                  borderColor: isUnlocked ? '#FFD700' : 'rgba(0,255,237,0.25)',
                  borderRadius: 20,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : (badge.premium && !isPremiumUnlocked ? 0.7 : 1),
                })}
              >
                <Text style={{ fontSize: 40, marginRight: 20, opacity: isUnlocked ? 1 : 0.3 }}>{badge.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                    {badge.title} {badge.premium && <Text style={{ color: '#FFD700' }}>★</Text>}
                  </Text>
                  <Text style={{ color: '#00FFED', fontSize: 14, opacity: 0.8 }}>
                    {badge.desc}
                  </Text>
                  {badge.premium && !isPremiumUnlocked && (
                    <Text style={{ color: '#FF6666', fontSize: 13, marginTop: 4 }}>Tap to unlock with 15 coins</Text>
                  )}
                  {isUnlocked && (
                    <Text style={{ color: '#00FF88', fontSize: 13, marginTop: 4 }}>✓ Earned.</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}