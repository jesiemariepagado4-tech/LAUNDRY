import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';

// --- FIREBASE IMPORTS ---
import { doc, onSnapshot, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function AchievementBadgesScreen({ navigation }) {
  // State
  const [userXp, setUserXp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // --- FETCH REAL-TIME USER XP ---
  useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserXp(docSnap.data().xpBalance || 0);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- DISCOUNT TIERS ---
  const rewardTiers = [
    { 
      id: 1, 
      cost: 200, 
      title: '10% Discount', 
      desc: 'Get 10% off your entire next laundry pickup.', 
      icon: '🎟️', 
      code: 'DISCOUNT_10' 
    },
    { 
      id: 2, 
      cost: 400, 
      title: '20% Discount', 
      desc: 'Get 20% off your entire next laundry pickup.', 
      icon: '🎫', 
      code: 'DISCOUNT_20' 
    },
    { 
      id: 3, 
      cost: 1000, 
      title: '50% Discount', 
      desc: 'Half price! Get 50% off your next laundry pickup.', 
      icon: '💎', 
      code: 'DISCOUNT_50',
      premium: true
    }
  ];

  // Handle XP Info Tap
  const handleUseCoins = () => {
    if (userXp <= 0) {
      Alert.alert("No XP Left", "Complete more laundry missions to earn XP!");
      return;
    }

    Alert.alert(
      "Your Armory Funds",
      `You currently have ${userXp} XP.\n\nTap on any of the discount badges below to unlock them and save on your next pickup!`
    );
  };

  // Handle Reward Unlock
  const handleRewardUnlock = (cost, code, title) => {
    if (userXp < cost) {
      Alert.alert("Not Enough XP", `You need ${cost} XP to unlock this. You currently have ${userXp}.`);
      return;
    }

    Alert.alert(
      "Unlock Discount?",
      `Spend ${cost} XP to get ${title}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Unlock Now", 
          onPress: async () => {
            setIsRedeeming(true);
            try {
              const userRef = doc(db, 'users', auth.currentUser.uid);
              // Securely deduct XP and save the discount code
              await updateDoc(userRef, {
                xpBalance: increment(-cost), 
                activeDiscounts: arrayUnion(code) 
              });
              Alert.alert("✅ Success!", `${title} Unlocked! It will automatically apply to your next booking.`);
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Transaction failed. Please check your connection.");
            } finally {
              setIsRedeeming(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView 
        style={{ flex: 1, padding: 24 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 30, fontWeight: '900', color: '#00FFED' }}>Rewards Armory</Text>
        </View>

        {/* User XP Wallet */}
        <Pressable 
          onPress={handleUseCoins}
          style={({ pressed }) => ({
            backgroundColor: 'rgba(255, 20, 147, 0.15)', // Changed to Pink vibe
            borderWidth: 2,
            borderColor: '#FF1493',
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
            {isLoading ? (
              <ActivityIndicator color="#FF1493" style={{ marginRight: 15 }} />
            ) : (
              <Text style={{ fontSize: 28, marginRight: 10 }}>🎁</Text>
            )}
            <View>
              <Text style={{ color: '#FF1493', fontSize: 18, fontWeight: '700' }}>Available Funds</Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800' }}>{userXp} XP</Text>
            </View>
          </View>
          <Text style={{ color: '#FF1493', fontSize: 16, fontWeight: '600' }}>HOW TO USE →</Text>
        </Pressable>

        {/* Reward Tiers List */}
        <View style={{ gap: 16 }}>
          {rewardTiers.map((reward) => {
            const isAffordable = userXp >= reward.cost;
            
            return (
              <Pressable 
                key={reward.id}
                onPress={() => handleRewardUnlock(reward.cost, reward.code, reward.title)}
                disabled={isRedeeming}
                style={({ pressed }) => ({
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 2,
                  borderColor: isAffordable ? '#00FFED' : 'rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  padding: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  opacity: pressed ? 0.8 : (isAffordable ? 1 : 0.6),
                })}
              >
                <Text style={{ fontSize: 40, marginRight: 20, opacity: isAffordable ? 1 : 0.5 }}>
                  {reward.icon}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
                    {reward.title} {reward.premium && <Text style={{ color: '#FFD700' }}>★</Text>}
                  </Text>
                  <Text style={{ color: '#00FFED', fontSize: 14, opacity: 0.8 }}>
                    {reward.desc}
                  </Text>
                  
                  {isAffordable ? (
                    <Text style={{ color: '#00FF88', fontSize: 13, marginTop: 6, fontWeight: 'bold' }}>
                      Tap to unlock for {reward.cost} XP
                    </Text>
                  ) : (
                    <Text style={{ color: '#FF6666', fontSize: 13, marginTop: 6 }}>
                      Need {reward.cost - userXp} more XP
                    </Text>
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