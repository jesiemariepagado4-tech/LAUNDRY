import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  useWindowDimensions, Alert, ActivityIndicator, Modal, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';
import { Svg, Path, Circle } from 'react-native-svg';
import * as Location from 'expo-location';

// Firebase
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase'; 

export default function PickupQuestScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;
  const webViewRef = useRef(null);

  const [service, setService] = useState('wash');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const laundryServices = [
    { 
      id: 'wash', label: 'Wash & Fold', priceText: 'Base Rate: ₱150.00 / kg', desc: 'Final price calculated after weigh-in.',
      svg: <Path d="M4 8H20V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/> 
    },
    { 
      id: 'dry', label: 'Dry Cleaning', priceText: 'Base Rate: ₱450.00 / item', desc: 'Final price calculated after item count.',
      svg: <Path d="M6 5H18L20 9V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V9L6 5Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/> 
    },
    { 
      id: 'premium', label: 'Premium', priceText: 'Base Rate: ₱850.00 / item', desc: 'Subject to inspection and material type.',
      svg: <Path d="M12 2L15 8L22 9L17 14L18 21L12 17L6 21L7 14L2 9L9 8L12 2Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/> 
    }
  ];

  const selectedServiceData = laundryServices.find(s => s.id === service);

  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>body { padding: 0; margin: 0; background-color: #1A0D3A; } #map { height: 100vh; width: 100vw; }</style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([14.5995, 120.9842], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);
        var marker;
        function setLocationFromApp(lat, lng) {
          if (marker) map.removeLayer(marker);
          marker = L.marker([lat, lng]).addTo(map);
          map.setView([lat, lng], 17);
        }
        window.addEventListener('message', function(event) {
          try { var data = JSON.parse(event.data); if(data.action === 'setLocation') setLocationFromApp(data.lat, data.lng); } catch(e){}
        });
        map.on('click', function(e) {
          var lat = e.latlng.lat; var lng = e.latlng.lng;
          setLocationFromApp(lat, lng);
          fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng)
            .then(res => res.json())
            .then(data => {
              var payload = JSON.stringify({ address: data.display_name || ("Lat: " + lat.toFixed(5) + ", Lng: " + lng.toFixed(5)) });
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload); else window.parent.postMessage(payload, "*");
            }).catch(err => {
              var fallback = JSON.stringify({ address: "Lat: " + lat.toFixed(5) + ", Lng: " + lng.toFixed(5) });
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(fallback); else window.parent.postMessage(fallback, "*");
            });
        });
      </script>
    </body>
    </html>
  `;

  const moveMapTo = (lat, lng) => {
    if (Platform.OS === 'web') {
      const iframe = document.getElementById('map-iframe');
      if (iframe) iframe.contentWindow.postMessage(JSON.stringify({ action: 'setLocation', lat, lng }), '*');
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`setLocationFromApp(${lat}, ${lng}); true;`);
    }
  };

  const handleAddressSearch = async (text) => {
    setAddress(text);
    if (text.length > 4) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=4`);
        setSuggestions(await res.json());
      } catch(e) {}
    } else setSuggestions([]);
  };

  const selectSuggestion = (item) => {
    setAddress(item.display_name);
    setSuggestions([]);
    moveMapTo(item.lat, item.lon);
  };

  const handleAutoLocate = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Denied', 'Allow location access.'); setIsLocating(false); return; }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      moveMapTo(latitude, longitude);
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
      const data = await response.json();
      setAddress(data.display_name ? data.display_name : `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
    } catch (error) { Alert.alert("Error", "Could not fetch location."); } finally { setIsLocating(false); }
  };

  const handleMapMessage = (dataString) => {
    try { const data = JSON.parse(dataString); if (data && data.address) setAddress(data.address); } catch (e) {}
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event) => { if (typeof event.data === 'string' && event.data.includes('address')) handleMapMessage(event.data); };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  const handleDatePress = () => {
    if (Platform.OS === 'web') {
      const newDate = window.prompt("Enter Date:", date.toDateString());
      if (newDate && !isNaN(new Date(newDate))) setDate(new Date(newDate));
    } else setShowDatePicker(true);
  };

  const handleTimePress = () => {
    if (Platform.OS === 'web') {
      const newTimeStr = window.prompt("Enter Time:", time.toLocaleTimeString());
      if (newTimeStr) { const parsedTime = new Date(`1970-01-01T${newTimeStr}`); if (!isNaN(parsedTime)) setTime(parsedTime); }
    } else setShowTimePicker(true);
  };

  // --- RESTORED: DEPLOY MISSION DIRECTLY TO FIREBASE ---
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

      // Save directly to Firebase
      await addDoc(collection(db, 'missions'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        missionId: generatedMissionId,
        serviceType: selectedServiceData.label,
        address: address,
        notes: notes,
        pickupDate: date.toISOString(),
        pickupTime: time.toISOString(),
        displayDateTime: formattedDateTime,
        status: 'pending_pickup', // Status before weigh-in
        paymentStatus: 'unpaid',
        createdAt: serverTimestamp()
      });

      setIsDeploying(false);

      // Route directly to tracking screen
      navigation.navigate('MissionProgress', {
        bookingId: generatedMissionId,
        service: selectedServiceData.label,
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
      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" style={{ marginRight: 12 }}>
                <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
          <Text style={{ fontSize: isSmallPhone ? 26 : 30, fontWeight: '900', color: '#00FFED', letterSpacing: 1 }}>NEW PICKUP QUEST</Text>
        </View>

        <View style={{ gap: 32 }}>

          {/* 1. SERVICE WITH PRICING INFO */}
          <View>
            <Text style={{ color: '#FF1493', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>1. LAUNDRY SERVICE</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {laundryServices.map(item => (
                <TouchableOpacity 
                  key={item.id} onPress={() => setService(item.id)}
                  style={{
                    flex: 1, paddingVertical: 20, borderRadius: 20, borderWidth: 2,
                    borderColor: service === item.id ? '#00FFED' : '#475569',
                    backgroundColor: service === item.id ? 'rgba(0,255,237,0.1)' : 'rgba(255,255,255,0.05)',
                    alignItems: 'center'
                  }}
                >
                  <Svg width={40} height={40} viewBox="0 0 24 24" fill="none">{item.svg}</Svg>
                  <Text style={{ color: '#fff', fontWeight: '700', marginTop: 8 }}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Selected Service Pricing Box */}
            <View style={{ backgroundColor: 'rgba(0,255,237,0.1)', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,255,237,0.3)' }}>
              <Text style={{ color: '#00FFED', fontWeight: '900', fontSize: 16 }}>{selectedServiceData.priceText}</Text>
              <Text style={{ color: '#fff', opacity: 0.8, fontSize: 13, marginTop: 4 }}>{selectedServiceData.desc}</Text>
            </View>
          </View>

          {/* 2. ADDRESS */}
          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>2. PICKUP ADDRESS</Text>
            <TouchableOpacity onPress={() => setShowMapModal(true)} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: '#00FFED33', borderRadius: 20, padding: 18, minHeight: 110, flexDirection: 'row' }}>
              <Text style={{ color: address ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 16, flex: 1 }}>{address ? address : "Tap to open map & select address..."}</Text>
            </TouchableOpacity>
          </View>

          {/* 3. DATE & TIME */}
          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>3. PICKUP DATE & TIME</Text>
            <TouchableOpacity onPress={handleDatePress} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 2, borderColor: '#00FFED33' }}>
              <Text style={{ color: '#aaa', fontSize: 13 }}>Date</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{date.toDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleTimePress} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18, borderWidth: 2, borderColor: '#00FFED33' }}>
              <Text style={{ color: '#aaa', fontSize: 13 }}>Time</Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </TouchableOpacity>
          </View>

          {/* 4. NOTES */}
          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>4. ADDITIONAL NOTES (OPTIONAL)</Text>
            <TextInput placeholder="Gate code, instructions..." placeholderTextColor="rgba(255,255,255,0.5)" value={notes} onChangeText={setNotes} multiline style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: '#00FFED33', borderRadius: 20, padding: 18, color: '#fff', fontSize: 16, minHeight: 90, textAlignVertical: 'top' }} />
          </View>

          {/* DEPLOY BUTTON */}
          <TouchableOpacity 
            onPress={handleConfirmBooking} 
            disabled={isDeploying}
            style={{ marginTop: 10, backgroundColor: '#FF1493', paddingVertical: 20, borderRadius: 999, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: '#C40D72' }}
          >
            {isDeploying ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontSize: 19, fontWeight: '900', letterSpacing: 1 }}>CONFIRM & DEPLOY MISSION</Text>}
          </TouchableOpacity>

        </View>

        {Platform.OS !== 'web' && showDatePicker && ( <DateTimePicker value={date} mode="date" display="default" onChange={(e, selectedDate) => { setShowDatePicker(false); if (selectedDate) setDate(selectedDate); }} /> )}
        {Platform.OS !== 'web' && showTimePicker && ( <DateTimePicker value={time} mode="time" display="default" onChange={(e, selectedTime) => { setShowTimePicker(false); if (selectedTime) setTime(selectedTime); }} /> )}
      </ScrollView>

      {/* Map Modal */}
      <Modal visible={showMapModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#2D1A5B', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED', height: '90%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ color: '#00FFED', fontSize: 22, fontWeight: '900', fontStyle: 'italic' }}>📍 DEPLOYMENT ZONE</Text>
            </View>
            <TouchableOpacity onPress={handleAutoLocate} style={{ backgroundColor: '#1A0D3A', paddingVertical: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#475569', flexDirection: 'row' }}>
              {isLocating ? <ActivityIndicator color="#00FFED" /> : <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>🛰️ Auto-Detect Current Location</Text>}
            </TouchableOpacity>
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#475569' }}>
              {Platform.OS === 'web' ? ( <iframe id="map-iframe" srcDoc={leafletHTML} style={{ width: '100%', height: '100%', border: 'none' }} /> ) : ( <WebView ref={webViewRef} source={{ html: leafletHTML }} style={{ flex: 1, width: '100%' }} originWhitelist={['*']} javaScriptEnabled={true} domStorageEnabled={true} onMessage={(event) => handleMapMessage(event.nativeEvent.data)} /> )}
            </View>
            <View style={{ zIndex: 10 }}>
              <TextInput placeholder="Search or type address manually..." placeholderTextColor="#8d85b1" value={address} onChangeText={handleAddressSearch} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, borderRadius: 16, marginBottom: suggestions.length > 0 ? 0 : 20 }} />
              {suggestions.length > 0 && (
                <View style={{ backgroundColor: '#1A0D3A', borderWidth: 1, borderColor: '#00FFED', borderRadius: 12, marginTop: 4, marginBottom: 20, maxHeight: 150, overflow: 'hidden' }}>
                  <ScrollView nestedScrollEnabled={true}>
                    {suggestions.map((item, index) => (
                      <TouchableOpacity key={index} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#475569' }} onPress={() => selectSuggestion(item)}>
                        <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={2}>{item.display_name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={{ backgroundColor: '#FF1493', padding: 18, borderRadius: 999, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '900', letterSpacing: 1 }}>CONFIRM ZONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}