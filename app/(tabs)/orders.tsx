import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { auth, db } from '../../firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { money } from '../../theme';

type Booking = {
  id: string;
  offerName: string;
  price: string;
  pickupTime: string;
  code: string;
  status: string;
  createdAt?: any;
};

export default function Orders() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'bookings'),
      where('uid', '==', uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs
        .map(d => {
          const data = d.data() as any;
          return {
            id: d.id,
            offerName: data.offerName,
            price: money(data.priceCents, data.currency || 'EUR'),
            pickupTime: data.pickupUntil,
            code: data.code,
            status: data.status,
            createdAt: data.createdAt,
          } as Booking;
        })
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setBookings(docs);
    });
    return unsub;
  }, [uid]);

  if (!uid) return <View style={styles.center}><Text>Please sign in to view orders.</Text></View>;

  const onCancel = async (id: string) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { status: 'cancelled' });
    } catch (e: any) {
      Alert.alert('Cancellation failed', e.message ?? 'Please try again.');
    }
  };

  return (
    <View style={{ flex: 1, paddingTop: 60 }}>
      <Text style={styles.header}>Your Bookings</Text>
      <FlatList
        data={bookings}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={styles.empty}>No bookings yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.offerName}</Text>
            <Text style={styles.meta}>{item.price} • {item.pickupTime}</Text>
            <Text style={styles.code}>Code: {item.code}</Text>
            {item.status === 'active' && (
              <TouchableOpacity style={styles.cancel} onPress={() => onCancel(item.id)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: '800', paddingHorizontal: 20, marginBottom: 10 },
  empty: { textAlign: 'center', marginTop: 24, color: '#64748b' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 8, padding: 16, borderRadius: 14, elevation: 2 },
  name: { fontSize: 18, fontWeight: '700' },
  meta: { color: '#475569', marginTop: 4 },
  code: { marginTop: 4, fontWeight: '600' },
  cancel: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#dc2626', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  cancelText: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
