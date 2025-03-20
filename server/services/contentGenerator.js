/**
 * Content Generator Service
 * 
 * Responsible for fetching gig information from the LML API,
 * filtering gigs by proximity to subscriber locations,
 * generating multilingual content, and creating QR codes.
 */

const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const contentModel = require('../models/content');
const { Translate } = require('@google-cloud/translate').v2;

// Constants
const LML_API_BASE_URL = 'https://api.lml.live';
const MAX_GIGS_PER_EMAIL = 5;
const PROXIMITY_RADIUS_KM = 10; // Gigs within this distance will be included

// Google Translate - disabled for stage 1 (minimize costs)
// We'll fake translations for now with simple prefixes
// const translate = new Translate({ projectId: 'your-project-id' });

// Mapping of language codes to names (for display)
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  'ar': 'Arabic',
  'vi': 'Vietnamese',
  'es': 'Spanish',
  'hi': 'Hindi',
  'ko': 'Korean',
  'ja': 'Japanese'
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c;
  return distance;
};

/**
 * Fetch gigs from LML API for a specific date range and location
 * @param {string} dateFrom - Start date in YYYY-MM-DD format
 * @param {string} dateTo - End date in YYYY-MM-DD format
 * @param {string} location - Location name (e.g., 'melbourne')
 * @returns {Promise<Array>} Array of gig objects
 */
