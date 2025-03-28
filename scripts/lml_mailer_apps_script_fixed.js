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
 * Translate a paragraph of text to the specified language
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @returns {string} Translated text
 */
function translateParagraph(text, targetLanguage) {
  try {
    // Use Google Translate API (requires Advanced Google Service activation)
    // This implementation is designed for Google Apps Script
    return LanguageApp.translate(text, 'en', targetLanguage);
  } catch (error) {
    Logger.log(`Translation error for paragraph: ${error.message}`);
    // Return original text if translation fails
    return text;
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
    text += `   🏢 ${getTranslation('Venue', language)}: ${gig.venue.name} | ${distanceText}\n`;
    text += `   📍 ${getTranslation('Address', language)}: ${gig.venue.address}\n`;
    text += `   🕒 ${getTranslation('Time/Price', language)}: ${gig.start_time || 'TBA'} | 💲 ${priceText}\n`;
    
    if (genresText) {
      // Translate each genre
      if (language !== 'en' && gig.genre_tags) {
        const translatedGenres = gig.genre_tags.map(genre => getTranslation(genre, language) || genre).join(', ');
        genresText = `   🎵 ${getTranslation('Genres', language)}: ${translatedGenres}\n`;
      } else {
        genresText = `   🎵 ${getTranslation('Genres', language)}: ${gig.genre_tags.join(', ')}\n`;
      }
      text += genresText;
    }
    
    text += `   🗺️ ${getTranslation('View on Map', language)}: ${mapUrl}\n`;
    text += `   QR: ${qrCodeUrl}\n`;
    text += `   ----------------------\n\n`;
  });
  
  text += `=== ${getTranslation('HOW TO USE', language)} ===\n`;
  text += `• ${getTranslation('View on mobile to scan QR codes directly from screen', language)}\n`;
  text += `• ${getTranslation('QR codes link to venue locations on Google Maps', language)}\n`;
  text += `• ${getTranslation('Share this guide with friends!', language)}\n\n`;
  
  text += `---\n`;
  text += `${getTranslation('This information was sent to', language)} ${subscriber.name} ${language === 'ar' ? 'على' : 'at'} ${subscriber.email}.\n`;
  text += `${getTranslation('Melbourne Gig Guide - Supporting local music and venues.', language)}\n`;
  
  return text;
}

/**
 * Extract sections from gig content for targeted translation
 * @param {string} content - The full content to parse
 * @returns {Object} Sections of the content
 */
function extractSections(content) {
  try {
    // Extract date from header
    const dateMatch = content.match(/=== MELBOURNE GIG GUIDE - (.+?) ===/);
    const date = dateMatch ? dateMatch[1] : '';
    
    // Extract description paragraph
    const descStart = content.indexOf('\n\n') + 2;
    const descEnd = content.indexOf('\n\n', descStart);
    const description = content.substring(descStart, descEnd);
    
    // Extract gig items (we'll keep these as is for now)
    const gigsStart = content.indexOf('--- GIGS NEAR YOU ---\n\n') + '--- GIGS NEAR YOU ---\n\n'.length;
    const howToUseStart = content.indexOf('=== HOW TO USE ===');
    const gigsSection = content.substring(gigsStart, howToUseStart).trim();
    
    // Split gigs by the separator
    const gigItems = gigsSection.split('   ----------------------\n\n')
      .filter(item => item.trim().length > 0)
      .map(item => item + '   ----------------------\n\n');
    
    // Extract how to use section
    const howToUseEnd = content.indexOf('---\n');
    const howToUse = content.substring(howToUseStart, howToUseEnd);
    
    // Extract footer
    const footer = content.substring(howToUseEnd);
    
    return {
      date,
      description,
      gigItems,
      howToUse,
      footer
    };
  } catch (error) {
    Logger.log(`Error extracting sections: ${error.message}`);
    // Return empty sections if extraction fails
    return {
      date: '',
      description: '',
      gigItems: [],
      howToUse: '',
      footer: ''
    };
  }
}

/**
 * Fix Arabic translation specifics
 * @param {string} text - Translated text
 * @returns {string} Fixed text
 */
function fixArabicTranslation(text) {
  // Fix RTL formatting issues and other Arabic-specific adjustments
  return text;
}

/**
 * Send email with formatted content
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} content - Email content
 * @param {string} name - Recipient name
 * @returns {Object} Result of sending
 */
