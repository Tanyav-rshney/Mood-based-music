/**
 * ============================================
 *  Mood Processing Service - NLP Engine
 * ============================================
 * 
 * Core NLP module for classifying user mood from text input.
 * 
 * APPROACH:
 * 1. Keyword-based mood classification (primary)
 * 2. Sentiment scoring using word weights
 * 3. Fallback to default mood if unrecognized
 * 
 * EXTENSIBILITY:
 * - This module is designed to be easily replaced with a real ML model
 * - Just swap the classifyMood() function with an ML API call
 * - The interface (input text → output mood) stays the same
 * 
 * SUPPORTED MOODS: happy, sad, calm, energetic, romantic, melancholy, focus, hyper, chilled
 */

const logger = require('../config/logger');

// =============================================
//  MOOD KEYWORD DICTIONARY
// =============================================
// Each mood maps to an array of keywords/phrases.
// Keywords are ordered by relevance (most specific first).
// Supports English and common Hinglish terms.

const MOOD_KEYWORDS = {
  happy: [
    'happy', 'joy', 'joyful', 'cheerful', 'delighted', 'excited', 'thrilled',
    'wonderful', 'amazing', 'great', 'good', 'awesome', 'fantastic', 'blessed',
    'grateful', 'content', 'pleased', 'smile', 'smiling', 'laugh', 'laughing',
    'celebration', 'celebrate', 'party', 'fun', 'enjoy', 'enjoying',
    'khush', 'khushi', 'masti', 'mazaa', 'upbeat', 'elated', 'euphoric',
    'ecstatic', 'overjoyed', 'vibrant', 'positive', 'bright', 'sunny',
  ],

  sad: [
    'sad', 'depressed', 'depression', 'unhappy', 'miserable', 'heartbroken',
    'broken', 'crying', 'cry', 'tears', 'grief', 'grieving', 'sorrow',
    'sorrowful', 'lonely', 'loneliness', 'alone', 'lost', 'empty', 'hollow',
    'gloomy', 'down', 'feeling down', 'blue', 'upset', 'hurt', 'pain',
    'dukhi', 'udas', 'rona', 'tanha', 'akela', 'despair', 'hopeless',
    'heartache', 'suffering', 'anguish', 'dejected', 'devastated',
  ],

  calm: [
    'calm', 'peaceful', 'peace', 'tranquil', 'serene', 'quiet', 'still',
    'gentle', 'soft', 'soothing', 'relaxed', 'relaxing', 'mellow',
    'composed', 'centered', 'balanced', 'zen', 'mindful', 'breath',
    'shanti', 'sukoon', 'shaant', 'comfortable', 'ease', 'easygoing',
    'harmonious', 'placid', 'untroubled', 'restful',
  ],

  energetic: [
    'energetic', 'energy', 'pumped', 'workout', 'gym', 'running', 'run',
    'exercise', 'active', 'dynamic', 'powerful', 'strong', 'intense',
    'fire', 'lit', 'beast', 'motivated', 'motivation', 'drive', 'driven',
    'josh', 'junoon', 'power', 'explosive', 'fierce', 'aggressive',
    'adrenaline', 'turbo', 'charged', 'unstoppable', 'warrior',
  ],

  romantic: [
    'romantic', 'romance', 'love', 'loving', 'in love', 'crush', 'date',
    'dating', 'valentine', 'sweetheart', 'darling', 'beloved', 'passionate',
    'passion', 'desire', 'intimate', 'tender', 'affection', 'affectionate',
    'pyaar', 'ishq', 'mohabbat', 'dil', 'heart', 'soulmate', 'couple',
    'kiss', 'hug', 'cuddle', 'flirt', 'attraction', 'chemistry',
  ],

  melancholy: [
    'melancholy', 'melancholic', 'nostalgic', 'nostalgia', 'bittersweet',
    'wistful', 'pensive', 'reflective', 'contemplating', 'thinking',
    'memories', 'memory', 'remember', 'remembering', 'past', 'missing',
    'miss', 'longing', 'yearning', 'yaad', 'purani yaadein', 'regret',
    'somber', 'solemn', 'introspective', 'thoughtful', 'deep',
  ],

  focus: [
    'focus', 'focused', 'concentrate', 'concentration', 'study', 'studying',
    'work', 'working', 'productive', 'productivity', 'code', 'coding',
    'reading', 'read', 'learn', 'learning', 'exam', 'deadline', 'project',
    'padhai', 'kaam', 'determination', 'discipline', 'grind', 'hustle',
    'attention', 'mindful', 'sharp', 'alert', 'analytical',
  ],

  hyper: [
    'hyper', 'hype', 'crazy', 'wild', 'insane', 'mad', 'turnt', 'rave',
    'dance', 'dancing', 'jump', 'jumping', 'scream', 'yell', 'loud',
    'bass', 'drop', 'festival', 'club', 'clubbing', 'nightlife', 'dj',
    'pagal', 'paagal', 'mast', 'dhamaal', 'frenzy', 'explosive',
    'chaotic', 'intense', 'maximum', 'overdrive', 'extreme',
  ],

  chilled: [
    'chill', 'chilled', 'chilling', 'chill out', 'vibes', 'vibe', 'vibing',
    'laid back', 'lazy', 'lounge', 'lounging', 'sunday', 'evening',
    'sunset', 'coffee', 'rain', 'raining', 'rainy', 'cozy', 'cosy',
    'aram', 'thanda', 'cool', 'breeze', 'slow', 'easy', 'smooth',
    'casual', 'leisurely', 'unhurried', 'carefree', 'floating', 'drift',
  ],
};

