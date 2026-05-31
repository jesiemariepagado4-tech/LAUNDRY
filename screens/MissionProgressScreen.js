import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, useWindowDimensions, 
  ActivityIndicator, Modal, TextInput, StyleSheet, Alert, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Svg, Path, Circle } from 'react-native-svg';

// --- COMPONENTS & IMPORTS ---
import EwalletModal from '../components/EwalletModal';
import CodAlertModal from '../components/CodAlertModal'; 
import * as Location from 'expo-location'; 
import { doc, onSnapshot, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function MissionProgressScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  const { 
    missionDocId, 
    displayId = '#000', 
    service = 'Laundry', 
    address: initialAddress = 'Unknown Base' 
  } = route.params || {};

  const [missionStatus, setMissionStatus] = useState('pending_pickup');
  const [missionPrice, setMissionPrice] = useState(0); // Admin's Base Bill
  const [missionWeight, setMissionWeight] = useState(null); 
  const [paymentMethod, setPaymentMethod] = useState(null); 
  const [appliedDiscount, setAppliedDiscount] = useState(null); 
  
  // --- NEW: REWARD CHECKOUT STATES ---
  const [userDiscount, setUserDiscount] = useState(null); // The ticket they own
  const [useDiscount, setUseDiscount] = useState(false);  // Toggle checkbox

  const [isLoading, setIsLoading] = useState(true);
  
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  
  const [isEwalletModalVisible, setIsEwalletModalVisible] = useState(false);
  const [isCodModalVisible, setIsCodModalVisible] = useState(false); 

  const [currentService, setCurrentService] = useState(service);
  const [editedAddress, setEditedAddress] = useState(initialAddress);
  const [editedNotes, setEditedNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const webViewRef = useRef(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // --- FIREBASE DUAL-LISTENER (Mission & User Profile) ---
  useEffect(() => {
    if (!missionDocId || !auth.currentUser) {
      setIsLoading(false);
      return;
    }

    // 1. Listen to Mission Updates
    const missionRef = doc(db, 'missions', missionDocId);
    const unsubMission = onSnapshot(missionRef, (docSnap) => {
      if (docSnap.exists()) {
        const docData = docSnap.data();
        setMissionStatus(docData.status || 'pending_pickup');
        setMissionPrice(docData.finalPrice || docData.basePrice || 0); 
        setMissionWeight(docData.weight || null);
        setPaymentMethod(docData.paymentMethod || null);
        setAppliedDiscount(docData.appliedDiscount || null);
        setCurrentService(docData.serviceType || service);
        setEditedAddress(docData.address || initialAddress);
        setEditedNotes(docData.notes || '');
      }
      setIsLoading(false);
    });

    // 2. Listen to User Profile for available discounts
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const discountTicket = docSnap.data().activeDiscount || null;
        setUserDiscount(discountTicket);
        // Auto-check the box if they have a ticket and haven't paid yet
        if (discountTicket && !paymentMethod) setUseDiscount(true);
      }
    });

    return () => { unsubMission(); unsubUser(); };
  }, [missionDocId, paymentMethod]);

  // --- 6-STEP WORKFLOW LOGIC ---
  const isPending = missionStatus === 'pending' || missionStatus === 'pending_pickup';
  const isWeighIn = missionStatus === 'weigh_in';
  const isWashing = missionStatus === 'washing';
  const isReady = missionStatus === 'ready_for_delivery';
  const isOTW = missionStatus === 'otw';
  const isDelivered = missionStatus === 'delivered' || missionStatus === 'completed';
  const isCancelled = missionStatus === 'cancelled';

  const step1Active = !isCancelled; 
  const step2Active = isWeighIn || isWashing || isReady || isOTW || isDelivered;
  const step3Active = isWashing || isReady || isOTW || isDelivered;
  const step4Active = isReady || isOTW || isDelivered;
  const step5Active = isOTW || isDelivered;
  const step6Active = isDelivered;

  // --- MATH CALCULATION FOR CHECKOUT ---
  const baseAmount = parseFloat(missionPrice) || 0;
  const discountSavings = (useDiscount && userDiscount) ? (baseAmount * (userDiscount / 100)) : 0;
  const finalAmountToPay = baseAmount - discountSavings;

  // --- PAYMENT & XP SYSTEM ---
  const processFinalPayment = async (method) => {
    setIsUpdating(true);
    try {
      // XP is based on what they actually paid
      const earnedXp = Math.floor(finalAmountToPay / 10) + 50;

      // 1. Update the Mission with the discounted price and applied ticket
      await updateDoc(doc(db, 'missions', missionDocId), { 
        paymentMethod: method,
        paymentStatus: method === 'cod' ? 'pending_cash' : 'paid',
        status: 'washing',
        finalPrice: finalAmountToPay, // Save the discounted price
        basePrice: baseAmount,        // Keep a record of the original bill
        appliedDiscount: (useDiscount && userDiscount) ? userDiscount : null
      });

      // 2. Grant XP, and BURN the ticket if it was used!
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userUpdates = {
        xpBalance: increment(earnedXp),
        lifetimeXp: increment(earnedXp)
      };
      if (useDiscount && userDiscount) {
        userUpdates.activeDiscount = null; // Ticket consumed
      }
      await updateDoc(userRef, userUpdates);

      setIsEwalletModalVisible(false);
      setIsCodModalVisible(false);
      
      Alert.alert("Funds Cleared ✨", `Payment method secured. Operations advancing to Washing.\n\n🎖️ You earned +${earnedXp} XP!`);
      
    } catch (error) { Alert.alert("Error", "Payment verification failed."); } 
    finally { setIsUpdating(false); }
  };

  // --- MAP & LOCATION LOGIC (UNCHANGED) ---
  const leafletHTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body { padding: 0; margin: 0; background-color: #1A0D3A; } #map { height: 100vh; width: 100vw; }</style></head><body><div id="map"></div><script>var map = L.map('map').setView([14.5995, 120.9842], 13);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);var marker;function setLocationFromApp(lat, lng) {if (marker) map.removeLayer(marker);marker = L.marker([lat, lng]).addTo(map);map.setView([lat, lng], 17);}window.addEventListener('message', function(event) {try { var data = JSON.parse(event.data); if(data.action === 'setLocation') setLocationFromApp(data.lat, data.lng); } catch(e){}});map.on('click', function(e) {var lat = e.latlng.lat; var lng = e.latlng.lng;setLocationFromApp(lat, lng);fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng).then(res => res.json()).then(data => {var payload = JSON.stringify({ address: data.display_name || ("Lat: " + lat.toFixed(5) + ", Lng: " + lng.toFixed(5)) });if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(payload); else window.parent.postMessage(payload, "*");}).catch(err => {var fallback = JSON.stringify({ address: "Lat: " + lat.toFixed(5) + ", Lng: " + lng.toFixed(5) });if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(fallback); else window.parent.postMessage(fallback, "*");});});</script></body></html>`;
  const moveMapTo = (lat, lng) => { if (Platform.OS === 'web') { const iframe = document.getElementById('map-iframe'); if (iframe) iframe.contentWindow.postMessage(JSON.stringify({ action: 'setLocation', lat, lng }), '*'); } else if (webViewRef.current) { webViewRef.current.injectJavaScript(`setLocationFromApp(${lat}, ${lng}); true;`); } };
  const handleAddressSearch = async (text) => { setEditedAddress(text); if (text.length > 4) { try { const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=4`); setSuggestions(await res.json()); } catch(e) {} } else setSuggestions([]); };
  const selectSuggestion = (item) => { setEditedAddress(item.display_name); setSuggestions([]); moveMapTo(item.lat, item.lon); };
  const handleAutoLocate = async () => { setIsLocating(true); try { let { status } = await Location.requestForegroundPermissionsAsync(); if (status !== 'granted') { Alert.alert('Denied', 'Allow location access.'); setIsLocating(false); return; } let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }); const { latitude, longitude } = location.coords; moveMapTo(latitude, longitude); const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`); const data = await response.json(); setEditedAddress(data.display_name ? data.display_name : `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`); } catch (error) { Alert.alert("Error", "Could not fetch location."); } finally { setIsLocating(false); } };
  const handleMapMessage = (dataString) => { try { const data = JSON.parse(dataString); if (data && data.address) setEditedAddress(data.address); } catch (e) {} };
  useEffect(() => { if (Platform.OS === 'web') { const handleWebMessage = (event) => { if (typeof event.data === 'string' && event.data.includes('address')) handleMapMessage(event.data); }; window.addEventListener('message', handleWebMessage); return () => window.removeEventListener('message', handleWebMessage); } }, []);

  const handleSaveUpdate = async () => { if (!editedAddress.trim()) { Alert.alert("Error", "Address cannot be empty."); return; } setIsUpdating(true); try { await updateDoc(doc(db, 'missions', missionDocId), { address: editedAddress, notes: editedNotes }); Alert.alert("Success", "Mission manifest updated!"); setIsEditModalVisible(false); } catch (error) { Alert.alert("Error", "Failed to patch manifest."); } finally { setIsUpdating(false); } };
  const executeCancelMission = async () => { setIsUpdating(true); try { await updateDoc(doc(db, 'missions', missionDocId), { status: 'cancelled' }); setIsCancelModalVisible(false); } catch (error) { Alert.alert("Error", "Could not abort."); } finally { setIsUpdating(false); } };

  if (isLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B', justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#00FFED" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }}>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: isSmallPhone ? 26 : 30, fontWeight: '900', color: '#00FFED', letterSpacing: 1 }}>
            Mission Progress
          </Text>
        </View>

        {/* Mission Info Card */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: isCancelled ? '#F87171' : 'rgba(255,20,147,0.4)', borderRadius: 20, padding: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: isCancelled ? '#F87171' : '#FF1493', fontSize: 22, fontWeight: '900', marginRight: 12 }}>{displayId}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{currentService} Mission</Text>
              <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: 14 }} numberOfLines={2}>Zone: {editedAddress}</Text>
            </View>
          </View>
          
          {isCancelled && <Text style={{ color: '#F87171', fontWeight: 'bold', marginTop: 10, textAlign: 'center' }}>MISSION ABORTED</Text>}
        </View>

        {/* UPDATE & CANCEL BUTTONS */}
        {isPending && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity style={[styles.editTriggerBtn, { flex: 1 }]} onPress={() => setIsEditModalVisible(true)}>
              <Text style={styles.editTriggerText}>EDIT INFO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.editTriggerBtn, { flex: 1, borderColor: '#F87171' }]} onPress={() => setIsCancelModalVisible(true)}>
              <Text style={[styles.editTriggerText, { color: '#F87171' }]}>ABORT</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />

        {/* --- 6-STEP GAMIFIED TIMELINE --- */}
        {!isCancelled && (
          <View style={{ position: 'relative', paddingLeft: 46, marginTop: 10, paddingBottom: 40 }}>
            <View style={{ position: 'absolute', left: 19, top: 18, bottom: 40, width: 3, backgroundColor: '#334155' }} />

            {/* Step 1: Pending Pickup */}
            <View style={{ marginBottom: 60, position: 'relative', opacity: step1Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step1Active ? '#00FFED' : '#475569' }]} />
              <Text style={styles.timelineTitle}>1. Mission Deployed</Text>
              <Text style={[styles.timelineSub, { color: step1Active ? '#00FFED' : '#FFFFFF' }]}>Agent dispatched to zone.</Text>
            </View>

            {/* Step 2: HQ Weigh-In */}
            <View style={{ marginBottom: (isWeighIn && !paymentMethod) ? 30 : 60, position: 'relative', opacity: step2Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step2Active ? '#00FFED' : '#475569' }]}>
                {!step2Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>2. HQ Weigh-In ⚖️</Text>
              <Text style={[styles.timelineSub, { color: step2Active ? '#00FFED' : '#FFFFFF' }]}>
                {step2Active ? 'Cargo secured and measured.' : 'Awaiting extraction...'}
              </Text>
            </View>

            {/* >>> NEW: CHECKOUT PAYMENT INJECTION <<< */}
            {(isWeighIn && !paymentMethod) && (
              <View style={{ marginLeft: 42, marginBottom: 60, backgroundColor: 'rgba(255,20,147,0.1)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#FF1493' }}>
                <Text style={{ color: '#fff', fontSize: 13, marginBottom: 15 }}>HQ has verified your cargo load.</Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ color: '#8d85b1', fontWeight: 'bold' }}>WEIGHT:</Text>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{missionWeight || 0} kg</Text>
                </View>

                {/* Base Bill */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: userDiscount ? 15 : 20 }}>
                  <Text style={{ color: '#8d85b1', fontWeight: 'bold' }}>HQ BASE BILL:</Text>
                  <Text style={{ color: '#fff', fontSize: 18, textDecorationLine: (useDiscount && userDiscount) ? 'line-through' : 'none', opacity: (useDiscount && userDiscount) ? 0.5 : 1 }}>
                    ₱{baseAmount}
                  </Text>
                </View>

                {/* Dynamic Discount Toggle */}
                {userDiscount && (
                  <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,20,147,0.3)', paddingTop: 15, marginBottom: 15 }}>
                    <TouchableOpacity onPress={() => setUseDiscount(!useDiscount)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* Custom Checkbox */}
                        <View style={{ width: 22, height: 22, borderWidth: 2, borderColor: '#FF1493', borderRadius: 6, marginRight: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: useDiscount ? '#FF1493' : 'transparent' }}>
                          {useDiscount && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                        </View>
                        <Text style={{ color: '#FF1493', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 }}>USE {userDiscount}% TICKET</Text>
                      </View>
                      <Text style={{ color: '#FF1493', fontWeight: '900', fontSize: 16 }}>-₱{discountSavings.toFixed(2)}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Final Total */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ color: '#00FFED', fontWeight: '900', letterSpacing: 1 }}>TOTAL TO PAY:</Text>
                  <Text style={{ color: '#00FFED', fontSize: 28, fontWeight: '900' }}>₱{finalAmountToPay.toFixed(2)}</Text>
                </View>
                
                {isUpdating ? (
                  <ActivityIndicator color="#00FFED" style={{ marginVertical: 10 }} />
                ) : (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: '#00FFED', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }} onPress={() => setIsEwalletModalVisible(true)}>
                      <Text style={{ color: '#000', fontWeight: '900', letterSpacing: 1 }}>E-WALLET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#00FFED', paddingVertical: 16, borderRadius: 12, alignItems: 'center' }} onPress={() => setIsCodModalVisible(true)}>
                      <Text style={{ color: '#00FFED', fontWeight: '900', letterSpacing: 1 }}>C.O.D.</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ALREADY PAID BADGE */}
            {paymentMethod && !isWeighIn && (
               <View style={{ marginLeft: 42, backgroundColor: 'rgba(0,255,136,0.1)', borderWidth: 1, borderColor: '#00FF88', borderRadius: 12, padding: 15, marginBottom: 30, alignItems: 'center', flexDirection: 'row' }}>
                 <Text style={{ fontSize: 24, marginRight: 15 }}>✅</Text>
                 <View>
                  <Text style={{ color: '#00FF88', fontWeight: '900', fontSize: 13, letterSpacing: 0.5 }}>PAYMENT AUTHORIZED</Text>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>₱{missionPrice}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 10 }}>
                    <Text style={{ color: '#8d85b1', fontSize: 11 }}>Method: {paymentMethod.toUpperCase()}</Text>
                    {appliedDiscount && (
                      <Text style={{ color: '#FF1493', fontSize: 10, fontWeight: 'bold' }}>🎟️ {appliedDiscount}% APPLIED</Text>
                    )}
                  </View>
                 </View>
               </View>
            )}

            {/* Step 3: Washing Ops */}
            <View style={{ marginBottom: 60, position: 'relative', opacity: step3Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step3Active ? '#00FFED' : '#475569' }]}>
                {!step3Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>3. Washing Ops 🫧</Text>
              <Text style={[styles.timelineSub, { color: step3Active ? '#00FFED' : '#FFFFFF' }]}>
                {step3Active ? 'Cleaning sequence initiated.' : 'Locked until authorization.'}
              </Text>
            </View>

            {/* Step 4: Folded & Ready */}
            <View style={{ marginBottom: 60, position: 'relative', opacity: step4Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step4Active ? '#00FFED' : '#475569' }]}>
                {!step4Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>4. Folded & Ready 👕</Text>
              <Text style={[styles.timelineSub, { color: step4Active ? '#00FFED' : '#FFFFFF' }]}>
                {step4Active ? 'Laundry is fresh and packed.' : 'Pending...'}
              </Text>
            </View>

            {/* Step 5: On The Way */}
            <View style={{ marginBottom: 60, position: 'relative', opacity: step5Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step5Active ? '#00FFED' : '#475569' }]}>
                {!step5Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>5. On The Way 🛵</Text>
              <Text style={[styles.timelineSub, { color: step5Active ? '#00FFED' : '#FFFFFF' }]}>
                {step5Active ? 'Rider is heading to your location.' : 'Pending...'}
              </Text>
            </View>

            {/* Step 6: Complete */}
            <View style={{ position: 'relative', opacity: step6Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step6Active ? '#FF1493' : '#475569', borderColor: '#FF1493' }]}>
                {!step6Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>6. Delivered ✅</Text>
              <Text style={[styles.timelineSub, { color: step6Active ? '#FF1493' : '#FFFFFF' }]}>
                {step6Active ? 'Mission successfully accomplished!' : 'Pending finish...'}
              </Text>
            </View>

          </View>
        )}
      </ScrollView>

      {/* --- PAYMENT MODALS (Receives the final calculated price) --- */}
      <EwalletModal 
        visible={isEwalletModalVisible} 
        onClose={() => setIsEwalletModalVisible(false)} 
        onSuccess={processFinalPayment}
        price={finalAmountToPay.toFixed(2)} // Passes the discounted price to modal!
        isUpdating={isUpdating}
      />

      <CodAlertModal 
        visible={isCodModalVisible}
        onClose={() => setIsCodModalVisible(false)}
        onConfirm={() => processFinalPayment('cod')}
        price={finalAmountToPay.toFixed(2)} // Passes the discounted price to modal!
        isUpdating={isUpdating}
      />

      {/* --- RESTORED EDIT MODAL WITH MAP TRIGGER --- */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>⚡ LOGISTICS RE-CONFIG</Text>
            <Text style={styles.inputLabel}>PICKUP ADDRESS</Text>
            <TouchableOpacity onPress={() => setShowMapModal(true)} style={styles.addressBtn}>
              <Text style={{ color: editedAddress ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>{editedAddress ? editedAddress : "Tap to open map & select address..."}</Text>
            </TouchableOpacity>
            <Text style={styles.inputLabel}>ADDITIONAL NOTES</Text>
            <TextInput style={[styles.textInput, { minHeight: 70 }]} value={editedNotes} onChangeText={setEditedNotes} multiline />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditModalVisible(false)}><Text style={styles.cancelBtnText}>DISCARD</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUpdate} disabled={isUpdating}>{isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>COMMIT CHANGES</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- RESTORED REAL LEAFLET MAP MODAL --- */}
      <Modal visible={showMapModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#2D1A5B', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED', height: '90%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}><Svg width={24} height={24} viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}><Path d="M12 21C16.5 16.5 19 13.2357 19 10C19 6.13401 15.866 3 12 3C8.13401 3 5 6.13401 5 10C5 13.2357 7.5 16.5 12 21Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><Circle cx="12" cy="10" r="2" fill="#00FFED"/></Svg><Text style={{ color: '#00FFED', fontSize: 22, fontWeight: '900', fontStyle: 'italic' }}>DEPLOYMENT ZONE</Text></View>
            <TouchableOpacity onPress={handleAutoLocate} style={{ backgroundColor: '#1A0D3A', paddingVertical: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#475569', flexDirection: 'row' }}>{isLocating ? <ActivityIndicator color="#00FFED" /> : <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>🛰️ Auto-Detect Current Location</Text>}</TouchableOpacity>
            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#475569' }}>{Platform.OS === 'web' ? ( <iframe id="map-iframe" srcDoc={leafletHTML} style={{ width: '100%', height: '100%', border: 'none' }} /> ) : ( <WebView ref={webViewRef} source={{ html: leafletHTML }} style={{ flex: 1, width: '100%' }} originWhitelist={['*']} javaScriptEnabled={true} domStorageEnabled={true} onMessage={(event) => handleMapMessage(event.nativeEvent.data)} /> )}</View>
            <View style={{ zIndex: 10 }}><TextInput placeholder="Search or type address manually..." placeholderTextColor="#8d85b1" value={editedAddress} onChangeText={handleAddressSearch} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, borderRadius: 16, marginBottom: suggestions.length > 0 ? 0 : 20 }} />{suggestions.length > 0 && (<View style={{ backgroundColor: '#1A0D3A', borderWidth: 1, borderColor: '#00FFED', borderRadius: 12, marginTop: 4, marginBottom: 20, maxHeight: 150, overflow: 'hidden' }}><ScrollView nestedScrollEnabled={true}>{suggestions.map((item, index) => (<TouchableOpacity key={index} style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#475569' }} onPress={() => selectSuggestion(item)}><Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={2}>{item.display_name}</Text></TouchableOpacity>))}</ScrollView></View>)}</View>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={{ backgroundColor: '#FF1493', padding: 18, borderRadius: 999, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: '900', letterSpacing: 1 }}>CONFIRM ZONE</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- CANCEL MODAL --- */}
      <Modal visible={isCancelModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { borderColor: '#F87171', paddingVertical: 30 }]}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 15 }}>⚠️</Text>
            <Text style={[styles.modalTitle, { color: '#F87171', textAlign: 'center', marginBottom: 10 }]}>ABORT MISSION?</Text>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 25, fontSize: 14, opacity: 0.9 }}>Are you absolutely sure you want to cancel this laundry pickup? This action cannot be reversed.</Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: '#475569' }]} onPress={() => setIsCancelModalVisible(false)}><Text style={[styles.cancelBtnText, { color: '#8d85b1' }]}>NO, KEEP IT</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#F87171' }]} onPress={executeCancelMission} disabled={isUpdating}>{isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>YES, CANCEL</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  editTriggerBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#00FFED', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  editTriggerText: { color: '#00FFED', fontWeight: '900', letterSpacing: 1, fontSize: 13 },
  timelineNode: { position: 'absolute', left: -6, top: 4, width: 34, height: 34, borderRadius: 999, borderWidth: 4, borderColor: '#2D1A5B', alignItems: 'center', justifyContent: 'center' },
  timelineTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginLeft: 42 },
  timelineSub: { opacity: 0.8, fontSize: 13.5, fontWeight: '700', marginLeft: 42, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#2D1A5B', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED' },
  modalTitle: { color: '#00FFED', fontSize: 20, fontWeight: '900', fontStyle: 'italic', marginBottom: 20 },
  inputLabel: { color: '#FF1493', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, marginBottom: 18, textAlignVertical: 'top' },
  addressBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: '#475569', borderRadius: 12, padding: 14, minHeight: 60, marginBottom: 18, justifyContent: 'center' },
  modalButtonRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center' },
  cancelBtnText: { color: '#FFF', fontWeight: '700', letterSpacing: 0.5, fontSize: 13 },
  saveBtn: { flex: 2, paddingVertical: 16, borderRadius: 999, backgroundColor: '#FF1493', alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '900', letterSpacing: 0.5, fontSize: 13 }
});