function sendEmail(email, subject, content, name) {
  try {
    // Convert text content to HTML
    const htmlContent = textToHtml(content);
    
    // Send email using Gmail
    GmailApp.sendEmail(
      email,
      subject,
      content, // Plain text version
      {
        name: CONFIG.EMAIL_SENDER_NAME,
        htmlBody: htmlContent // HTML version
      }
    );
    
    return {
      success: true
    };
  } catch (error) {
    Logger.log(`Error sending email to ${email}: ${error.message}`);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Convert plain text to HTML with proper formatting
 * @param {string} text - Plain text content
 * @returns {string} HTML formatted content
 */
function textToHtml(text) {
  // Replace newlines with <br> tags
  let html = text.replace(/\n/g, '<br>');
  
  // Style language headers
  html = html.replace(/\[([^\]]+)\]/g, '<h2 style="color:#007bff;">[$1]</h2>');
  
  // Style section headers
  html = html.replace(/=== (.+?) ===/g, '<h1 style="color:#333;border-bottom:1px solid #ccc;padding-bottom:5px;">$1</h1>');
  html = html.replace(/--- (.+?) ---/g, '<h3 style="color:#0066cc;margin-top:20px;">$1</h3>');
  
  // Style gig numbers
  html = html.replace(/▶ (\d+)\. (.+?)<br>/g, '<div style="margin-top:15px;font-weight:bold;font-size:16px;">▶ $1. $2</div>');
  
  // Style gig details
  html = html.replace(/   🏢 (.+?)<br>/g, '<div style="margin-left:20px;margin-top:5px;">🏢 $1</div>');
  html = html.replace(/   📍 (.+?)<br>/g, '<div style="margin-left:20px;">📍 $1</div>');
  html = html.replace(/   🕒 (.+?)<br>/g, '<div style="margin-left:20px;">🕒 $1</div>');
  html = html.replace(/   🎵 (.+?)<br>/g, '<div style="margin-left:20px;">🎵 $1</div>');
  html = html.replace(/   🗺️ (.+?)<br>/g, '<div style="margin-left:20px;">🗺️ <a href="$1" target="_blank">$1</a></div>');
  
  // Create image tags for QR codes
  html = html.replace(/   QR: (.+?)<br>/g, '<div style="margin-left:20px;margin-top:5px;margin-bottom:10px;"><img src="$1" alt="QR Code" style="width:100px;height:100px;"></div>');
  
  // Style separator
  html = html.replace(/   ----------------------<br><br>/g, '<hr style="border:0;border-top:1px dashed #ccc;margin:15px 0;">');
  
  // Style How to Use section
  html = html.replace(/• (.+?)<br>/g, '<li style="margin-left:20px;margin-bottom:5px;">$1</li>');
  
  // Style footer
  html = html.replace(/---<br>/g, '<hr style="border:0;border-top:1px solid #ccc;margin:20px 0;">');
  
  // Wrap with proper HTML structure and add responsive styling
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 15px;
        }
        @media only screen and (max-width: 480px) {
          body {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
}

/**
 * Log success in the Email Logs sheet
 * @param {string} subscriberId - Subscriber ID
 * @param {string} subject - Email subject
 */
function logSuccess(subscriberId, subject) {
  logToSheet(subscriberId, 'SUCCESS', `Sent email: ${subject}`);
}

/**
 * Log error in the Email Logs sheet
 * @param {string} message - Error message
 * @param {string} subscriberId - Subscriber ID
 */
function logError(message, subscriberId) {
  logToSheet(subscriberId, 'ERROR', message);
}

/**
 * Log message to the Email Logs sheet
 * @param {string} subscriberId - Subscriber ID
 * @param {string} status - Status (SUCCESS/ERROR)
 * @param {string} message - Log message
 */
function logToSheet(subscriberId, status, message) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAMES.EMAIL_LOGS);
    
    if (!sheet) {
      // Create sheet if it doesn't exist
      const newSheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).insertSheet(CONFIG.SHEET_NAMES.EMAIL_LOGS);
      newSheet.appendRow(['Date', 'SubscriberID', 'Status', 'Message']);
      newSheet.appendRow([new Date(), subscriberId, status, message]);
      return;
    }
    
    sheet.appendRow([new Date(), subscriberId, status, message]);
  } catch (error) {
    Logger.log(`Error logging to sheet: ${error.message}`);
  }
}
