import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';

export default function AlertCommsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ 
            fontSize: isSmallPhone ? 26 : 30, 
            fontWeight: '900', 
            color: '#00FFED', 
            letterSpacing: 1 
          }}>
            Alert Comms
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Level Up Notification */}
          <View style={{
            backgroundColor: 'rgba(255,20,147,0.1)',
            borderLeftWidth: 6,
            borderLeftColor: '#FF1493',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <View style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1 }}>
              <Text style={{ fontSize: 80 }}>🏆</Text>
            </View>
            <Text style={{ color: '#FF1493', fontSize: 15, fontWeight: '700', marginBottom: 6 }}>!! LEVEL UP !!</Text>
            <Text style={{ color: '#FFFFFF', lineHeight: 20 }}>You’ve reached Level 12! Enclosed is your 10% discount power-up!</Text>
          </View>

          {/* Mission Reminder */}
          <View style={{
            backgroundColor: 'rgba(0,255,237,0.1)',
            borderLeftWidth: 6,
            borderLeftColor: '#00FFED',
            borderRadius: 20,
            padding: 20,
            marginBottom: 20
          }}>
            <Text style={{ color: '#00FFED', fontSize: 15, fontWeight: '700', marginBottom: 6 }}>MISSION REMINDER</Text>
            <Text style={{ color: '#FFFFFF', lineHeight: 20 }}>Agent J arrives in 15 mins. Get your laundry ready!</Text>
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}