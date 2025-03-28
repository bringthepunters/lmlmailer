/**
 * LML Mailer - Google Apps Script Implementation
 * 
 * This script fetches gig data from the LML API, formats it for subscribers,
 * translates content based on language preference, and sends emails directly
 * through Gmail.
 * 
 * Sheet Structure:
 * - Subscribers: ID, Name, Email, Language, Latitude, Longitude, Active
 * - Translations: Key (English), LanguageCode, TranslatedText
 * - EmailLogs: Date, SubscriberID, Status, Message
 */

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://api.lml.live',
  SPREADSHEET_ID: '1zLQ5JplOj4t9LPBIeMpooHNeHqnBU55umSzKHqVzfos', // Your Google Sheet ID
  SHEET_NAMES: {
    SUBSCRIBERS: 'Subscribers',
    TRANSLATIONS: 'Translations', 
    EMAIL_LOGS: 'Email Logs',
    LANGUAGE_PREFERENCES: 'Language Preferences' // New sheet for language preferences
  },
  MAX_GIGS_PER_EMAIL: 5,
  PROXIMITY_RADIUS_KM: 10,
  EMAIL_SENDER_NAME: 'Melbourne Gig Guide',
  // Default translations for UI elements to ensure they're always translated
  UI_ELEMENTS: {
    'Venue': true,
    'Address': true,
    'Time/Price': true,
    'Genres': true,
    'View on Map': true,
    'Check venue': true,
    'Free': true,
    'TBA': true,
    'km away': true
  }
};

// Supported languages
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
 * Main function to run the email sending process
 * Call this function from triggers or manually
 */
