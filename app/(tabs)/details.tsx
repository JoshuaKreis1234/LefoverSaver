import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { auth, db } from '../../firebase';
import { addDoc, collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { scheduleBookingReminder } from '../../notifications';
import { money } from '../../theme';
import PaymentModal from '../../components/PaymentModal';

type Offer = {
  id: string;
  name: string;
  priceCents: number;
  currency?: string;
  pickupUntil: string;
  stock?: number;
};

async function scheduleBookingReminder(pickupUntil: string) {
  // In a full implementation, trigger a local notification before pickupUntil.
  console.log('Scheduling reminder for', pickupUntil);
}

export default function Details() {
  const { offer } = useLocalSearchParams<{ offer: string }>();
  const data = useMemo(() => (offer ? JSON.parse(offer) as Offer : null), [offer]);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const paymentResolver = useRef<(paid: boolean) => void>();

  if (!data) return <View style={styles.center}><Text>Offer not found.</Text></View>;

  const startPayment = () => new Promise<boolean>((resolve) => {
    paymentResolver.current = resolve;
    setShowPayment(true);
  });

  const onBook = async () => {
    if (!auth.currentUser) {
      Alert.alert('Sign in required', 'Please sign in to book.');
      return;
    }

    const paid = await startPayment();
    setLoading(true);
    try {
      if (paid) {
        // decrement stock and create paid booking
        await runTransaction(db, async (tx) => {
          const offerRef = doc(db, 'offers', data.id);
          const snap = await tx.get(offerRef);
          const current = snap.data() as Offer | undefined;
          const currentStock = (current?.stock ?? 1);
          if (currentStock <= 0) throw new Error('Sold out');
          tx.update(offerRef, { stock: currentStock - 1 });
          const code = Math.random().toString(36).slice(2, 10).toUpperCase();
          await addDoc(collection(db, 'bookings'), {
            offerId: data.id,
            offerName: data.name,
            priceCents: data.priceCents,
            pickupUntil: data.pickupUntil,
            uid: auth.currentUser!.uid,
            createdAt: serverTimestamp(),
            paid: true,
            code,
            status: 'active',
            ...(data.currency ? { currency: data.currency } : {}),
          });
        });

        await scheduleBookingReminder(data.pickupUntil);
        Alert.alert('Booked!', 'Your meal has been reserved.', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/orders') },
        ]);
      } else {

        const code = Math.random().toString(36).slice(2, 10).toUpperCase();
        await addDoc(collection(db, 'bookings'), {
          offerId: data.id,
          offerName: data.name,
          priceCents: data.priceCents,
          pickupUntil: data.pickupUntil,
          uid: auth.currentUser!.uid,
          createdAt: serverTimestamp(),
          paid: false,
          code,
          status: 'active',
          ...(data.currency ? { currency: data.currency } : {}),
        });
        Alert.alert('Payment failed', 'Booking saved as unpaid.');
      }
    } catch (e: any) {
      Alert.alert('Booking failed', e.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{data.name}</Text>
      <Text style={styles.price}>{money(data.priceCents, data.currency || 'EUR')}</Text>
      <Text style={styles.time}>{data.pickupUntil}</Text>
      <TouchableOpacity style={styles.cta} onPress={onBook} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Book Now</Text>}
      </TouchableOpacity>
      <PaymentModal
        visible={showPayment}
        amount={data.priceCents}
        currency={data.currency || 'EUR'}
        onComplete={(paid) => {
          setShowPayment(false);
          paymentResolver.current?.(paid);
        }}
      />
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
