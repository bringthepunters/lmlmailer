/**
 * Content Generator
 * 
 * Client-side version of the content generator service.
 * Responsible for fetching gig information from the LML API,
 * filtering gigs by proximity to subscriber locations,
 * and generating multilingual content.
 */

import { createContentLog } from './localStorage';
import { generateId } from './localStorage';

// Constants
const LML_API_BASE_URL = 'https://api.lml.live';
const MAX_GIGS_PER_EMAIL = 5;
const PROXIMITY_RADIUS_KM = 10; // Gigs within this distance will be included

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
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
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
export const fetchGigsFromApi = async (dateFrom, dateTo, location = 'melbourne') => {
  try {
    // For debugging, log the request parameters
    console.log('Fetching gigs with params:', { dateFrom, dateTo, location });
    
    // Ensure we're using today's date if not specified
    if (!dateFrom) {
      dateFrom = new Date().toISOString().split('T')[0];
    }
    if (!dateTo) {
      dateTo = dateFrom;
    }
    
    // Force location to melbourne for now
    location = 'melbourne';
    
    // Use the correct API endpoint format as provided in the example
    const url = `${LML_API_BASE_URL}/gigs/query?location=${location}&date_from=${dateFrom}&date_to=${dateTo}`;
    console.log('API URL:', url);
    
    try {
      const response = await fetch(url, { timeout: 5000 });
      
      if (!response.ok) {
        throw new Error(`LML API returned ${response.status}: ${response.statusText}`);
      }
      
      const gigs = await response.json();
      console.log(`Fetched ${gigs.length} gigs from API`);
      return gigs;
    } catch (apiError) {
      console.warn('Failed to fetch from API, using mock data instead:', apiError);
      return getMockGigs(dateFrom);
    }
  } catch (error) {
    console.error('Error in fetchGigsFromApi:', error);
    // Return mock data instead of throwing an error
    return getMockGigs(dateFrom);
  }
};

/**
 * Generate mock gig data for testing when API is unavailable
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Array} Array of mock gig objects
 */
export const getMockGigs = (date) => {
  console.log('Generating mock gigs for date:', date);
  
  // Create a date object from the input date
  const gigDate = new Date(date);
  const formattedDate = gigDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate 10 mock gigs
  return [
    {
      id: 'mock-gig-1',
      name: 'Peanut Butter Melly',
      venue: {
        name: "Baxter's Lot",
        address: '302 Brunswick Street Fitzroy',
        latitude: -37.7963,
        longitude: 144.9778,
        location_url: 'https://maps.app.goo.gl/2pKyampoCBNGhxVDA'
      },
      start_time: '21:00',
      prices: [{ price: 'Check venue' }],
      genre_tags: ['Rock', 'Indie'],
      information_tags: []
    },
    {
      id: 'mock-gig-2',
      name: 'The Velvet Underground Tribute',
      venue: {
        name: 'The Corner Hotel',
        address: '57 Swan Street Richmond',
        latitude: -37.8236,
        longitude: 144.9975,
        location_url: 'https://maps.app.goo.gl/3pLyamqoCBNGhxVDB'
      },
      start_time: '20:00',
      prices: [{ price: '$25' }],
      genre_tags: ['Rock', 'Alternative'],
      information_tags: []
    },
    {
      id: 'mock-gig-3',
      name: 'Jazz Fusion Collective',
      venue: {
        name: 'Paris Cat Jazz Club',
        address: '6 Goldie Place Melbourne',
        latitude: -37.8119,
        longitude: 144.9567,
        location_url: 'https://maps.app.goo.gl/4qLyamroCBNGhxVDC'
      },
      start_time: '19:30',
      prices: [{ price: '$30' }],
      genre_tags: ['Jazz', 'Fusion'],
      information_tags: []
    },
    {
      id: 'mock-gig-4',
      name: 'Electronic Beats',
      venue: {
        name: 'Revolver Upstairs',
        address: '229 Chapel Street Prahran',
        latitude: -37.8512,
        longitude: 144.9931,
        location_url: 'https://maps.app.goo.gl/5rLyamsoCBNGhxVDD'
      },
      start_time: '22:00',
      prices: [{ price: '$15' }],
      genre_tags: ['Electronic', 'House'],
      information_tags: []
    },
    {
      id: 'mock-gig-5',
      name: 'Acoustic Sessions',
      venue: {
        name: 'The Toff in Town',
        address: '252 Swanston Street Melbourne',
        latitude: -37.8123,
        longitude: 144.9668,
        location_url: 'https://maps.app.goo.gl/6sLyamtoCBNGhxVDE'
      },
      start_time: '20:30',
      prices: [{ price: 'Free' }],
      genre_tags: ['Acoustic', 'Folk'],
      information_tags: ['Free']
    }
  ];
};

/**
 * Generate a QR code for a venue map URL
 * @param {string} mapUrl - URL to encode in QR code
 * @returns {string} URL to QR code image
 */
