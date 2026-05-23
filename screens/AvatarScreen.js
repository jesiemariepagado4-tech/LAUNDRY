import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function AvatarScreen({ navigation }) {
  const [skin, setSkin] = useState('🧑‍🚀');
  const [heroName, setHeroName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth) setIsReady(true);
  }, []);

  const handleJoinSquad = async () => {
    if (!heroName.trim()) return Alert.alert("Error", "Please enter a Hero Name");
    if (!email.trim()) return Alert.alert("Error", "Please enter your email");
    if (!password || password.length < 6) return Alert.alert("Error", "Password must be at least 6 characters");
    if (password !== confirmPassword) return Alert.alert("Error", "Passcodes do not match");

    setLoading(true);

    try {
      console.log("🚀 Starting registration...");

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("✅ User created:", userCredential.user.uid);

      await setDoc(doc(db, "users", userCredential.user.uid), {
        heroName: heroName.trim(),
        skin: skin,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString(),
        xp: 25
      });

      console.log("✅ Firestore data saved");

      // Go to Login Screen
      navigation.navigate('Login');

    } catch (error) {
      console.error("❌ Error:", error.code, error.message);
      
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert("Account Exists", "This email is already registered.\nPlease login instead.");
      } else {
        Alert.alert("Registration Failed", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isReady) return <ActivityIndicator size="large" color="#02ffd2" />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D1A5B' }} className="flex-1">
      <ScrollView style={{ padding: 32 }}>
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }} onPress={() => navigation.goBack()}>
          <Text style={{ fontSize: 24, color: '#02ffd2', marginRight: 16 }}>◀</Text>
          <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#02ffd2' }}>NEW AVATAR</Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 12, color: '#02ffd2', fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Hero Skin</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 24, borderWidth: 2, borderColor: 'rgba(2,255,210,0.2)' }}>
            {['🧑‍🚀', '🤖', '🥷', '👩‍🔬'].map((emoji) => {
              const isSelected = skin === emoji;
              return (
                <TouchableOpacity key={emoji} onPress={() => setSkin(emoji)} style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#ff0d87' : 'rgba(255,255,255,0.1)', borderWidth: isSelected ? 4 : 0, borderColor: '#02ffd2' }}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <TextInput placeholder="HERO_NAME" value={heroName} onChangeText={setHeroName} placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />
          <TextInput placeholder="COMMS_CHANNEL (EMAIL)" value={email} onChangeText={setEmail} keyboardType="email-address" placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />
          <TextInput placeholder="SECURE_PASSCODE" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />
          <TextInput placeholder="RE-TYPE_PASSCODE" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />

          <TouchableOpacity 
            style={{ width: '100%', backgroundColor: '#ff0d87', padding: 16, borderRadius: 9999, alignItems: 'center', borderBottomWidth: 5, borderBottomColor: '#C40D72', marginTop: 24 }} 
            onPress={handleJoinSquad}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 }}>JOIN SQUAD +25 XP</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}