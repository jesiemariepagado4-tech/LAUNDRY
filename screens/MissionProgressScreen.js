import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, ScrollView, useWindowDimensions, 
  ActivityIndicator, Modal, TextInput, StyleSheet, Alert, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Svg, Path, Circle } from 'react-native-svg';

// --- LOCATION & FIREBASE IMPORTS ---
import * as Location from 'expo-location'; 
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export default function MissionProgressScreen({ route, navigation }) {
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 390;

  const { bookingId = '#000', service = 'Laundry', address: initialAddress = 'Unknown Base' } = route.params || {};

  const [missionStatus, setMissionStatus] = useState('pending_pickup');
  const [missionPrice, setMissionPrice] = useState(null); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [missionDocId, setMissionDocId] = useState(''); 
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  
  const [currentService, setCurrentService] = useState(service);
  const [editedAddress, setEditedAddress] = useState('');
  const [editedNotes, setEditedNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // --- MAP STATES ---
  const webViewRef = useRef(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // --- BULLETPROOF FIREBASE LISTENER ---
  useEffect(() => {
    if (!bookingId || !auth.currentUser) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'missions'), 
      where('missionId', '==', bookingId),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot && !snapshot.empty) {
        snapshot.forEach((docSnap) => {
          const docData = docSnap.data();
          setMissionStatus(docData.status || 'pending_pickup');
          setMissionPrice(docData.finalPrice || null); 
          setMissionDocId(docSnap.id); 
          setCurrentService(docData.serviceType || service);
          setEditedAddress(docData.address || initialAddress);
          setEditedNotes(docData.notes || '');
        });
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Firebase Listener Error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [bookingId]);

  const isPending = missionStatus === 'pending' || missionStatus === 'pending_pickup';
  const isWeighIn = missionStatus === 'weigh_in';
  const isAwaitingPayment = missionStatus === 'awaiting_payment';
  const isCleaning = missionStatus === 'cleaning';
  const isCompleted = missionStatus === 'completed';
  const isCancelled = missionStatus === 'cancelled';

  const step1Active = !isCancelled; 
  const step2Active = isWeighIn || isAwaitingPayment || isCleaning || isCompleted;
  const step3Active = isAwaitingPayment || isCleaning || isCompleted;
  const step4Active = isCleaning || isCompleted;
  const step5Active = isCompleted;

  // --- 3D SCENE: VOXEL AGENT + WASHING MACHINE ---
  const threeJsHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>body { margin: 0; overflow: hidden; background-color: #2D1A5B; touch-action: none; }</style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    </head>
    <body>
      <script>
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        // Main group to rotate everything together
        const mainGroup = new THREE.Group();
        scene.add(mainGroup);

        // --- 1. WASHING MACHINE ---
        const machineGroup = new THREE.Group();
        machineGroup.position.set(-1.0, -0.5, 0); // Offset to the left
        mainGroup.add(machineGroup);

        const bodyGeo = new THREE.BoxGeometry(1.8, 2.2, 1.8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
        const machineBody = new THREE.Mesh(bodyGeo, bodyMat);
        machineGroup.add(machineBody);

        const drumGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.81, 32);
        const drumMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
        const drum = new THREE.Mesh(drumGeo, drumMat);
        drum.rotation.x = Math.PI / 2;
        machineGroup.add(drum);

        const glassGeo = new THREE.SphereGeometry(0.58, 32, 32, 0, Math.PI * 2, 0, Math.PI / 4);
        const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x00FFED, transparent: true, opacity: 0.5 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.rotation.x = -Math.PI / 2;
        glass.position.set(0, 0, 0.75);
        machineGroup.add(glass);

        // --- 2. VOXEL AGENT (PERSON) ---
        const personGroup = new THREE.Group();
        personGroup.position.set(1.2, -0.7, 0.5); // Offset to the right
        personGroup.rotation.y = -0.5; // Turn slightly toward machine
        mainGroup.add(personGroup);

        // Head/Helmet
        const headGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xFF1493 }); 
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0, 1.4, 0);
        personGroup.add(head);

        // Visor
        const visorGeo = new THREE.BoxGeometry(0.5, 0.2, 0.75);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0x00FFED });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.45, 0.05);
        personGroup.add(visor);

        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.8, 1.1, 0.5);
        const torsoMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.set(0, 0.4, 0);
        personGroup.add(torso);

        // Arm (Interacting Arm)
        const armGeo = new THREE.BoxGeometry(0.25, 0.9, 0.25);
        const armMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
        
        const armPivot = new THREE.Group();
        armPivot.position.set(-0.55, 0.8, 0); // Shoulder joint
        personGroup.add(armPivot);
        
        const arm = new THREE.Mesh(armGeo, armMat);
        arm.position.set(0, -0.35, 0); 
        armPivot.add(arm);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        const legL = new THREE.Mesh(legGeo, legMat);
        legL.position.set(-0.2, -0.6, 0);
        personGroup.add(legL);
        const legR = new THREE.Mesh(legGeo, legMat);
        legR.position.set(0.2, -0.6, 0);
        personGroup.add(legR);

        // --- 3. DYNAMIC BUBBLES ---
        const bubbles = [];
        const bGeo = new THREE.SphereGeometry(0.15, 16, 16);
        const bMat = new THREE.MeshPhysicalMaterial({ color: 0x00FFED, transparent: true, opacity: 0.8 });
        
        for(let i=0; i<12; i++) {
          const b = new THREE.Mesh(bGeo, bMat);
          b.position.set(-1.0 + (Math.random()-0.5), (Math.random()-0.5), 0.5);
          b.userData = { velocity: new THREE.Vector3((Math.random()-0.5)*0.02, Math.random()*0.05, 0) };
          b.visible = false; 
          scene.add(b);
          bubbles.push(b);
        }

        camera.position.set(0, 0.5, 6.5);

        // --- INTERACTION LOGIC ---
        let isWashing = false;
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let dragHasMoved = false;

        document.addEventListener('pointerdown', (e) => {
          isDragging = true;
          dragHasMoved = false;
          previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        document.addEventListener('pointermove', (e) => {
          if(isDragging) {
            dragHasMoved = true;
            const deltaMove = { x: e.clientX - previousMousePosition.x, y: e.clientY - previousMousePosition.y };
            mainGroup.rotation.y += deltaMove.x * 0.01;
            mainGroup.rotation.x += deltaMove.y * 0.01;
          }
          previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        document.addEventListener('pointerup', (e) => {
          isDragging = false;
          if (!dragHasMoved) {
            isWashing = !isWashing; // Toggle washing sequence on click
            bubbles.forEach(b => b.visible = isWashing);
          }
        });

        // --- ANIMATION LOOP ---
        let clock = 0;
        function animate() {
          requestAnimationFrame(animate);
          clock += 0.15;
          
          if (isWashing) {
            drum.rotation.y -= 0.15;
            
            // Agent moves arm to "operate" machine
            armPivot.rotation.x = Math.sin(clock) * 0.6 - 0.6; 
            
            // Machine vibrates
            machineGroup.position.x = -1.0 + (Math.random() - 0.5) * 0.03;
            machineGroup.position.y = -0.5 + (Math.random() - 0.5) * 0.03;
            
            // Floating bubbles
            bubbles.forEach(b => {
              b.position.add(b.userData.velocity);
              if(b.position.y > 3) {
                b.position.set(-1.0 + (Math.random()-0.5), 0, 0.5); 
              }
            });
          } else {
            machineGroup.position.set(-1.0, -0.5, 0);
            armPivot.rotation.x = 0; 
          }

          renderer.render(scene, camera);
        }
        animate();
      </script>
    </body>
    </html>
  `;

  // --- LEAFLET MAP HTML ---
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

  // --- MAP LOGIC FUNCTIONS ---
  const moveMapTo = (lat, lng) => {
    if (Platform.OS === 'web') {
      const iframe = document.getElementById('map-iframe');
      if (iframe) iframe.contentWindow.postMessage(JSON.stringify({ action: 'setLocation', lat, lng }), '*');
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`setLocationFromApp(${lat}, ${lng}); true;`);
    }
  };

  const handleAddressSearch = async (text) => {
    setEditedAddress(text);
    if (text.length > 4) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=4`);
        setSuggestions(await res.json());
      } catch(e) {}
    } else setSuggestions([]);
  };

  const selectSuggestion = (item) => {
    setEditedAddress(item.display_name);
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
      setEditedAddress(data.display_name ? data.display_name : `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`);
    } catch (error) { Alert.alert("Error", "Could not fetch location."); } finally { setIsLocating(false); }
  };

  const handleMapMessage = (dataString) => {
    try { const data = JSON.parse(dataString); if (data && data.address) setEditedAddress(data.address); } catch (e) {}
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event) => { if (typeof event.data === 'string' && event.data.includes('address')) handleMapMessage(event.data); };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, []);

  // --- ACTION HANDLERS ---
  const handleSaveUpdate = async () => {
    if (!editedAddress.trim()) { Alert.alert("Error", "Address cannot be empty."); return; }
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'missions', missionDocId), { 
        address: editedAddress, 
        notes: editedNotes 
      });
      Alert.alert("Success", "Mission manifest updated!");
      setIsEditModalVisible(false);
    } catch (error) { 
      console.error(error);
      Alert.alert("Error", "Failed to patch manifest."); 
    } 
    finally { setIsUpdating(false); }
  };

  const executeCancelMission = async () => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'missions', missionDocId), { status: 'cancelled' });
      setIsCancelModalVisible(false);
    } catch (error) { Alert.alert("Error", "Could not abort."); } 
    finally { setIsUpdating(false); }
  };

  const handleAuthorizePayment = async () => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'missions', missionDocId), { status: 'cleaning', paymentStatus: 'paid' });
      Alert.alert("Funds Cleared", "Payment accepted. Cleaning operations are a go!");
    } catch (error) { Alert.alert("Error", "Payment failed."); } 
    finally { setIsUpdating(false); }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00FFED" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: isSmallPhone ? 20 : 24, paddingTop: 20 }}>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
            <Text style={{ fontSize: 28, color: '#00FFED', marginRight: 12 }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: isSmallPhone ? 26 : 30, fontWeight: '900', color: '#00FFED', letterSpacing: 1 }}>
            Mission Progress
          </Text>
        </View>

        {/* --- 3D SCENE: VOXEL AGENT --- */}
        {!isCancelled && (
          <View style={{ height: 260, borderRadius: 20, overflow: 'hidden', marginBottom: 20, backgroundColor: 'transparent' }}>
            {Platform.OS === 'web' ? (
              <iframe 
                srcDoc={threeJsHTML} 
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'transparent' }} 
                title="3D Animation"
              />
            ) : (
              <WebView 
                source={{ html: threeJsHTML }} 
                style={{ flex: 1, backgroundColor: 'transparent' }} 
                scrollEnabled={false}
                originWhitelist={['*']}
              />
            )}
            <View style={{ position: 'absolute', bottom: 10, alignSelf: 'center', pointerEvents: 'none', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 }}>
              <Text style={{ color: '#00FFED', fontSize: 11, fontWeight: 'bold' }}>
                👆 Drag to Spin • Tap to Wash
              </Text>
            </View>
          </View>
        )}

        {/* Mission Info Card */}
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 2, borderColor: isCancelled ? '#F87171' : 'rgba(255,20,147,0.4)',
          borderRadius: 20, padding: 20, marginBottom: 20
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: isCancelled ? '#F87171' : '#FF1493', fontSize: 22, fontWeight: '900', marginRight: 12 }}>
              {bookingId}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '900' }}>{currentService} Mission</Text>
              <Text style={{ color: '#FFFFFF', opacity: 0.7, fontSize: 14 }} numberOfLines={2}>Zone: {editedAddress}</Text>
            </View>
          </View>
          {isCancelled && <Text style={{ color: '#F87171', fontWeight: 'bold', marginTop: 10, textAlign: 'center' }}>MISSION ABORTED</Text>}
        </View>

        {/* --- HORIZONTAL UPDATE & CANCEL BUTTONS --- */}
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

        {/* --- 5-STEP GAMIFIED TIMELINE --- */}
        {!isCancelled && (
          <View style={{ position: 'relative', paddingLeft: 46, marginTop: 10, paddingBottom: 40 }}>
            <View style={{ position: 'absolute', left: 19, top: 18, bottom: 40, width: 3, backgroundColor: '#334155' }} />

            {/* Step 1: Deployed */}
            <View style={{ marginBottom: 60, position: 'relative', opacity: step1Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step1Active ? '#00FFED' : '#475569' }]} />
              <Text style={styles.timelineTitle}>1. Mission Deployed</Text>
              <Text style={[styles.timelineSub, { color: step1Active ? '#00FFED' : '#FFFFFF' }]}>Agent J dispatched to zone.</Text>
            </View>

            {/* Step 2: Extraction & Weigh-In */}
            <View style={{ marginBottom: 60, position: 'relative', opacity: step2Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step2Active ? '#00FFED' : '#475569' }]}>
                {!step2Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>2. HQ Weigh-In ⚖️</Text>
              <Text style={[styles.timelineSub, { color: step2Active ? '#00FFED' : '#FFFFFF' }]}>
                {step2Active ? 'Cargo secured and measured.' : 'Awaiting extraction...'}
              </Text>
            </View>

            {/* Step 3: Secure Payment */}
            <View style={{ marginBottom: isAwaitingPayment ? 30 : 60, position: 'relative', opacity: step3Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step3Active ? '#00FFED' : '#475569' }]}>
                {!step3Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>3. Authorization 💳</Text>
              <Text style={[styles.timelineSub, { color: step3Active ? '#00FFED' : '#FFFFFF' }]}>
                {isAwaitingPayment ? 'Action required to proceed.' : (step4Active ? 'Funds cleared.' : 'Waiting for HQ bill...')}
              </Text>
            </View>

            {/* >> GAMIFIED PAYMENT INJECTION << */}
            {isAwaitingPayment && (
              <View style={{ marginLeft: 42, marginBottom: 60, backgroundColor: 'rgba(255,20,147,0.1)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FF1493' }}>
                <Text style={{ color: '#fff', fontSize: 13, marginBottom: 10 }}>HQ has verified your cargo load.</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <Text style={{ color: '#8d85b1', fontWeight: 'bold' }}>FINAL AMOUNT:</Text>
                  <Text style={{ color: '#00FFED', fontSize: 24, fontWeight: '900' }}>₱{missionPrice || '450.00'}</Text>
                </View>
                <TouchableOpacity 
                  style={{ backgroundColor: '#FF1493', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                  onPress={handleAuthorizePayment}
                  disabled={isUpdating}
                >
                  {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', letterSpacing: 1 }}>AUTHORIZE FUNDS</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4: Cleaning Ops */}
            <View style={{ marginBottom: 60, position: 'relative', opacity: step4Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step4Active ? '#00FFED' : '#475569' }]}>
                {!step4Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>4. Cleaning Ops 🫧</Text>
              <Text style={[styles.timelineSub, { color: step4Active ? '#00FFED' : '#FFFFFF' }]}>
                {step4Active ? 'Washing sequence initiated.' : 'Locked until authorization.'}
              </Text>
            </View>

            {/* Step 5: Complete */}
            <View style={{ position: 'relative', opacity: step5Active ? 1 : 0.45 }}>
              <View style={[styles.timelineNode, { backgroundColor: step5Active ? '#FF1493' : '#475569', borderColor: '#FF1493' }]}>
                {!step5Active && <Text style={{ fontSize: 14 }}>🔒</Text>}
              </View>
              <Text style={styles.timelineTitle}>5. Mission Complete ✨</Text>
              <Text style={[styles.timelineSub, { color: step5Active ? '#FF1493' : '#FFFFFF' }]}>
                {step5Active ? '+50 XP Earned!' : 'Pending finish...'}
              </Text>
            </View>

          </View>
        )}
      </ScrollView>

      {/* --- RESTORED EDIT MODAL WITH MAP TRIGGER --- */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>⚡ LOGISTICS RE-CONFIG</Text>
            
            <Text style={styles.inputLabel}>PICKUP ADDRESS</Text>
            <TouchableOpacity onPress={() => setShowMapModal(true)} style={styles.addressBtn}>
              <Text style={{ color: editedAddress ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                {editedAddress ? editedAddress : "Tap to open map & select address..."}
              </Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>ADDITIONAL NOTES</Text>
            <TextInput style={[styles.textInput, { minHeight: 70 }]} value={editedNotes} onChangeText={setEditedNotes} multiline />
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.cancelBtnText}>DISCARD</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveUpdate} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>COMMIT CHANGES</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- RESTORED REAL LEAFLET MAP MODAL --- */}
      <Modal visible={showMapModal} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#2D1A5B', borderRadius: 24, padding: 24, borderWidth: 2, borderColor: '#00FFED', height: '90%' }}>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }}>
                <Path d="M12 21C16.5 16.5 19 13.2357 19 10C19 6.13401 15.866 3 12 3C8.13401 3 5 6.13401 5 10C5 13.2357 7.5 16.5 12 21Z" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <Circle cx="12" cy="10" r="2" fill="#00FFED"/>
              </Svg>
              <Text style={{ color: '#00FFED', fontSize: 22, fontWeight: '900', fontStyle: 'italic' }}>DEPLOYMENT ZONE</Text>
            </View>
            
            <TouchableOpacity onPress={handleAutoLocate} style={{ backgroundColor: '#1A0D3A', paddingVertical: 14, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#475569', flexDirection: 'row' }}>
              {isLocating ? <ActivityIndicator color="#00FFED" /> : <Text style={{ color: '#00FFED', fontWeight: 'bold' }}>🛰️ Auto-Detect Current Location</Text>}
            </TouchableOpacity>

            <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 15, borderWidth: 1, borderColor: '#475569' }}>
              {Platform.OS === 'web' ? (
                <iframe id="map-iframe" srcDoc={leafletHTML} style={{ width: '100%', height: '100%', border: 'none' }} />
              ) : (
                <WebView ref={webViewRef} source={{ html: leafletHTML }} style={{ flex: 1, width: '100%' }} originWhitelist={['*']} javaScriptEnabled={true} domStorageEnabled={true} onMessage={(event) => handleMapMessage(event.nativeEvent.data)} />
              )}
            </View>

            <View style={{ zIndex: 10 }}>
              <TextInput placeholder="Search or type address manually..." placeholderTextColor="#8d85b1" value={editedAddress} onChangeText={handleAddressSearch} style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, borderRadius: 16, marginBottom: suggestions.length > 0 ? 0 : 20 }} />
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

      {/* --- CANCEL MODAL --- */}
      <Modal visible={isCancelModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { borderColor: '#F87171', paddingVertical: 30 }]}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 15 }}>⚠️</Text>
            <Text style={[styles.modalTitle, { color: '#F87171', textAlign: 'center', marginBottom: 10 }]}>ABORT MISSION?</Text>
            <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 25, fontSize: 14, opacity: 0.9 }}>Are you absolutely sure you want to cancel this laundry pickup? This action cannot be reversed.</Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: '#475569' }]} onPress={() => setIsCancelModalVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: '#8d85b1' }]}>NO, KEEP IT</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#F87171' }]} onPress={executeCancelMission} disabled={isUpdating}>
                {isUpdating ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>YES, CANCEL</Text>}
              </TouchableOpacity>
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