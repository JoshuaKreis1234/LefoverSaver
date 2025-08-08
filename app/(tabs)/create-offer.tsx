import React, { useState } from 'react';
import {
  Text, TextInput, StyleSheet, TouchableOpacity, Alert,
  ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { auth, db, storage } from '../../firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CreateOffer() {
  const [name, setName] = useState('');
  const [priceCents, setPriceCents] = useState('599'); // as string for input
  const [currency, setCurrency] = useState('EUR');
  const [pickupUntil, setPickupUntil] = useState('Pickup before 8PM');
  const [stock, setStock] = useState('5');
  const [categories, setCategories] = useState(''); // comma-separated

  const [imageUri, setImageUri] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please grant photo library access.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!res.canceled) {
      setImageUri(res.assets[0].uri);
    }
  };

  const uploadImageIfAny = async (): Promise<string | null> => {
    if (!imageUri) return null;
    const resp = await fetch(imageUri);
    const blob = await resp.blob();
    const key = `offers/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const storageRef = ref(storage, key);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const submit = async () => {
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please sign in to create offers.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a name.');
      return;
    }
    const priceNum = Number(priceCents);
    const stockNum = Number(stock);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      Alert.alert('Invalid price', 'Enter price in cents (e.g., 599).');
      return;
    }
    if (Number.isNaN(stockNum) || stockNum < 0) {
      Alert.alert('Invalid stock', 'Enter a non-negative number.');
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = await uploadImageIfAny();

      await addDoc(collection(db, 'offers'), {
        name: name.trim(),
        priceCents: priceNum,
        currency: currency || 'EUR',
        pickupUntil: pickupUntil || '',
        stock: stockNum,
        categories: categories.split(',').map(c => c.trim()).filter(Boolean),
        imageUrl: imageUrl || null,
        ownerUid: auth.currentUser.uid,
        storeId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Created', 'Offer added successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'Failed to create offer.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Offer</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          placeholder="Cafe Aroma Surprise Bag"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Price (in cents)</Text>
        <TextInput
          placeholder="599"
          style={styles.input}
          keyboardType="numeric"
          value={priceCents}
          onChangeText={setPriceCents}
        />

        <Text style={styles.label}>Currency</Text>
        <TextInput
          placeholder="EUR"
          style={styles.input}
          autoCapitalize="characters"
          value={currency}
          onChangeText={setCurrency}
        />

        <Text style={styles.label}>Pickup window text</Text>
        <TextInput
          placeholder="Pickup before 8PM"
          style={styles.input}
          value={pickupUntil}
          onChangeText={setPickupUntil}
        />

        <Text style={styles.label}>Stock</Text>
        <TextInput
          placeholder="5"
          style={styles.input}
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
        />

        <Text style={styles.label}>Categories (comma separated)</Text>
        <TextInput
          placeholder="bakery, vegan"
          style={styles.input}
          value={categories}
          onChangeText={setCategories}
        />

        <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
          <Text style={styles.imageBtnText}>{imageUri ? 'Change Image' : 'Pick Image'}</Text>
        </TouchableOpacity>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : null}

        <TouchableOpacity style={styles.submit} onPress={submit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Offer</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', padding: 12, borderRadius: 10,
    backgroundColor: '#fff',
  },
  imageBtn: { backgroundColor: '#111827', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  imageBtnText: { color: '#fff', fontWeight: '800' },
  preview: { width: '100%', height: 200, borderRadius: 12, marginTop: 10 },
  submit: { backgroundColor: '#16a34a', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
