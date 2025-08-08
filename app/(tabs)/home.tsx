import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { money, useTheme } from '../../theme';

type Offer = {
  id: string;
  name: string;
  priceCents: number;
  currency?: string;
  pickupUntil: string;
  stock?: number;
  imageUrl?: string;
  lat?: number;
  lng?: number;
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);

  // get location (ask once)
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    })();
  }, []);

  // live offers
  useEffect(() => {
    const q = query(collection(db, 'offers'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Offer,'id'>) })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const withDistance = useMemo(() => {
    const addDist = (o: Offer) => {
      if (!coords || o.lat == null || o.lng == null) return { ...o, distanceKm: null as number | null };
      const R = 6371;
      const toRad = (v:number)=>v*Math.PI/180;
      const dLat = toRad(o.lat - coords.lat);
      const dLng = toRad(o.lng - coords.lng);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(coords.lat))*Math.cos(toRad(o.lat))*Math.sin(dLng/2)**2;
      const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return { ...o, distanceKm: R*c };
    };
    return offers.map(addDist).sort((a,b) => {
      // nearest first; if nulls, push to bottom
      const da = a.distanceKm ?? 9999;
      const db = b.distanceKm ?? 9999;
      return da - db;
    });
  }, [offers, coords]);

  return (
    <LinearGradient colors={[colors.bg, colors.bg2]} style={[styles.background]}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} translucent backgroundColor="transparent" />
      <Text style={[styles.header,{ color: colors.primary }]}>🍽️ Today’s Food Offers</Text>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={withDistance}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.center}>
              {/* Optional Lottie empty state */}
              {/* <LottieView source={require('../../assets/lottie/empty.json')} autoPlay loop style={{ width: 220, height: 220 }} /> */}
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>No offers available right now.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.card, shadowOpacity: 0.12 }]}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/(tabs)/details', params: { offer: JSON.stringify(item) } })}
            >
              <View style={styles.cardRow}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, { backgroundColor: colors.tagBg }]} />
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <View style={[styles.timeBox, { backgroundColor: colors.tagBg }]}>
                    <Text style={[styles.time, { color: colors.tagText }]}>{item.pickupUntil}</Text>
                  </View>
                  {item.distanceKm != null && (
                    <Text style={{ color: colors.textMuted, marginTop: 6 }}>
                      {item.distanceKm.toFixed(1)} km away
                    </Text>
                  )}
                </View>

                <View style={[styles.priceBox, { backgroundColor: colors.priceBg }]}>
                  <Text style={[styles.price, { color: colors.priceText }]}>
                    {money(item.priceCents, item.currency || 'EUR')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: 'bold', marginLeft: 28, marginBottom: 16, letterSpacing: 0.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    marginHorizontal: 18, marginVertical: 10, borderRadius: 20, padding: 14, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowRadius: 12
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 68, height: 68, borderRadius: 12, backgroundColor: '#e5e7eb' },
  name: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  timeBox: { alignSelf: 'flex-start', borderRadius: 7, paddingVertical: 4, paddingHorizontal: 11 },
  time: { fontSize: 13, fontWeight: '600' },
  priceBox: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  price: { fontSize: 16, fontWeight: '800' },
});