function sendGigGuideEmails() {
  try {
    Logger.log('Starting gig guide email process');
    
    // Get active subscribers
    const subscribers = getActiveSubscribers();
    if (!subscribers || subscribers.length === 0) {
      Logger.log('No active subscribers found');
      return;
    }
    
    Logger.log(`Found ${subscribers.length} active subscribers`);
    
    // Get today's gigs
    const today = new Date();
    const dateString = Utilities.formatDate(today, 'GMT', 'yyyy-MM-dd');
    const gigs = fetchGigsFromApi(dateString, dateString);
    
    if (!gigs || gigs.length === 0) {
      logError('No gigs found for today', 'API');
      return;
    }
    
    Logger.log(`Fetched ${gigs.length} gigs for ${dateString}`);
    
    // Process each subscriber
    let successCount = 0;
    let failCount = 0;
    
    subscribers.forEach(subscriber => {
      try {
        // Filter gigs by proximity to subscriber
        const nearbyGigs = filterGigsByProximity(gigs, subscriber);
        const gigsToUse = nearbyGigs.length > 0 ? 
          nearbyGigs : 
          gigs.slice(0, Math.min(CONFIG.MAX_GIGS_PER_EMAIL, gigs.length));
        
        // Generate content for each language
        // Make sure we properly parse the language string, handling both comma and semicolon separators
        let languages = [];
        if (typeof subscriber.language === 'string') {
          // Try comma first, then semicolon if comma doesn't work
          if (subscriber.language.includes(',')) {
            languages = subscriber.language.split(',').map(l => l.trim());
          } else if (subscriber.language.includes(';')) {
            languages = subscriber.language.split(';').map(l => l.trim());
          } else {
            // Just a single language
            languages = [subscriber.language.trim()];
          }
          
          // Filter out any empty strings
          languages = languages.filter(lang => lang.length > 0);
          
          // Validate each language code to make sure it's supported
          languages = languages.filter(lang => {
            if (lang === 'en' || SUPPORTED_LANGUAGES[lang]) {
              return true;
            }
            Logger.log(`Warning: Unsupported language '${lang}' for subscriber ${subscriber.name}. Skipping.`);
            return false;
          });
        } else {
          Logger.log(`Warning: Invalid language format for subscriber ${subscriber.name}. Defaulting to English.`);
          languages = ['en'];
        }
        
        let content = '';
        
        // Ensure English is always included
        if (!languages.includes('en')) {
          languages.unshift('en');
        }
        
        Logger.log(`Final language list for ${subscriber.name}: ${JSON.stringify(languages)}`);
        
        // Debug the languages
        Logger.log(`Processing languages for ${subscriber.name}: ${JSON.stringify(languages)}`);
        
        // Generate content for each language the subscriber has selected
        // We'll use a for loop with explicit index to avoid any potential issues
        for (let i = 0; i < languages.length; i++) {
          const language = languages[i];
          
          // Add separator between languages
          if (i > 0) {
            content += '\n\n' + '='.repeat(40) + '\n\n';
          }
          
          Logger.log(`Generating content in ${language} for ${subscriber.name}`);
          
          if (language === 'en') {
            // Generate English content with the language-specific intro
            const englishContent = formatGigText(gigsToUse, subscriber, 'en');
            content += `[ENGLISH]\n\n${englishContent}`;
          } else {
            // Format with language-specific intro first, then translate other elements
            const baseContent = formatGigText(gigsToUse, subscriber, language);
            const translated = translateContent(baseContent, language);
            content += `[${SUPPORTED_LANGUAGES[language] || language}]\n\n${translated}`;
          }
        }
        
        // Send email
        const subject = `Melbourne Gig Guide - ${Utilities.formatDate(today, 'GMT', 'EEE, MMM d, yyyy')}`;
        const result = sendEmail(subscriber.email, subject, content, subscriber.name);
        
        if (result.success) {
          logSuccess(subscriber.id, subject);
          successCount++;
        } else {
          logError(result.message, subscriber.id);
          failCount++;
        }
      } catch (subError) {
        logError(`Error processing subscriber ${subscriber.id}: ${subError.message}`, subscriber.id);
        failCount++;
      }
    });
    
    Logger.log(`Email sending complete. Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    logError(`Main process error: ${error.message}`, 'SYSTEM');
    throw error;
  }
}

/**
 * Get all active subscribers from the Subscribers sheet
 * @returns {Array} Array of subscriber objects
 */
function getActiveSubscribers() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAMES.SUBSCRIBERS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices
  const idCol = headers.indexOf('ID');
  const nameCol = headers.indexOf('Name');
  const emailCol = headers.indexOf('Email');
  const languageCol = headers.indexOf('Language');
  const latCol = headers.indexOf('Latitude');
  const lngCol = headers.indexOf('Longitude');
  const activeCol = headers.indexOf('Active');
  
  // Make sure all required columns exist
  if (idCol === -1 || nameCol === -1 || emailCol === -1 || 
      languageCol === -1 || latCol === -1 || lngCol === -1 || activeCol === -1) {
    throw new Error('Subscribers sheet is missing required columns');
  }
  
  // Extract subscribers
  const subscribers = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Only include active subscribers
    if (row[activeCol] === true || row[activeCol] === 'TRUE' || row[activeCol] === 1) {
      subscribers.push({
        id: row[idCol],
        name: row[nameCol],
        email: row[emailCol],
        language: row[languageCol] || 'en',
        latitude: parseFloat(row[latCol]) || -37.8136, // Default to Melbourne CBD
        longitude: parseFloat(row[lngCol]) || 144.9631
      });
    }
  }
  
  return subscribers;
}

/**
 * Fetch gigs from the LML API
 * @param {string} dateFrom - Start date in YYYY-MM-DD format
 * @param {string} dateTo - End date in YYYY-MM-DD format
 * @param {string} location - Location name (default: melbourne)
 * @returns {Array} Array of gig objects
 */
function fetchGigsFromApi(dateFrom, dateTo, location = 'melbourne') {
  try {
    const url = `${CONFIG.API_BASE_URL}/gigs/query?location=${location}&date_from=${dateFrom}&date_to=${dateTo}`;
    Logger.log(`Fetching gigs from: ${url}`);
    
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error(`API returned status code ${response.getResponseCode()}`);
    }
    
    const responseText = response.getContentText();
    const gigs = JSON.parse(responseText);
    
    return gigs;
  } catch (error) {
    Logger.log(`Error fetching gigs: ${error.message}`);
    // Use mock data if the API fails
    return getMockGigs(dateFrom);
  }
}

/**
 * Generate mock gig data for testing or when API fails
 * @param {string} date - Date string in YYYY-MM-DD format
 * @returns {Array} Array of mock gig objects
 */
function getMockGigs(date) {
  Logger.log(`Using mock gigs for date: ${date}`);
  
  // Format the date for display
  const gigDate = new Date(date);
  const formattedDate = Utilities.formatDate(gigDate, 'GMT', 'EEE, MMM d, yyyy');
  
  // Create mock gigs similar to the API response
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
    // Add more mock gigs as needed
  ];
}

/**
 * Filter gigs by proximity to subscriber location
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object with latitude and longitude
 * @returns {Array} Filtered and sorted gigs
 */
function filterGigsByProximity(gigs, subscriber) {
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
  const nearbyGigs = gigsWithDistance.filter(gig => gig.distance <= CONFIG.PROXIMITY_RADIUS_KM);
  
  // Sort by distance (closest first)
  nearbyGigs.sort((a, b) => a.distance - b.distance);
  
  // Limit to MAX_GIGS_PER_EMAIL
  return nearbyGigs.slice(0, CONFIG.MAX_GIGS_PER_EMAIL);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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
}

/**
 * Generate a QR code URL for a venue map URL
 * @param {string} mapUrl - URL to encode in QR code
 * @returns {string} QR code image URL
 */
function generateQRCode(mapUrl) {
  try {
    // If no map URL provided, use a default
    const url = mapUrl || 'https://maps.google.com';
    
    // Use QR Server API for QR code generation
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}&margin=1&qzone=1`;
  } catch (error) {
    Logger.log('Error generating QR code:', error);
    // Return a fallback URL
    return 'https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fmaps.google.com&margin=1&qzone=1';
  }
}

/**
 * Generate a description of Melbourne's live music scene
 * @param {string} language - The language code to use (default: 'en')
 * @returns {string} Description text
 */
function generateMelbourneMusicSceneDescription(language = 'en') {
  // Check if we have a specific intro text for this language
  const languageIntro = getTranslation('INTRO_TEXT', language);
  
  // If we have a language-specific intro, use it
  if (languageIntro && languageIntro !== 'INTRO_TEXT') {
    Logger.log(`Using language-specific intro for ${language}`);
    return languageIntro;
  }
  
  // Otherwise, use one of the default English descriptions
  const descriptions = [
    "Melbourne's vibrant live music scene offers everything from intimate jazz clubs to stadium rock concerts. With over 460 live music venues, it's one of the world's leading music cities.",
    
    "Melbourne has a thriving live music culture, with venues ranging from historic pubs to modern performance spaces. The city hosts more live music venues per capita than any other city in the world.",
    
    "Known as Australia's music capital, Melbourne's live scene spans genres from indie rock and electronic to jazz and classical. The city's diverse venues create a unique cultural tapestry for music lovers.",
    
    "Melbourne's iconic music scene has launched countless careers and attracts global acts year-round. With venues scattered across unique neighborhoods, each offering its own musical flavor and atmosphere."
  ];
  
  // Randomly select one description
  const randomIndex = Math.floor(Math.random() * descriptions.length);
  const englishDesc = descriptions[randomIndex];
  
  // If it's English, return as is; otherwise translate
  if (language === 'en') {
    return englishDesc;
  } else {
    return translateParagraph(englishDesc, language);
  }
}

/**
 * Format gigs into a human-readable text format with QR codes
 * @param {Array} gigs - Array of gig objects
 * @param {Object} subscriber - Subscriber object
 * @param {string} language - Language code (default: 'en')
 * @returns {string} Formatted text
 */
function formatGigText(gigs, subscriber, language = 'en') {
  const date = Utilities.formatDate(new Date(), 'GMT', 'EEEE, MMMM d, yyyy');
  const musicSceneDescription = generateMelbourneMusicSceneDescription(language);
  
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
      genresText = `   🎵 ${gig.genre_tags.join(', ')}\n`;
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
      text += genresText;
    }
    
    text += `   🗺️ ${mapUrl}\n`;
    text += `   QR: ${qrCodeUrl}\n`;
    text += `   ----------------------\n\n`;
  });
  
  text += `=== HOW TO USE ===\n`;
  text += `• View on mobile to scan QR codes directly from screen\n`;
  text += `• QR codes link to venue locations on Google Maps\n`;
  text += `• Share this guide with friends!\n\n`;
  
  text += `---\n`;
  text += `This information was sent to ${subscriber.name} at ${subscriber.email}.\n`;
  text += `Melbourne Gig Guide - Supporting local music and venues.\n`;
  
  return text;
}

