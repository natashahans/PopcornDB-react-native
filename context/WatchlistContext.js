// context/WatchlistContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WatchlistContext = createContext();

export const WatchlistProvider = ({ children }) => {
  // STATE MANAGEMENT:
  // I am using the Context API pattern here. This acts as the 'Single Source of Truth'
  // for the entire application, avoiding the need for complex Redux boilerplate
  // while still allowing any screen (Home, Search, Details) to access and modify data.
  const [watchlist, setWatchlist] = useState([]);
  const [viewHistory, setViewHistory] = useState([]);

  // DATA PERSISTENCE (LOAD):
  // On app launch, I retrieve the saved JSON strings from the device's local storage 
  // and parse them back into state. This ensures the user's data survives app restarts.
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedWatchlist = await AsyncStorage.getItem('@watchlist');
        const savedHistory = await AsyncStorage.getItem('@viewHistory');
        if (savedWatchlist !== null) setWatchlist(JSON.parse(savedWatchlist));
        if (savedHistory !== null) setViewHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load data from storage.', e);
      }
    };
    loadData();
  }, []);

  // DATA PERSISTENCE (SAVE):
  // I use useEffect with the 'watchlist' dependency. This ensures that ANY change 
  // to the list (adding, removing, editing notes) is automatically saved to storage immediately.
  useEffect(() => {
    const saveWatchlist = async () => {
      try {
        await AsyncStorage.setItem('@watchlist', JSON.stringify(watchlist));
      } catch (e) {
        console.error('Failed to save watchlist.', e);
      }
    };
 
    saveWatchlist(); 
  }, [watchlist]);

  useEffect(() => {
    const saveHistory = async () => {
      try {
        await AsyncStorage.setItem('@viewHistory', JSON.stringify(viewHistory));
      } catch (e) {
        console.error('Failed to save view history.', e);
      }
    };
    if (viewHistory.length >= 0) saveHistory();
  }, [viewHistory]);

  // LOGIC: History Management
  // This function manages the 'Recently Viewed' list. I implemented logic here to:
  // 1. Remove duplicates (if I view a movie again, it moves to the top).
  // 2. Limit the array to the last 10 items to save memory and storage space.
  const addToHistory = (movie) => {
    setViewHistory(prev => {
      const filtered = prev.filter(item => item.id !== movie.id);
      return [movie, ...filtered].slice(0, 10);
    });
  };

  const clearHistory = () => {
    setViewHistory([]);
  };

  // LOGIC: Watchlist & Notes
  // I designed this function to handle both adding a new movie AND updating the note 
  // of an existing movie. It checks if the ID exists; if so, it updates the object; 
  // if not, it pushes a new object.
  const addToWatchlist = ({ movieId, note = '' }) => {
    setWatchlist(prev => {
      const existingIndex = prev.findIndex(item => item.id === movieId);

      if (existingIndex >= 0) {
        const updatedList = [...prev];
        updatedList[existingIndex] = { 
          ...updatedList[existingIndex], 
          note: note 
        };
        return updatedList;
      } else {
        return [...prev, { id: movieId, note }];
      }
    });
  };

  const removeFromWatchlist = (movieId) => {
    setWatchlist(prev => prev.filter(item => item.id !== movieId));
  };

  const isMovieInWatchlist = (movieId) => {
    return watchlist.some(item => item.id === movieId);
  };

  const getNoteForMovie = (movieId) => {
    const movie = watchlist.find(item => item.id === movieId);
    return movie ? movie.note : '';
  };

  const value = {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isMovieInWatchlist,
    getNoteForMovie,
    viewHistory,
    addToHistory,
    clearHistory,
  };

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => {
  return useContext(WatchlistContext);
};