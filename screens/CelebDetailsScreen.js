// screens/CelebDetailsScreen.js

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
  Platform,
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { BASE_URL, IMAGE_BASE_URL, createApiOptions } from '../api';
import { COLORS, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

const CelebDetailsScreen = ({ route, navigation }) => {
  const { personId } = route.params;
  const insets = useSafeAreaInsets();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Appending 'movie_credits' allows me to show the actor's filmography 
        // without needing a second API call.
        const url = `${BASE_URL}/person/${personId}?append_to_response=movie_credits,images`;
        const response = await fetch(url, createApiOptions());
        const data = await response.json();
        setDetails(data);
      } catch (error) {
        console.error("Failed to fetch celebrity details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [personId]);

  // UTILITY LOGIC: Age Calculation
  // This helper function transforms raw date strings (YYYY-MM-DD) into a 
  // calculated age integer, handling edge cases like if the person has passed away.
  const getAge = (birthday, deathday) => {
    if (!birthday) return null;
    const birthDate = new Date(birthday);
    const endDate = deathday ? new Date(deathday) : new Date();
    let age = endDate.getFullYear() - birthDate.getFullYear();
    const m = endDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && endDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  };

  if (loading || !details) {
    return (
        <View style={[styles.screen, {justifyContent:'center', alignItems:'center'}]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );
  }
  
  // DATA SORTING:
  // Instead of showing movies in random order, I sort them by 'popularity'.
  // This ensures the user sees the most famous roles first (e.g., Iron Man for RDJ)
  // rather than obscure early roles.
  const knownForMovies = details.movie_credits?.cast
    ?.sort((a, b) => b.popularity - a.popularity)
    .slice(0, 15) || [];

  const age = getAge(details.birthday, details.deathday);

  const renderKnownForCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.movieCard}
      onPress={() => navigation.navigate('MovieDetails', { movieId: item.id })}
      activeOpacity={0.7}
    >
      <Image 
        source={item.poster_path ? { uri: `${IMAGE_BASE_URL}${item.poster_path}` } : require('../assets/imgs/placeholder.webp')} 
        style={styles.moviePoster} 
      />
      <View style={styles.movieMeta}>
        <Text style={styles.movieTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.characterName} numberOfLines={1}>{item.character || "Cast"}</Text>
      </View>
    </TouchableOpacity>
  );

  const isWeb = Platform.OS === 'web';
  const containerStyle = isWeb 
    ? { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' } 
    : { flex: 1 };

  return (
    <View style={[styles.screen, containerStyle]}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ImageBackground
          source={details.profile_path ? { uri: `${IMAGE_BASE_URL}${details.profile_path}` } : require('../assets/imgs/placeholder.webp')}
          style={styles.heroImage}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', COLORS.background]}
            locations={[0, 0.7, 1]}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
                <View style={styles.jobBadge}>
                    <Text style={styles.jobTitle}>{details.known_for_department?.toUpperCase()}</Text>
                </View>
                <Text style={styles.celebName}>{details.name}</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.bodyContainer}>
          
          {/* Info Strip: Displays key biographic data cleanly */}
          <View style={styles.infoStrip}>
             <View style={styles.infoItem}>
                 <Text style={styles.infoLabel}>BORN</Text>
                 <Text style={styles.infoValue}>{details.birthday ? details.birthday.split('-')[0] : 'N/A'}</Text>
             </View>
             {age && (
                 <>
                    <View style={styles.verticalDivider} />
                    <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>AGE</Text>
                        <Text style={styles.infoValue}>{age}</Text>
                    </View>
                 </>
             )}
             <View style={styles.verticalDivider} />
             <View style={styles.infoItem}>
                 <Text style={styles.infoLabel}>ORIGIN</Text>
                 <Text 
                    style={[styles.infoValue, {maxWidth: 120, color: COLORS.textPrimary}]} 
                    numberOfLines={1} 
                 >
                    {details.place_of_birth ? details.place_of_birth.split(',').pop().trim() : 'N/A'}
                 </Text>
             </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BIOGRAPHY</Text>
            {/* Conditional expansion of biography text for better UX on small screens */}
            <Text 
              style={styles.biography} 
              numberOfLines={isBioExpanded ? undefined : 5}
            >
              {details.biography || "No biography available."}
            </Text>
            {details.biography && details.biography.length > 300 && (
              <TouchableOpacity onPress={() => setIsBioExpanded(!isBioExpanded)} style={styles.readMoreBtn}>
                <Text style={styles.readMoreText}>{isBioExpanded ? 'READ LESS' : 'READ MORE'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {knownForMovies.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>KNOWN FOR</Text>
              <FlatList
                data={knownForMovies}
                renderItem={renderKnownForCard}
                keyExtractor={(item) => item.credit_id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                removeClippedSubviews={!isWeb}
              />
            </View>
          )}

          {details.images?.profiles?.length > 0 && (
             <View style={styles.section}>
              <Text style={styles.sectionTitle}>GALLERY</Text>
              <FlatList
                data={details.images.profiles}
                renderItem={({ item }) => (
                  <Image 
                    source={{ uri: `${IMAGE_BASE_URL}${item.file_path}` }} 
                    style={styles.galleryImage}
                  />
                )}
                keyExtractor={(item) => item.file_path}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                removeClippedSubviews={!isWeb}
              />
            </View>
          )}

        </View>

      <TouchableOpacity 
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
      </TouchableOpacity>
      
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { 
    backgroundColor: COLORS.background 
  },
  
  heroImage: {
    width: '100%',
    height: 550, 
    justifyContent: 'flex-end',
  },
  heroGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 20
  },
  heroContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  jobBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  jobTitle: {
      color: COLORS.primary,
      fontSize: 12,
      fontFamily: FONTS.urbanist,
      fontWeight: '700',
      letterSpacing: 2,
  },
  celebName: {
    color: COLORS.white,
    fontSize: 42,
    fontFamily: FONTS.urbanist,
    fontWeight: '900', 
    textTransform: 'uppercase',
    lineHeight: 46,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },

  bodyContainer: {
    marginTop: 10,
  },

  infoStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 30,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      paddingVertical: 15,
  },
  infoItem: {
      marginRight: 20,
  },
  infoLabel: {
      color: COLORS.textMuted,
      fontSize: 10,
      fontFamily: FONTS.urbanist,
      fontWeight: '700',
      letterSpacing: 1,
      marginBottom: 2
  },
  infoValue: {
      color: COLORS.textPrimary,
      fontSize: 16,
      fontFamily: FONTS.urbanist,
      fontWeight: '600'
  },
  verticalDivider: {
      width: 1,
      height: '80%',
      backgroundColor: 'rgba(255,255,255,0.1)',
      marginRight: 20
  },

  section: {
    marginBottom: 40,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontFamily: FONTS.urbanist,
    fontWeight: '800',
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 15,
    textTransform: 'uppercase'
  },

  biography: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.urbanist,
    lineHeight: 26,
    paddingHorizontal: 20,
    fontWeight: '400'
  },
  readMoreBtn: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  readMoreText: {
    color: COLORS.primary,
    fontSize: 13,
    fontFamily: FONTS.urbanist,
    fontWeight: '700',
    letterSpacing: 1
  },

  movieCard: {
    width: 140,
    marginRight: 10,
    backgroundColor: COLORS.transparent,
  },
  moviePoster: {
    width: 140,
    height: 210,
    backgroundColor: '#333',
    marginBottom: 10,
    borderRadius: 0,
  },
  movieMeta: {
      paddingRight: 4
  },
  movieTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontFamily: FONTS.urbanist,
    fontWeight: '700',
    marginBottom: 2
  },
  characterName: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: FONTS.urbanist,
  },

  galleryImage: {
    width: 160,
    height: 240,
    marginRight: 10,
    backgroundColor: '#333',
    borderRadius: 0,
  },

  backButton: { 
    position: 'absolute', 
    left: 20, 
    width: 44, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 22,
  },
});

export default CelebDetailsScreen;