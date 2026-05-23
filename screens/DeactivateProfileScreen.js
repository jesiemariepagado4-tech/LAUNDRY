import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, Alert } from 'react-native';

export default function DeactivateProfileScreen({ navigation }) {

  const handleDeactivate = () => {
    Alert.alert(
      "Confirm Deactivation",
      "This action is permanent and your hero data will be lost forever. Do you wish to continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "DEACTIVATE", style: "destructive", onPress: () => console.log("Account Deactivated") }
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 40 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#F87171' }}>Deactivate Profile</Text>
        </View>

        {/* Warning Card */}
        <View style={{
          backgroundColor: 'rgba(248,113,113,0.1)',
          borderWidth: 2,
          borderColor: 'rgba(248,113,113,0.3)',
          borderRadius: 20,
          padding: 24,
          marginBottom: 40
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginBottom: 12 }}>⚠️ Warning</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 24 }}>
            Deactivating your profile will permanently wipe your mission history, achievement badges, and current Hero level. This process cannot be undone.
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity 
          onPress={handleDeactivate}
          style={{
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: '#F87171',
            paddingVertical: 16,
            borderRadius: 999,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#F87171', fontWeight: '900', fontSize: 17, letterSpacing: 1 }}>
            PERMANENTLY DEACTIVATE
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}