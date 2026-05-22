import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AlertCommsScreen({ navigation }) {
  return (
    <SafeAreaView className="flex-1 bg-purpleBg p-8">
      <TouchableOpacity className="flex-row items-center mb-8" onPress={() => navigation.goBack()}>
        <Text className="text-2xl text-aqua mr-4">◀</Text>
        <Text className="text-3xl font-bold text-aqua">Alert Comms</Text>
      </TouchableOpacity>

      <ScrollView className="space-y-4">
        <View className="p-5 bg-pink/10 border-l-8 border-pink rounded-r-2xl relative overflow-hidden mb-4">
          <Text className="text-sm font-bold text-pink mb-1">!! LEVEL UP !!</Text>
          <Text className="text-sm text-white/90 leading-relaxed">You’ve reached Level 12! Enclosed is your 10% discount power-up!</Text>
        </View>
        
        <View className="p-5 bg-aqua/10 border-l-8 border-aqua rounded-r-2xl">
          <Text className="text-sm font-bold text-aqua mb-1">MISSION REMINDER</Text>
          <Text className="text-sm text-white/90 leading-relaxed">Agent J arrives in 15 mins. Get your laundry ready!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}