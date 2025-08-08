import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { auth, db } from '../../firebase';
import { addDoc, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

type Offer = { id: string; name: string; price: string; time: string; stock?: number; };

export default function Details() {
  const { offer } = useLocalSearchParams<{ offer: string }>();
  const data = useMemo(() => (offer ? JSON.parse(offer) as Offer : null), [offer]);
  const [loading, setLoading] = useState(false);

  if (!data) return <View style={styles.center}><Text>Offer not found.</Text></View>;

  const onBook = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign in required', 'Please sign in to book.'); 
      return;
    }
    setLoading(true);
    try {
      // (Optional) decrement stock safely using a transaction
      await runTransaction(db, async (tx) => {
        const offerRef = doc(db, 'offers', data.id);
        const snap = await tx.get(offerRef);
        const current = snap.data() as Offer | undefined;
        const currentStock = (current?.stock ?? 1);
        if (currentStock <= 0) throw new Error('Sold out');
        tx.update(offerRef, { stock: currentStock - 1 });
        // create booking
        await addDoc(collection(db, 'bookings'), {
          offerId: data.id,
          offerName: data.name,
          price: data.price,
          pickupTime: data.time,
          uid: auth.currentUser!.uid,
          createdAt: serverTimestamp(),
        });
      });

      Alert.alert('Booked!', 'Your meal has been reserved.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/orders') },
      ]);
    } catch (e: any) {
      Alert.alert('Booking failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{data.name}</Text>
      <Text style={styles.price}>{data.price}</Text>
      <Text style={styles.time}>{data.time}</Text>
      <TouchableOpacity style={styles.cta} onPress={onBook} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Book Now</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  price: { fontSize: 22, color: '#d97706', fontWeight: '700', marginBottom: 6 },
  time: { fontSize: 16, color: '#374151', marginBottom: 20 },
  cta: { backgroundColor: '#16a34a', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
