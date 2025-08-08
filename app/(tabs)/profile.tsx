import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useIdTokenAuthRequest } from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { auth, db, storage } from '../../firebase';
import {
  onAuthStateChanged, signInAnonymously, signOut, updateProfile,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, User,
  GoogleAuthProvider, signInWithCredential
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

WebBrowser.maybeCompleteAuthSession();

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(false);

  // form state
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState<string | null>(user?.photoURL || null);
  const [role, setRole] = useState<'user' | 'partner' | 'admin' | null>(null);

  const [request, response, promptAsync] = useIdTokenAuthRequest({
    clientId: 'YOUR_GOOGLE_CLIENT_ID',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const cred = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, cred).catch((e) => {
        Alert.alert('Google sign-in failed', e?.message ?? 'Try again');
      });
    }
  }, [response]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setDisplayName(u?.displayName || '');
      setPhotoURL(u?.photoURL || null);
      // fetch role doc
      if (u) {
        const r = await getDoc(doc(db, 'roles', u.uid));
        setRole((r.exists() ? (r.data().role as any) : 'user') ?? 'user');
      } else {
        setRole(null);
      }
    });
    return unsub;
  }, []);

  const signedIn = !!user;

  const doAnon = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (e: any) {
      Alert.alert('Anon sign-in failed', e?.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const doEmailSignUp = async () => {
    if (!email || !pw) return Alert.alert('Missing', 'Enter email and password');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pw);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        createdAt: new Date(),
      });
      Alert.alert('Signed up', 'Welcome!');
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const doEmailSignIn = async () => {
    if (!email || !pw) return Alert.alert('Missing', 'Enter email and password');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const doSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setRole(null);
    } catch (e: any) {
      Alert.alert('Sign out failed', e?.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo access to upload an avatar.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled) {
      const uri = res.assets[0].uri;
      setLoading(true);
      try {
        // upload to /avatars/{uid}/avatar.jpg
        const key = `avatars/${user!.uid}/avatar-${Date.now()}.jpg`;
        const blob = await (await fetch(uri)).blob();
        const r = ref(storage, key);
        await uploadBytes(r, blob);
        const url = await getDownloadURL(r);
        await updateProfile(user!, { photoURL: url });
        setPhotoURL(url);
        // optionally store in /users/{uid}
        await setDoc(doc(db, 'users', user!.uid), { photoURL: url }, { merge: true });
      } catch (e: any) {
        Alert.alert('Upload failed', e?.message ?? 'Try again');
      } finally {
        setLoading(false);
      }
    }
  };

  const saveDisplayName = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user, { displayName });
      await setDoc(doc(db, 'users', user.uid), { displayName }, { merge: true });
      Alert.alert('Saved', 'Profile updated.');
    } catch (e: any) {
      Alert.alert('Update failed', e?.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  };

  const requestPartner = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          partnerRequest: {
            uid: user.uid,
            email: user.email ?? null,
            displayName: user.displayName ?? null,
            createdAt: new Date(),
            status: 'pending',
          },
        },
        { merge: true }
      );
      Alert.alert('Request sent', 'We will review your partner request.');
    } catch (e: any) {
      Alert.alert('Failed', e?.message ?? 'Try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>

      {/* Avatar + Basic info */}
      <View style={styles.row}>
        <TouchableOpacity onPress={signedIn ? pickAvatar : undefined}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]} />
          )}
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.uid} numberOfLines={1}>
            {user ? `UID: ${user.uid}` : 'Not signed in'}
          </Text>
          <Text style={styles.role}>
            Role: {role ?? 'unknown'}
          </Text>
        </View>
      </View>

      {/* Sign-in / Sign-up */}
      {!signedIn && (
        <>
          <Text style={styles.section}>Sign in / Sign up</Text>
          <TextInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            style={styles.input}
            value={pw}
            onChangeText={setPw}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={doEmailSignIn}>
              <Text style={styles.btnText}>Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnAlt]} onPress={doEmailSignUp}>
              <Text style={[styles.btnText, styles.btnAltText]}>Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnAlt]}
              disabled={!request}
              onPress={() => promptAsync()}
            >
              <Text style={[styles.btnText, styles.btnAltText]}>Sign In with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={doAnon}>
              <Text style={styles.btnGhostText}>Continue Anonymously</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Update profile */}
      {signedIn && (
        <>
          <Text style={styles.section}>Update Profile</Text>
          <TextInput
            placeholder="Display name"
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.btn} onPress={saveDisplayName}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#ef4444' }]} onPress={doSignOut}>
              <Text style={styles.btnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Partner controls */}
          <Text style={styles.section}>Partner</Text>
          {role === 'partner' || role === 'admin' ? (
            <TouchableOpacity style={styles.btn} onPress={() => router.push('/(tabs)/create-offer')}>
              <Text style={styles.btnText}>Create Offer</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.btn} onPress={requestPartner}>
              <Text style={styles.btnText}>Request Partner Access</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e5e7eb' },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  uid: { color: '#475569', fontSize: 12 },
  role: { marginTop: 4, color: '#111827', fontWeight: '700' },
  section: { marginTop: 14, marginBottom: 6, fontWeight: '800', color: '#111827' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10, backgroundColor: '#fff', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  btn: { backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '800' },
  btnAlt: { backgroundColor: '#fef3c7' },
  btnAltText: { color: '#1f2937' },
  btnGhost: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  btnGhostText: { color: '#111827', fontWeight: '800' },
});
