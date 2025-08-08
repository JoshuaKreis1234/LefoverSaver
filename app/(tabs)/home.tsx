import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// eslint-disable-next-line import/no-unresolved
import MapView, { Marker } from 'react-native-maps';
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
  const [coords, setCoords] = useState<{lat:number; lng:number} | null>(null);
  const [maxDistance, setMaxDistance] = useState('');
  const [pickupAfter, setPickupAfter] = useState('');
  const [category, setCategory] = useState('');

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
      setLoading(false);
    }, () => setLoading(false));
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

  const filtered = useMemo(() => {
    return withDistance.filter(o => {
      const distOk = !maxDistance || (o.distanceKm != null && o.distanceKm <= parseFloat(maxDistance));
      const pickupOk = !pickupAfter || o.pickupUntil >= pickupAfter;
      const catOk = !category || (o.category || '').toLowerCase().includes(category.toLowerCase());
      return distOk && pickupOk && catOk;
    });
  }, [withDistance, maxDistance, pickupAfter, category]);

  const region = coords ? {
    latitude: coords.lat,
    longitude: coords.lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  } : {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  };

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
  header: { fontSize: 28, fontWeight: 'bold', marginLeft: 28, marginBottom: 16, letterSpacing: 0.5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filters: { paddingHorizontal: 20, marginBottom: 10 },
  input: { borderRadius: 8, padding: 8, marginBottom: 8 },
  map: { flex: 1 },
});
