import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, 
  useWindowDimensions, Alert, ActivityIndicator, Modal, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { WebView } from 'react-native-webview';
import { Svg, Path } from 'react-native-svg';
import * as Location from 'expo-location';

import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../config/firebase'; 

export default function PickupQuestScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;
  const webViewRef = useRef(null);

  const [laundryServices, setLaundryServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [service, setService] = useState(null); 
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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'services'), (snapshot) => {
      const servicesData = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const isDeleted = data.isDeleted || data.isArchived || data.status === 'deleted' || data.status === 'archived';
        if (!isDeleted) {
          servicesData.push({ id: docSnap.id, ...data });
        }
      });
      
      servicesData.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeA - timeB; 
      });

      setLaundryServices(servicesData);
      
      if (servicesData.length > 0 && !service) {
        const firstActive = servicesData.find(s => s.isActive !== false && s.status !== 'deactivated' && s.status !== 'inactive');
        if (firstActive) {
          setService(firstActive.id);
        }
      }
      
      setIsLoadingServices(false);
    }, (error) => {
      console.error("Error fetching services:", error);
      setIsLoadingServices(false);
    });

    return () => unsubscribe();
  }, []);

  const selectedServiceData = laundryServices.find(s => s.id === service);

  // FIX: Added headers to the fetch request in the HTML so map clicks don't fail
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
          
          fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng, {
            headers: { 'User-Agent': 'LabU App (com.captainwash.labau)' }
          })
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
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=4`, {
          headers: { 'User-Agent': 'LabU App (com.captainwash.labau)' }
        });
        setSuggestions(await res.json());
      } catch(e) {}
    } else setSuggestions([]);
  };

  const selectSuggestion = (item) => {
    setAddress(item.display_name);
    setSuggestions([]);
    moveMapTo(item.lat, item.lon);
  };

  // FIX: Added headers to OpenStreetMap and updated error handling
  const handleAutoLocate = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { 
        Alert.alert('Denied', 'Allow location access in your phone settings.'); 
        setIsLocating(false); 
        return; 
      }
      
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;
      moveMapTo(latitude, longitude);
      
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
        headers: { 'User-Agent': 'LabU App (com.captainwash.labau)' }
      });
      
      const data = await response.json();
      setAddress(data.display_name ? data.display_name : `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
      
    } catch (error) { 
      // This will now show you the actual reason if it fails!
      Alert.alert("Error", error.message || "Could not fetch location."); 
    } finally { 
      setIsLocating(false); 
    }
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

  const handleConfirmBooking = async () => {
    if (!selectedServiceData) {
      Alert.alert("Error", "Please select a laundry service before deploying.");
      return;
    }
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

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      let userDiscount = null;
      if (userSnap.exists()) {
        userDiscount = userSnap.data().activeDiscount || null;
      }

      const docRef = await addDoc(collection(db, 'missions'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        missionId: generatedMissionId,
        serviceType: selectedServiceData.label,
        address: address,
        notes: notes,
        pickupDate: date.toISOString(),
        pickupTime: time.toISOString(),
        displayDateTime: formattedDateTime,
        status: 'pending_pickup', 
        paymentStatus: 'unpaid',
        appliedDiscount: userDiscount, 
        createdAt: serverTimestamp()
      });

      if (userDiscount) {
        await updateDoc(userRef, { activeDiscount: null });
      }

      setIsDeploying(false);

      navigation.reset({
        index: 1,
        routes: [
          { name: 'Dashboard' }, 
          { 
            name: 'MissionProgress', 
            params: {
              missionDocId: docRef.id,         
              displayId: generatedMissionId,   
              service: selectedServiceData.label,
              address: address,
              datetime: formattedDateTime
            }
          }
        ],
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
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" style={{ marginRight: 12 }}>
                <Path d="M15 19L8 12L15 5" stroke="#00FFED" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
          </TouchableOpacity>
          <Text style={{ fontSize: isSmallPhone ? 26 : 30, fontWeight: '900', color: '#00FFED', letterSpacing: 1 }}>NEW PICKUP QUEST</Text>
        </View>

        <View style={{ gap: 32 }}>

          <View>
            <Text style={{ color: '#FF1493', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>1. LAUNDRY SERVICE</Text>
            
            {isLoadingServices ? (
              <View style={{ alignItems: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                <ActivityIndicator color="#00FFED" />
                <Text style={{ color: '#00FFED', marginTop: 10 }}>Syncing Services with HQ...</Text>
              </View>
            ) : laundryServices.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20 }}>
                <Text style={{ color: '#FF1493', fontWeight: 'bold' }}>No services available right now.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {laundryServices.map(item => {
                  const isDeactivated = item.isActive === false || item.status === 'deactivated' || item.status === 'inactive';
                  
                  return (
                    <View key={item.id} style={{ width: 140, opacity: isDeactivated ? 0.6 : 1 }}>
                      <TouchableOpacity 
                        disabled={isDeactivated}
                        onPress={() => setService(item.id)}
                        style={{
                          paddingVertical: 20, borderRadius: 20, borderWidth: 2,
                          borderColor: service === item.id ? '#00FFED' : '#475569',
                          backgroundColor: service === item.id ? 'rgba(0,255,237,0.1)' : 'rgba(255,255,255,0.05)',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 40, marginBottom: 8 }}>{item.icon || '👕'}</Text>
                        <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
                      </TouchableOpacity>

                      {isDeactivated && (
                        <Text style={{ color: '#FF1493', fontSize: 11, textAlign: 'center', marginTop: 6, fontWeight: '600' }}>
                          {item.inactiveReason || item.deactivationReason || 'Temporarily Unavailable'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {selectedServiceData && (
              <View style={{ backgroundColor: 'rgba(0,255,237,0.1)', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: 'rgba(0,255,237,0.3)' }}>
                <Text style={{ color: '#00FFED', fontWeight: '900', fontSize: 16 }}>{selectedServiceData.priceText}</Text>
                <Text style={{ color: '#fff', opacity: 0.8, fontSize: 13, marginTop: 4 }}>{selectedServiceData.desc}</Text>
              </View>
            )}
          </View>

          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>2. PICKUP ADDRESS</Text>
            <TouchableOpacity onPress={() => setShowMapModal(true)} style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: '#00FFED33', borderRadius: 20, padding: 18, minHeight: 110, flexDirection: 'row' }}>
              <Text style={{ color: address ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 16, flex: 1 }}>{address ? address : "Tap to open map & select address..."}</Text>
            </TouchableOpacity>
          </View>

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

          <View>
            <Text style={{ color: '#00FFED', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1 }}>4. ADDITIONAL NOTES (OPTIONAL)</Text>
            <TextInput placeholder="Gate code, instructions..." placeholderTextColor="rgba(255,255,255,0.5)" value={notes} onChangeText={setNotes} multiline style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 2, borderColor: '#00FFED33', borderRadius: 20, padding: 18, color: '#fff', fontSize: 16, minHeight: 90, textAlignVertical: 'top' }} />
          </View>

          <TouchableOpacity 
            onPress={handleConfirmBooking} 
            disabled={isDeploying || !selectedServiceData || laundryServices.length === 0}
            style={{ marginTop: 10, backgroundColor: '#FF1493', paddingVertical: 20, borderRadius: 999, alignItems: 'center', borderBottomWidth: 6, borderBottomColor: '#C40D72', opacity: (laundryServices.length === 0 || !selectedServiceData) ? 0.5 : 1 }}
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