/**
 * Translate content to the specified language
 * @param {string} content - Content to translate
 * @param {string} targetLanguage - Target language code
 * @returns {string} Translated content
 */
function translateContent(content, targetLanguage) {
  try {
    // Extract sections from the content
    const sections = extractSections(content);
    
    // Translate each section
    let translatedContent = '';
    
    // Header (with the date preserved)
    if (targetLanguage === 'ar') {
      translatedContent += `=== ${getTranslation('MELBOURNE GIG GUIDE', targetLanguage)} - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'ja') {
      translatedContent += `=== メルボルン ライブガイド - ${sections.date} ===\n\n`;
    } else if (targetLanguage === 'zh-CN') {
      translatedContent += `=== 墨尔本演出指南 - ${sections.date} ===\n\n`;
    } else {
      translatedContent += `=== ${getTranslation('MELBOURNE GIG GUIDE', targetLanguage)} - ${sections.date} ===\n\n`;
    }
    
    // Description paragraph
    translatedContent += translateParagraph(sections.description, targetLanguage) + '\n\n';
    
    // Gigs near you header
    translatedContent += `--- ${getTranslation('GIGS NEAR YOU', targetLanguage)} ---\n\n`;
    
    // Gig items
    sections.gigItems.forEach((gigItem, index) => {
      const translatedItem = translateGigItem(gigItem, targetLanguage);
      translatedContent += translatedItem;
      if (index < sections.gigItems.length - 1) {
        translatedContent += '\n\n';
      }
    });
    
    // How to use section
    translatedContent += '\n\n';
    translatedContent += `=== ${getTranslation('HOW TO USE', targetLanguage)} ===\n`;
    translatedContent += `• ${getTranslation('View on mobile to scan QR codes directly from screen', targetLanguage)}\n`;
    translatedContent += `• ${getTranslation('QR codes link to venue locations on Google Maps', targetLanguage)}\n`;
    translatedContent += `• ${getTranslation('Share this guide with friends!', targetLanguage)}\n\n`;
    
    // Footer
    translatedContent += '---\n';
    translatedContent += `${getTranslation('This information was sent to', targetLanguage)} ${sections.subscriberName} ${targetLanguage === 'ar' ? 'على' : 'at'} ${sections.subscriberEmail}.\n`;
    translatedContent += `${getTranslation('Melbourne Gig Guide - Supporting local music and venues.', targetLanguage)}\n`;
    
    // Special handling for Arabic
    if (targetLanguage === 'ar') {
      translatedContent = fixArabicTranslation(translatedContent);
    }
    
    return translatedContent;
  } catch (error) {
    Logger.log(`Translation error: ${error.message}`);
    // Return the original content with a language tag if translation fails
    return `[${targetLanguage}]\n\n${content}`;
  }
}

/**
 * Get translation for a specific phrase from the Translations sheet
 * @param {string} phrase - Phrase to translate in English
 * @param {string} targetLanguage - Target language code
 * @returns {string} Translated phrase or original if not found
 */
function getTranslation(phrase, targetLanguage) {
  // Cache translations for better performance
  if (!this.translationCache) {
    this.translationCache = {};
    loadTranslations();
  }
  
  const cacheKey = `${targetLanguage}_${phrase}`;
  if (this.translationCache[cacheKey]) {
    return this.translationCache[cacheKey];
  }
  
  // Return original phrase if no translation found
  return phrase;
}

/**
 * Load all translations from the Translations sheet into cache
 */
function loadTranslations() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAMES.TRANSLATIONS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const keyCol = headers.indexOf('Key');
    const langCol = headers.indexOf('LanguageCode');
    const transCol = headers.indexOf('TranslatedText');
    
    if (keyCol === -1 || langCol === -1 || transCol === -1) {
      Logger.log('Translations sheet is missing required columns');
      return;
    }
    
    // Build cache
    for (let i = 1; i < data.length; i++) {
      const key = data[i][keyCol];
      const lang = data[i][langCol];
      const trans = data[i][transCol];
      
      if (key && lang && trans) {
        const cacheKey = `${lang}_${key}`;
        this.translationCache[cacheKey] = trans;
      }
    }
    
    Logger.log(`Loaded ${Object.keys(this.translationCache).length} translations into cache`);
    
    // Make sure UI elements are in the translation sheet
    ensureUIElementTranslations();
  } catch (error) {
    Logger.log(`Error loading translations: ${error.message}`);
  }
}

/**
 * Make sure all essential UI elements have translation entries
 * in the Translations sheet
 */
function ensureUIElementTranslations() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAMES.TRANSLATIONS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const keyCol = headers.indexOf('Key');
    const langCol = headers.indexOf('LanguageCode');
    const transCol = headers.indexOf('TranslatedText');
    
    if (keyCol === -1 || langCol === -1 || transCol === -1) {
      Logger.log('Translations sheet is missing required columns');
      return;
    }
    
    // Create a map of existing entries (key_lang)
    const existingEntries = {};
    for (let i = 1; i < data.length; i++) {
      const key = data[i][keyCol];
      const lang = data[i][langCol];
      if (key && lang) {
        existingEntries[`${key}_${lang}`] = true;
      }
    }
    
    // List of essential UI elements that must be translated
    const uiElements = [
      'Venue',
      'Address',
      'Time/Price',
      'Genres',
      'View on Map',
      'Check venue',
      'Free',
      'TBA',
      'km away',
      'GIGS NEAR YOU',
      'HOW TO USE',
      'View on mobile to scan QR codes directly from screen',
      'QR codes link to venue locations on Google Maps',
      'Share this guide with friends!',
      'This information was sent to',
      'Melbourne Gig Guide - Supporting local music and venues.'
    ];
    
    // Default translations for some UI elements (these would be professionally translated in practice)
    const defaultTranslations = {
      'zh-CN': {
        'Venue': '场地',
        'Address': '地址',
        'Time/Price': '时间/价格',
        'Genres': '音乐类型',
        'View on Map': '在地图上查看',
        'Check venue': '查看场地',
        'Free': '免费',
        'TBA': '待定',
        'km away': '公里远',
        'GIGS NEAR YOU': '附近的演出',
        'HOW TO USE': '使用方法',
        'View on mobile to scan QR codes directly from screen': '在手机上查看以直接扫描屏幕上的二维码',
        'QR codes link to venue locations on Google Maps': '二维码链接到Google地图上的场地位置',
        'Share this guide with friends!': '与朋友分享此指南！',
        'This information was sent to': '此信息已发送至',
        'Melbourne Gig Guide - Supporting local music and venues.': '墨尔本演出指南 - 支持本地音乐和场馆。'
      },
      'es': {
        'Venue': 'Lugar',
        'Address': 'Dirección',
        'Time/Price': 'Hora/Precio',
        'Genres': 'Géneros',
        'View on Map': 'Ver en Mapa',
        'Check venue': 'Consultar lugar',
        'Free': 'Gratis',
        'TBA': 'Por anunciar',
        'km away': 'km de distancia',
        'GIGS NEAR YOU': 'CONCIERTOS CERCA DE TI',
        'HOW TO USE': 'CÓMO USAR',
        'View on mobile to scan QR codes directly from screen': 'Vea en móvil para escanear códigos QR directamente desde la pantalla',
        'QR codes link to venue locations on Google Maps': 'Los códigos QR enlazan a ubicaciones de lugares en Google Maps',
        'Share this guide with friends!': '¡Comparte esta guía con amigos!',
        'This information was sent to': 'Esta información fue enviada a',
        'Melbourne Gig Guide - Supporting local music and venues.': 'Guía de Conciertos de Melbourne - Apoyando música y lugares locales.'
      }
    };
    
    // Add entries for each UI element in each language
    const newRows = [];
    Object.keys(SUPPORTED_LANGUAGES).forEach(lang => {
      if (lang === 'en') return; // Skip English as it's the source language
      
      uiElements.forEach(element => {
        // Check if this translation already exists
        if (!existingEntries[`${element}_${lang}`]) {
          // Check for default translation
          let translation = '';
          if (defaultTranslations[lang] && defaultTranslations[lang][element]) {
            translation = defaultTranslations[lang][element];
          }
          
          // Add to new rows
          newRows.push([element, lang, translation]);
        }
      });
    });
    
    // Append new rows if any
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, keyCol + 1, newRows.length, 3).setValues(newRows);
      Logger.log(`Added ${newRows.length} missing UI element translations`);
    }
  } catch (error) {
    Logger.log(`Error ensuring UI translations: ${error.message}`);
  }
}

/**
 * Extract sections from email content for translation
 * @param {string} content - Full email content
 * @returns {Object} Extracted sections
 */
function extractSections(content) {
  // Header pattern
  const headerMatch = content.match(/===.*===\n/);
  const header = headerMatch ? headerMatch[0] : '';
  
  // Date pattern
  const dateMatch = header.match(/- (.+) ===/);
  const date = dateMatch ? dateMatch[1] : '';
  
  // Description paragraph
  const descriptionMatch = content.match(/===.*===\n\n(.*?)(?=\n\n---)/s);
  const description = descriptionMatch ? descriptionMatch[1].trim() : '';
  
  // Gigs section
  const gigsHeaderMatch = content.match(/--- GIGS NEAR YOU ---\n\n/);
  const gigsHeader = gigsHeaderMatch ? gigsHeaderMatch[0] : '';
  
  // Extract all gig items
  const gigItems = [];
  const gigPattern = /▶ \d+\..+?(?=▶|\n\n===|\n*$)/gs;
  let match;
  while ((match = gigPattern.exec(content)) !== null) {
    gigItems.push(match[0]);
  }
  
  // How to use section
  const howToUseMatch = content.match(/=== HOW TO USE ===\n(.*?)(?=\n\n---|$)/s);
  const howToUse = howToUseMatch ? howToUseMatch[0] : '';
  
  // Footer section
  const footerMatch = content.match(/---\n(.*?)$/s);
  const footer = footerMatch ? footerMatch[0] : '';
  
  // Subscriber info
  const subscriberMatch = footer.match(/sent to (.*?) at (.*?)\./);
  const subscriberName = subscriberMatch ? subscriberMatch[1] : '';
  const subscriberEmail = subscriberMatch ? subscriberMatch[2] : '';
  
  return {
    header,
    date,
    description,
    gigsHeader,
    gigItems,
    howToUse,
    footer,
    subscriberName,
    subscriberEmail
  };
}

/**
 * Translate a paragraph using the phrase database
 * @param {string} paragraph - Paragraph to translate
 * @param {string} targetLang - Target language
 * @returns {string} Translated paragraph
 */
function translateParagraph(paragraph, targetLang) {
  // Try to translate the exact paragraph
  const exactTranslation = getTranslation(paragraph, targetLang);
  if (exactTranslation !== paragraph) {
    return exactTranslation;
  }
  
  // Break into sentences and translate each one
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  const translated = sentences.map(sentence => 
    getTranslation(sentence.trim(), targetLang)
  );
  
  return translated.join(' ');
}

/**
 * Translate a gig item
 * @param {string} gigItem - Gig item text
 * @param {string} targetLang - Target language
 * @returns {string} Translated gig item
 */
function translateGigItem(gigItem, targetLang) {
  // Parse the gig item
  const titleMatch = gigItem.match(/▶ (\d+)\. (.*?)(?=\n)/);
  const venueMatch = gigItem.match(/🏢 (.*?) \| (.*?)(?=\n)/);
  const addressMatch = gigItem.match(/📍 (.*?)(?=\n)/);
  const timeMatch = gigItem.match(/🕒 (.*?) \| 💲 (.*?)(?=\n)/);
  const genresMatch = gigItem.match(/🎵 (.*?)(?=\n)/);
  const mapUrlMatch = gigItem.match(/🗺️ (.*?)(?=\n)/);
  const qrUrlMatch = gigItem.match(/QR: (.*?)(?=\n)/);
  
  if (!titleMatch) {
    return gigItem; // Return original if parsing fails
  }
  
  const num = titleMatch[1];
  const name = titleMatch[2];
  
  const venue = venueMatch ? venueMatch[1] : '';
  const distance = venueMatch ? venueMatch[2] : '';
  
  const address = addressMatch ? addressMatch[1] : '';
  
  const time = timeMatch ? timeMatch[1] : '';
  const price = timeMatch ? timeMatch[2] : '';
  
  // Additionally translate genre names if available
  let translatedGenres = '';
  if (genresMatch) {
    // Split, translate each genre, then rejoin
    const genreList = genresMatch[1].split(', ').map(genre => 
      getTranslation(genre.trim(), targetLang)
    ).join(', ');
    
    translatedGenres = `   🎵 ${genreList}\n`;
  }
  
  const mapUrl = mapUrlMatch ? mapUrlMatch[1] : '';
  const qrUrl = qrUrlMatch ? qrUrlMatch[1] : '';
  
  // Translate specific components
  const translatedDistance = getTranslation(distance, targetLang);
  let translatedPrice = price;
  
  // Translate common price terms
  if (price === 'Free') {
    translatedPrice = getTranslation('Free', targetLang);
  } else if (price === 'Check venue') {
    translatedPrice = getTranslation('Check venue', targetLang);
  } else if (price === 'TBA') {
    translatedPrice = getTranslation('TBA', targetLang);
  }
  
  // Build the translated item
  let translatedItem = `▶ ${num}. ${name}\n`;
  translatedItem += `   🏢 ${venue} | ${translatedDistance}\n`;
  translatedItem += `   📍 ${address}\n`;
  translatedItem += `   🕒 ${time} | 💲 ${translatedPrice}\n`;
  
  if (translatedGenres) {
    translatedItem += translatedGenres;
  }
  
  translatedItem += `   🗺️ ${mapUrl}\n`;
  
  // Special handling for QR code label in Arabic
  if (targetLang === 'ar') {
    translatedItem += `   رمز الاستجابة السريعة: ${qrUrl}\n`;
  } else {
    translatedItem += `   QR: ${qrUrl}\n`;
  }
  
  translatedItem += `   ----------------------`;
  
  return translatedItem;
}

/**
 * Special fixes for Arabic translation issues
 * @param {string} text - Translated text
 * @returns {string} Fixed text
 */
function fixArabicTranslation(text) {
  // Replace any instances of "مكان" with "قاعة الحفلات"
  text = text.replace(/مكان/g, 'قاعة الحفلات');
  text = text.replace(/مكانًا/g, 'قاعة حفلات');
  
  // Replace "حفلة" with "عرض موسيقي"
  text = text.replace(/حفلة/g, 'عرض موسيقي');
  text = text.replace(/حفلات/g, 'عروض موسيقية');
  
  // Replace "دليل حفلات" with "دليل العروض الموسيقية"
  text = text.replace(/دليل حفلات/g, 'دليل العروض الموسيقية');
  
  return text;
}

/**
 * Send an email to a subscriber
 * @param {string} email - Recipient's email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body
 * @param {string} recipientName - Name of recipient
 * @returns {Object} Success status and message
 */
function sendEmail(email, subject, body, recipientName) {
  try {
    // Detect the language from [LANGUAGE] tags
    const languageMatch = body.match(/\[(.*?)\]/);
    const language = languageMatch ? languageMatch[1].toLowerCase() : 'english';
    
    // Convert language name to code
    let languageCode = 'en'; // Default
    
    // Find language code from the language name
    for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
      if (name.toLowerCase() === language.toLowerCase()) {
        languageCode = code;
        break;
      }
    }
    
    // Create HTML version from text with proper language support
    const htmlBody = textToHtml(body, languageCode);
    
    // Send the email
    GmailApp.sendEmail(
      email,
      subject,
      body, // Plain text version
      {
        name: CONFIG.EMAIL_SENDER_NAME,
        htmlBody: htmlBody,
        replyTo: Session.getEffectiveUser().getEmail()
      }
    );
    
    Logger.log(`Email sent to ${email} with language: ${languageCode}`);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    Logger.log(`Error sending email to ${email}: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Convert plain text content to HTML for email
 * @param {string} text - Plain text content
 * @param {string} language - Language code for translating UI elements
 * @returns {string} HTML formatted content
 */
function textToHtml(text, language = 'en') {
  // Basic conversion
  let html = '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">';
  
  // Replace newlines with <br> tags
  const lines = text.split('\n');
  
  let inGigSection = false;
  
  // Translated UI labels
  const uiLabels = {
    'Venue': getTranslation('Venue', language) || 'Venue',
    'Address': getTranslation('Address', language) || 'Address',
    'Time/Price': getTranslation('Time/Price', language) || 'Time/Price',
    'Genres': getTranslation('Genres', language) || 'Genres',
    'View on Map': getTranslation('View on Map', language) || 'View on Map',
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle headers
    if (line.startsWith('===')) {
      const headerText = line.replace(/===/g, '').trim();
      html += `<h2 style="color: #d32f2f; border-bottom: 1px solid #eee; padding-bottom: 10px;">${headerText}</h2>`;
    } 
    // Handle subheaders
    else if (line.startsWith('---')) {
      const subheaderText = line.replace(/---/g, '').trim();
      html += `<h3 style="color: #1976d2; margin-top: 20px;">${subheaderText}</h3>`;
      inGigSection = true;
    } 
    // Handle gig items
    else if (line.startsWith('▶')) {
      // Start a new gig card
      html += '<div style="background-color: #f5f5f5; border-radius: 10px; padding: 15px; margin-bottom: 20px;">';
      const gigTitle = line.replace('▶', '').trim();
      html += `<div style="font-weight: bold; font-size: 16px;">${gigTitle}</div>`;
    } 
    // Handle QR code line
    else if (line.includes('QR:') && line.trim().startsWith('QR:')) {
      const qrUrl = line.replace('QR:', '').trim();
      html += `<div style="margin-top: 10px;"><img src="${qrUrl}" alt="QR Code" style="width: 100px; height: 100px;"></div>`;
    }
    // Handle divider
    else if (line.includes('----------------------')) {
      html += '</div>'; // Close gig card
    }
    // Handle bullet points
    else if (line.trim().startsWith('•')) {
      if (i === 0 || !lines[i-1].trim().startsWith('•')) {
        html += '<ul style="list-style-type: disc; margin-left: 20px;">';
      }
      
      html += `<li>${line.replace('•', '').trim()}</li>`;
      
      if (i === lines.length - 1 || !lines[i+1].trim().startsWith('•')) {
        html += '</ul>';
      }
    }
    // Regular text content
    else if (line.trim() !== '') {
      // Check if this is a gig detail line
      if (inGigSection && (
        line.includes('🏢') || 
        line.includes('📍') || 
        line.includes('🕒') || 
        line.includes('🎵') || 
        line.includes('🗺️'))) {
        // Format gig details
        if (line.includes('🏢')) {
          const venueInfo = line.replace('🏢', '').trim();
          html += `<div style="margin-top: 5px;"><strong>${uiLabels['Venue']}:</strong> ${venueInfo}</div>`;
        } else if (line.includes('📍')) {
          const address = line.replace('📍', '').trim();
          html += `<div><strong>${uiLabels['Address']}:</strong> ${address}</div>`;
        } else if (line.includes('🕒')) {
          const timePrice = line.replace('🕒', '').trim();
          html += `<div><strong>${uiLabels['Time/Price']}:</strong> ${timePrice}</div>`;
        } else if (line.includes('🎵')) {
          const genres = line.replace('🎵', '').trim();
          html += `<div><strong>${uiLabels['Genres']}:</strong> ${genres}</div>`;
        } else if (line.includes('🗺️')) {
          const mapUrl = line.replace('🗺️', '').trim();
          html += `<div><a href="${mapUrl}" target="_blank" style="color: #1976d2; text-decoration: none;">${uiLabels['View on Map']}</a></div>`;
        }
      } else {
        // Regular paragraph
        html += `<p>${line}</p>`;
      }
    } else {
      // Empty line
      html += '<br>';
    }
  }
  
  html += '</div>';
  return html;
}

/**
 * Creates or updates the Language Preferences sheet
 * This provides a better UI solution than commas/semicolons
 */
function setupLanguagePreferencesSheet() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LANGUAGE_PREFERENCES);
    
    // Create the sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEET_NAMES.LANGUAGE_PREFERENCES);
      
      // Set up the header row
      const headerRow = ["SubscriberID", "Name", "Email"];
      
      // Add all supported languages as columns
      Object.entries(SUPPORTED_LANGUAGES).forEach(([code, name]) => {
        headerRow.push(`${name} (${code})`);
      });
      
      // Write the header row
      sheet.getRange(1, 1, 1, headerRow.length).setValues([headerRow]);
      sheet.getRange(1, 1, 1, headerRow.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      
      // Format as checkboxes from column 4 onwards (language selections)
      if (headerRow.length > 3) {
        sheet.getRange(2, 4, 1000, headerRow.length - 3).insertCheckboxes();
      }
      
      // Auto-resize columns
      for (let i = 1; i <= headerRow.length; i++) {
        sheet.autoResizeColumn(i);
      }
      
      Logger.log("Created Language Preferences sheet");
    }
    
    // Sync with current subscribers
    syncSubscribersToLanguagePreferences();
    
    return true;
  } catch (error) {
    Logger.log(`Error setting up Language Preferences sheet: ${error.message}`);
    return false;
  }
}