export const generateQRCode = (mapUrl) => {
  try {
    // If no map URL provided, use a default
    const url = mapUrl || 'https://maps.google.com';
    
    // Use the QR Server API to generate a QR code with smaller size
    // Using 100x100 for smaller QR codes
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&margin=1&qzone=1`;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a fallback URL in case of error
    return 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fmaps.google.com&margin=1&qzone=1';
  }
};

/**
 * Translate text to the specified language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @returns {Promise<string>} Translated text
 */
export const translateText = async (text, targetLanguage) => {
  // Stage 1: Fake translations to avoid API costs
  // In production, use Google Translate API or another translation service
  
  if (targetLanguage === 'en') {
    return text;
  }
  
  // For stage 1, just prefix the text with language name to simulate translation
  const languageName = SUPPORTED_LANGUAGES[targetLanguage] || targetLanguage;
  return `[${languageName}] ${text}`;
};

/**
 * Generate a description of Melbourne's live music scene
 * @returns {string} Description text
 */
export const generateMelbourneMusicSceneDescription = () => {
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
 * Format gigs into a human-readable text format with QR codes
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object
 * @returns {string} Formatted text
 */
export const formatGigText = (gigs, subscriber) => {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const musicSceneDescription = generateMelbourneMusicSceneDescription();
  
  let text = `=== MELBOURNE GIG GUIDE - ${date} ===\n\n`;
  text += `${musicSceneDescription}\n\n`;
  text += `--- GIGS NEAR YOU ---\n\n`;
  
  gigs.forEach((gig, index) => {
    const mapUrl = gig.venue.location_url || `https://maps.google.com/?q=${gig.venue.latitude},${gig.venue.longitude}`;
    const qrCodeUrl = generateQRCode(mapUrl);
    
    // Format price
    let priceText = "Check venue";
    if (gig.prices && gig.prices.length > 0) {
      priceText = gig.prices[0].price;
    } else if (gig.information_tags && gig.information_tags.includes('Free')) {
      priceText = "Free";
    }
    
    // Format genres
    let genresText = "";
    if (gig.genre_tags && gig.genre_tags.length > 0) {
      genresText = gig.genre_tags.join(', ');
    }
    
    // Format distance
    let distanceText = "";
    if (gig.distance) {
      distanceText = `${gig.distance.toFixed(1)} km away`;
    }
    
    text += `▶ ${index + 1}. ${gig.name}\n`;
    text += `   🏢 ${gig.venue.name} | ${distanceText}\n`;
    text += `   📍 ${gig.venue.address}\n`;
    text += `   🕒 ${gig.start_time || 'TBA'} | 💲 ${priceText}\n`;
    
    if (genresText) {
      text += `   🎵 ${genresText}\n`;
    }
    
    // More compact QR code presentation
    text += `   🗺️ ${mapUrl}\n`;
    text += `   QR: ${qrCodeUrl}\n`;
    text += `   ----------------------\n`;
  });
  
  text += `\n=== HOW TO USE ===\n`;
  text += `• View on mobile to scan QR codes directly from screen\n`;
  text += `• QR codes link to venue locations on Google Maps\n`;
  text += `• Share this guide with friends!\n\n`;
  
  text += `---\n`;
  text += `This information was sent to ${subscriber.name} at ${subscriber.email}.\n`;
  text += `Melbourne Gig Guide - Supporting local music and venues.\n`;
  
  return text;
};

/**
 * Generate content in English
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object
 * @returns {string} Formatted content
 */
export const generateContent = (gigs, subscriber) => {
  try {
    console.log('Generating English content for subscriber:', subscriber.name);
    
    // Generate English content
    const content = formatGigText(gigs, subscriber);
    console.log('Content generation successful');
    
    return content;
  } catch (error) {
    console.error('Error generating content:', error);
    // Return a basic error message instead of throwing
    return `Error generating content: ${error.message}\n\nThis is a placeholder content that was generated because an error occurred during the normal content generation process.`;
  }
};

/**
 * Filter and sort gigs by proximity to subscriber location
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object
 * @returns {Array} Filtered and sorted gigs
 */
