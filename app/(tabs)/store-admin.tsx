import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function StoreAdmin() {
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [categories, setCategories] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      const ref = doc(db, 'stores', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as any;
        setAddress(data.address || '');
        setContact(data.contact || '');
        setCategories((data.categories || []).join(', '));
        if (data.lat != null) setLat(String(data.lat));
        if (data.lng != null) setLng(String(data.lng));
      }
    })();
  }, []);

  const save = async () => {
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please sign in to edit store.');
      return;
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if ([latNum, lngNum].some(n => Number.isNaN(n))) {
      Alert.alert('Invalid coordinates', 'Latitude/Longitude must be numbers.');
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'stores', auth.currentUser.uid), {
        address: address.trim(),
        contact: contact.trim(),
        categories: categories.split(',').map(c => c.trim()).filter(Boolean),
        lat: latNum,
        lng: lngNum,
      }, { merge: true });
      Alert.alert('Saved', 'Store profile updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Store Profile</Text>
      <Text style={styles.label}>Address</Text>
      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="123 Main St" />
      <Text style={styles.label}>Contact</Text>
      <TextInput style={styles.input} value={contact} onChangeText={setContact} placeholder="email@example.com" />
      <Text style={styles.label}>Categories (comma separated)</Text>
      <TextInput style={styles.input} value={categories} onChangeText={setCategories} placeholder="bakery, vegan" />
      <Text style={styles.label}>Latitude</Text>
      <TextInput style={styles.input} value={lat} onChangeText={setLat} keyboardType="decimal-pad" placeholder="52.5200" />
      <Text style={styles.label}>Longitude</Text>
      <TextInput style={styles.input} value={lng} onChangeText={setLng} keyboardType="decimal-pad" placeholder="13.4050" />
      <TouchableOpacity style={styles.btn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10,
    backgroundColor: '#fff',
  },
  btn: { backgroundColor: '#111827', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '800' },
});