const fetchGigsFromApi = async (dateFrom, dateTo, location = 'melbourne') => {
  try {
    const url = `${LML_API_BASE_URL}/gigs/query?date_from=${dateFrom}&date_to=${dateTo}&location=${location}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`LML API returned ${response.status}: ${response.statusText}`);
    }
    
    const gigs = await response.json();
    return gigs;
  } catch (error) {
    console.error('Error fetching gigs from LML API:', error);
    throw error;
  }
};

/**
 * Generate a QR code for a venue map URL
 * @param {string} mapUrl - URL to encode in QR code
 * @returns {Promise<string>} Data URL of QR code image
 */
const generateQRCode = async (mapUrl) => {
  try {
    // If no map URL provided, use a default
    const url = mapUrl || 'https://maps.google.com';
    
    // Generate QR code as data URL (stage 1)
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 150,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

/**
 * Translate text to the specified language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} Translated text
 */
const translateText = async (text, targetLanguage) => {
  // Stage 1: Fake translations to avoid API costs
  // In production, use Google Translate API
  
  if (targetLanguage === 'en') {
    return text;
  }
  
  // For stage 1, just prefix the text with language name to simulate translation
  const languageName = SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage;
  return `[${languageName}] ${text}`;
  
  /* 
  // Stage 2: Real translation
  try {
    const [translation] = await translate.translate(text, targetLanguage);
    return translation;
  } catch (error) {
    console.error(`Error translating text to ${targetLanguage}:`, error);
    return text; // Fallback to original text
  }
  */
};

/**
 * Generate a description of Melbourne's live music scene
 * @returns {string} Description text
 */
const generateMelbourneMusicSceneDescription = () => {
  const descriptions = [
    "Melbourne's vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts. With over 460 live music venues, it's one of the world's leading music cities.",
    
    "Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces. The city hosts more live music venues per capita than any other city in the world.",
    
    "Known as Australia's music capital, Melbourne's live scene spans genres from indie rock and electronic to jazz and classical. The city's diverse venues create a unique cultural tapestry for music lovers.",
    
    "Melbourne's iconic music scene has launched countless careers and attracts global acts year-round. With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere."
  ];
  
  // Randomly select one description
  return descriptions[Math.floor(Math.random() * descriptions.length)];
};

/**
 * Format gigs into a human-readable text format
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object
 * @returns {string} Formatted text
 */
const formatGigText = (gigs, subscriber) => {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const musicSceneDescription = generateMelbourneMusicSceneDescription();
  
  let text = `MELBOURNE GIG GUIDE - ${date}\n\n`;
  text += `${musicSceneDescription}\n\n`;
  text += `GIGS NEAR YOU:\n\n`;
  
  gigs.forEach((gig, index) => {
    text += `${index + 1}. ${gig.name}\n`;
    text += `   Venue: ${gig.venue.name}\n`;
    text += `   Address: ${gig.venue.address}\n`;
    text += `   Time: ${gig.start_time || 'TBA'}\n`;
    
    if (gig.prices && gig.prices.length > 0) {
      text += `   Price: ${gig.prices[0].price}\n`;
    } else if (gig.information_tags && gig.information_tags.includes('Free')) {
      text += `   Price: Free\n`;
    } else {
      text += `   Price: Check venue\n`;
    }
    
    if (gig.genre_tags && gig.genre_tags.length > 0) {
      text += `   Genres: ${gig.genre_tags.join(', ')}\n`;
    }
    
    // Add distance info
    if (gig.distance) {
      text += `   Distance: ${gig.distance.toFixed(1)} km from your location\n`;
    }
    
    // In full implementation, QR codes would be embedded in HTML email
    text += `   Map: ${gig.venue.location_url || `https://maps.google.com/?q=${gig.venue.latitude},${gig.venue.longitude}`}\n`;
    
    text += '\n';
  });
  
  text += `---\n`;
  text += `This email was sent to ${subscriber.name} at ${subscriber.email}.\n`;
  text += `You're receiving this because you subscribed to Melbourne Gig Guide updates.\n`;
  
  return text;
};

/**
 * Generate multilingual content
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object
 * @returns {Promise<string>} Multilingual formatted content
 */
const generateMultilingualContent = async (gigs, subscriber) => {
  try {
    // Generate English content first
    const englishContent = formatGigText(gigs, subscriber);
    
    // If English is the only language, return just the English content
    if (subscriber.languages.length === 1 && subscriber.languages[0] === 'en') {
      return englishContent;
    }
    
    // Generate content for each language
    let multilingualContent = '';
    
    for (const language of subscriber.languages) {
      const languageName = SUPPORTED_LANGUAGES[language] || language;
      
      if (language === 'en') {
        multilingualContent += `### ENGLISH ###\n\n${englishContent}\n\n`;
      } else {
        // Translate content to target language
        const translatedContent = await translateText(englishContent, language);
        multilingualContent += `### ${languageName.toUpperCase()} ###\n\n${translatedContent}\n\n`;
      }
    }
    
    return multilingualContent;
  } catch (error) {
    console.error('Error generating multilingual content:', error);
    throw error;
  }
};

/**
 * Filter and sort gigs by proximity to subscriber location
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object
 * @returns {Array} Filtered and sorted gigs
 */
const filterGigsByProximity = (gigs, subscriber) => {
  // Filter out gigs with no venue or no coordinates
  const gigsWithLocation = gigs.filter(gig => 
    gig.venue && 
    typeof gig.venue.latitude === 'number' && 
    typeof gig.venue.longitude === 'number'
  );
  
  // Calculate distance for each gig
  const gigsWithDistance = gigsWithLocation.map(gig => {
    const distance = calculateDistance(
      subscriber.latitude,
      subscriber.longitude,
      gig.venue.latitude,
      gig.venue.longitude
    );
    
    return {
      ...gig,
      distance
    };
  });
  
  // Filter gigs within the proximity radius
  const nearbyGigs = gigsWithDistance.filter(gig => gig.distance <= PROXIMITY_RADIUS_KM);
  
  // Sort by distance (closest first)
  nearbyGigs.sort((a, b) => a.distance - b.distance);
  
  // Limit to MAX_GIGS_PER_EMAIL
  return nearbyGigs.slice(0, MAX_GIGS_PER_EMAIL);
};

/**
 * Generate content for a single subscriber and store in database
 * @param {Object} subscriber - Subscriber object
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Created content log
 */
const generateContentForSubscriber = async (subscriber, date) => {
  try {
    // Get gigs for the specified date from the LML API
    const gigs = await fetchGigsFromApi(date, date);
    
    if (!gigs || gigs.length === 0) {
      throw new Error(`No gigs found for date ${date}`);
    }
    
    // Filter gigs by proximity to subscriber
    const nearbyGigs = filterGigsByProximity(gigs, subscriber);
    
    if (nearbyGigs.length === 0) {
      throw new Error(`No gigs found within ${PROXIMITY_RADIUS_KM}km of subscriber location`);
    }
    
    // Generate multilingual content
    const content = await generateMultilingualContent(nearbyGigs, subscriber);
    
    // Store in database
    const contentLog = {
      id: uuidv4(),
      subscriber_id: subscriber.id,
      generated_date: date,
      gig_ids: nearbyGigs.map(gig => gig.id),
      content
    };
    
    const createdLog = await contentModel.createContentLog(contentLog);
    return createdLog;
  } catch (error) {
    console.error(`Error generating content for subscriber ${subscriber.id}:`, error);
    throw error;
  }
};

/**
 * Generate daily content for all subscribers scheduled for today
 * @returns {Promise<Object>} Results of content generation
 */
const generateDailyContent = async () => {
  // This function will be called by the scheduler
  // Implementation will leverage the content route POST /api/content/generate/all
  // For Stage 1, this can be a placeholder
  console.log('Daily content generation would happen here');
  return { message: 'Daily content generation executed' };
};

module.exports = {
  generateContentForSubscriber,
  generateDailyContent,
  fetchGigsFromApi,
  calculateDistance,
  filterGigsByProximity
};
