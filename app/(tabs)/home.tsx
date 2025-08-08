import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, StatusBar, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// eslint-disable-next-line import/no-unresolved
import MapView, { Marker } from 'react-native-maps';
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
  category?: string;
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
        <>
          <View style={styles.filters}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Max distance (km)"
              placeholderTextColor={colors.textMuted}
              value={maxDistance}
              onChangeText={setMaxDistance}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Pickup after (HH:MM)"
              placeholderTextColor={colors.textMuted}
              value={pickupAfter}
              onChangeText={setPickupAfter}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Category"
              placeholderTextColor={colors.textMuted}
              value={category}
              onChangeText={setCategory}
            />
          </View>
          <MapView style={styles.map} initialRegion={region}>
            {filtered.map(item => (
              item.lat != null && item.lng != null && (
                <Marker
                  key={item.id}
                  coordinate={{ latitude: item.lat, longitude: item.lng }}
                  title={item.name}
                  description={`${money(item.priceCents, item.currency || 'EUR')} • ${item.pickupUntil}`}
                  onCalloutPress={() => router.push({ pathname: '/(tabs)/details', params: { offer: JSON.stringify(item) } })}
                />
              )
            ))}
          </MapView>
        </>
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
