// screens/SearchScreen.js

import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  Keyboard, 
  ScrollView, 
  useWindowDimensions,
  Platform,
  LayoutAnimation,
  UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; 

import { BASE_URL, IMAGE_BASE_URL, createApiOptions } from '../api';
import { useWatchlist } from '../context/WatchlistContext';
import { COLORS, FONTS } from '../constants/theme';

// Enabling LayoutAnimation for Android, as it's not enabled by default.
// This allows for the smooth expansion/collapse effect when opening search filters.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Results' },
  { id: 'year_2020', label: '2020+', icon: 'calendar' },
  { id: 'top_rated', label: 'Top Rated', icon: 'star' },
  { id: 'newest', label: 'Newest', icon: 'time' },
  { id: 'oldest', label: 'Classics', icon: 'film' },
];

const SearchScreen = ({ route, navigation }) => {
  const { width } = useWindowDimensions();
  const { autoFocus = false } = route.params || {};
  const { viewHistory, clearHistory } = useWatchlist();

  const [query, setQuery] = useState('');
  const [rawResults, setRawResults] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [popularPeople, setPopularPeople] = useState([]);
  
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false); 

  // Responsive Grid Calculation:
  // Dynamically calculating card width based on screen width ensures the app looks 
  // great on both small phones and larger tablets/web.
  const isWideScreen = width > 768;
  const numColumns = isWideScreen ? 4 : 2;
  const gap = 12; 
  const paddingHorizontal = 16;
  const cardWidth = (width - (paddingHorizontal * 2) - (gap * (numColumns - 1))) / numColumns;
  const cardHeight = cardWidth / 1.6;

  const isWeb = Platform.OS === 'web';
  const isSearching = query.length > 0;

  const popularInterests = [
    { id: 28, name: 'Action', image: require('../assets/imgs/action.webp') },
    { id: 27, name: 'Horror', image: require('../assets/imgs/horror.webp') },
    { id: 35, name: 'Comedy', image: require('../assets/imgs/comedy.webp') },
    { id: 53, name: 'Thriller', image: require('../assets/imgs/thriller.webp') },
    { id: 878, name: 'Sci-Fi', image: require('../assets/imgs/sci-fi.webp') },
    { id: 10749, name: 'Romance', image: require('../assets/imgs/romance.webp') },
  ];

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      try {
        const response = await fetch(`${BASE_URL}/person/popular`, createApiOptions());
        const data = await response.json();
        if (data.results) {
          setPopularPeople(data.results.slice(0, 10));
        }
      } catch (error) { 
        console.error("Failed to fetch discovery data:", error); 
      }
    };
    fetchDiscoveryData();
  }, []);

  // SEARCH DEBOUNCE LOGIC:
  // Instead of fetching on every keystroke, I wait 500ms after the user stops typing.
  // This drastically reduces API calls and improves UI responsiveness.
  useEffect(() => {
    if (query.trim() === '') {
      setRawResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const searchTimeout = setTimeout(async () => {
      try {
        const url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false`;
        const response = await fetch(url, createApiOptions());
        const data = await response.json();
        setRawResults(data.results || []);
      } catch (error) {
        console.error("Failed to fetch search results:", error);
      } finally {
        setLoading(false);
      }
    }, 500); 

    return () => clearTimeout(searchTimeout);
  }, [query]);

  // CLIENT-SIDE FILTERING (useMemo):
  // Since the API search endpoint doesn't support complex sorting (like "Top Rated" 
  // within search results), I fetch the raw results first and then sort/filter 
  // them locally on the client side. useMemo ensures this expensive operation 
  // only runs when results or filters actually change.
  const processedResults = useMemo(() => {
    if (!rawResults.length) return [];
    
    let data = [...rawResults];

    switch (activeFilter) {
      case 'year_2020':
        return data.filter(item => item.release_date && item.release_date >= '2020-01-01');
      case 'top_rated':
        return data.sort((a, b) => b.vote_average - a.vote_average);
      case 'newest':
        return data.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      case 'oldest':
        return data.sort((a, b) => new Date(a.release_date) - new Date(b.release_date));
      default:
        return data; 
    }
  }, [rawResults, activeFilter]);

  const handleRightButtonPress = () => {
    if (isSearching) {
        setQuery('');
        setRawResults([]);
        setShowFilters(false);
        if (!isWeb) Keyboard.dismiss();
    } else {
        navigation.goBack();
    }
  };

  const toggleFilters = () => {
    // Animating the appearance of the filter row for a smoother UX.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(!showFilters);
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.historyCard} 
      onPress={() => navigation.navigate('MovieDetails', { movieId: item.id })}
    >
      <Image 
        source={item.poster_path ? { uri: IMAGE_BASE_URL + item.poster_path } : require('../assets/imgs/placeholder.webp')} 
        style={styles.historyImage} 
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  const renderPersonItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.personCard} 
      onPress={() => navigation.navigate('CelebDetails', { personId: item.id })}
    >
      <Image 
        source={item.profile_path ? { uri: IMAGE_BASE_URL + item.profile_path } : require('../assets/imgs/placeholder.webp')} 
        style={styles.personImage} 
        resizeMode="cover"
      />
      <Text style={styles.personName} numberOfLines={2}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderDiscoveryContent = () => (
    <ScrollView 
      style={{ flex: 1, height: '100%' }}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode={isWeb ? 'none' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
    >
      {viewHistory.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Viewed</Text>
            <TouchableOpacity onPress={clearHistory}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={viewHistory}
            renderItem={renderHistoryItem}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            style={{ flexGrow: 0 }}
          />
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Popular Genres</Text>
      </View>
      
      <View style={styles.interestsGrid}>
        {popularInterests.map((interest) => (
          <TouchableOpacity 
            key={interest.id} 
            style={[styles.interestCard, { width: cardWidth, height: cardHeight }]}
            onPress={() => navigation.navigate('Genre', { genreId: interest.id, genreTitle: interest.name })}
          >
            <Image 
              source={interest.image}
              style={styles.absoluteImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.interestGradient}
            >
              <Text style={styles.interestName}>{interest.name}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {popularPeople.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trending Celebrities</Text>
          </View>
          <FlatList
            data={popularPeople}
            renderItem={renderPersonItem}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }} 
            style={{ flexGrow: 0 }}
          />
        </>
      )}
    </ScrollView>
  );

  const renderResultItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => navigation.navigate("MovieDetails", { movieId: item.id })}
    >
      <Image
        source={
          item.poster_path
            ? { uri: IMAGE_BASE_URL + item.poster_path }
            : require("../assets/imgs/placeholder.webp")
        }
        style={styles.resultPoster}
        resizeMode="cover"
      />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.releaseYear}>
          {item.release_date ? item.release_date.split('-')[0] : "N/A"}
        </Text>
        <View style={styles.metaRow}>
            <View style={styles.ratingContainer}>
                <Ionicons name="star" size={14} color={COLORS.primary} />
                <Text style={styles.ratingText}>{item.vote_average ? item.vote_average.toFixed(1) : '0.0'}</Text>
            </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const renderFilterChips = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.filterContainer}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
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
  );

  const containerStyle = isWeb 
    ? { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } 
    : { flex: 1 };

  return (
    <SafeAreaView style={[styles.screen, containerStyle]} edges={['top']}>
      
      <View style={styles.headerContainer}>
          <View style={styles.searchBarRow}>
            <View style={styles.inputWrapper}>
                <Ionicons name="search" size={20} color={COLORS.textMuted} style={styles.searchIcon} />
                <TextInput
                    style={styles.inputField}
                    placeholder="Movies, shows, people..."
                    placeholderTextColor={COLORS.textMuted}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus={autoFocus}
                    returnKeyType="search"
                    onSubmitEditing={() => !isWeb && Keyboard.dismiss()}
                />
                {isSearching && (
                    <TouchableOpacity onPress={() => setQuery('')} style={styles.clearIcon}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
            
            {/* Filter Toggle Button */}
            {isSearching && (
                <TouchableOpacity 
                    style={[styles.filterBtn, showFilters && styles.filterBtnActive]} 
                    onPress={toggleFilters}
                >
                    <Ionicons 
                        name="options-outline" 
                        size={22} 
                        color={showFilters ? COLORS.white : COLORS.textPrimary} 
                    />
                </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleRightButtonPress} style={{marginLeft: 4}}>
                <Text style={styles.cancelButton}>
                    {isSearching ? "Cancel" : "Back"}
                </Text>
            </TouchableOpacity>
          </View>

          {/* Conditional rendering for filter chips */}
          {isSearching && showFilters && renderFilterChips()}
      </View>

      <View style={{ flex: 1 }}>
        {isSearching ? (
          loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : processedResults.length === 0 ? (
            <View style={styles.centeredMessage}>
               <MaterialCommunityIcons name="movie-search-outline" size={60} color={COLORS.surface} />
               <Text style={styles.noResultsText}>No results found.</Text>
            </View>
          ) : (
            <FlatList
              style={{ flex: 1, height: '100%' }} 
              removeClippedSubviews={!isWeb}
              data={processedResults}
              renderItem={renderResultItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode={isWeb ? 'none' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
            />
          )
        ) : (
          renderDiscoveryContent()
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: { 
    backgroundColor: COLORS.background 
  },
  
  headerContainer: {
      backgroundColor: COLORS.background,
      zIndex: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.surface,
      paddingBottom: 8,
  },
  searchBarRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  inputField: { 
    flex: 1, 
    color: COLORS.textPrimary, 
    fontSize: 16, 
    fontFamily: FONTS.urbanist,
    height: '100%',
    ...Platform.select({
      web: { outlineStyle: 'none' }
    })
  },
  clearIcon: {
    marginLeft: 8,
  },
  filterBtn: {
      width: 46,
      height: 46,
      borderRadius: 12,
      backgroundColor: COLORS.surface,
      justifyContent: 'center',
      alignItems: 'center',
  },
  filterBtnActive: {
      backgroundColor: COLORS.primary,
  },
  cancelButton: { 
    color: COLORS.primary,
    fontSize: 16, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '600'
  },

  filterContainer: {
      marginTop: 4,
      maxHeight: 50, 
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

  centeredMessage: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: -50
  },
  noResultsText: { 
    color: COLORS.textPrimary, 
    fontSize: 18, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '700',
    marginTop: 16
  },
  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 16, 
    marginBottom: 16,
  },
  resultPoster: { 
    width: 70, 
    height: 105, 
    backgroundColor: COLORS.surface, 
  }, 
  textContainer: { 
    flex: 1, 
    marginLeft: 14,
    justifyContent: 'center',
  },
  title: { 
    color: COLORS.textPrimary, 
    fontSize: 17, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '600',
    marginBottom: 4
  },
  releaseYear: { 
    color: COLORS.textMuted, 
    fontSize: 14, 
    fontFamily: FONTS.urbanist, 
  },
  metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 12
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  ratingText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.urbanist,
  },

  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    marginTop: 24, 
    marginBottom: 16 
  },
  sectionTitle: { 
    color: COLORS.textPrimary, 
    fontSize: 18, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '700' 
  },
  clearButton: { 
    color: COLORS.primary, 
    fontSize: 14, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '600' 
  },
  
  historyCard: { 
    width: 100, 
    marginRight: 12,
    overflow: 'hidden' 
  },
  historyImage: { 
    width: '100%', 
    height: 150, 
    backgroundColor: COLORS.surface 
  }, 
  personCard: { 
    width: 100, 
    marginRight: 12, 
    alignItems: 'center' 
  },
  personImage: { 
    width: 100, 
    height: 150, 
    backgroundColor: COLORS.surface, 
    marginBottom: 8 
  }, 
  personName: { 
    color: COLORS.textPrimary, 
    fontSize: 12, 
    fontFamily: FONTS.urbanist, 
    textAlign: 'center',
    fontWeight: '500'
  },

  interestsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12,
    paddingHorizontal: 16 
  },
  interestCard: { 
    backgroundColor: COLORS.surface, 
    overflow: 'hidden', 
    position: 'relative' 
  },
  absoluteImage: { 
    width: '100%', 
    height: '100%', 
    position: 'absolute', 
    top: 0, 
    left: 0 
  },
  interestGradient: { 
    width: '100%', 
    height: '100%', 
    justifyContent: 'flex-end', 
    padding: 10, 
    position: 'absolute', 
    zIndex: 2 
  },
  interestName: { 
    color: '#fff', 
    fontSize: 16, 
    fontFamily: FONTS.urbanist, 
    fontWeight: '700' 
  },
});

export default SearchScreen;