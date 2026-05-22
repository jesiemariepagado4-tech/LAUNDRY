  import React from 'react';
  import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';

  export default function MissionProgressScreen({ navigation }) {
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
              Mission Progress
            </Text>
          </View>

          {/* Mission Info Card */}
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 2,
            borderColor: 'rgba(255,20,147,0.4)',
            borderRadius: 20,
            padding: 20,
            marginBottom: 40
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ 
                color: '#FF1493', 
                fontSize: 22, 
                fontWeight: '900', 
                marginRight: 12 
              }}>#882</Text>
              <View>
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>Wash & Fold Mission</Text>
                <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: 14 }}>Hero Base: Unit 401</Text>
              </View>
            </View>
          </View>

          {/* Timeline - More Space Between Icon and Text */}
          <View style={{ position: 'relative', paddingLeft: 46 }}>
            {/* Vertical Line */}
            <View style={{
              position: 'absolute',
              left: 19,
              top: 18,
              bottom: 10,
              width: 3,
              backgroundColor: '#334155',
            }} />

            {/* Step 1 - Mission Accepted */}
            <View style={{ marginBottom: 80, position: 'relative' }}>
              <View style={{
                position: 'absolute',
                left: -6,
                top: 4,
                width: 34,
                height: 34,
                borderRadius: 999,
                backgroundColor: '#00FFED',
                borderWidth: 4,
                borderColor: '#2D1A5B',
                alignItems: 'center',
                justifyContent: 'center'
              }} />
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginLeft: 42 }}>Mission Accepted</Text>
              <Text style={{ color: '#00FFED', fontSize: 13.5, fontWeight: '700', marginLeft: 42, marginTop: 2 }}>10:05 AM</Text>
            </View>

            {/* Step 2 - Hero En Route */}
            <View style={{ marginBottom: 80, position: 'relative', opacity: 0.45 }}>
              <View style={{
                position: 'absolute',
                left: -6,
                top: 4,
                width: 34,
                height: 34,
                borderRadius: 999,
                backgroundColor: '#475569',
                borderWidth: 4,
                borderColor: '#2D1A5B',
                alignItems: 'center',
                justifyContent: 'center'
              }} />
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginLeft: 42 }}>Hero En Route 🚚</Text>
              <Text style={{ color: '#FFFFFF', opacity: 0.6, fontSize: 13.5, marginLeft: 42, marginTop: 2 }}>Pending...</Text>
            </View>

            {/* Step 3 - Cleaning Ops */}
            <View style={{ position: 'relative', opacity: 0.45 }}>
              <View style={{
                position: 'absolute',
                left: -6,
                top: 4,
                width: 34,
                height: 34,
                borderRadius: 999,
                backgroundColor: '#475569',
                borderWidth: 4,
                borderColor: '#2D1A5B',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{ fontSize: 18 }}>🔒</Text>
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginLeft: 42 }}>Cleaning Ops</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }