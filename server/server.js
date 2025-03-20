/**
 * Main server file for LML Mailer application
 * 
 * This sets up the Express server, connects to the database,
 * and initializes all routes and middleware.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const cron = require('node-cron');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Apply middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

// API Routes
app.use('/api/subscribers', require('./routes/subscribers'));
app.use('/api/content', require('./routes/content'));

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Schedule content generation job (disabled for now, until fully implemented)
// Daily at 6am Melbourne time (AEDT/AEST)
// cron.schedule('0 6 * * *', async () => {
//   const { generateDailyContent } = require('./services/contentGenerator');
//   try {
//     await generateDailyContent();
//     console.log('Daily content generation completed');
//   } catch (err) {
//     console.error('Error generating daily content:', err);
//   }
// }, {
//   timezone: "Australia/Melbourne"
// });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
