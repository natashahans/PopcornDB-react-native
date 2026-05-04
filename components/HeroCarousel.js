// components/HeroCarousel.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  FlatList, 
  useWindowDimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWatchlist } from '../context/WatchlistContext';
import { COLORS, FONTS } from '../constants/theme';
import { BASE_URL, IMAGE_BASE_URL, createApiOptions } from '../api';

// CURATION STRATEGY:
// While the rest of the app is algorithmic, this Hero section is "Editorially Curated".
// I define the IDs here to ensure high-quality artwork is always at the top,
// but the actual data (title, rating, genres) is still fetched live from the API.
const HERO_CONFIG = [
  {
    id: 1022789, // Inside Out 2
    mediaType: 'movie',
    subtitle: "Disney • Pixar",
    bannerUrl: "https://res.cloudinary.com/dslonhubr/image/upload/v1764674641/inside-out_fbhzlx.webp",
  },
  {
    id: 1079091, // It Ends with Us
    mediaType: 'movie',
    subtitle: "Blake Lively • Justin Baldoni",
    bannerUrl: "https://res.cloudinary.com/dslonhubr/image/upload/v1764675576/AAAAQaTJtaj_QCKp9wAoChIurga6QZqn0FHD3K-Ifr_sMVXQ4rJGSMRTqdpB01H-9nL6ovUwEGTHg4-xf9wHcB7qX7GH7lkFzEvOLIaRYekbYXlQBRKLwpu97hMk9PEI7nVhJ1-0R-rmsK5PWiZVVRgFG6fNAN0_uemwfb.jpg",
  },
  {
    id: 402431, // Wicked
    mediaType: 'movie',
    subtitle: "Ariana Grande • Cynthia Erivo",
    bannerUrl: "https://res.cloudinary.com/dslonhubr/image/upload/v1764676115/mspfilm-wicked_1920x1080_nqdzol.jpg",
  }
];

