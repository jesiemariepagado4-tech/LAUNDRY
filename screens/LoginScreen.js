import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, 
  Platform, ScrollView, StatusBar, Image, ActivityIndicator, Alert 
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';

// FIREBASE IMPORTS
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithCredential, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../config/firebase'; 

// NEW: EXPO NATIVE AUTH IMPORTS
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Required for Expo AuthSession
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [recruitId, setRecruitId] = useState('');
  const [secretPassword, setSecretPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [isLoginLoading, setIsLoginLoading] = useState(false); 
  const [isGoogleLoading, setIsGoogleLoading] = useState(false); 
  const passwordInputRef = useRef(null);

  // --- NEW: EXPO GOOGLE AUTH CONFIG ---
  // You will need to replace these with your actual Client IDs from Google Cloud Console later!
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: '782994470105-7u48js4s6e5v22eb9dimfhveqhtf5i48.apps.googleusercontent.com',
    androidClientId: '782994470105-brorh8si4kauqg2jqekhhl2g80p9qh8k.apps.googleusercontent.com',
  });

  // Handle the Native Expo Google Response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      
      // Sign into Firebase with the native credential
      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          await verifyUserAccess(userCredential.user);
          await AsyncStorage.setItem('@user_session', JSON.stringify(userCredential.user));
          setIsGoogleLoading(false);
          navigation.navigate('Dashboard');
        })
        .catch((error) => {
          setIsGoogleLoading(false);
          setErrorMessage(error.message);
        });
    } else if (response?.type === 'cancel' || response?.type === 'error') {
      setIsGoogleLoading(false);
    }
  }, [response]);

  // Security Checkpoint
  const verifyUserAccess = async (user) => {
    if (user.email === 'admin@gmail.com') return;

    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.banned === true || userData.status === 'banned' || userData.status === 'deactivated') {
        await signOut(auth); 
        throw new Error("ACCESS DENIED: Your account has been deactivated or suspended by HQ.");
      }
    }
  };

  const handleLogin = async () => {
    setErrorMessage('');
    
    if (!recruitId || !secretPassword) {
      setErrorMessage('Please enter both your Recruit ID and Secret Password.');
      return;
    }

    setIsLoginLoading(true); 

    setTimeout(async () => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, recruitId, secretPassword);
        await verifyUserAccess(userCredential.user);

        await AsyncStorage.setItem('@user_session', JSON.stringify(userCredential.user));
        setIsLoginLoading(false); 
        
        if (userCredential.user.email === 'admin@gmail.com') {
          navigation.navigate('CommandCenter');
        } else {
          navigation.navigate('Dashboard');
        }
      } catch (error) {
        setIsLoginLoading(false); 
        setErrorMessage(error.message);
      }
    }, 2000); // Shortened delay to 2 seconds for better UX
  };

  // --- HYBRID GOOGLE SIGN IN ---
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);
    
    try {
      // IF ON WEB: Use standard Firebase Popup
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        const userCredential = await signInWithPopup(auth, provider);
        
        await verifyUserAccess(userCredential.user);
        await AsyncStorage.setItem('@user_session', JSON.stringify(userCredential.user));
        
        setIsGoogleLoading(false);
        navigation.navigate('Dashboard');
      } 
      // IF ON NATIVE (APK/iOS): Use Expo AuthSession
      else {
        await promptAsync();
        // Note: isGoogleLoading will be set to false inside the useEffect above when the prompt finishes.
      }
    } catch (error) {
      setIsGoogleLoading(false);
      setErrorMessage(error.message);
    }
  };

  const isAnyLoading = isLoginLoading || isGoogleLoading;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1, backgroundColor: '#2D1A5B', width: '100%' }}
    >
      <StatusBar barStyle="light-content" />
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} 
        style={{ width: '100%' }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 360, paddingHorizontal: 24, paddingTop: 160 }}>
          
          <View style={{ position: 'absolute', top: -20, left: 0, right: 0, alignItems: 'center', height: 171, justifyContent: 'center' }}>
            <Image 
              source={require('../assets/final.png')} 
              style={{ width: 250, height: 400, resizeMode: 'contain' }} 
            />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Text style={{ color: '#02ffd2', fontSize: 44, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', fontStyle: 'italic' }}>
              Laba U?
            </Text>
            <Text style={{ color: '#8d85b1', fontSize: 14, fontWeight: '500', marginTop: 8, textAlign: 'center', letterSpacing: 0.3 }}>
              Power up your cleanliness!
            </Text>
          </View>

          <View style={{ marginBottom: 24 }}>
            <TextInput
              placeholder="RECRUIT_ID"
              placeholderTextColor="#6c6192"
              value={recruitId}
              onChangeText={setRecruitId}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              style={{ backgroundColor: '#392b6b', borderColor: '#4e3e85', width: '100%', padding: 18, borderRadius: 28, color: '#a098c4', borderWidth: 2, paddingHorizontal: 24, fontSize: 16, fontWeight: '600', marginBottom: 16, letterSpacing: 0.5 }}
            />
            <TextInput
              ref={passwordInputRef}
              placeholder="SECRET_PASSWORD"
              placeholderTextColor="#6c6192"
              value={secretPassword}
              onChangeText={setSecretPassword}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              style={{ backgroundColor: '#392b6b', borderColor: '#4e3e85', width: '100%', padding: 18, borderRadius: 28, color: '#a098c4', borderWidth: 2, paddingHorizontal: 24, fontSize: 16, fontWeight: '600', letterSpacing: 0.5 }}
            />
            
            {errorMessage ? (
              <Text style={{ color: '#ff0d87', textAlign: 'center', marginTop: 10, fontWeight: '600' }}>
                {errorMessage}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={isAnyLoading}
            style={{ backgroundColor: '#ff0d87', width: '100%', padding: 16, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderBottomWidth: 4, borderBottomColor: '#c20062' }}
          >
            {isLoginLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', fontStyle: 'italic' }}>
                Start Adventure
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 12, opacity: 0.4 }}>
            <View style={{ flexGrow: 1, borderTopWidth: 1, borderColor: '#8d85b1' }} />
            <Text style={{ color: '#8d85b1', fontSize: 11, marginHorizontal: 14, fontWeight: '700', letterSpacing: 1 }}>OR</Text>
            <View style={{ flexGrow: 1, borderTopWidth: 1, borderColor: '#8d85b1' }} />
          </View>

          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={isAnyLoading}
            style={{ borderColor: '#ffffff', backgroundColor: 'transparent', width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 28, borderWidth: 2, marginTop: 16, marginBottom: 28 }}
          >
            {isGoogleLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Svg width={18} height={18} viewBox="0 0 24 24" style={{ marginRight: 12 }}>
                  <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                  <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </Svg>
                <Text style={{ color: '#02ffd2', fontSize: 16, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase', fontStyle: 'italic' }}>
                  Sign In With Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Avatar')} 
            style={{ marginTop: 4, alignItems: 'center' }}
          >
            <Text style={{ color: '#8d85b1', fontSize: 13, fontWeight: '500', letterSpacing: 0.3 }}>
              New recruit? <Text style={{ color: '#ff0d87', fontWeight: '700' }}>Apply Here</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}