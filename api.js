// ARCHITECTURE NOTE:
// In a production environment, I would never store API keys client-side like this.
// I would route requests through a secure proxy server to hide credentials.
// However, for this self-contained Expo Snack prototype, I am keeping them here 
// to ensure the app functions as a standalone demo without requiring external backend dependencies.
const API_KEY = '56cbd14068d4e08c0cb6af0583730f59';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI1NmNiZDE0MDY4ZDRlMDhjMGNiNmFmMDU4MzczMGY1OSIsIm5iZiI6MTc2MTU3MDUxMS45OTIsInN1YiI6IjY4ZmY2ZWNmYjMwOWU1YmFlMjlmYjVkNCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.ooKqPhCwDKIPIrd0FXLsJ968IW-32t1K7NLBVJUVqgY';

// The base endpoint for the TMDB API. 
// Unlike the prototype which used local JSON files, all data is now fetched live from here.
const BASE_URL = 'https://api.themoviedb.org/3';

// I am specifically using the 'w500' image width size.
// This is an optimization decision: 'original' size is too heavy for mobile data/memory,
// while 'w200' is too blurry for modern screens. 'w500' offers the best balance of quality and performance.
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// A helper function to generate the necessary headers for every API call.
// This follows the DRY (Don't Repeat Yourself) principle, so I don't have to 
// manually type the Authorization header in every fetch request throughout the app.
const createApiOptions = () => ({
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_TOKEN}`,
  },
});

export { BASE_URL, IMAGE_BASE_URL, createApiOptions };