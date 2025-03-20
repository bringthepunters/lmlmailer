/**
 * Database configuration and initialization for LML Mailer
 * 
 * This module establishes a connection to the SQLite database,
 * creates the necessary tables if they don't exist, and exports
 * the database instance for use in other parts of the application.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure the database directory exists
const dbDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(path.join(dbDir, 'lmlmailer.sqlite'));

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');
      
      // Create subscribers table
      db.run(`
        CREATE TABLE IF NOT EXISTS subscribers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          languages TEXT NOT NULL, -- stored as JSON array
          days TEXT NOT NULL, -- stored as JSON array
          active INTEGER NOT NULL DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) reject(err);
      });
      
      // Create content_logs table (for Stage 1)
      db.run(`
        CREATE TABLE IF NOT EXISTS content_logs (
          id TEXT PRIMARY KEY,
          subscriber_id TEXT NOT NULL,
          generated_date TIMESTAMP NOT NULL,
          gig_ids TEXT NOT NULL, -- stored as JSON array
          content_preview TEXT, -- first 100 chars of generated content
          content TEXT NOT NULL, -- full generated content
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (subscriber_id) REFERENCES subscribers (id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

// Run database initialization
initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
  });

module.exports = {
  db,
  initDatabase
};
