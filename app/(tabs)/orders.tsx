import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { auth, db } from '../../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

type Booking = {
  id: string;
  offerName: string;
  price: string;
  pickupTime: string;
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
        .map(d => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setBookings(docs);
    });
    return unsub;
  }, [uid]);

  if (!uid) return <View style={styles.center}><Text>Please sign in to view orders.</Text></View>;

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
