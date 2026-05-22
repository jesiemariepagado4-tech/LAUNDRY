import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  useWindowDimensions, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PickupQuestScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  const [service, setService] = useState('wash');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleConfirmBooking = () => {
    if (!address.trim()) {
      Alert.alert("Mission Failed", "Please enter pickup address");
      return;
    }

    navigation.navigate('MissionProgress', {
      bookingId: '#883',
      service: service,
      address: address,
      datetime: `${date.toDateString()} at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
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
            NEW PICKUP QUEST
          </Text>
        </View>

        <View style={{ gap: 32 }}>

          {/* 1. SERVICE */}
          <View>
            <Text style={{ color: '#FF1493', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>
              1. LAUNDRY SERVICE
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { id: 'wash', label: 'Wash & Fold', emoji: '🧺' },
                { id: 'dry', label: 'Dry Cleaning', emoji: '👔' },
                { id: 'premium', label: 'Premium', emoji: '✨' }
              ].map(item => (
                <TouchableOpacity 
                  key={item.id}
                  onPress={() => setService(item.id)}
                  style={{
                    flex: 1,
                    paddingVertical: 20,
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: service === item.id ? '#00FFED' : '#475569',
                    backgroundColor: service === item.id ? 'rgba(0,255,237,0.1)' : 'rgba(255,255,255,0.05)',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 40 }}>{item.emoji}</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', marginTop: 8 }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* 2. ADDRESS */}
          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>
              2. PICKUP ADDRESS
            </Text>
            <TextInput
              placeholder="Enter full pickup address..."
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderWidth: 2,
                borderColor: '#00FFED33',
                borderRadius: 20,
                padding: 18,
                color: '#fff',
                fontSize: 16,
                minHeight: 110,
                textAlignVertical: 'top'
              }}
            />
          </View>

          {/* 3. DATE & TIME */}
          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>
              3. PICKUP DATE & TIME
            </Text>

            <TouchableOpacity 
              onPress={() => setShowDatePicker(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: 18,
                marginBottom: 12,
                borderWidth: 2,
                borderColor: '#00FFED33'
              }}
            >
              <Text style={{ color: '#aaa', fontSize: 13 }}>Date</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{date.toDateString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setShowTimePicker(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)',
                borderRadius: 20,
                padding: 18,
                borderWidth: 2,
                borderColor: '#00FFED33'
              }}
            >
              <Text style={{ color: '#aaa', fontSize: 13 }}>Time</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CONFIRM BUTTON */}
          <TouchableOpacity 
            style={{
              marginTop: 30,
              backgroundColor: '#FF1493',
              paddingVertical: 20,
              borderRadius: 999,
              alignItems: 'center',
              borderBottomWidth: 6,
              borderBottomColor: '#C40D72'
            }}
            onPress={handleConfirmBooking}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: 19, 
              fontWeight: '900', 
              letterSpacing: 1 
            }}>
              CONFIRM & DEPLOY MISSION
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date & Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) setTime(selectedTime);
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}