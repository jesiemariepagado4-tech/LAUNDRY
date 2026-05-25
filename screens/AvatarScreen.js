import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function AvatarScreen({ navigation }) {
  const [skin, setSkin] = useState(null);
  const [heroName, setHeroName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (auth) setIsReady(true);
  }, []);

  const updateField = (setter, value) => {
    setErrorMessage('');
    setter(value);
  };

  const handleJoinSquad = async () => {
    setErrorMessage('');

    if (!skin) { setErrorMessage("Please choose an avatar skin."); return; }
    if (!heroName.trim()) { setErrorMessage("Please enter a Hero Name."); return; }
    if (!email.trim()) { setErrorMessage("Please enter your email."); return; }
    if (!password || password.length < 6) { setErrorMessage("Password must be at least 6 characters."); return; }
    if (password !== confirmPassword) { setErrorMessage("Passcodes do not match."); return; }
    if (!agreed) { setErrorMessage("You must agree to the Hero's Code."); return; }

    setLoading(true);

    // 3-Second Loading Delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        heroName: heroName.trim(),
        skin: skin,
        email: email.toLowerCase(),
        createdAt: new Date().toISOString(),
        xp: 25
      });
      navigation.navigate('Login');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage("This email is already in use. Please use another one.");
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage("The email address is invalid.");
      } else {
        setErrorMessage(error.message);
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
                <TouchableOpacity key={emoji} onPress={() => { setSkin(emoji); setErrorMessage(''); }} style={{ width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: isSelected ? '#ff0d87' : 'rgba(255,255,255,0.1)', borderWidth: isSelected ? 4 : 0, borderColor: '#02ffd2' }}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <TextInput placeholder="HERO_NAME" value={heroName} onChangeText={(val) => updateField(setHeroName, val)} placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />
          <TextInput placeholder="COMMS_CHANNEL (EMAIL)" value={email} onChangeText={(val) => updateField(setEmail, val)} keyboardType="email-address" placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />
          <TextInput placeholder="SECURE_PASSCODE" value={password} onChangeText={(val) => updateField(setPassword, val)} secureTextEntry placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />
          <TextInput placeholder="RE-TYPE_PASSCODE" value={confirmPassword} onChangeText={(val) => updateField(setConfirmPassword, val)} secureTextEntry placeholderTextColor="rgba(255,255,255,0.4)" style={{ width: '100%', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 9999, color: '#ffffff', borderWidth: 2, borderColor: 'rgba(2,255,210,0.1)', paddingHorizontal: 24 }} />

          {errorMessage ? (
            <Text style={{ color: '#ff0d87', textAlign: 'center', marginVertical: 10, fontWeight: 'bold' }}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
            onPress={() => { setAgreed(!agreed); setErrorMessage(''); }}
          >
            <View style={{ width: 20, height: 20, borderWidth: 2, borderColor: '#ff0d87', backgroundColor: agreed ? '#ff0d87' : 'transparent', marginRight: 10, borderRadius: 4 }} />
            <Text style={{ color: '#ffffff', fontSize: 14 }}>
              I agree to the <Text style={{ color: '#ff0d87', fontWeight: 'bold' }}>Hero's Code</Text>
            </Text>
          </TouchableOpacity>

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