const HeroCarousel = ({ hideGenres }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // RESPONSIVE DESIGN:
  // Using the window width to calculate slide size ensuring the carousel 
  // looks correct on both narrow phones and wider tablets/web view.
  const { width } = useWindowDimensions(); 
  
  const { addToWatchlist, removeFromWatchlist, isMovieInWatchlist } = useWatchlist();
  
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heroData, setHeroData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeroData = async () => {
      try {
        // Parallel fetching of details for all 3 hero items.
        const promises = HERO_CONFIG.map(async (item) => {
          const response = await fetch(
            `${BASE_URL}/${item.mediaType}/${item.id}?language=en-US`, 
            createApiOptions()
          );
          const data = await response.json();

          return {
            ...item,
            title: data.title || data.name,
            overview: data.overview,
            rating: (data.vote_average && data.vote_average > 0)
                ? `${(data.vote_average * 10).toFixed(0)}% Match` 
                : 'Popular',
            genres: data.genres ? data.genres.map(g => g.name) : [],
            posterUrl: data.poster_path ? `${IMAGE_BASE_URL}${data.poster_path}` : null,
            backdropUrl: item.bannerUrl 
          };
        });

        const results = await Promise.all(promises);
        setHeroData(results);
      } catch (error) {
        console.error("Error fetching Hero Carousel data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHeroData();
  }, []);

  // ANIMATION LOGIC: Auto-Scrolling
  // This effect sets up a timer to automatically advance the slides every 5 seconds.
  // It checks bounds to loop back to the first slide seamlessly.
  useEffect(() => {
    if (heroData.length === 0) return;
    const interval = setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= heroData.length) nextIndex = 0;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [currentIndex, heroData]);

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setCurrentIndex(index);
  };

  const renderItem = ({ item }) => {
    const isInWatchlist = isMovieInWatchlist(item.id);

    const handlePress = () => {
        navigation.navigate('MovieDetails', { 
            movieId: item.id, 
            mediaType: item.mediaType 
        });
    };

    const handleWatchlist = (e) => {
        e.stopPropagation();
        if (isInWatchlist) {
            removeFromWatchlist(item.id);
        } else {
            addToWatchlist({ movieId: item.id, note: '' });
        }
    };

    return (
      <View style={[styles.slideContainer, { width: width }]}>
        <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={[styles.bannerTouchable, { width: width }]}>
            <Image 
                source={{ uri: item.backdropUrl }} 
                style={styles.backdropImage} 
                resizeMode="cover"
            />
            
            {/* VISUAL LAYERING:
                I use two separate gradients here. One for the bottom fade 
                (to blend into the poster area) and one for the top 
                (to make the status bar icons visible). */}
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', COLORS.background]}
                locations={[0, 0.6, 1]}
                style={styles.bottomGradient}
            />

            <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={styles.topGradient}
            />
        </TouchableOpacity>

        <View style={styles.contentRow}>
            <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.posterContainer}>
                {item.posterUrl ? (
                    <Image source={{ uri: item.posterUrl }} style={styles.posterImage} resizeMode="cover" />
                ) : (
                    <View style={[styles.posterImage, { backgroundColor: '#222' }]} />
                )}
                
                <TouchableOpacity style={styles.watchlistBtn} onPress={handleWatchlist}>
                    <Ionicons name={isInWatchlist ? "checkmark" : "add"} size={20} color={COLORS.white} />
                </TouchableOpacity>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.infoContainer}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
                <View style={styles.metaRow}>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color={COLORS.primary} />
                        <Text style={styles.ratingText}>{item.rating}</Text>
                    </View>
                    
                    {!hideGenres && item.genres.slice(0, 2).map((genre, idx) => (
                        <Text key={idx} style={styles.genreText}>
                            {idx > 0 ? ' • ' : ''}{genre}
                        </Text>
                    ))}
                    
                </View>
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={heroData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToAlignment="center" 
        decelerationRate="fast"
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
        })}
      />
      
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    marginBottom: 26, 
    height: 375,
    position: 'relative' 
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  slideContainer: { 
    height: 375 
  },
  bannerTouchable: { 
    height: 280, 
    backgroundColor: COLORS.surface 
  },
  backdropImage: { 
    width: '100%', 
    height: '100%' 
  },
  bottomGradient: { 
    position: 'absolute', 
    left: 0, 
    right: 0, 
    bottom: 0, 
    height: 220 
  },
  topGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 120, 
  },
  contentRow: { 
    flexDirection: 'row', 
    paddingHorizontal: 16, 
    marginTop: -72, 
    alignItems: 'flex-end', 
    zIndex: 10 
  },
  posterContainer: { 
    width: 110, 
    height: 160, 
    backgroundColor: COLORS.background, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.6, 
    shadowRadius: 8, 
    elevation: 10 
  },
  posterImage: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: COLORS.surface 
  },
  watchlistBtn: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    width: 30, 
    height: 30, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 20 
  },
  infoContainer: { 
    flex: 1, 
    marginLeft: 16, 
    paddingBottom: 4, 
    justifyContent: 'flex-end', 
    height: 160 
  },
  title: { 
    fontSize: 22, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '800', 
    color: COLORS.textPrimary, 
    lineHeight: 26, 
    marginBottom: 4, 
    textShadowColor: 'rgba(0, 0, 0, 0.9)', 
    textShadowOffset: { width: 0, height: 2 }, 
    textShadowRadius: 6 
  },
  subtitle: { 
    fontSize: 13, 
    color: COLORS.textSecondary, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '700', 
    marginBottom: 6, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 2 
  },
  ratingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'transparent', 
    paddingRight: 10 
  },
  ratingText: { 
    color: COLORS.textPrimary, 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginLeft: 4, 
    fontFamily: FONTS.urbanist 
  },
  genreText: { 
    color: COLORS.textMuted, 
    fontSize: 13, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '500' 
  },
});

export default HeroCarousel;