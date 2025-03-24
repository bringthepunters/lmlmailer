# LML Mailer (Serverless Version)

A serverless implementation of the Melbourne Gig Guide Email System. This version runs entirely in the browser without requiring a backend server.

## Features

- **Admin Interface**: Manage subscribers and content generation
- **Content Generation**: Generate formatted text content for subscribers based on their preferences
- **Live Music Integration**: Fetches gig data from the LML API
- **Browser-Based Multilingual Support**: Translates content to multiple languages directly in the browser
- **Persistence**: Uses browser localStorage for data storage
- **QR Code Integration**: Generates real, scannable QR codes for venue locations
- **Email HTML Export**: Copy HTML with embedded QR codes for email clients

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd lmlmailer-serverless
   ```

2. Install dependencies:
   
   If you're in the root directory:
   ```
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   ```
   
   If you're already in the client directory:
   ```
   npm install
   ```

### Running the Application

If you're in the root directory:
```
npm start
```

If you're already in the client directory:
```
npm start
```

This will launch the React application on [http://localhost:3000](http://localhost:3000).

### Troubleshooting

If you encounter the error `react-scripts: command not found`, make sure you've installed all dependencies:

```
npm install react-scripts
```

## How It Works

This implementation combines browser-based functionality with secure server-side operations:

- **Data Storage**: Uses browser's localStorage instead of SQLite
- **API Calls**: Makes direct fetch calls to the LML API from the browser
- **Content Generation**: Performs all content generation in the browser
- **QR Code Generation**: Uses QR Server API to generate scannable QR codes for venue locations
- **Email HTML Export**: Generates complete HTML with embedded QR codes for email clients
- **Secure LLM Translation**: Translates content to multiple languages using AI LLM services

### QR Code Feature

The application now includes real QR codes in the email preview:

1. QR codes are generated for each venue's map URL
2. The codes are displayed in the email preview
3. Users can copy the complete HTML with embedded QR codes
4. The HTML can be pasted into email clients to send emails with working QR codes

To test the QR code feature:
1. Go to the Dashboard
2. Click "Preview Email with QR Codes"
3. Use the "Copy HTML for Email Client" button
4. Paste the HTML into your email client

### Browser-Based Translation Feature

This application includes a translation system that works entirely in the browser without external APIs:

1. **Dictionary-Based Translation**: Uses extensive language dictionaries for key phrases and terms
2. **Smart Text Parsing**: Separates content sections for more accurate translation
3. **Domain-Specific Knowledge**: Includes music and venue terminology in all supported languages
4. **Performance Optimized**: Uses caching to improve translation speed

#### How It Works

Our browser-based translation approach:

1. **No API Keys Required**: All translation happens directly in the browser
2. **No External Dependencies**: No need for third-party translation services
3. **Content-Aware**: Understands the structure of gig guide content for better results
4. **Smart Preservation**: Maintains URLs, QR codes, and venue information intact

#### Supported Languages

The system supports all these languages without external services:

- English
- Japanese (日本語)
- Simplified Chinese (简体中文)
- Traditional Chinese (繁體中文)
- Arabic (العربية)
- Vietnamese (Tiếng Việt)
- Spanish (Español)
- German (Deutsch)
- Hindi (हिन्दी)
- Korean (한국어)

## Project Structure

- `client/src/utils/localStorage.js`: Utilities for storing and retrieving data from localStorage
- `client/src/utils/contentGenerator.js`: Content generation logic ported from the server
- `client/src/pages/`: React components for the admin interface
- `client/public/`: Static assets
- `client/src/services/translationService.js`: Secure translation service with caching
- `server/routes/translation.js`: Secure server-side proxy for LLM API calls

## Limitations

- **Storage Capacity**: localStorage is limited to about 5MB per domain
- **API Usage Costs**: LLM translation services have usage costs based on volume
- **No Authentication**: This version doesn't include user authentication
- **No Email Sending**: This version only generates content but doesn't send emails

## Future Enhancements

- Add a proper database using IndexedDB for larger storage capacity
- Implement user authentication
- Add email sending capabilities using a third-party service
- Expand translation capabilities with more language options

## License

ISC