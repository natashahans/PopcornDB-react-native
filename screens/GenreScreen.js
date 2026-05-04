// screens/GenreScreen.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image,
  Platform,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BASE_URL, IMAGE_BASE_URL, createApiOptions } from '../api';
import { COLORS, FONTS } from '../constants/theme';
import { useWatchlist } from '../context/WatchlistContext';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Results' },
  { id: 'year_2020', label: '2020+', icon: 'calendar' },
  { id: 'top_rated', label: 'Top Rated', icon: 'star' },
  { id: 'newest', label: 'Newest', icon: 'time' },
  { id: 'oldest', label: 'Classics', icon: 'film' },
];

const MovieCard = ({ movie, navigation, mediaType }) => {
  const { addToWatchlist, removeFromWatchlist, isMovieInWatchlist } = useWatchlist();
  const isInWatchlist = isMovieInWatchlist(movie.id);

  const handleWatchlistPress = () => {
    if (isInWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ movieId: movie.id, note: '' });
    }
  };

  const title = movie.title || movie.name;

  return (
    <View style={styles.cardContainer}>
      <View style={styles.posterWrapper}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('MovieDetails', { 
              movieId: movie.id, 
              mediaType: mediaType || 'movie' 
          })}
          activeOpacity={0.8}
        >
          <Image 
            source={movie.poster_path ? { uri: `${IMAGE_BASE_URL}${movie.poster_path}` } : require('../assets/imgs/placeholder.webp')} 
            style={styles.poster} 
          />
        </TouchableOpacity>
        
        {/* Direct Watchlist Action: 
            Allows users to save movies quickly without entering the details screen. 
            This reduces friction in the user journey. */}
        <TouchableOpacity style={styles.addButton} onPress={handleWatchlistPress}>
          <Ionicons name={isInWatchlist ? "checkmark" : "add"} size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.movieTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
};

const GenreScreen = ({ route, navigation }) => {
  const { genreId, genreTitle, mediaType = 'movie' } = route.params;
  
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State to track pagination. We start at page 1.
  const [page, setPage] = useState(1);
  
  const [activeFilter, setActiveFilter] = useState('all');

  // DATA FETCHING & PAGINATION:
  // This function handles the "Infinite Scroll" logic.
  // Instead of replacing the data when the page changes, I append the new results
  // to the existing array (`prevMovies`). This creates a seamless scrolling experience
  // where the user can keep scrolling down to load more content.
  const fetchMoviesByGenre = useCallback(async () => {
    if (page === 1) setLoading(true);
    try {
      let url;
      if (mediaType === 'tv') {
        url = `${BASE_URL}/tv/popular?page=${page}`;
      } else {
        url = `${BASE_URL}/discover/movie?with_genres=${genreId}&page=${page}`;
      }
      
      const response = await fetch(url, createApiOptions());
      const data = await response.json();
      const moviesWithPosters = data.results.filter(movie => movie.poster_path);
      
      // Appending new data to the existing list
      setMovies(prevMovies => [...prevMovies, ...moviesWithPosters]);
    } catch (error) {
      console.error("Failed to fetch genre items:", error);
    } finally {
      setLoading(false);
    }
  }, [genreId, page, mediaType]);

  useEffect(() => {
    fetchMoviesByGenre();
  }, [fetchMoviesByGenre]);

  // CLIENT-SIDE SORTING:
  // Since I have already fetched the data, I decided to handle sorting (Newest, Top Rated)
  // locally on the device using useMemo. This is faster than requesting a re-sort from the API
  // and saves bandwidth.
  const processedMovies = useMemo(() => {
    let data = [...movies];

    switch (activeFilter) {
      case 'year_2020':
        return data.filter(item => {
            const date = item.release_date || item.first_air_date;
            return date && date >= '2020-01-01';
        });
      case 'top_rated':
        return data.sort((a, b) => b.vote_average - a.vote_average);
      case 'newest':
        return data.sort((a, b) => {
            const dateA = new Date(a.release_date || a.first_air_date || 0);
            const dateB = new Date(b.release_date || b.first_air_date || 0);
            return dateB - dateA;
        });
      case 'oldest':
        return data.sort((a, b) => {
            const dateA = new Date(a.release_date || a.first_air_date || 0);
            const dateB = new Date(b.release_date || b.first_air_date || 0);
            return dateA - dateB;
        });
      default:
        return data; 
    }
  }, [movies, activeFilter]);

  const handleLoadMore = () => {
    setPage(prevPage => prevPage + 1);
  };

  const renderMovieItem = ({ item }) => (
    <MovieCard movie={item} navigation={navigation} mediaType={mediaType} />
  );

  const renderFilterChips = () => (
    <View style={{ height: 40, marginTop: 12, marginBottom: 8 }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {FILTER_OPTIONS.map((filter) => {
          const isActive = activeFilter === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              onPress={() => setActiveFilter(filter.id)}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive
              ]}
            >
              {filter.icon && (
                  <Ionicons 
                      name={filter.icon} 
                      size={14} 
                      color={isActive ? COLORS.white : COLORS.textMuted} 
                      style={{marginRight: 6}}
                  />
              )}
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const isWeb = Platform.OS === 'web';
  const containerStyle = isWeb 
    ? { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } 
    : { flex: 1 };

  return (
    <SafeAreaView style={[styles.screen, containerStyle]} edges={['top']}>
    
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{genreTitle}</Text>
      </View>

      {renderFilterChips()}
      
      {loading && page === 1 ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          // Unmounting off-screen components to save memory on long lists.
          removeClippedSubviews={!isWeb} 
          
          data={processedMovies}
          renderItem={renderMovieItem}
          keyExtractor={(item, index) => item.id.toString() + index}
          
          numColumns={3}
          contentContainerStyle={styles.listContent}
          
          // UI OPTIMIZATION:
          // I am using onEndReached to detect when the user hits the bottom of the grid.
          // This triggers the next page fetch automatically.
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => page > 1 && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { 
    backgroundColor: COLORS.background 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8, 
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  headerTitle: { 
    color: COLORS.textPrimary, 
    fontSize: 22, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '700', 
    marginLeft: 16,
    flex: 1, 
  },
  
  filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: COLORS.surface,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center',
  },
  filterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary
  },
  filterText: {
      color: COLORS.textMuted,
      fontSize: 14,
      fontFamily: FONTS.urbanist,
      fontWeight: '600',
  },
  filterTextActive: {
      color: COLORS.white
  },

  listContent: { 
    paddingHorizontal: 8, 
    paddingBottom: 100, 
    flexGrow: 1 
  },
  cardContainer: {
    flex: 1/3,
    padding: 7,
    marginBottom: 6,
    marginTop: 12 
  },
  
  posterWrapper: {
    position: 'relative', 
    width: '100%',
    aspectRatio: 2/3,
  },
  poster: { 
    width: '100%', 
    height: '100%', 
    backgroundColor: COLORS.surface, 
  },
  movieTitle: { 
    color: COLORS.textSecondary, 
    fontSize: 12, 
    fontFamily: FONTS.urbanist, 
    marginTop: 8, 
  },
  
  addButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 30,
    height: 30,
    borderBottomRightRadius: 8, 
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
});

export default GenreScreen;