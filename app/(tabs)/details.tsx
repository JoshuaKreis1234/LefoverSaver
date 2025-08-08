import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { auth, db } from '../../firebase';
import { addDoc, collection, doc, runTransaction, serverTimestamp, getDoc } from 'firebase/firestore';
import { money, useTheme } from '../../theme';
import PaymentModal from '../../components/PaymentModal';

type Store = {
  address?: string;
  contact?: string;
  categories?: string[];
  lat?: number;
  lng?: number;
};

type Offer = {
  id: string;
  name: string;
  priceCents: number;
  currency?: string;
  pickupUntil: string;
  stock?: number;
  imageUrl?: string;
  storeId?: string;
  categories?: string[];
  store?: Store | null;
};

async function scheduleBookingReminder(pickupUntil: string) {
  // In a full implementation, trigger a local notification before pickupUntil.
  console.log('Scheduling reminder for', pickupUntil);
}

export default function Details() {
  const { offer } = useLocalSearchParams<{ offer: string }>();
  const data = useMemo(() => (offer ? JSON.parse(offer) as Offer : null), [offer]);
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [store, setStore] = useState<Store | null>(data?.store ?? null);
  const [showPayment, setShowPayment] = useState(false);
  const paymentResolver = useRef<((paid: boolean) => void) | null>(null);

  useEffect(() => {
    (async () => {
      if (!store && data?.storeId) {
        const s = await getDoc(doc(db, 'stores', data.storeId));
        setStore(s.exists() ? (s.data() as Store) : null);
      }
    })();
  }, [store, data]);

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
    <View style={[styles.container, { backgroundColor: colors.bg }]}> 
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {data.imageUrl ? (
          <Image source={{ uri: data.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, { backgroundColor: colors.tagBg }]} />
        )}
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>{data.name}</Text>
          <Text style={[styles.price, { color: colors.priceText }]}>
            {money(data.priceCents, data.currency || 'EUR')}
          </Text>
          <View style={[styles.timeBox, { backgroundColor: colors.tagBg }]}> 
            <Text style={[styles.time, { color: colors.tagText }]}>Pickup until {data.pickupUntil}</Text>
          </View>
          {store?.address && <Text style={[styles.info, { color: colors.text }]}>{store.address}</Text>}
          {store?.contact && <Text style={[styles.info, { color: colors.textMuted }]}>{store.contact}</Text>}
          {data.categories && data.categories.length > 0 && (
            <View style={styles.categoryRow}>
              {data.categories.map((cat) => (
                <View key={cat} style={[styles.categoryChip, { backgroundColor: colors.tagBg }]}> 
                  <Text style={{ color: colors.tagText, fontSize: 12 }}>{cat}</Text>
                </View>
              ))}
            </View>
          )}
          {typeof data.stock === 'number' && (
            <Text style={[styles.stock, { color: colors.textMuted }]}>{data.stock} left</Text>
          )}
          <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={onBook} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Book Now</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 220 },
  content: { padding: 24 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  price: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  timeBox: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 16 },
  time: { fontSize: 14, fontWeight: '500' },
  info: { fontSize: 14, marginBottom: 4 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 8 },
  categoryChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6, marginBottom: 6 },
  stock: { fontSize: 14, marginBottom: 20 },
  cta: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  ctaText: { color: '#fff', fontWeight: '800', fontSize: 18 },
});
