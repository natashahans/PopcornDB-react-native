// components/MovieCarousel.js

import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; 

import { IMAGE_BASE_URL } from '../api';
import { useWatchlist } from '../context/WatchlistContext';
import { COLORS, FONTS } from '../constants/theme';

// REUSABILITY:
// I extracted MovieCard into its own sub-component. 
// This keeps the main carousel logic clean and allows me to potentially reuse 
// this specific card design in other parts of the app (like the Search results) later.
const MovieCard = ({ movie }) => {
  const navigation = useNavigation();
  // Accessing the context directly inside the card avoids 'prop drilling' 
  // (passing functions down through multiple layers of parents).
  const { addToWatchlist, removeFromWatchlist, isMovieInWatchlist } = useWatchlist();
  const isInWatchlist = isMovieInWatchlist(movie.id);

  const handleMoviePress = () => {
    navigation.navigate('MovieDetails', { movieId: movie.id });
  };

  const handleWatchlistPress = () => {
    if (isInWatchlist) {
      removeFromWatchlist(movie.id);
    } else {
      addToWatchlist({ movieId: movie.id, note: '' });
    }
  };

  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity onPress={handleMoviePress} activeOpacity={0.8}>
        <Image
          source={movie.poster_path ? { uri: `${IMAGE_BASE_URL}${movie.poster_path}` } : require('../assets/imgs/placeholder.webp')}
          style={styles.poster}
        />
      </TouchableOpacity>
      
      {/* UX DECISION:
          I added this overlay button so users can add movies to their watchlist 
          immediately without having to click into the details screen first. 
          This reduces the number of taps required for the core user action. */}
      <TouchableOpacity style={styles.addButton} onPress={handleWatchlistPress}>
        <Ionicons name={isInWatchlist ? "checkmark" : "add"} size={22} color={COLORS.white} />
      </TouchableOpacity>
      <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
    </View>
  );
};

const MovieCarousel = ({ title, movies, navigation, genreId }) => {
  const handleViewAllPress = () => {
    if (genreId) {
      navigation.navigate('Genre', { genreId, genreTitle: title });
    } else {
      Alert.alert(`View All: ${title}`, "Navigation for this section is not yet implemented.");
    }
  };

  return (
    <View style={styles.carouselContainer}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={handleViewAllPress}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {/* PERFORMANCE:
          Using FlatList with 'horizontal={true}' instead of a horizontal ScrollView.
          FlatList lazy-loads the images as the user swipes right, which is crucial 
          for memory management when displaying high-resolution movie posters. */}
      <FlatList
        data={movies}
        renderItem={({ item }) => <MovieCard movie={item} />}
        keyExtractor={(item) => item.id.toString()}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carouselContainer: {
    marginBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontFamily: FONTS.urbanist,
    fontWeight: '600',
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 16, 
    fontFamily: FONTS.urbanist,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: 120,
    marginRight: 14,
  },
  poster: {
    width: '100%',
    height: 180,
    backgroundColor: COLORS.surface,
  },
  addButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    width: 32,
    height: 32,
    borderBottomRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movieTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontFamily: FONTS.urbanist,
    marginTop: 8,
  },
});

export default MovieCarousel;