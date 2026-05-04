// screens/MovieDetailsScreen.js

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ImageBackground, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList, 
  Image, 
  Linking, // Used for deep linking to the YouTube app
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { BASE_URL, IMAGE_BASE_URL, createApiOptions } from '../api';
import { useWatchlist } from '../context/WatchlistContext';
import { COLORS, FONTS } from '../constants/theme';

const MovieDetailsScreen = ({ route, navigation }) => {
  // Receiving the 'movieId' passed from the previous screen. 
  // This allows the screen to be dynamic and reusable for any content item.
  const { movieId, mediaType = 'movie' } = route.params;
  const insets = useSafeAreaInsets();

  const { 
    addToHistory, 
    addToWatchlist, 
    removeFromWatchlist, 
    isMovieInWatchlist 
  } = useWatchlist();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trailerKey, setTrailerKey] = useState(null);

  // DATA FETCHING STRATEGY:
  // Instead of making 3 separate API calls (one for details, one for cast, one for images),
  // I use TMDB's 'append_to_response' feature. This fetches everything in a SINGLE request,
  // significantly reducing latency and battery usage.
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const url = `${BASE_URL}/${mediaType}/${movieId}?append_to_response=videos,credits,images`;
        const response = await fetch(url, createApiOptions());
        const data = await response.json();

        setDetails(data);

        // Automatically tracking user history for the "Recently Viewed" section in Profile.
        addToHistory(data);

        // Logic to find the official trailer among various video clips (teasers, featurettes, etc).
        const officialTrailer = data.videos?.results.find(
          (video) => video.site === 'YouTube' && video.type === 'Trailer'
        );

        setTrailerKey(officialTrailer?.key || data.videos?.results[0]?.key);
      } catch (error) {
        console.error("Failed to fetch details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [movieId, mediaType, addToHistory]);

  // DEEP LINKING:
  // This function constructs a standard YouTube URL and asks the operating system
  // to open it. On a real device, this will launch the YouTube app directly.
  const handlePlayTrailer = () => {
    if (trailerKey) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${trailerKey}`;
      Linking.openURL(youtubeUrl).catch(err =>
        console.error("Couldn't load page", err)
      );
    }
  };

  if (loading || !details) {
    return (
      <ActivityIndicator 
        size="large" 
        color={COLORS.primary} 
        style={styles.loader} 
      />
    );
  }

  const isInWatchlist = isMovieInWatchlist(details.id);

  const handleWatchlistPress = () => {
    if (isInWatchlist) {
      removeFromWatchlist(details.id);
    } else {
      addToWatchlist({ movieId: details.id, note: '' });
    }
  };

  const releaseDate = details.release_date || details.first_air_date;
  const runtime = details.runtime || (details.episode_run_time ? details.episode_run_time[0] : null);


  const isWeb = Platform.OS === 'web';
  const containerStyle = isWeb
    ? { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }
    : { flex: 1 };

  return (
    <View style={[styles.screen, containerStyle]}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        removeClippedSubviews={isWeb ? false : true}
        showsVerticalScrollIndicator={false}
      >

        {/* UI DESIGN:
          Using an ImageBackground with a LinearGradient overlay ensures that 
          white text is always readable, even if the movie poster is very bright. */}       

        <ImageBackground
          source={
            details.backdrop_path 
              ? { uri: `${IMAGE_BASE_URL}${details.backdrop_path}` } 
              : require('../assets/imgs/placeholder.webp')
          }
          style={styles.backdrop}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 120,
              zIndex: 1
            }}
          />

          <LinearGradient
            colors={[COLORS.transparent, COLORS.background]}
            locations={[0.6, 1]}
            style={styles.backdropGradient}
          />
        </ImageBackground>

        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.metadataContainer}>
              <Text style={styles.title}>{details.title || details.name}</Text>

              <View style={styles.infoRow}>
                {releaseDate && (
                  <Text style={styles.infoText}>
                    {new Date(releaseDate).getFullYear()}
                  </Text>
                )}

                {releaseDate && runtime && <Text style={styles.infoDot}>•</Text>}

                {runtime && (
                  <Text style={styles.infoText}>{runtime} min</Text>
                )}
              </View>

              <View style={styles.genreRow}>
                {details.genres.slice(0, 3).map(genre => (
                  <View key={genre.id} style={styles.genreTag}>
                    <Text style={styles.genreText}>{genre.name}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.ratingRow}>
                <Ionicons name="star" size={20} color={COLORS.gold} />
                <Text style={styles.ratingText}>{details.vote_average.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>
                  ({details.vote_count.toLocaleString()} votes)
                </Text>
              </View>
            </View>
            
            {/* Dynamic Watchlist Button: Changes appearance based on state */}
            <TouchableOpacity 
              style={[styles.watchlistButton, isInWatchlist && styles.watchlistButtonActive]} 
              onPress={handleWatchlistPress}
            >
              <Ionicons
                name={isInWatchlist ? "bookmark" : "bookmark-outline"}
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Trailer</Text>
          {trailerKey ? (
            <TouchableOpacity 
              onPress={handlePlayTrailer} 
              style={styles.trailerContainer}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={{ uri: `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg` }}
                style={styles.trailerThumbnail}
              >
                <View style={styles.playIconContainer}>
                  <Ionicons 
                    name="play-circle" 
                    size={60} 
                    color="rgba(255, 255, 255, 0.8)" 
                  />
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ) : (
            <Text style={styles.infoText}>No trailer available.</Text>
          )}

          <Text style={styles.sectionTitle}>Plot Summary</Text>
          <Text style={styles.overview}>{details.overview}</Text>

          <Text style={styles.sectionTitle}>Cast</Text>
          <FlatList
            data={details.credits.cast.slice(0, 15)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.castCard}
                onPress={() => navigation.navigate('CelebDetails', { personId: item.id })}
                activeOpacity={0}
              >
                <Image 
                  source={
                    item.profile_path
                      ? { uri: `${IMAGE_BASE_URL}${item.profile_path}` }
                      : require('../assets/imgs/placeholder.webp')
                  }
                  style={styles.castImage}
                />
                <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.castCharacter} numberOfLines={2}>{item.character}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.credit_id}
            horizontal
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={isWeb ? false : true}
          />

          <Text style={styles.sectionTitle}>Gallery</Text>
          <FlatList
            data={details.images.backdrops.slice(0, 10)}
            renderItem={({ item }) => (
              <Image
                source={{ uri: `${IMAGE_BASE_URL}${item.file_path}` }}
                style={styles.galleryImage}
              />
            )}
            keyExtractor={(item) => item.file_path}
            horizontal
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews={isWeb ? false : true}
          />
        </View>
      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color={COLORS.white} />
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { backgroundColor: COLORS.background },
  loader: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center' },

  backButton: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },

  backdrop: { height: 250, justifyContent: 'flex-end' },
  backdropGradient: { ...StyleSheet.absoluteFillObject },

  contentContainer: { padding: 16, paddingBottom: 120 },

  headerContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  metadataContainer: { flex: 1 },

  watchlistButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginLeft: 16
  },
  watchlistButtonActive: { backgroundColor: COLORS.primary },

  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontFamily: FONTS.urbanist,
    fontWeight: '800',
    marginBottom: 8
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { color: COLORS.textSecondary, fontSize: 14, fontFamily: FONTS.urbanist },
  infoDot: { color: COLORS.textMuted, marginHorizontal: 8 },

  genreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreTag: { backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  genreText: { color: COLORS.textSecondary, fontSize: 12, fontFamily: FONTS.urbanist },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 24, gap: 6 },
  ratingText: { color: COLORS.textPrimary, fontSize: 18, fontFamily: FONTS.urbanist, fontWeight: '700' },
  ratingCount: { color: COLORS.textMuted, fontSize: 14, fontFamily: FONTS.urbanist },

  sectionTitle: { color: COLORS.textPrimary, fontSize: 20, fontFamily: FONTS.urbanist, fontWeight: '600', marginVertical: 16 },

  overview: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: FONTS.urbanist,
    lineHeight: 22,
    marginBottom: 16
  },

  trailerContainer: { height: 200, backgroundColor: COLORS.black, marginBottom: 16 },
  trailerThumbnail: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  playIconContainer: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 40 },

  castCard: { width: 100, marginRight: 12, alignItems: 'center' },
  castImage: { width: 100, height: 150, backgroundColor: COLORS.surface, marginBottom: 8 },
  castName: { color: COLORS.textPrimary, fontSize: 13, fontFamily: FONTS.urbanist, fontWeight: '600', textAlign: 'center' },
  castCharacter: { color: COLORS.textMuted, fontSize: 12, fontFamily: FONTS.urbanist, textAlign: 'center' },

  galleryImage: { width: 250, height: 140, marginRight: 12, backgroundColor: COLORS.surface }
});

export default MovieDetailsScreen;
