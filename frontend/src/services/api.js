import axios from 'axios';

// =============================================
//  Axios Instance with JWT Interceptor
// =============================================

const API = axios.create({
  baseURL: '',
  timeout: 10000,
});

// Attach JWT token to every request if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('neonpulse_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('neonpulse_token');
      localStorage.removeItem('neonpulse_user');
    }
    return Promise.reject(error);
  }
);

// =============================================
//  Comprehensive Indian Music Library (50+ songs)
// =============================================

const fallbackMockData = [
  // ── Energetic / Party ──
  { id: 'track-1', title: 'Chaiyya Chaiyya', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 95, duration: 312 },
  { id: 'track-2', title: 'Chak De India', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Patriotic'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 92, duration: 288 },
  { id: 'track-3', title: 'Malhari', artist: 'Vishal Dadlani', mood: 'energetic', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 90, duration: 245 },
  { id: 'track-4', title: 'Kar Har Maidaan Fateh', artist: 'Sukhwinder Singh', mood: 'energetic', genres: ['Bollywood', 'Motivational'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 88, duration: 296 },
  { id: 'track-5', title: 'Zinda', artist: 'Siddharth Mahadevan', mood: 'energetic', genres: ['Bollywood', 'Rock'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 85, duration: 268 },
  { id: 'track-6', title: 'Khalibali', artist: 'Shivam Pathak', mood: 'hyper', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 87, duration: 230 },

  // ── Romantic ──
  { id: 'track-7', title: 'Tum Hi Ho', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 98, duration: 262 },
  { id: 'track-8', title: 'Raabta', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 91, duration: 284 },
  { id: 'track-9', title: 'Tera Ban Jaunga', artist: 'Akhil Sachdeva', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 89, duration: 248 },
  { id: 'track-10', title: 'Hawayein', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 93, duration: 290 },
  { id: 'track-11', title: 'Tere Bina', artist: 'A.R. Rahman', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 86, duration: 318 },
  { id: 'track-12', title: 'Pehla Nasha', artist: 'Udit Narayan', mood: 'romantic', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 94, duration: 302 },

  // ── Sad → Calming/Soothing (songs that heal) ──
  { id: 'track-13', title: 'Tujhe Kitna Chahne Lage', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Soothing'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 97, duration: 240 },
  { id: 'track-14', title: 'Agar Tum Saath Ho', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 96, duration: 340 },
  { id: 'track-15', title: 'Samjhawan', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Soothing'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 90, duration: 280 },
  { id: 'track-16', title: 'Humdard', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 87, duration: 255 },
  { id: 'track-17', title: 'Tera Yaar Hoon Main', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Comforting'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 85, duration: 254 },
  { id: 'track-65', title: 'Moh Moh Ke Dhaage', artist: 'Papon', mood: 'sad', genres: ['Bollywood', 'Soothing'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 83, duration: 295 },
  { id: 'track-66', title: 'Bol Do Na Zara', artist: 'Armaan Malik', mood: 'sad', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 84, duration: 270 },
  { id: 'track-67', title: 'Tum Se Hi', artist: 'Mohit Chauhan', mood: 'sad', genres: ['Bollywood', 'Comforting'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 91, duration: 312 },
  { id: 'track-18', title: 'Kabira', artist: 'Arijit Singh', mood: 'melancholy', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 90, duration: 232 },
  { id: 'track-68', title: 'Kal Ho Naa Ho', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Healing'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 96, duration: 322 },
  { id: 'track-69', title: 'Abhi Mujh Mein Kahin', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Comforting'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 94, duration: 298 },

  // ── Calm / Chilled ──
  { id: 'track-19', title: 'Kun Faya Kun', artist: 'A.R. Rahman', mood: 'calm', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 96, duration: 468 },
  { id: 'track-20', title: 'Tujhe Kitna Chahne Lage', artist: 'Arijit Singh', mood: 'calm', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 92, duration: 240 },
  { id: 'track-21', title: 'Ilahi', artist: 'Arijit Singh', mood: 'calm', genres: ['Bollywood', 'Travel'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 87, duration: 218 },
  { id: 'track-22', title: 'Iktara', artist: 'Amitabh Bhattacharya', mood: 'chilled', genres: ['Bollywood', 'Indie'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 86, duration: 232 },
  { id: 'track-23', title: 'Safar', artist: 'Arijit Singh', mood: 'chilled', genres: ['Bollywood', 'Travel'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 84, duration: 266 },
  { id: 'track-24', title: 'Dil Dhadakne Do', artist: 'Priyanka Chopra', mood: 'chilled', genres: ['Bollywood', 'Pop'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 83, duration: 248 },

  // ── Happy ──
  { id: 'track-25', title: 'Gallan Goodiyaan', artist: 'Sukhwinder Singh', mood: 'happy', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 91, duration: 282 },
  { id: 'track-26', title: 'London Thumakda', artist: 'Labh Janjua', mood: 'happy', genres: ['Bollywood', 'Punjabi'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 89, duration: 258 },
  { id: 'track-27', title: 'Balam Pichkari', artist: 'Vishal Dadlani', mood: 'happy', genres: ['Bollywood', 'Holi'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 93, duration: 276 },
  { id: 'track-28', title: 'Badtameez Dil', artist: 'Benny Dayal', mood: 'happy', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 240 },
  { id: 'track-29', title: 'Ainvayi Ainvayi', artist: 'Salim Merchant', mood: 'happy', genres: ['Bollywood', 'Wedding'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 86, duration: 266 },
  { id: 'track-30', title: 'Kala Chashma', artist: 'Badshah', mood: 'happy', genres: ['Bollywood', 'Punjabi'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 94, duration: 234 },

  // ── Focus / Study ──
  { id: 'track-31', title: 'Jashn-E-Bahara', artist: 'Javed Ali', mood: 'focus', genres: ['Bollywood', 'Classical Fusion'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 88, duration: 340 },
  { id: 'track-32', title: 'Ae Dil Hai Mushkil', artist: 'Arijit Singh', mood: 'focus', genres: ['Bollywood', 'Melodic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 95, duration: 278 },
  { id: 'track-33', title: 'Tum Jo Mil Gaye Ho', artist: 'Rafi', mood: 'focus', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 82, duration: 290 },
  { id: 'track-34', title: 'Lag Ja Gale', artist: 'Lata Mangeshkar', mood: 'focus', genres: ['Bollywood', 'Retro'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 91, duration: 264 },

  // ── Hyper / Party ──
  { id: 'track-35', title: 'Lungi Dance', artist: 'Honey Singh', mood: 'hyper', genres: ['Bollywood', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 88, duration: 252 },
  { id: 'track-36', title: 'Swag Se Swagat', artist: 'Vishal Dadlani', mood: 'hyper', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 244 },
  { id: 'track-37', title: 'Garmi', artist: 'Badshah', mood: 'hyper', genres: ['Bollywood', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 86, duration: 228 },
  { id: 'track-38', title: 'DJ Wale Babu', artist: 'Badshah', mood: 'hyper', genres: ['Punjabi', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 87, duration: 216 },

  // ── Sufi / Spiritual ──
  { id: 'track-39', title: 'Khwaja Mere Khwaja', artist: 'A.R. Rahman', mood: 'calm', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 93, duration: 380 },
  { id: 'track-40', title: 'Afreen Afreen', artist: 'Rahat Fateh Ali Khan', mood: 'calm', genres: ['Ghazal', 'Sufi'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 95, duration: 472 },
  { id: 'track-41', title: 'Bol Na Halke Halke', artist: 'Rahat Fateh Ali Khan', mood: 'romantic', genres: ['Bollywood', 'Sufi'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 88, duration: 296 },

  // ── Punjabi ──
  { id: 'track-42', title: 'Brown Munde', artist: 'AP Dhillon', mood: 'energetic', genres: ['Punjabi', 'Hip-Hop'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 94, duration: 196 },
  { id: 'track-43', title: 'Excuses', artist: 'AP Dhillon', mood: 'chilled', genres: ['Punjabi', 'R&B'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 92, duration: 210 },
  { id: 'track-44', title: 'Lover', artist: 'Diljit Dosanjh', mood: 'romantic', genres: ['Punjabi', 'Pop'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 90, duration: 224 },
  { id: 'track-45', title: 'Pasoori', artist: 'Ali Sethi', mood: 'chilled', genres: ['Coke Studio', 'Fusion'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 97, duration: 258 },

  // ── Retro / Classic ──
  { id: 'track-46', title: 'Pal Pal Dil Ke Paas', artist: 'Kishore Kumar', mood: 'romantic', genres: ['Retro', 'Romantic'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 90, duration: 290 },
  { id: 'track-47', title: 'Mere Sapno Ki Rani', artist: 'Kishore Kumar', mood: 'happy', genres: ['Retro', 'Classic'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 88, duration: 268 },
  { id: 'track-48', title: 'Dum Maro Dum', artist: 'Asha Bhosle', mood: 'chilled', genres: ['Retro', 'Psychedelic'], image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 87, duration: 310 },
  { id: 'track-49', title: 'Ek Ladki Ko Dekha', artist: 'Kumar Sanu', mood: 'romantic', genres: ['Retro', 'Romantic'], image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 92, duration: 302 },
  { id: 'track-50', title: 'Roop Tera Mastana', artist: 'Kishore Kumar', mood: 'romantic', genres: ['Retro', 'Classic'], image: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 86, duration: 276 },

  // ── Modern Hits ──
  { id: 'track-51', title: 'Kesariya', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 99, duration: 268 },
  { id: 'track-52', title: 'Apna Bana Le', artist: 'Arijit Singh', mood: 'romantic', genres: ['Bollywood', 'Romantic'], image: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 96, duration: 302 },
  { id: 'track-53', title: 'Naatu Naatu', artist: 'Rahul Sipligunj', mood: 'energetic', genres: ['Telugu', 'Dance'], image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 98, duration: 242 },
  { id: 'track-54', title: 'Maan Meri Jaan', artist: 'King', mood: 'romantic', genres: ['Indie', 'Pop'], image: 'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 95, duration: 198 },
  { id: 'track-55', title: 'O Bedardeya', artist: 'Arijit Singh', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1517430529647-90cce5b4fb15?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 93, duration: 286 },
  { id: 'track-56', title: 'Jhoome Jo Pathaan', artist: 'Arijit Singh', mood: 'energetic', genres: ['Bollywood', 'Dance'], image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', popularity: 97, duration: 232 },

  // ── Shreya Ghoshal Collection ──
  { id: 'track-57', title: 'Ghoomar', artist: 'Shreya Ghoshal', mood: 'happy', genres: ['Bollywood', 'Folk'], image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', popularity: 89, duration: 266 },
  { id: 'track-58', title: 'Deewani Mastani', artist: 'Shreya Ghoshal', mood: 'romantic', genres: ['Bollywood', 'Classical Fusion'], image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', popularity: 92, duration: 314 },
  { id: 'track-59', title: 'Nagada Sang Dhol', artist: 'Shreya Ghoshal', mood: 'energetic', genres: ['Bollywood', 'Garba'], image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', popularity: 91, duration: 248 },

  // ── Sonu Nigam / KK ──
  { id: 'track-60', title: 'Kal Ho Naa Ho', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Emotional'], image: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', popularity: 96, duration: 322 },
  { id: 'track-61', title: 'Yaaron', artist: 'KK', mood: 'happy', genres: ['Bollywood', 'Friendship'], image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', popularity: 90, duration: 278 },
  { id: 'track-62', title: 'Tadap Tadap', artist: 'KK', mood: 'sad', genres: ['Bollywood', 'Sad'], image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', popularity: 88, duration: 340 },
  { id: 'track-63', title: 'Abhi Mujh Mein Kahin', artist: 'Sonu Nigam', mood: 'melancholy', genres: ['Bollywood', 'Emotional'], image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop', audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', popularity: 94, duration: 298 },
];

// Helper: filter songs by mood
const getSongsByMood = (mood) => fallbackMockData.filter(s => s.mood === mood);

// Helper: get random songs
const getRandomSongs = (count = 10) => {
  const shuffled = [...fallbackMockData].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Helper: get top songs by popularity
const getTopSongs = (count = 10) => {
  return [...fallbackMockData].sort((a, b) => b.popularity - a.popularity).slice(0, count);
};

// =============================================
//  AUTH API
// =============================================

export const authAPI = {
  register: async (name, email, password) => {
    const res = await API.post('/api/auth/register', { name, email, password });
    return res.data;
  },

  login: async (email, password) => {
    const res = await API.post('/api/auth/login', { email, password });
    return res.data;
  },

  getProfile: async () => {
    const res = await API.get('/api/auth/me');
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await API.put('/api/auth/profile', data);
    return res.data;
  },

  forgotPassword: async (email) => {
    const res = await API.post('/api/auth/forgot-password', { email });
    return res.data;
  },

  resetPassword: async (token, password) => {
    const res = await API.post(`/api/auth/reset-password/${token}`, { password });
    return res.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const res = await API.post('/api/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
};

// =============================================
//  DASHBOARD API
// =============================================

export const dashboardAPI = {
  getDashboard: async () => {
    const res = await API.get('/api/dashboard');
    return res.data;
  },

  trackListen: async (songData) => {
    try {
      const res = await API.post('/api/dashboard/listen', songData);
      return res.data;
    } catch { return null; }
  },

  trackMood: async (mood, rawInput = '') => {
    try {
      const res = await API.post('/api/dashboard/mood', { mood, rawInput });
      return res.data;
    } catch { return null; }
  },

  toggleFavorite: async (songId) => {
    try {
      const res = await API.post('/api/dashboard/favorite', { songId });
      return res.data;
    } catch { return null; }
  },

  getHistory: async (page = 1, limit = 20) => {
    const res = await API.get(`/api/dashboard/history?page=${page}&limit=${limit}`);
    return res.data;
  },
};

// =============================================
//  MUSIC API
// =============================================

export const getSpotifyStatus = async () => {
  try {
    const res = await API.get('/api/spotify/status');
    return res.data;
  } catch (error) {
    return { configured: false, available: false, message: 'Unable to reach backend.' };
  }
};

/**
 * Get ML-powered recommendations
 * Tries: /api/getMusic (ML) → /api/recommendations (local backend) → local mock data
 */
export const getRecommendations = async (payload) => {
  try {
    // ── Step 1: Try ML-powered endpoint (uses Flask NLP model + iTunes real audio) ──
    const res = await API.post('/api/getMusic', {
      mood: payload?.mood || '',
      text: payload?.text || '',
      count: payload?.count || 15,
    });

    const data = res.data;
    const recommendations = (data.recommendations || []).map((track, i) => ({
      ...track,
      id: track.id || `ml-${i}`,
      // ★ Use real audio/image from backend (iTunes), only fallback if truly missing ★
      audioUrl: track.audioUrl || fallbackMockData[i % fallbackMockData.length].audioUrl,
      image: track.image || fallbackMockData[i % fallbackMockData.length].image,
      duration: track.duration || 240,
      isPreview: false, // JioSaavn provides full songs
    }));

    return {
      recommendations,
      explanation: data.explanation,
      detected_mood: data.detected_mood,
      emoji: data.emoji,
      confidence: data.confidence,
      source: data.source,
    };

  } catch (mlError) {
    // ── Step 2: Fall back to local backend endpoint ──
    try {
      const res = await API.post('/api/recommendations', payload);
      const recommendations = res.data.recommendations.map((track, i) => ({
        ...track,
        id: track.id || track._id || `rec-${i}`,
        audioUrl: track.audioUrl || fallbackMockData[i % fallbackMockData.length].audioUrl,
        image: track.image || fallbackMockData[i % fallbackMockData.length].image,
        duration: track.duration || 30,
      }));
      return { recommendations, explanation: res.data.explanation, source: 'local-backend' };

    } catch (localError) {
      // ── Step 3: Pure client-side fallback ──
      const mood = payload?.mood || 'chilled';
      const moodSongs = getSongsByMood(mood);
      const songs = moodSongs.length >= 5 ? moodSongs : [...moodSongs, ...getRandomSongs(10 - moodSongs.length)];
      return {
        recommendations: songs.slice(0, 15),
        explanation: `Showing ${songs.length} curated tracks for "${mood}" mood from local library.`,
        source: 'client-fallback',
      };
    }
  }
};

/**
 * Search JioSaavn directly for a Hindi song (frontend utility)
 * Returns full audio URL + real artwork
 */
export const searchJioSaavnSong = async (title, artist) => {
  try {
    const res = await API.get(`/api/jiosaavn/search?q=${encodeURIComponent(`${title} ${artist}`)}&limit=1`);
    const results = res.data?.results || [];
    return results.length > 0 ? results[0] : null;
  } catch { return null; }
};

// Backward compat alias
export const searchITunesSong = searchJioSaavnSong;

/**
 * Get ML recommendations using free-text input
 * Example: getMLRecommendations("I feel so happy and energetic today!")
 */
export const getMLRecommendations = async (text, count = 10) => {
  try {
    const res = await API.post('/api/getMusic', { text, count });
    return res.data;
  } catch (error) {
    console.error('ML text recommendation error:', error);
    return null;
  }
};

/**
 * Check if the ML API (Flask) is running
 */
export const getMLStatus = async () => {
  try {
    const res = await API.get('/api/ml/status');
    return res.data;
  } catch (error) {
    return { ml_api_available: false, message: 'Backend not reachable' };
  }
};

/**
 * Get moods supported by the ML model
 */
export const getMLMoods = async () => {
  try {
    const res = await API.get('/api/ml/moods');
    return res.data;
  } catch (error) {
    return { moods: [] };
  }
};

// =============================================
//  SONG BROWSING HELPERS (for Home page sections)
// =============================================

export const getTrendingSongs = () => getTopSongs(10);
export const getForYouSongs = (count = 8) => getRandomSongs(count);
export const getMoodPlaylist = (mood, count = 10) => getSongsByMood(mood).slice(0, count);
export const getAllArtists = () => {
  const artists = {};
  fallbackMockData.forEach(s => {
    if (!artists[s.artist]) {
      artists[s.artist] = { name: s.artist, songCount: 0, topSong: s, image: s.image };
    }
    artists[s.artist].songCount++;
  });
  return Object.values(artists).sort((a, b) => b.songCount - a.songCount);
};

export default API;