/**
 * Syncs the current subscribers to the Language Preferences sheet
 */
function syncSubscribersToLanguagePreferences() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const lpSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LANGUAGE_PREFERENCES);
    const subscribersSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SUBSCRIBERS);
    
    if (!lpSheet || !subscribersSheet) {
      throw new Error("Required sheets not found");
    }
    
    // Get subscriber data
    const subscriberData = subscribersSheet.getDataRange().getValues();
    const subHeaders = subscriberData[0];
    const idCol = subHeaders.indexOf('ID');
    const nameCol = subHeaders.indexOf('Name');
    const emailCol = subHeaders.indexOf('Email');
    const langCol = subHeaders.indexOf('Language');
    
    if (idCol === -1 || nameCol === -1 || emailCol === -1 || langCol === -1) {
      throw new Error("Required columns not found in Subscribers sheet");
    }
    
    // Get language preferences data
    const lpData = lpSheet.getDataRange().getValues();
    const lpHeaders = lpData[0];
    
    // Create a map of existing subscriber IDs in the language preferences sheet
    const lpSubscriberMap = {};
    for (let i = 1; i < lpData.length; i++) {
      const id = lpData[i][0];
      if (id) {
        lpSubscriberMap[id] = i + 1; // Row index (1-based)
      }
    }
    
    // Process each subscriber
    for (let i = 1; i < subscriberData.length; i++) {
      const id = subscriberData[i][idCol];
      const name = subscriberData[i][nameCol];
      const email = subscriberData[i][emailCol];
      const languages = subscriberData[i][langCol];
      
      // Skip if missing required fields
      if (!id || !name || !email) continue;
      
      // Parse the language codes
      let languageCodes = [];
      if (languages) {
        if (languages.includes(',')) {
          languageCodes = languages.split(',').map(l => l.trim());
        } else if (languages.includes(';')) {
          languageCodes = languages.split(';').map(l => l.trim());
        } else {
          languageCodes = [languages.trim()];
        }
      }
      
      // If subscriber exists in LP sheet, update; otherwise, add
      if (lpSubscriberMap[id]) {
        const rowIndex = lpSubscriberMap[id];
        
        // Update basic info
        lpSheet.getRange(rowIndex, 1, 1, 3).setValues([[id, name, email]]);
        
        // Update language checkboxes
        for (let j = 3; j < lpHeaders.length; j++) {
          const headerParts = lpHeaders[j].match(/\((.*?)\)$/);
          if (headerParts && headerParts[1]) {
            const langCode = headerParts[1];
            const checked = languageCodes.includes(langCode);
            lpSheet.getRange(rowIndex, j + 1).check(checked);
          }
        }
      } else {
        // Add new row
        const newRow = [id, name, email];
        
        // Add language checkboxes
        for (let j = 3; j < lpHeaders.length; j++) {
          const headerParts = lpHeaders[j].match(/\((.*?)\)$/);
          if (headerParts && headerParts[1]) {
            const langCode = headerParts[1];
            newRow.push(languageCodes.includes(langCode));
          } else {
            newRow.push(false);
          }
        }
        
        lpSheet.appendRow(newRow);
      }
    }
    
    Logger.log("Successfully synced subscribers to Language Preferences sheet");
    return true;
  } catch (error) {
    Logger.log(`Error syncing subscribers: ${error.message}`);
    return false;
  }
}

