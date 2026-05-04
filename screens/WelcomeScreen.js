import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  StatusBar, 
  Easing, 
  useWindowDimensions, 
  FlatList 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS } from '../constants/theme';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

// I chose a specifically wide image for the background to enable the 
// slow panning animation (Ken Burns effect) without pixelation or white space.
const WIDE_BANNER_IMAGE = require('../assets/imgs/welcome-bg.webp');

const BANNER_WIDTH_RATIO = 5; 
const PAN_DURATION = 40000; 
const AUTO_SLIDE_INTERVAL = 4000;

const BASE_DATA = [
  {
    id: '1',
    title: "Discover",
    description: "Search millions of movies and shows. Explore genres. Find your next obsession instantly."
  },
  {
    id: '2',
    title: "Track",
    description: "Build your watchlist. Add personal notes. We remember, so you don't have to."
  },
  {
    id: '3',
    title: "Immerse", 
    description: "Full cast profiles. Filmographies. Plot summaries. Go beyond the screen."
  },
];

// ARCHITECTURE NOTE: Infinite Scroll Logic
// Instead of a complex circular buffer, I simply repeated the data array 3000 times.
// By starting the user in the middle of this massive array, they can scroll 
// "infinitely" in either direction without hitting an edge case. 
// This is a performance-friendly trick often used in mobile carousels.
const REPEAT_COUNT = 3000; 
const INFINITE_DATA = Array(REPEAT_COUNT).fill(BASE_DATA).flat().map((item, index) => ({
  ...item,
  uniqueId: `${item.id}_${index}`, 
  originalIndex: index % BASE_DATA.length 
}));

const START_INDEX = (BASE_DATA.length * REPEAT_COUNT) / 2;

const WelcomeScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  
  // Using useRef for animation values ensures they persist across renders 
  // without triggering unnecessary re-renders of the component tree.
  const scrollX = useRef(new Animated.Value(0)).current;
  const panAnim = useRef(new Animated.Value(0)).current;
  
  const flatListRef = useRef(null);
  const currentIndexRef = useRef(START_INDEX);
  const isAutoScrolling = useRef(true);

  // This effect handles the background panning animation.
  // It creates a continuous loop that slowly moves the background image back and forth,
  // setting a cinematic tone immediately upon opening the app.
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(panAnim, { 
            toValue: 1, 
            duration: PAN_DURATION, 
            useNativeDriver: true, 
            easing: Easing.linear 
        }),
        Animated.timing(panAnim, { 
            toValue: 0, 
            duration: PAN_DURATION, 
            useNativeDriver: true, 
            easing: Easing.linear 
        })
      ])
    ).start();
  }, [panAnim]);

  // Logic for the auto-sliding text carousel.
  useEffect(() => {
    const timer = setInterval(() => {
      if (isAutoScrolling.current && flatListRef.current) {
        currentIndexRef.current += 1;
        
        // Safety check: If we somehow reach the end of the massive array,
        // snap silently back to the start index to prevent a crash.
        if (currentIndexRef.current >= INFINITE_DATA.length) {
          currentIndexRef.current = START_INDEX;
          flatListRef.current.scrollToIndex({ index: START_INDEX, animated: false });
        } else {
          flatListRef.current.scrollToIndex({
            index: currentIndexRef.current,
            animated: true,
          });
        }
      }
    }, AUTO_SLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, []);

  const handleScrollBegin = () => {
    // If the user interacts manually, we pause auto-scrolling to prevent UX conflict.
    isAutoScrolling.current = false;
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const item = viewableItems[0];
      setActiveDotIndex(item.item.originalIndex);
      if (item.index !== null) {
        currentIndexRef.current = item.index;
      }
    }
  }).current;

  const getItemLayout = (_, index) => ({
    length: width,
    offset: width * index,
    index,
  });

  const handleGetStarted = () => navigation.navigate('MainApp');

  // Interpolating the background position based on the animation value.
  const bgTranslate = panAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -width * (BANNER_WIDTH_RATIO - 1)] 
  });

  const renderItem = ({ item, index }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [width, 0, -width], 
    });

    // Interpolating opacity to create a fade-in/fade-out effect as text scrolls.
    const opacityInputRange = [
      (index - 0.5) * width, 
      index * width, 
      (index + 0.5) * width
    ];
    
    const opacity = scrollX.interpolate({
      inputRange: opacityInputRange,
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slideContainer, { width }]}>
        <Animated.View style={{ opacity, transform: [{ translateX }] }}>
          <Text style={styles.heading}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.backgroundWrapper}>
        <Animated.Image
          source={WIDE_BANNER_IMAGE}
          style={[
            styles.backgroundImage,
            { 
                width: width * BANNER_WIDTH_RATIO, 
                transform: [{ translateX: bgTranslate }] 
            }
          ]}
          resizeMode="cover" 
        />
      </View>

      {/* I'm using two LinearGradients here. 
          The top one darkens the status bar area for visibility.
          The bottom one ensures the white text is readable against any background image. */}
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none" 
      />

      <LinearGradient
        colors={[
          'transparent',     
          'rgba(0,0,0,0.22)', 
          'rgba(0,0,0,0.9)',         
          '#000000'          
        ]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles.bottomGradient}
        pointerEvents="none" 
      />

      <SafeAreaView style={styles.safeArea}>
        
        <View style={styles.carouselSection}>
          
          <View style={styles.brandContainer}>
            <View style={styles.brandLine} />
            <Text style={styles.brandText}>POPCORNDB</Text>
          </View>

          <View style={styles.listContainer}>
            <AnimatedFlatList
              ref={flatListRef}
              data={INFINITE_DATA}
              renderItem={renderItem}
              keyExtractor={(item) => item.uniqueId}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              
              initialScrollIndex={START_INDEX}
              getItemLayout={getItemLayout}
              
              initialNumToRender={3}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}

              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              onScrollBeginDrag={handleScrollBegin}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
              
              contentContainerStyle={{ alignItems: 'flex-end' }} 
            />
          </View>
        </View>

        <View style={styles.footer}>
          
          {/* Custom pagination dots to indicate swipe progress */}
          <View style={styles.pagination}>
            {BASE_DATA.map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: activeDotIndex === i ? COLORS.primary : 'rgba(255,255,255,0.3)',
                    width: activeDotIndex === i ? 24 : 6,
                  }
                ]} 
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleGetStarted}
            activeOpacity={0.8}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.mainButton}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    zIndex: 1,
  },
  bottomGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
    justifyContent: 'flex-end', 
  },
  carouselSection: {
    marginBottom: 20, 
  },
  brandContainer: {
    paddingHorizontal: 24,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.textSecondary, 
  },
  brandText: {
    color: COLORS.textSecondary,
    fontSize: 11, 
    fontFamily: FONTS.urbanist,
    fontWeight: '800',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  listContainer: {
    height: 180, 
  },
  slideContainer: {
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
  },
  heading: {
    fontSize: 60, 
    color: COLORS.white,
    fontFamily: FONTS.urbanist,
    fontWeight: '900', 
    marginBottom: 16,
    letterSpacing: -1.5,
    lineHeight: 64,
  },
  description: {
    fontSize: 18,
    color: '#E0E0E0', 
    fontFamily: FONTS.urbanist,
    lineHeight: 28,
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  pagination: {
    flexDirection: 'row',
    height: 10,
    marginBottom: 30,
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  buttonWrapper: {
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  mainButton: {
    height: 56,
    borderRadius: 28, 
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: FONTS.urbanist,
  },
});

export default WelcomeScreen;