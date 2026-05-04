// screens/UserProfileScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  FlatList,
  ActivityIndicator,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context'; 
// useFocusEffect is vital here: it ensures the profile data refreshes 
// automatically whenever the user taps the 'User' tab.
import { useFocusEffect } from '@react-navigation/native';

import { useWatchlist } from '../context/WatchlistContext';
import { COLORS, FONTS } from '../constants/theme';
import { BASE_URL, IMAGE_BASE_URL, createApiOptions } from '../api';

// Hardcoded user data for the prototype "Guest" profile.
// In a future update with Firebase Auth, this would be fetched from a 'users' collection.
const USER_PROFILE = {
  name: "Alex Doe",
  handle: "@alex_movies",
  bio: "Cinema addict. Sci-fi geek. Always looking for the next hidden gem.",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=400&auto=format&fit=crop",
  cover: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1000&auto=format&fit=crop",
};

const FAVORITE_GENRES = ["Sci-Fi", "Thriller", "Adventure", "Indie"];

const UserProfileScreen = ({ navigation }) => {
  // Accessing the global state for both the Watchlist and the Viewing History.
  const { watchlist, viewHistory } = useWatchlist();
  
  const [watchlistPreview, setWatchlistPreview] = useState([]);
  const [loadingWatchlist, setLoadingWatchlist] = useState(false);

  // DATA FETCHING STRATEGY:
  // Since AsyncStorage only stores movie IDs (to save space), I need to fetch 
  // the actual movie posters for the preview section.
  // I use Promise.all here to fetch the 5 most recent items in parallel.
  // This is significantly faster than awaiting them one by one in a loop.
  useFocusEffect(
    useCallback(() => {
      const fetchWatchlistData = async () => {
        if (!watchlist || watchlist.length === 0) {
          setWatchlistPreview([]);
          return;
        }
        
        // Slicing the last 5 items to show a "Preview" rather than the whole list.
        const recentItems = [...watchlist].reverse().slice(0, 5);
        setLoadingWatchlist(true);

        try {
          const promises = recentItems.map(item => 
            fetch(`${BASE_URL}/movie/${item.id}`, createApiOptions()).then(res => res.json())
          );
          const results = await Promise.all(promises);
          
          const validResults = results.filter(movie => movie && movie.id);
          setWatchlistPreview(validResults);
        } catch (error) {
          console.error("Failed to load profile watchlist preview", error);
        } finally {
          setLoadingWatchlist(false);
        }
      };

      fetchWatchlistData();
    }, [watchlist])
  );

  const renderSectionHeader = (title, onPress = null) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.seeAllText}>View All</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMovieCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.movieCard}
      onPress={() => navigation.navigate('MovieDetails', { movieId: item.id })}
      activeOpacity={0.8}
    >
      <Image 
        source={item.poster_path ? { uri: IMAGE_BASE_URL + item.poster_path } : require('../assets/imgs/placeholder.webp')}
        style={styles.posterImage}
      />
    </TouchableOpacity>
  );

  const isWeb = Platform.OS === 'web';
  const containerStyle = isWeb 
    ? { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } 
    : { flex: 1 };

  return (
    <SafeAreaView style={[styles.screen, containerStyle]} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {/* DESIGN CHOICE: Parallax-style Header 
            Using a gradient overlay on the cover image ensures the white text 
            remains readable regardless of the image brightness. */}
        <View style={styles.headerWrapper}>
          <Image source={{ uri: USER_PROFILE.cover }} style={styles.coverImage} />
          <LinearGradient
            colors={['transparent', COLORS.background]}
            style={styles.coverGradient}
            locations={[0.2, 1]}
          />
          
          <View style={[styles.profileInfoContainer, { marginTop: -60 }]}>
            <View style={styles.avatarRow}>
              <Image source={{ uri: USER_PROFILE.avatar }} style={styles.avatar} />
              
              {/* Dynamic Stats Row: Updates instantly as user interacts with the app */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{watchlist.length}</Text>
                  <Text style={styles.statLabel}>Watchlist</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{viewHistory.length}</Text>
                  <Text style={styles.statLabel}>Viewed</Text>
                </View>
              </View>
            </View>

            <Text style={styles.userName}>{USER_PROFILE.name}</Text>
            <Text style={styles.userHandle}>{USER_PROFILE.handle}</Text>
            <Text style={styles.userBio}>{USER_PROFILE.bio}</Text>

            <View style={styles.genreContainer}>
              {FAVORITE_GENRES.map((genre, index) => (
                <View key={index} style={styles.genrePill}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* SECTION: Viewing History 
            This fulfills the "Transformation" part of the brief: 
            Turning a list of clicked movies into a visual history log. */}
        <View style={styles.sectionContainer}>
          {renderSectionHeader("Recently Viewed")}
          
          {viewHistory.length > 0 ? (
            <FlatList
              data={viewHistory}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `history-${item.id}`}
              contentContainerStyle={styles.listContent}
              renderItem={renderMovieCard}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color={COLORS.surface} />
              <Text style={styles.emptyText}>Movies you view will appear here.</Text>
            </View>
          )}
        </View>

        {/* SECTION: Watchlist Preview 
            Shows a CTA (Call to Action) if the list is empty to guide the user. */}
        <View style={styles.sectionContainer}>
          {renderSectionHeader("Your Watchlist", () => navigation.navigate('Watchlist'))}
          
          {loadingWatchlist ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : watchlistPreview.length > 0 ? (
            <FlatList
              data={watchlistPreview}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => `watchlist-${item.id}`}
              contentContainerStyle={styles.listContent}
              renderItem={renderMovieCard}
            />
          ) : (
            <TouchableOpacity 
              style={styles.emptyWatchlistCard}
              onPress={() => navigation.navigate('Home')}
            >
              <LinearGradient
                colors={[COLORS.surface, '#2A2A2A']}
                style={styles.emptyGradient}
              >
                <MaterialCommunityIcons name="bookmark-plus-outline" size={32} color={COLORS.textMuted} />
                <Text style={styles.emptyWatchlistTitle}>Start Your Collection</Text>
                <Text style={styles.emptyWatchlistSub}>Find movies and add them to your list.</Text>
                <Text style={styles.browseButton}>Browse Movies</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerContainer}>
            <View style={styles.divider} />
            <Text style={styles.footerText}>PopcornDB v1.0</Text>
            <Text style={styles.footerSubText}>Designed for Movie Lovers</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    marginBottom: 10,
  },
  coverImage: {
    width: '100%',
    height: 200,
    opacity: 0.7,
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  profileInfoContainer: {
    paddingHorizontal: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: COLORS.background,
    marginRight: 20,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12, 
    justifyContent: 'space-around',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.urbanist,
    fontWeight: '700',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.urbanist,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontFamily: FONTS.urbanist,
    fontWeight: '800',
  },
  userHandle: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: FONTS.urbanist,
    fontWeight: '600',
    marginBottom: 12,
  },
  userBio: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontFamily: FONTS.urbanist,
    lineHeight: 22,
    marginBottom: 16,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genrePill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  genreText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontFamily: FONTS.urbanist,
    fontWeight: '600',
  },
  sectionContainer: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.urbanist,
    fontWeight: '700',
  },
  seeAllText: {
    color: COLORS.primary,
    fontSize: 14,
    fontFamily: FONTS.urbanist,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingRight: 8,
  },
  movieCard: {
    width: 120,
    marginRight: 12,
  },
  posterImage: {
    width: 120,
    height: 180,
    backgroundColor: COLORS.surface,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.urbanist,
    marginTop: 8,
  },
  emptyWatchlistCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWatchlistTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontFamily: FONTS.urbanist,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyWatchlistSub: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.urbanist,
    textAlign: 'center',
    marginBottom: 16,
  },
  browseButton: {
    color: COLORS.primary,
    fontSize: 16,
    fontFamily: FONTS.urbanist,
    fontWeight: '700',
  },
  footerContainer: {
    marginTop: 40,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.urbanist,
    fontWeight: '600',
  },
  footerSubText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.urbanist,
    opacity: 0.6,
    marginTop: 4,
  },
});

export default UserProfileScreen;