/**
 * Gets a subscriber's language preferences from the Language Preferences sheet
 * @param {string} subscriberId - Subscriber ID
 * @returns {Array} Array of language codes
 */
function getSubscriberLanguagePreferences(subscriberId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const lpSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.LANGUAGE_PREFERENCES);
    
    if (!lpSheet) {
      // Create the sheet if it doesn't exist
      setupLanguagePreferencesSheet();
      return []; // Return empty for this run
    }
    
    // Get all data
    const data = lpSheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find the subscriber
    let subscriberRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == subscriberId) {
        subscriberRow = i;
        break;
      }
    }
    
    if (subscriberRow === -1) {
      return []; // Subscriber not found in preferences
    }
    
    // Get language preferences
    const languages = [];
    for (let j = 3; j < headers.length; j++) {
      const headerParts = headers[j].match(/\((.*?)\)$/);
      if (headerParts && headerParts[1] && data[subscriberRow][j] === true) {
        languages.push(headerParts[1]);
      }
    }
    
    return languages;
  } catch (error) {
    Logger.log(`Error getting language preferences: ${error.message}`);
    return [];
  }
}

/**
 * Log successful email sending
 * @param {string} subscriberId - Subscriber ID
 * @param {string} subject - Email subject
 */
function logSuccess(subscriberId, subject) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAMES.EMAIL_LOGS);
    const date = new Date();
    sheet.appendRow([
      Utilities.formatDate(date, 'GMT', 'yyyy-MM-dd HH:mm:ss'),
      subscriberId,
      subject,
      'SUCCESS',
      ''
    ]);
  } catch (error) {
    Logger.log(`Error logging success: ${error.message}`);
  }
}

/**
 * Log an error
 * @param {string} message - Error message
 * @param {string} subscriberId - Subscriber ID or system identifier
 */
function logError(message, subscriberId) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAMES.EMAIL_LOGS);
    const date = new Date();
    sheet.appendRow([
      Utilities.formatDate(date, 'GMT', 'yyyy-MM-dd HH:mm:ss'),
      subscriberId,
      '',
      'ERROR',
      message
    ]);
  } catch (error) {
    Logger.log(`Error logging error: ${error.message}`);
  }
}
