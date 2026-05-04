# PopcornDB (Final Version)

**Course:** Mobile Computing  
**Student:** [Natasha Hans]  
**Platform:** Expo (React Native)

---

## 📱 Project Overview
PopcornDB is a movie discovery and tracking application built with React Native. It solves the problem of "choice paralysis" by allowing users to browse trending content, search with advanced filters, and curate a personal watchlist.

This final submission represents a complete evolution from the initial prototype. While the prototype demonstrated the *intent* using static data, this final version implements a robust, live environment using the **TMDB (The Movie Database) API**.

---

## 🎯 The Core Transformation
This app transforms raw data into a personalized user utility:

1.  **Information Provided:** Live movie and TV show data fetched from the TMDB API.
2.  **Transformed Into:** A persistent, personalized **Watchlist**.
3.  **Enhancements:** 
    *   **Personal Notes:** Users can attach specific thoughts or reminders to saved items.
    *   **History Tracking:** The app automatically tracks "Recently Viewed" items to build a local viewing history.
    *   **Smart Filtering:** Raw search data can be filtered by year, rating, and recency.

---

## 🚀 Key Features & Improvements (vs Prototype)

| Feature | Prototype (Assignment 1) | Final App (Assignment 2) |
| :--- | :--- | :--- |
| **Data Source** | Hardcoded JSON Arrays | **Live TMDB API** (Async/Await) |
| **Performance** | Basic `ScrollView` / `map` | Optimized **Nested FlatLists** & Virtualized Lists |
| **Persistence** | None (Resets on reload) | **AsyncStorage** (Persists Watchlist & History) |
| **Navigation** | Basic Stack Navigation | **Complex Nesting** (Tab + Stack + Modals) |
| **Search** | Alert Box Only | **Live Debounced Search** with Filters |
| **UI/UX** | Static Images | **Animated Hero Carousel** & Parallax Headers |

---

## 🏗 Architectural Decisions

### 1. Hybrid Feed Architecture (`HomeScreen.js`)
Instead of fixed layout components, the Home Screen is built dynamically.
*   **The Logic:** I use `Promise.all` to fetch Trending People, TV Shows, and multiple Movie Genres in parallel.
*   **The Feed:** These distinct data streams are merged into a single `feedContent` array.
*   **The Render:** A single parent `FlatList` renders different component types (`movie_carousel`, `promo_banner`, `tv_section`) based on the item type. This ensures 60fps scrolling performance compared to nesting multiple ScrollViews.

### 2. State Management (Context API vs Redux)
*   **Decision:** I chose **React Context** combined with **AsyncStorage**.
*   **Trade-off:** Redux was considered but deemed "architectural over-engineering" for this scope. The Context API provides a lightweight "Single Source of Truth" for the Watchlist, ensuring that if a user bookmarks a movie in the *Search Screen*, the icon updates instantly on the *Home Screen* without manual refetching.

### 3. API & Security
*   **Trade-off:** The TMDB API Key is stored client-side in `api/tmdb.js`.
*   **Note:** In a real-world production environment, I would route these requests through a secure proxy server to hide the credentials. For this client-side prototype/Snack, direct access was chosen to ensure the app runs standalone.

---

## 🛠 Tech Stack
*   **Core:** React Native, Expo
*   **Navigation:** React Navigation (Stack, Bottom Tabs)
*   **Styling:** StyleSheet, Expo Linear Gradient
*   **Icons:** Ionicons, Feather
*   **Data:** TMDB API (`fetch`)
*   **Storage:** `@react-native-async-storage/async-storage`

---

## 📂 File Structure
*   `screens/`: Individual screen components (Separation of Concerns).
*   `components/`: Reusable UI elements (`MovieCarousel`, `HeroCarousel`).
*   `context/`: Global State Logic (`WatchlistContext`).
*   `api/`: API configuration and endpoints.
*   `constants/`: App-wide theme and color definitions.

---

## 🔮 Future Roadmap
If development continued, the next steps would be:
1.  **User Accounts:** Replacing local AsyncStorage with Firebase Auth/Firestore for cross-device syncing.
2.  **Notification System:** Alerts when a watchlist movie is released.
3.  **Video Player:** Replacing the deep link to YouTube with an embedded video player.