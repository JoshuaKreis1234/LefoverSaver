import React, { useRef } from 'react';
import { View, Text, Animated, FlatList, TouchableOpacity, Dimensions, StyleSheet, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

const { width, height } = Dimensions.get('window');

type Slide = {
  key: string;
  title: string;
  desc: string;
  image: any;
};

const slides: Slide[] = [
  {
    key: '1',
    title: 'Welcome!',
    desc: 'Swipe to learn about the app.',
    image: require('../assets/onboarding1.png'), // Replace with your asset
  },
  {
    key: '2',
    title: 'Easy to Use',
    desc: 'Simple, fast and reliable.',
    image: require('../assets/onboarding2.png'),
  },
  {
    key: '3',
    title: 'Get Started',
    desc: "Let's dive in together!",
    image: require('../assets/onboarding3.png'),
  },
];

const OnboardingScreen: React.FC = () => {
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<Slide>>(null);

  const handleSkip = () => {
    router.replace('/(tabs)/home'); // or '/(tabs)/home' for home tab directly
  };

  return (
    <LinearGradient
      colors={['#E0EAFC', '#CFDEF3', '#F7F0FA']}
      style={styles.gradient}
    >
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <Animated.FlatList
        ref={flatListRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        data={slides}
        keyExtractor={item => item.key}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.imageContainer}>
              <Image source={item.image} style={styles.image} resizeMode="contain" />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => {
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return <Animated.View key={i} style={[styles.dot, { opacity }]} />;
        })}
      </View>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skip} onPress={handleSkip} activeOpacity={0.7}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default OnboardingScreen;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 100,
    paddingBottom: 80,
    borderRadius: 40,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 18,
    elevation: 6,
    shadowColor: '#9e9e9e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    marginBottom: 32,
    alignItems: 'center',
  },
  image: {
    width: width * 0.55,
    height: height * 0.32,
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#22223b',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  desc: {
    fontSize: 17,
    color: '#444',
    textAlign: 'center',
    marginHorizontal: 10,
    lineHeight: 26,
    opacity: 0.88,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22223b',
    marginHorizontal: 7,
  },
  skip: {
    position: 'absolute',
    top: 54,
    right: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#ccc',
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  skipText: {
    color: '#22223b',
    fontWeight: '600',
    fontSize: 18,
    letterSpacing: 1,
  },
});
