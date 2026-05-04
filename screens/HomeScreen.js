// screens/HomeScreen.js
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
  Platform,
  ImageBackground
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BASE_URL, IMAGE_BASE_URL, createApiOptions } from '../api';
import MovieCarousel from '../components/MovieCarousel';
import HeroCarousel from '../components/HeroCarousel';
import { useWatchlist } from '../context/WatchlistContext';
import { COLORS, FONTS } from '../constants/theme';

// Hardcoded ID for the "Featured" promo banner to ensure high-quality assets.
const SUPERMAN_ID = 1061474;

const HomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { addToWatchlist, removeFromWatchlist, isMovieInWatchlist } = useWatchlist();
  const [feedContent, setFeedContent] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hiding the default header to implement a custom transparent navigation bar.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: false,
      headerLeft: () => null,
    });
  }, [navigation]);

  // ARCHITECTURAL DECISION: Parallel Data Fetching
  // Instead of chaining API calls (which creates a "waterfall" loading effect),
  // I use Promise.all to fetch TV shows, Genres, and People simultaneously.
  // This drastically reduces the Time-To-Interactive (TTI) for the user.
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const tvPromise = fetch(`${BASE_URL}/tv/popular?language=en-US&page=1`, createApiOptions()).then(res => res.json());
        const genrePromise = fetch(`${BASE_URL}/genre/movie/list`, createApiOptions()).then(res => res.json());
        const peoplePromise = fetch(`${BASE_URL}/person/popular?language=en-US&page=1`, createApiOptions()).then(res => res.json());
        
        const [tvData, genreData, peopleData] = await Promise.all([tvPromise, genrePromise, peoplePromise]);
        
        const trendingPeople = peopleData.results.slice(0, 10);
        // Limiting to 18 genres to prevent the homepage from becoming infinitely long.
        const genres = genreData.genres ? genreData.genres.slice(0, 18) : []; 
        
        // Fetching movies for each genre in parallel.
        const moviePromises = genres.map(genre => 
          fetch(`${BASE_URL}/discover/movie?with_genres=${genre.id}`, createApiOptions()).then(res => res.json())
        );
        const allMovieResults = await Promise.all(moviePromises);

        // DATA TRANSFORMATION: Dynamic Feed Construction
        // Instead of hardcoding the layout, I build a "feed" array.
        // This allows me to inject different types of content (TV shows, Banners, People)
        // at specific indices to break up the visual monotony of standard movie rows.
        let dynamicFeed = [];
        
        allMovieResults.forEach((movieResult, index) => {
          const genreName = genres[index]?.name;
          
          const movieCarouselItem = { 
            type: 'movie_carousel', 
            title: genreName, 
            data: movieResult.results, 
            genreId: genres[index].id 
          };

          // Injecting the TV Shows section after the first genre row.
          if (index === 1 && tvData.results) {
            dynamicFeed.push({ 
              type: 'tv_shows_section', 
              title: 'Popular TV Shows', 
              data: tvData.results.slice(0, 10), 
              genreId: null 
            });
          }

          // Injecting a Promo Banner specifically after the Animation category.
          if (genreName === 'Animation') {
            dynamicFeed.push(movieCarouselItem); 
            dynamicFeed.push({
              type: 'promo_banner',
              title: 'Movie of the Year',
              data: null
            });
            return; 
          }

          // Injecting the Celebrity Spotlight section.
          if (genreName === 'Family') {
            dynamicFeed.push({ 
              type: 'trending_people_section', 
              title: 'Trending Celebrities', 
              data: trendingPeople, 
              genreId: null 
            });
            dynamicFeed.push(movieCarouselItem); 
            return; 
          }

          dynamicFeed.push(movieCarouselItem);
        });
        
        setFeedContent(dynamicFeed);
      } catch (error) {
        console.error("Failed to fetch feed sections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleSearchPress = () => navigation.navigate('SearchFromHome', { autoFocus: true });

  const renderFooter = () => {
    if (loading) return null;
    return (
      <View style={styles.footerContainer}>
        <View style={styles.footerDivider} />
        <Text style={styles.footerAppName}>PopcornDB</Text>
        <Text style={styles.footerTagline}>Discover your next favorite story.</Text>
        <Text style={styles.footerCopyright}>© {new Date().getFullYear()} PopcornDB. Data provided by TMDB.</Text>
      </View>
    );
  };

  // This switch statement allows the FlatList to render completely different 
  // UI components based on the 'type' field in the feed array.
  const renderFeedItem = ({ item }) => {
    switch (item.type) {
      case 'movie_carousel':
        return (
          <MovieCarousel 
            title={item.title} 
            movies={item.data} 
            navigation={navigation} 
            genreId={item.genreId} 
          />
        );
      case 'tv_shows_section':
        return (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.title}</Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Genre', { 
                  genreId: 'popular', 
                  genreTitle: 'Popular TV Shows', 
                  mediaType: 'tv' 
                })}
              >
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={item.data}
              renderItem={({ item: tvShow }) => {
                const isInWatchlist = isMovieInWatchlist(tvShow.id);
                return (
                  <TouchableOpacity 
                    style={styles.tvCard} 
                    onPress={() => navigation.navigate('MovieDetails', { movieId: tvShow.id, mediaType: 'tv' })}
                  >
                    <Image source={{ uri: `${IMAGE_BASE_URL}${tvShow.poster_path}` }} style={styles.tvPoster} />
                    <TouchableOpacity 
                      style={styles.addButton} 
                      onPress={(e) => { 
                        e.stopPropagation();
                        if (isInWatchlist) {
                          removeFromWatchlist(tvShow.id);
                        } else {
                          addToWatchlist({ movieId: tvShow.id, note: '' });
                        }
                      }}
                    >
                      <Ionicons name={isInWatchlist ? "checkmark" : "add"} size={22} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.itemTitle} numberOfLines={1}>{tvShow.name}</Text>
                  </TouchableOpacity>
                );
              }}
              keyExtractor={tvShow => tvShow.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            />
          </View>
        );

      case 'promo_banner':
        return (
            <TouchableOpacity 
                style={styles.promoContainer}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('MovieDetails', { movieId: SUPERMAN_ID })}
            >
                <ImageBackground 
                    source={{ uri: 'https://res.cloudinary.com/dbbedy5lo/image/upload/v1765059625/Superman_2025_Movie_Banner_1_ip6hun.webp' }} 
                    style={styles.promoImage}
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.promoGradient}
                    >
                        <View style={styles.promoContent}>
                            <View style={styles.promoBadge}>
                                <Text style={styles.promoBadgeText}>IMDb BEST OF 2025</Text>
                            </View>
                            <Text style={styles.promoTitle}>SUPERMAN</Text>
                        </View>
                    </LinearGradient>
                </ImageBackground>
            </TouchableOpacity>
        );

      case 'trending_people_section':
        return (
            <View style={[styles.sectionContainer, { marginTop: 10 }]}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{item.title}</Text>
                    <Text style={[styles.viewAllText, { color: COLORS.textMuted, fontSize: 12 }]}>Top 10</Text>
                </View>
                <FlatList
                    data={item.data}
                    renderItem={({ item: person, index }) => (
                      <TouchableOpacity 
                        style={styles.spotlightCard}
                        onPress={() => navigation.navigate('CelebDetails', { personId: person.id })}
                        activeOpacity={0.9}
                      >
                        <ImageBackground
                          source={{ uri: `${IMAGE_BASE_URL}${person.profile_path}` }} 
                          style={styles.spotlightImage}
                          resizeMode="cover"
                        >
                          <View style={styles.rankBadge}>
                              <Text style={styles.rankText}>#{index + 1}</Text>
                          </View>

                          <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.0)', 'rgba(0,0,0,0.8)']}
                            style={styles.spotlightGradient}
                          >
                            <Text style={styles.spotlightName} numberOfLines={1}>{person.name}</Text>
                          </LinearGradient>
                        </ImageBackground>
                      </TouchableOpacity>
                    )}
                    keyExtractor={person => person.id.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.carouselContent}
                />
            </View>
        );
      
      default:
        return null;
    }
  };

  const isWeb = Platform.OS === 'web';
  const containerStyle = isWeb 
    ? { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } 
    : { flex: 1 };

  return (
    <View style={[styles.screen, containerStyle]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* PERFORMANCE OPTIMIZATION: 
          I am rendering the entire screen as a single FlatList. 
          If I used a ScrollView with nested maps, it would render every single row 
          and image immediately, consuming huge amounts of memory.
          FlatList virtualizes the rows, only rendering what is currently on screen. */}
      <FlatList
        data={loading ? [] : feedContent}
        renderItem={renderFeedItem}
        keyExtractor={(item, index) => item.type + index.toString()}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={isWeb ? false : true}
        initialNumToRender={isWeb ? 30 : 10}
        windowSize={isWeb ? 50 : 21}
        
        // The Hero Carousel and Search Bar are rendered as a Header component
        // so they scroll naturally with the rest of the content.
        ListHeaderComponent={
          <View>
            <HeroCarousel hideGenres={true} />
            <View style={styles.searchContainer}>
              <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress} activeOpacity={0.7}>
                <Feather name="search" size={20} color={COLORS.primary} />
                <Text style={styles.searchBarText}>Search for movies, genres...</Text>
              </TouchableOpacity>
            </View>
            {loading && <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 20 }} />}
          </View>
        }
        
        ListFooterComponent={renderFooter}

        ListEmptyComponent={!loading && (
           <View style={{ padding: 20, alignItems: 'center' }}>
             <Text style={{ color: COLORS.textMuted }}>No data available.</Text>
           </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.background
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 50,
    marginBottom: 10
  },
  searchBarText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontFamily: FONTS.urbanist
  },
  sectionContainer: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.urbanist,
    fontWeight: '600'
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: FONTS.urbanist,
    fontWeight: '600'
  },
  carouselContent: {
    paddingHorizontal: 16
  },
  itemTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.urbanist,
    marginTop: 8
  },
  tvCard: {
    width: 180,
    marginRight: 14
  },
  tvPoster: {
    width: '100%',
    height: 270,
    backgroundColor: COLORS.surface
  },
  addButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5
  },
  spotlightCard: {
    width: 200,
    height: 300,
    marginRight: 16,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  spotlightGradient: {
    height: '40%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  spotlightName: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: FONTS.urbanist,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  rankBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomLeftRadius: 12,
    elevation: 3,
    zIndex: 10
  },
  rankText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    fontStyle: 'italic',
    fontFamily: FONTS.urbanist
  },
  promoContainer: {
    width: 'auto',
    marginHorizontal: 16,
    height: 250,
    marginBottom: 32,
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  promoImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  promoGradient: {
    height: '100%',
    justifyContent: 'flex-end',
    padding: 20
  },
  promoContent: {
    alignItems: 'flex-start'
  },
  promoBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 10
  },
  promoBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontFamily: FONTS.urbanist,
    fontWeight: '700',
    letterSpacing: 1
  },
  promoTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontFamily: FONTS.urbanist,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 60,
    opacity: 0.7
  },
  footerDivider: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginBottom: 20
  },
  footerAppName: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: FONTS.urbanist,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 5
  },
  footerTagline: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.urbanist,
    marginBottom: 15
  },
  footerCopyright: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontFamily: FONTS.urbanist
  }
});

export default HomeScreen;