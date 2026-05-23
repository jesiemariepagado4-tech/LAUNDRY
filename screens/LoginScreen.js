import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  StatusBar,
  Alert 
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
// Added AsyncStorage import
import AsyncStorage from '@react-native-async-storage/async-storage';
// Added GoogleAuthProvider and signInWithPopup
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function LoginScreen({ navigation }) {
  const [recruitId, setRecruitId] = useState('');
  const [secretPassword, setSecretPassword] = useState('');

  // Updated handleLogin function to store session
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, recruitId, secretPassword);
      // Store the session in local storage
      await AsyncStorage.setItem('@user_session', JSON.stringify(userCredential.user));
      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    }
  };

  // Added Google Sign-In function
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      // Store the session in local storage
      await AsyncStorage.setItem('@user_session', JSON.stringify(userCredential.user));
      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Google Login Failed', error.message);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1, backgroundColor: '#2D1A5B', width: '100%' }}
      className="flex-1 items-center justify-center" 
    >
      <StatusBar barStyle="light-content" />
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }} 
        style={{ width: '100%' }}
        className="w-full px-6 md:px-0"
        showsVerticalScrollIndicator={false}
      >
        {/* Maximum responsive content container block */}
        <View style={{ width: '100%', maxWidth: 360, paddingHorizontal: 24, paddingVertical: 32, marginVertical: 'auto' }} className="w-full max-w-sm sm:max-w-md my-auto py-8">
          
          {/* Neon Laundry Mascot Character Vector */}
          <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }} className="items-center mb-4 mt-2">
            <Svg width="180" height="180" viewBox="0 0 100 100">
              {/* Soft Backwards Neon Blue Glow */}
              <Circle cx="50" cy="55" r="28" fill="none" stroke="#00FFED" strokeWidth="6" opacity="0.15" />
              
              {/* Clothes Inside Basket (Pink & Cyan Layers) */}
              <Path d="M35 32 C35 24, 45 24, 45 32 Z" fill="#FF1493" opacity="0.8" />
              <Path d="M42 28 C42 20, 55 20, 55 28 Z" fill="#00FFED" opacity="0.9" />
              <Path d="M52 30 C52 22, 65 22, 65 30 Z" fill="#FF1493" opacity="0.6" />
              
              {/* Basket Handle */}
              <Path d="M32 35 C32 15, 68 15, 68 35" fill="none" stroke="#00FFED" strokeWidth="2.5" strokeLinecap="round" />
              
              {/* Main Laundry Basket Body */}
              <Path 
                d="M30 36 L70 36 C74 36, 76 40, 74 48 L68 76 C66 82, 62 84, 50 84 C38 84, 34 82, 32 76 L26 48 C24 40, 26 36, 30 36 Z" 
                fill="#1A0D3A" 
                stroke="#00FFED" 
                strokeWidth="2.5" 
                strokeLinejoin="round" 
              />
              
              {/* Cute Face Expressions (Winking Eye & Open Smile) */}
              <Path d="M38 46 Q43 42, 47 46" fill="none" stroke="#00FFED" strokeWidth="2" strokeLinecap="round" /> {/* Wink */}
              <Circle cx="61" cy="46" r="2.5" fill="#00FFED" /> {/* Normal Eye */}
              <Path d="M46 51 Q50 55, 54 51" fill="none" stroke="#00FFED" strokeWidth="1.8" strokeLinecap="round" /> {/* Little Smile */}

              {/* Circular Washing Machine Glass Window */}
              <Circle cx="50" cy="66" r="14" fill="#2D1A5B" stroke="#00FFED" strokeWidth="2" />
              <Circle cx="50" cy="66" r="11" fill="none" stroke="#00FFED" strokeWidth="1" strokeDasharray="3,3" opacity="0.7" />
              
              {/* Water & Mini Heart Swirl Inside Window */}
              <Path d="M39 68 Q44 63, 50 68 T61 68" fill="none" stroke="#00FFED" strokeWidth="1.5" strokeLinecap="round" />
              <Path d="M48 64 C48 62, 50 60, 51 62 C52 60, 54 62, 54 64 C54 66, 51 68, 51 68 C51 68, 48 66, 48 64 Z" fill="#FF1493" />

              {/* Floating Finger Heart on Left Side */}
              <Path d="M16 32 C16 29, 20 27, 22 30 C24 27, 27 29, 26 32 C26 35, 20 39, 20 39 C20 39, 16 35, 16 32 Z" fill="#FF1493" /> {/* Floating Mini Heart */}
              <Path d="M22 41 Q26 44, 25 48 Q20 53, 17 46" fill="none" stroke="#00FFED" strokeWidth="1.5" strokeLinecap="round" /> {/* Hand silhouette */}
            </Svg>
          </View>

          {/* Brand Text Headings */}
          <View style={{ alignItems: 'center', marginBottom: 32 }} className="items-center mb-8">
            <Text 
              style={{ color: '#02ffd2', fontSize: 44, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', fontStyle: 'italic' }} 
              className="text-5xl uppercase tracking-widest text-center"
            >
              Laba U?
            </Text>
            <Text style={{ color: '#8d85b1', fontSize: 14, fontWeight: '500', marginTop: 8, textAlign: 'center', letterSpacing: 0.3 }} className="text-sm font-normal mt-1 text-center tracking-wide">
              Power up your cleanliness!
            </Text>
          </View>

          {/* Interactive Form Controls */}
          <View style={{ marginBottom: 24 }} className="mb-6">
            {/* Recruit ID field */}
            <TextInput
              placeholder="RECRUIT_ID"
              placeholderTextColor="#6c6192"
              value={recruitId}
              onChangeText={setRecruitId}
              autoCapitalize="none"
              style={{ backgroundColor: '#392b6b', borderColor: '#4e3e85', width: '100%', padding: 18, borderRadius: 28, color: '#a098c4', borderWidth: 2, paddingHorizontal: 24, fontSize: 16, fontWeight: '600', marginBottom: 16, letterSpacing: 0.5, outlineStyle: 'none' }}
              className="w-full p-4 rounded-3xl text-white border-2 px-6 text-base mb-4 tracking-wider"
            />

            {/* Secret Password field */}
            <TextInput
              placeholder="SECRET_PASSWORD"
              placeholderTextColor="#6c6192"
              value={secretPassword}
              onChangeText={setSecretPassword}
              secureTextEntry
              autoCapitalize="none"
              style={{ backgroundColor: '#392b6b', borderColor: '#4e3e85', width: '100%', padding: 18, borderRadius: 28, color: '#a098c4', borderWidth: 2, paddingHorizontal: 24, fontSize: 16, fontWeight: '600', letterSpacing: 0.5, outlineStyle: 'none' }}
              className="w-full p-4 rounded-3xl text-white border-2 px-6 text-base tracking-wider"
            />
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={handleLogin}
            style={{ backgroundColor: '#ff0d87', width: '100%', padding: 16, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderBottomWidth: 4, borderBottomColor: '#c20062' }}
            className="w-full p-4 rounded-full items-center justify-center mb-5"
          >
            <Text 
              style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', fontStyle: 'italic' }} 
              className="text-white text-xl tracking-widest uppercase italic"
            >
              Start Adventure
            </Text>
          </TouchableOpacity>

          {/* Visual Partition Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 12, opacity: 0.4 }} className="flex-row items-center w-full my-3">
            <View style={{ flexGrow: 1, borderTopWidth: 1, borderColor: '#8d85b1' }} />
            <Text 
              style={{ color: '#8d85b1', fontSize: 11, marginHorizontal: 14, fontWeight: '700', letterSpacing: 1 }} 
              className="mx-4 text-[10px] tracking-widest"
            >
              OR
            </Text>
            <View style={{ flexGrow: 1, borderTopWidth: 1, borderColor: '#8d85b1' }} />
          </View>

          {/* Third-Party Federation (Google OAuth Connector) */}
          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            style={{ borderColor: '#ffffff', backgroundColor: 'transparent', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 28, borderWidth: 2, marginTop: 16, marginBottom: 28 }}
            className="w-full flex-row items-center justify-center p-4 rounded-full border-2 mb-4"
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginRight: 12 }}>
              <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </Svg>
            <Text 
              style={{ color: '#02ffd2', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', fontStyle: 'italic' }} 
              className="text-base tracking-widest uppercase italic"
            >
              Sign In With Google
            </Text>
          </TouchableOpacity>

          {/* Auxiliary Action Footer */}
          <TouchableOpacity 
            onPress={() => navigation.navigate('Avatar')} 
            style={{ marginTop: 4, alignItems: 'center' }}
            className="mt-3 items-center"
          >
            <Text style={{ color: '#8d85b1', fontSize: 13, fontWeight: '500', letterSpacing: 0.3 }} className="text-xs tracking-wide">
              New recruit? <Text style={{ color: '#ff0d87', fontWeight: '700' }} className="font-bold underline">Apply Here</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}