// =============================================
//  SENTIMENT WORD WEIGHTS
// =============================================
// Positive words boost happy/energetic moods
// Negative words boost sad/melancholy moods
// Neutral words lean toward calm/chilled

const SENTIMENT_WEIGHTS = {
  // Very positive
  'amazing': 0.9, 'wonderful': 0.9, 'incredible': 0.9, 'awesome': 0.8,
  'fantastic': 0.8, 'love': 0.7, 'great': 0.7, 'beautiful': 0.6,
  'perfect': 0.8, 'best': 0.7, 'excellent': 0.8,
  
  // Positive
  'good': 0.5, 'nice': 0.4, 'fine': 0.3, 'okay': 0.1, 'cool': 0.4,
  
  // Negative
  'bad': -0.5, 'terrible': -0.8, 'horrible': -0.9, 'awful': -0.8,
  'worst': -0.9, 'hate': -0.7, 'ugly': -0.6, 'boring': -0.3,
  'annoying': -0.5, 'stress': -0.6, 'stressed': -0.7, 'anxiety': -0.7,
  'anxious': -0.6, 'tired': -0.4, 'exhausted': -0.6, 'frustrated': -0.6,
  
  // Very negative
  'depressed': -0.9, 'suicidal': -1.0, 'hopeless': -0.9, 'miserable': -0.8,
  'devastated': -0.9, 'broken': -0.8, 'destroyed': -0.8,
};

// =============================================
//  MOOD CLASSIFICATION FUNCTIONS
// =============================================

/**
 * Classify mood from text input using keyword matching + sentiment analysis
 * 
 * @param {string} text - User's mood text input
 * @returns {Object} Classification result with mood, confidence, and method
 * 
 * @example
 * classifyMood("I'm feeling really happy and excited today!")
 * // => { mood: 'happy', confidence: 0.85, method: 'keyword', keywords: ['happy', 'excited'] }
 */
