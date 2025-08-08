import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform, FlatList, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { money, useTheme } from '../../theme';

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
  distanceKm?: number | null;
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Offer, 'id'>) }));
      const uniqueStoreIds = Array.from(new Set(raw.map(o => o.storeId).filter(Boolean)));
      const storeMap: Record<string, Store | null> = {};
      await Promise.all(uniqueStoreIds.map(async (sid) => {
        if (!sid) return;
        const s = await getDoc(doc(db, 'stores', sid));
        storeMap[sid] = s.exists() ? (s.data() as Store) : null;
      }));
      setOffers(raw.map(o => ({ ...o, store: o.storeId ? storeMap[o.storeId] ?? null : null })));
      setError(null);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Failed to load offers');
      setLoading(false);
    });
    return unsub;
  }, []);

  const withDistance = useMemo(() => {
    const addDist = (o: Offer) => {
      const slat = o.store?.lat; const slng = o.store?.lng;
      if (!coords || slat == null || slng == null) return { ...o, distanceKm: null as number | null };
      const R = 6371;
      const toRad = (v:number)=>v*Math.PI/180;
      const dLat = toRad(slat - coords.lat);
      const dLng = toRad(slng - coords.lng);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(coords.lat))*Math.cos(toRad(slat))*Math.sin(dLng/2)**2;
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
      <Text style={[styles.header, { color: colors.primary }]}>🍽️ Today’s Food Offers</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Find deals near you</Text>

      {error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : loading ? (
        <FlatList
          data={[1,2,3]}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyExtractor={(item) => item.toString()}
          renderItem={() => (
            <View style={[styles.card, { backgroundColor: colors.card, shadowOpacity: 0.12 }]}> 
              <View style={styles.cardRow}>
                <View style={[styles.thumb, { backgroundColor: colors.tagBg }]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={[styles.skeletonLine, { backgroundColor: colors.tagBg, width: '60%' }]} />
                  <View style={[styles.skeletonLine, { backgroundColor: colors.tagBg, width: '40%', marginTop: 8 }]} />
                  <View style={[styles.skeletonTag, { backgroundColor: colors.tagBg, marginTop: 8 }]} />
                </View>
                <View style={[styles.priceSkeleton, { backgroundColor: colors.tagBg }]} />
              </View>
            </View>
          )}
        />
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
                  {item.store?.address && (
                    <Text style={{ color: colors.textMuted }} numberOfLines={1}>{item.store.address}</Text>
                  )}
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
  header: { fontSize: 28, fontWeight: 'bold', marginLeft: 28, marginBottom: 4, letterSpacing: 0.5 },
  subtitle: { fontSize: 16, marginLeft: 28, marginBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', textAlign: 'center' },
  filters: { paddingHorizontal: 20, marginBottom: 10 },
  input: { borderRadius: 8, padding: 8, marginBottom: 8 },
  map: { flex: 1 },
  card: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 80, height: 80, borderRadius: 12 },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  timeBox: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  time: { fontSize: 12, fontWeight: '500' },
  priceBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginLeft: 12 },
  price: { fontSize: 16, fontWeight: 'bold' },
  skeletonLine: { height: 14, borderRadius: 4 },
  skeletonTag: { width: 80, height: 20, borderRadius: 8 },
  priceSkeleton: { width: 60, height: 24, borderRadius: 12, marginLeft: 12 },
});
