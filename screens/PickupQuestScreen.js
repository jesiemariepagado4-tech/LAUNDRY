import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  useWindowDimensions, Alert, ActivityIndicator, Modal, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';

// --- NEW LOCATION IMPORT ---
import * as Location from 'expo-location';

// Firebase Imports
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase'; 

export default function PickupQuestScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  const [service, setService] = useState('wash');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // State to show a loading spinner on the GPS button
  const [isLocating, setIsLocating] = useState(false);

  // --- UPDATED LEAFLET HTML (NOW INCLUDES REVERSE GEOCODING) ---
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { padding: 0; margin: 0; background-color: #1A0D3A; }
        #map { height: 100vh; width: 100vw; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([14.5995, 120.9842], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        var marker;

        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          
          if (marker) map.removeLayer(marker);
          marker = L.marker(e.latlng).addTo(map);
          
          // Reverse Geocoding API to get real address
          fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng)
            .then(res => res.json())
            .then(data => {
              var fullAddress = data.display_name || ("Lat: " + lat.toFixed(5) + ", Lng: " + lng.toFixed(5));
              var payload = JSON.stringify({ address: fullAddress });
              
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload);
              else window.parent.postMessage(payload, "*");
            })
            .catch(err => {
              var fallback = JSON.stringify({ address: "Lat: " + lat.toFixed(5) + ", Lng: " + lng.toFixed(5) });
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(fallback);
              else window.parent.postMessage(fallback, "*");
            });
        });
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView/iframe
  const handleMapMessage = (dataString) => {
    try {
      const data = JSON.parse(dataString);
      if (data && data.address) setAddress(data.address);
    } catch (e) {
      console.log("Map message parsing error", e);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event) => {
        if (typeof event.data === 'string' && event.data.includes('address')) {
          handleMapMessage(event.data);
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  // --- REAL GPS AUTO-LOCATE FUNCTION ---
  const handleAutoLocate = async () => {
    setIsLocating(true);
    try {
      // 1. Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use auto-detect.');
        setIsLocating(false);
        return;
      }

      // 2. Get Coordinates
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // 3. Convert to Real Address
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      
      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
      }
    } catch (error) {
      Alert.alert("GPS Error", "Could not fetch your location. Please ensure location services are on.");
    } finally {
      setIsLocating(false);
    }
  };

  // --- DATE & TIME ---
  const handleDatePress = () => {
    if (Platform.OS === 'web') {
      const newDate = window.prompt("Enter Date (e.g., May 22, 2026):", date.toDateString());
      if (newDate && !isNaN(new Date(newDate))) setDate(new Date(newDate));
    } else setShowDatePicker(true);
  };

  const handleTimePress = () => {
    if (Platform.OS === 'web') {
      const newTimeStr = window.prompt("Enter Time (e.g., 14:30 or 2:30 PM):", time.toLocaleTimeString());
      if (newTimeStr) {
        const parsedTime = new Date(`1970-01-01T${newTimeStr}`);
        if (!isNaN(parsedTime)) setTime(parsedTime);
      }
    } else setShowTimePicker(true);
  };

  // --- DEPLOY MISSION ---
  const handleConfirmBooking = async () => {
    if (!address.trim()) {
      Alert.alert("Mission Failed", "Please select a pickup address from the map.");
      return;
    }

    if (!auth.currentUser) {
      Alert.alert("Auth Error", "You must be logged in to deploy a mission.");
      return;
    }

    setIsDeploying(true);

    try {
      const generatedMissionId = '#' + Math.floor(100 + Math.random() * 900);
      const formattedDateTime = `${date.toDateString()} at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      let serviceName = 'Wash & Fold';
      if (service === 'dry') serviceName = 'Dry Cleaning';
      if (service === 'premium') serviceName = 'Premium';

      await addDoc(collection(db, 'missions'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        missionId: generatedMissionId,
        serviceType: serviceName,
        address: address,
        pickupDate: date.toISOString(),
        pickupTime: time.toISOString(),
        displayDateTime: formattedDateTime,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setIsDeploying(false);

      navigation.navigate('MissionProgress', {
        bookingId: generatedMissionId,
        service: serviceName,
        address: address,
        datetime: formattedDateTime
      });

    } catch (error) {
      console.error("Error deploying mission: ", error);
      setIsDeploying(false);
      Alert.alert("System Error", "Failed to deploy mission to HQ. Try again.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView 
        style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: isSmallPhone ? 26 : 30, fontWeight: '900', color: '#00FFED', letterSpacing: 1 }}>
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
                  key={item.id} onPress={() => setService(item.id)}
                  style={{
                    flex: 1, paddingVertical: 20, borderRadius: 20, borderWidth: 2,
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
            <TouchableOpacity
              onPress={() => setShowMapModal(true)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: '#00FFED33',
                borderRadius: 20, padding: 18, minHeight: 110,
              }}
            >
              <Text style={{ color: address ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 16 }}>
                {address ? address : "📍 Tap to open map & select address..."}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. DATE & TIME */}
          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>
              3. PICKUP DATE & TIME
            </Text>

            <TouchableOpacity onPress={handleDatePress} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 2, borderColor: '#00FFED33' }}>
              <Text style={{ color: '#aaa', fontSize: 13 }}>Date</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{date.toDateString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleTimePress} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, borderWidth: 2, borderColor: '#00FFED33' }}>
              <Text style={{ color: '#aaa', fontSize: 13 }}>Time</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CONFIRM BUTTON */}
          <TouchableOpacity 
            style={{
              marginTop: 30, backgroundColor: '#FF1493', paddingVertical: 20,
              borderRadius: 999, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: '#C40D72'
            }}
            onPress={handleConfirmBooking}
            disabled={isDeploying}
          >
            {isDeploying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '900', letterSpacing: 1 }}>
                CONFIRM & DEPLOY MISSION
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {Platform.OS !== 'web' && showDatePicker && (
          <DateTimePicker value={date} mode="date" display="default" onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) setDate(selectedDate); }} />
        )}

        {Platform.OS !== 'web' && showTimePicker && (
          <DateTimePicker value={time} mode="time" display="default" onChange={(event, selectedTime) => { setShowTimePicker(false); if (selectedTime) setTime(selectedTime); }} />
        )}
      </ScrollView>

      {/* --- REAL LEAFLET MAP MODAL --- */}
      <Modal visible={showMapModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#2D1A5B', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED', height: '85%' }}>
            
            <Text style={{ color: '#00FFED', fontSize: 22, fontWeight: '900', fontStyle: 'italic', marginBottom: 15 }}>
              📍 DEPLOYMENT ZONE
            </Text>
            
            {/* GPS Auto-Locate Button */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleAutoLocate}
              style={{ backgroundColor: '#1A0D3A', paddingVertical: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#475569', flexDirection: 'row' }}
            >
              {isLocating ? (
                <ActivityIndicator color="#00FFED" />
              ) : (
                <>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>🛰️</Text>
                  <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>Auto-Detect Current Location</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={{ color: '#fff', fontSize: 12, marginBottom: 10, opacity: 0.8, textAlign: 'center' }}>
              - OR - Tap anywhere on the map to pin manually
            </Text>

            {/* The Actual Map */}
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#475569' }}>
              {Platform.OS === 'web' ? (
                <iframe 
                  srcDoc={leafletHTML} 
                  style={{ width: '100%', height: '100%', border: 'none' }} 
                />
              ) : (
                <WebView 
                  source={{ html: leafletHTML }} 
                  style={{ flex: 1 }} 
                  onMessage={(event) => handleMapMessage(event.nativeEvent.data)}
                />
              )}
            </View>

            <TextInput
              placeholder="Full address will appear here..."
              placeholderTextColor="#8d85b1"
              value={address}
              onChangeText={setAddress}
              multiline
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', 
                padding: 16, borderRadius: 16, marginBottom: 20, minHeight: 80, textAlignVertical: 'top'
              }}
            />

            <TouchableOpacity 
              onPress={() => setShowMapModal(false)} 
              style={{ backgroundColor: '#FF1493', padding: 18, borderRadius: 999, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '900', letterSpacing: 1 }}>CONFIRM ZONE</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}