const classifyMood = (text) => {
  if (!text || typeof text !== 'string') {
    return {
      mood: 'chilled',
      confidence: 0,
      method: 'default',
      keywords: [],
      sentiment: 0,
    };
  }

  const normalizedText = text.toLowerCase().trim();
  const words = normalizedText.split(/\s+/);

  // Step 1: Try direct mood match first (user typed a mood name directly)
  const directMoods = Object.keys(MOOD_KEYWORDS);
  for (const mood of directMoods) {
    if (normalizedText === mood || words.includes(mood)) {
      return {
        mood,
        confidence: 1.0,
        method: 'direct',
        keywords: [mood],
        sentiment: 0,
      };
    }
  }

  // Step 2: Keyword matching - count matches for each mood
  const moodScores = {};
  const matchedKeywords = {};

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    moodScores[mood] = 0;
    matchedKeywords[mood] = [];

    for (const keyword of keywords) {
      if (normalizedText.includes(keyword)) {
        // Multi-word keywords get higher weight
        const weight = keyword.includes(' ') ? 2 : 1;
        moodScores[mood] += weight;
        matchedKeywords[mood].push(keyword);
      }
    }
  }

  // Step 3: Sentiment analysis as secondary signal
  let sentimentScore = 0;
  let sentimentWordCount = 0;

  for (const word of words) {
    if (SENTIMENT_WEIGHTS[word] !== undefined) {
      sentimentScore += SENTIMENT_WEIGHTS[word];
      sentimentWordCount++;
    }
  }

  const avgSentiment = sentimentWordCount > 0 ? sentimentScore / sentimentWordCount : 0;

  // Step 4: Find best matching mood
  const sortedMoods = Object.entries(moodScores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sortedMoods.length > 0) {
    const [bestMood, bestScore] = sortedMoods[0];
    const totalMatches = sortedMoods.reduce((sum, [, score]) => sum + score, 0);
    const confidence = Math.min(bestScore / Math.max(totalMatches, 1), 1.0);

    logger.debug(`🧠 Mood classified: "${text}" → ${bestMood} (confidence: ${confidence.toFixed(2)}, method: keyword)`);

    return {
      mood: bestMood,
      confidence: parseFloat(confidence.toFixed(2)),
      method: 'keyword',
      keywords: matchedKeywords[bestMood],
      sentiment: parseFloat(avgSentiment.toFixed(2)),
    };
  }

  // Step 5: Fallback to sentiment-based classification
  if (avgSentiment !== 0) {
    let fallbackMood;
    if (avgSentiment > 0.5) fallbackMood = 'happy';
    else if (avgSentiment > 0.2) fallbackMood = 'chilled';
    else if (avgSentiment > -0.2) fallbackMood = 'calm';
    else if (avgSentiment > -0.5) fallbackMood = 'melancholy';
    else fallbackMood = 'sad';

    logger.debug(`🧠 Mood classified via sentiment: "${text}" → ${fallbackMood} (sentiment: ${avgSentiment.toFixed(2)})`);

    return {
      mood: fallbackMood,
      confidence: 0.4,
      method: 'sentiment',
      keywords: [],
      sentiment: parseFloat(avgSentiment.toFixed(2)),
    };
  }

  // Step 6: Default fallback 
  logger.debug(`🧠 Mood defaulted: "${text}" → chilled (no matches found)`);

  return {
    mood: 'chilled',
    confidence: 0.1,
    method: 'default',
    keywords: [],
    sentiment: 0,
  };
};

/**
 * Get all supported moods with their descriptions
 * @returns {Array} List of mood objects
 */
const getSupportedMoods = () => {
  return [
    { id: 'happy', emoji: '😊', label: 'Happy', description: 'Joyful and upbeat vibes' },
    { id: 'sad', emoji: '😢', label: 'Sad', description: 'Emotional and somber tracks' },
    { id: 'calm', emoji: '🧘', label: 'Calm', description: 'Peaceful and serene sounds' },
    { id: 'energetic', emoji: '🔥', label: 'Energetic', description: 'High energy pump-up music' },
    { id: 'romantic', emoji: '💕', label: 'Romantic', description: 'Love and passion' },
    { id: 'melancholy', emoji: '🌙', label: 'Melancholy', description: 'Nostalgic and reflective' },
    { id: 'focus', emoji: '🎯', label: 'Focus', description: 'Concentration and study music' },
    { id: 'hyper', emoji: '⚡', label: 'Hyper', description: 'Wild and intense beats' },
    { id: 'chilled', emoji: '🌊', label: 'Chilled', description: 'Laid-back easy listening' },
  ];
};

module.exports = {
  classifyMood,
  getSupportedMoods,
  MOOD_KEYWORDS,
};
