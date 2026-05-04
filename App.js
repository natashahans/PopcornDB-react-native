import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import WelcomeScreen from './screens/WelcomeScreen';
import HomeScreen from './screens/HomeScreen';
import WatchlistScreen from './screens/WatchlistScreen';
import MovieDetailsScreen from './screens/MovieDetailsScreen'; 
import SearchScreen from './screens/SearchScreen';
import GenreScreen from './screens/GenreScreen';
import CelebDetailsScreen from './screens/CelebDetailsScreen';
import UserProfileScreen from './screens/UserProfileScreen'; 

// I am importing the WatchlistProvider here to wrap the entire app.
// This allows the watchlist state to be managed globally and accessed from any screen.
import { WatchlistProvider } from './context/WatchlistContext'; 
import { COLORS } from './constants/theme';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Defining a custom DarkTheme to match the cinema aesthetic of the app.
const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.background, 
  },
};

// I've structured the app using nested StackNavigators for each Tab.
// This ensures that when a user clicks on a movie details screen, they stay within 
// their current context (Home, Search, etc) rather than losing their place.
const HomeStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <Stack.Screen name="SearchFromHome" component={SearchScreen} />
      <Stack.Screen name="Genre" component={GenreScreen} />
      <Stack.Screen name="CelebDetails" component={CelebDetailsScreen} /> 
    </Stack.Navigator>
  );
};

const SearchStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchScreen" component={SearchScreen} />
      <Stack.Screen name="Genre" component={GenreScreen} />
      <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <Stack.Screen name="CelebDetails" component={CelebDetailsScreen} />
    </Stack.Navigator>
  );
};

const WatchlistStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="WatchlistMain" component={WatchlistScreen} />
      <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <Stack.Screen name="CelebDetails" component={CelebDetailsScreen} />
    </Stack.Navigator>
  );
};

const UserStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UserProfileMain" component={UserProfileScreen} />
      <Stack.Screen name="MovieDetails" component={MovieDetailsScreen} />
      <Stack.Screen name="CelebDetails" component={CelebDetailsScreen} />
    </Stack.Navigator>
  );
};

// This component handles the main bottom navigation.
const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: COLORS.transparent,
          height: 80,
          paddingTop: 10,
        },
        // I implemented Expo BlurView here to give the bottom tab bar a modern, 
        // glassmorphism look, improving on the solid color used in the prototype.
        tabBarBackground: () => (
          <BlurView 
            tint="dark" 
            intensity={80} 
            style={StyleSheet.absoluteFill} 
          />
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          // Dynamically switching between filled and outline icons based on focus state.
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline'; 
          else if (route.name === 'Search') iconName = focused ? 'search' : 'search-outline';
          else if (route.name === 'Watchlist') iconName = focused ? 'bookmark' : 'bookmark-outline';
          else if (route.name === 'User') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={26} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackNavigator} 
        // Using unmountOnBlur to ensure the home feed refreshes if necessary when returning.
        options={{ unmountOnBlur: true }}
      />
      <Tab.Screen name="Search" component={SearchStackNavigator} />
      <Tab.Screen name="Watchlist" component={WatchlistStackNavigator} />
      <Tab.Screen name="User" component={UserStackNavigator} />
    </Tab.Navigator>
  );
};

const App = () => {
  // Global font loading. 'Urbanist' is used throughout the app for consistent branding.
  const [fontsLoaded] = useFonts({ 'urbanist': require('./assets/font/urbanist') });
  if (!fontsLoaded) return null;

  return (
    // Wrapping the app in WatchlistProvider to provide context to all screens.
    <WatchlistProvider>
      <NavigationContainer theme={DarkTheme}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="MainApp" component={BottomTabNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </WatchlistProvider>
  );
};

export default App;