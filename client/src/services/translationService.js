/**
 * Translation Service
 * 
 * Handles secure translation of content using LLM API services.
 * Implements caching, error handling, and proxying API requests to keep keys secure.
 */

// In-memory cache for translations to reduce API calls
const translationCache = new Map();

/**
 * Calculate a hash for caching based on text content
 * @param {string} text - Text to hash
 * @returns {string} - Simple hash of the text
 */
const hashText = (text) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

/**
 * Get cached translation if available
 */
export const getCachedTranslation = (text, sourceLang, targetLang) => {
  const key = `${sourceLang}_${targetLang}_${hashText(text)}`;
  return translationCache.get(key);
};

/**
 * Store translation in cache
 */
export const setCachedTranslation = (text, sourceLang, targetLang, translatedText) => {
  const key = `${sourceLang}_${targetLang}_${hashText(text)}`;
  translationCache.set(key, translatedText);
  
  // Log cache size (for debugging)
  console.log(`Translation cache size: ${translationCache.size} entries`);
};

/**
 * Translate text using LLM service via a secure backend proxy
 * 
 * This keeps your API key secure by never exposing it in client-side code
 * 
 * @param {string} text - Text to translate
 * @param {string} sourceLang - Source language code
 * @param {string} targetLang - Target language code
 * @param {Object} context - Additional context for translation
 * @returns {Promise<string>} - Translated text
 */
export const translateWithLLM = async (text, sourceLang, targetLang, context = {}) => {
  try {
    // First, check if we have this translation cached
    const cachedResult = getCachedTranslation(text, sourceLang, targetLang);
    if (cachedResult) {
      console.log('Using cached translation');
      return cachedResult;
    }
    
    // Call our secure backend proxy endpoint
    // Note: This endpoint would be implemented separately and would handle the API key
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        sourceLang,
        targetLang,
        context: {
          domain: 'music_venues',
          preserveFormatting: true,
          ...context
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Translation service error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Cache the successful translation
    setCachedTranslation(text, sourceLang, targetLang, result.translatedText);
    
    return result.translatedText;
  } catch (error) {
    console.error('LLM Translation error:', error);
    
    // Fallback to simplified translation
    return fallbackTranslation(text, targetLang);
  }
};

/**
 * Simple fallback translation when API is unavailable
 * This is similar to the current word replacement strategy but more comprehensive
 */
const fallbackTranslation = (text, targetLang) => {
  // This would be expanded with more comprehensive word mappings
  const translations = {
    'ja': {
      'Melbourne': 'メルボルン',
      'Guide': 'ガイド',
      'gig': 'ライブ',
      'venue': '会場',
      'music': '音楽',
      'live': 'ライブ',
      'band': 'バンド',
      'concert': 'コンサート'
    },
    'zh-CN': {
      'Melbourne': '墨尔本',
      'Guide': '指南',
      'gig': '演出',
      'venue': '场地',
      'music': '音乐',
      'live': '现场',
      'band': '乐队',
      'concert': '音乐会'
    },
    // Add more languages here
  };
  
  // Get translation map for target language
  const translationMap = translations[targetLang] || {};
  
  // Simple word replacement
  let translatedText = text;
  for (const [english, translated] of Object.entries(translationMap)) {
    // Use regex with word boundaries to avoid partial word matches
    const regex = new RegExp(`\\b${english}\\b`, 'gi');
    translatedText = translatedText.replace(regex, translated);
  }
  
  return translatedText;
};