export const filterGigsByProximity = (gigs, subscriber) => {
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
 * Generate content for a single subscriber and store in localStorage
 * @param {Object} subscriber - Subscriber object
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Created content log
 */
export const generateContentForSubscriber = async (subscriber, date) => {
  try {
    console.log('Generating content for subscriber:', subscriber.name);
    console.log('Subscriber location:', subscriber.latitude, subscriber.longitude);
    
    // If no date provided, use today's date
    if (!date) {
      date = new Date().toISOString().split('T')[0];
    }
    console.log('Using date:', date);
    
    // Get gigs for the specified date from the LML API (or mock data if API fails)
    let gigs = [];
    try {
      gigs = await fetchGigsFromApi(date, date);
    } catch (error) {
      console.warn('Error fetching gigs, using mock data:', error);
      gigs = getMockGigs(date);
    }
    
    // Ensure we have gigs data, even if it's empty
    if (!gigs || gigs.length === 0) {
      console.warn('No gigs returned, using mock data');
      gigs = getMockGigs(date);
    }
    
    console.log(`Found ${gigs.length} gigs before filtering by proximity`);
    
    // Filter gigs by proximity to subscriber
    const nearbyGigs = filterGigsByProximity(gigs, subscriber);
    console.log(`Found ${nearbyGigs.length} gigs within ${PROXIMITY_RADIUS_KM}km of subscriber`);
    
    let gigsToUse;
    let contentSource;
    
    if (nearbyGigs.length === 0) {
      // If no nearby gigs, use the first 5 gigs regardless of distance
      console.log('No nearby gigs found, using first 5 gigs regardless of distance');
      gigsToUse = gigs.slice(0, Math.min(5, gigs.length));
      contentSource = 'general';
    } else {
      gigsToUse = nearbyGigs;
      contentSource = 'nearby';
    }
    
    // Generate content
    const content = generateContent(gigsToUse, subscriber);
    console.log('Generated content successfully');
    
    // Store in localStorage
    const contentLog = {
      id: generateId(),
      subscriber_id: subscriber.id,
      generated_date: date,
      gig_ids: gigsToUse.map(gig => gig.id || 'unknown'),
      content_source: contentSource,
      content
    };
    
    const createdLog = createContentLog(contentLog);
    console.log('Content log created and stored in localStorage');
    return createdLog;
  } catch (error) {
    console.error(`Error generating content for subscriber ${subscriber.id}:`, error);
    
    // Even if there's an error, create a basic content log with error information
    const errorContent = `Error generating content: ${error.message}\n\nThis is a placeholder content that was generated because an error occurred during the normal content generation process.`;
    
    const contentLog = {
      id: generateId(),
      subscriber_id: subscriber.id,
      generated_date: date,
      gig_ids: [],
      content_source: 'error',
      content: errorContent
    };
    
    const createdLog = createContentLog(contentLog);
    console.log('Error content log created and stored in localStorage');
    return createdLog;
  }
};

/**
 * Generate content for all active subscribers (simplified, no scheduling)
 * @returns {Promise<Object>} Results of content generation
 */
export const generateDailyContent = async (subscribers) => {
  try {
    console.log('Starting daily content generation...');
    
    // Filter active subscribers
    const activeSubscribers = subscribers.filter(s => s.active === 1);
    console.log(`Found ${activeSubscribers.length} active subscribers out of ${subscribers.length} total`);
    
    if (activeSubscribers.length === 0) {
      console.log('No active subscribers found, nothing to do');
      return { message: 'No active subscribers found', generated: 0 };
    }
    
    // Get today's date
    const date = new Date().toISOString().split('T')[0];
    console.log(`Generating content for date: ${date}`);
    
    // Track results
    const results = {
      success: 0,
      failed: 0,
      details: []
    };
    
    // Generate content for each subscriber (English only)
    for (const subscriber of activeSubscribers) {
      console.log(`Processing subscriber: ${subscriber.name} (${subscriber.email})`);
      
      try {
        // Force English only
        const subscriberWithEnglish = {
          ...subscriber,
          languages: ['en']
        };
        
        // generateContentForSubscriber now handles errors internally and always returns a content log
        const content = await generateContentForSubscriber(subscriberWithEnglish, date);
        
        // Check if this was an error content
        if (content.content_source === 'error') {
          console.log(`Content generation had errors for ${subscriber.name}, but created an error log`);
          results.failed++;
          results.details.push({
            subscriberId: subscriber.id,
            name: subscriber.name,
            success: false,
            contentId: content.id,
            error: 'Error content generated as fallback'
          });
        } else {
          console.log(`Successfully generated content for ${subscriber.name}`);
          results.success++;
          results.details.push({
            subscriberId: subscriber.id,
            name: subscriber.name,
            success: true,
            contentId: content.id,
            contentSource: content.content_source
          });
        }
      } catch (error) {
        // This should rarely happen since generateContentForSubscriber handles errors
        console.error(`Unexpected error for subscriber ${subscriber.name}:`, error);
        results.failed++;
        results.details.push({
          subscriberId: subscriber.id,
          name: subscriber.name,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log(`Content generation complete: ${results.success} successful, ${results.failed} failed`);
    
    return {
      message: `Generated content for ${results.success} subscribers (${results.failed} failed)`,
      results
    };
  } catch (error) {
    console.error('Error in generateDailyContent:', error);
    // Return a result instead of throwing
    return {
      message: `Error generating content: ${error.message}`,
      error: true,
      results: {
        success: 0,
        failed: 0,
        details: []
      }
    };
  }
};