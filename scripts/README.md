# LML Mailer - Google Apps Script Implementation

This directory contains the Google Apps Script implementation for the Melbourne Gig Guide mailer application. This solution fetches gig data from the LML API, formats it for subscribers, translates content into multiple languages, and sends emails directly through Gmail.

## Overview

The solution consists of:

1. A Google Apps Script that handles all the logic
2. A Google Sheet that stores subscriber information, translations, and logs
3. CSV templates for setting up the Google Sheet

## Setup Instructions

### Step 1: Create a new Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet
2. Rename the spreadsheet to "LML Mailer"
3. Create three sheets (tabs) with the following names:
   - Subscribers
   - Translations
   - Email Logs

### Step 2: Import subscriber and translation data

1. In the "Subscribers" sheet:
   - Click on cell A1
   - Go to File > Import > Upload
   - Upload the `subscribers_template.csv` file
   - Select "Replace data at selected cell" and click Import

2. In the "Translations" sheet:
   - Click on cell A1
   - Go to File > Import > Upload
   - Upload the `translations_template.csv` file
   - Select "Replace data at selected cell" and click Import
   - Then import the `genre_translations.csv` file by:
     - Select the last empty row in the sheet
     - Go to File > Import > Upload
     - Upload the `genre_translations.csv` file
     - Select "Insert at selected cell" and click Import
     - This will add all the genre translations to your translations database

3. In the "Email Logs" sheet:
   - Add the following headers in row 1:
     - A1: Timestamp
     - B1: SubscriberID
     - C1: Subject
     - D1: Status
     - E1: Message

### Step 3: Set up the Google Apps Script

1. In your Google Sheet, go to Extensions > Apps Script
2. This will open the Apps Script editor in a new tab
3. Delete any code in the editor and paste the entire content of the `lml_mailer_apps_script.js` file
4. Update the `CONFIG.SPREADSHEET_ID` value with your Google Sheet ID (you can find it in the URL of your sheet: `https://docs.google.com/spreadsheets/d/[THIS-IS-YOUR-SPREADSHEET-ID]/edit`)

### Step 4: Save and authorize the script

1. Click the Save icon (or press Ctrl+S / Cmd+S)
2. Name your project "LML Mailer"
3. Run the function `setupLanguagePreferencesSheet` once to create the Language Preferences sheet
   - Click on the dropdown menu showing functions
   - Select "setupLanguagePreferencesSheet"
   - Click the Run button (play icon)
   - Grant the necessary permissions when prompted
4. Run the function `sendGigGuideEmails` to test the email sending
   - Click on the dropdown menu showing functions
   - Select "sendGigGuideEmails"
   - Click the Run button (play icon)

### Step 5: Set up the trigger for automated emails

1. In the Apps Script editor, click on the clock icon on the left sidebar (Triggers)
2. Click "+ Add Trigger" at the bottom right
3. Set up the trigger with the following settings:
   - Choose which function to run: `sendGigGuideEmails`
   - Choose which deployment should run: Head
   - Select event source: Time-driven
   - Select type of time based trigger: Week timer
   - Select day of week: Friday (or your preferred day)
   - Select time of day: 6am to 7am (or your preferred time)
   - Failure notification settings: Notify me daily
4. Click Save

## How the Solution Works

### Subscriber Management

The "Subscribers" sheet stores information about subscribers including:
- ID: Unique identifier
- Name: Subscriber's name
- Email: Subscriber's email address
- Language: Comma-separated list of language codes (e.g., "en,es" for English and Spanish)
- Latitude: Subscriber's location latitude
- Longitude: Subscriber's location longitude
- Active: TRUE/FALSE to indicate if the subscriber should receive emails

### Translation System

The "Translations" sheet stores phrases and their translations:
- Key: The English phrase to translate
- LanguageCode: The language code (e.g., "ar" for Arabic)
- TranslatedText: The translated text

The script will use these translations to create properly translated emails. You can add more translations by adding rows to this sheet.

### Language Preferences

The "Language Preferences" sheet provides a better UI for managing subscriber language preferences:
- It shows checkboxes for each language a subscriber wants to receive
- This is automatically created and synced with the Subscribers sheet
- Use this sheet to easily update language preferences without editing comma-separated lists

### Email Process

When the script runs:
1. It fetches active subscribers
2. Gets gig data from the LML API (or uses mock data if the API fails)
3. For each subscriber:
   - Filters gigs by proximity to the subscriber's location
   - Generates content in the subscriber's preferred languages
   - Sends an email with the content
4. Records success/failure in the Email Logs sheet

### Email Format

The emails include:
- A description of Melbourne's music scene
- List of nearby gigs with details (venue, time, price, etc.)
- QR codes linking to venue locations on Google Maps
- Instructions for using the guide

## Customization

You can customize the script by modifying:
- `CONFIG` object at the top of the script
- Email content format in the `formatGigText` function
- HTML email styling in the `textToHtml` function
- Adding more languages by extending the translations sheet

## Troubleshooting

1. **API Access Issues**: If the script can't access the LML API, it will fall back to mock data
2. **Email Sending Failures**: Check the Email Logs sheet for error messages
3. **Translation Issues**: Add missing translations to the Translations sheet
4. **Script Timeout**: If the script times out, consider reducing the number of subscribers or simplifying the email content

## Extending the Solution

To extend this solution:
1. Add more translations to cover more phrases and languages
2. Customize the email design by modifying the HTML template
3. Add more sophisticated gig filtering based on subscriber preferences
4. Implement click tracking through URL parameters

## License

This solution is proprietary and for the exclusive use of LML Mailer.
