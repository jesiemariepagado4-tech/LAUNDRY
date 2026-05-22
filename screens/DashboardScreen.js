import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;   // Better detection for iPhone sizes
  const isWeb = width > 768;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      {/* Top Header */}
      <View style={{
        backgroundColor: '#1A0D3A',
        padding: isSmallPhone ? 18 : 24,
        paddingTop: isSmallPhone ? 50 : 48,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#00FFED'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: isSmallPhone ? 52 : 56,
            height: isSmallPhone ? 52 : 56,
            borderRadius: 999,
            borderWidth: 4,
            borderColor: '#00FFED',
            backgroundColor: '#FF1493',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: isSmallPhone ? 12 : 16,
          }}>
            <Text style={{ fontSize: isSmallPhone ? 30 : 32 }}>🧑‍🚀</Text>
          </View>
          <View>
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: isSmallPhone ? 19 : 21, 
              fontWeight: '900', 
              letterSpacing: 0.5 
            }}>
              Welcome, Captain_Wash!
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#FF1493', fontSize: isSmallPhone ? 12 : 13, fontWeight: '700' }}>Lvl 12</Text>
              <View style={{ 
                width: isSmallPhone ? 72 : 80, 
                height: 6, 
                backgroundColor: '#334155', 
                borderRadius: 999, 
                marginLeft: 10, 
                overflow: 'hidden' 
              }}>
                <View style={{ width: '48%', height: '100%', backgroundColor: '#FF1493' }} />
              </View>
              <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: isSmallPhone ? 11 : 12, marginLeft: 8 }}>
                1.2K / 2.5K XP
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('AlertComms')}>
          <Text style={{ fontSize: 28, color: '#00FFED', opacity: 0.9 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ 
        flex: 1, 
        paddingHorizontal: isSmallPhone ? 16 : 24, 
        paddingTop: 24, 
        paddingBottom: 110 
      }}>
        
        {/* Active Missions */}
        <Text style={{ 
          color: '#00FFED', 
          fontSize: isSmallPhone ? 19 : 20, 
          fontWeight: '900', 
          letterSpacing: 1, 
          marginBottom: 14 
        }}>
          Active Missions
        </Text>

        <TouchableOpacity 
          style={{
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderWidth: 2,
            borderColor: 'rgba(0,255,237,0.3)',
            borderRadius: 20,
            padding: isSmallPhone ? 16 : 20,
            marginBottom: 32
          }}
          onPress={() => navigation.navigate('MissionProgress')}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 16 : 18, fontWeight: '900' }}>
              Mission: Fresh Clothes
            </Text>
            <Text style={{ backgroundColor: '#FF1493', color: '#FFFFFF', fontSize: 12, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999 }}>
              #882
            </Text>
          </View>
          <Text style={{ color: '#FFFFFF', opacity: 0.75, marginBottom: 12 }}>Pickup: Today @ 2:00 PM</Text>
          
          <View style={{ height: 7, backgroundColor: '#334155', borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ width: '85%', height: '100%', backgroundColor: '#00FFED' }} />
          </View>
          <Text style={{ color: '#00FFED', fontSize: 12.5, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>
            CLEANING_IN_PROGRESS (85%)
          </Text>
        </TouchableOpacity>

        {/* Daily Quest */}
        <Text style={{ 
          color: '#FF1493', 
          fontSize: isSmallPhone ? 19 : 20, 
          fontWeight: '900', 
          letterSpacing: 1, 
          marginBottom: 14 
        }}>
          Daily Quest
        </Text>

        <View style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 2,
          borderColor: 'rgba(255,20,147,0.3)',
          borderRadius: 20,
          padding: isSmallPhone ? 16 : 20,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Text style={{ fontSize: isSmallPhone ? 42 : 48, marginRight: 18 }}>🏆</Text>
          <View>
            <Text style={{ color: '#FFFFFF', fontSize: isSmallPhone ? 16 : 17, fontWeight: '700' }}>
              Wash 5 full loads
            </Text>
            <Text style={{ color: '#FFFFFF', opacity: 0.65, fontSize: 14 }}>Rewards: Super Scent Bonus!</Text>
          </View>
        </View>

        {/* Big Button */}
        <TouchableOpacity 
          style={{
            marginTop: 36,
            backgroundColor: '#00FFED',
            paddingVertical: isSmallPhone ? 16 : 20,
            borderRadius: 999,
            alignItems: 'center',
            borderBottomWidth: 6,
            borderBottomColor: '#00C2B4'
          }}
          onPress={() => navigation.navigate('PickupQuest')}
        >
          <Text style={{ 
            color: '#1A0D3A', 
            fontSize: isSmallPhone ? 18 : 20, 
            fontWeight: '900', 
            letterSpacing: 1 
          }}>
            NEW PICKUP QUEST
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        backgroundColor: '#1A0D3A',
        borderWidth: 2,
        borderColor: 'rgba(0,255,237,0.6)',
        borderRadius: 999,
        padding: 10,
        flexDirection: 'row',
        justifyContent: 'space-around',
      }}>
        <TouchableOpacity style={{ alignItems: 'center', flex: 1 }} onPress={() => navigation.navigate('Dashboard')}>
          <Text style={{ fontSize: 26 }}>🎮</Text>
          <Text style={{ color: '#00FFED', fontSize: 10, fontWeight: '700', marginTop: 2 }}>HOME</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('PickupQuest')}>
          <Text style={{ fontSize: 26 }}>🧺</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>QUEST</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('CommandCenter')}>
          <Text style={{ fontSize: 26 }}>📊</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>HQ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ alignItems: 'center', flex: 1, opacity: 0.6 }} onPress={() => navigation.navigate('HeroSpecs')}>
          <Text style={{ fontSize: 26 }}>👤</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 10, marginTop: 2 }}>SPECS</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}