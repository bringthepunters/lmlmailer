/**
 * Content model
 * 
 * Handles database operations for content logs and 
 * manages content generation functionality.
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

/**
 * Get all content logs
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return
 * @param {string} options.subscriberId - Filter by subscriber ID
 * @returns {Promise<Array>} Array of content logs
 */
const getAllContentLogs = (options = {}) => {
  return new Promise((resolve, reject) => {
    let query = `SELECT * FROM content_logs`;
    const params = [];
    
    // Add WHERE clause if subscriberId provided
    if (options.subscriberId) {
      query += ` WHERE subscriber_id = ?`;
      params.push(options.subscriberId);
    }
    
    // Add ORDER BY
    query += ` ORDER BY generated_date DESC`;
    
    // Add LIMIT if provided
    if (options.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }
    
    db.all(query, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      
      // Parse JSON strings
      const logs = rows.map(row => ({
        ...row,
        gig_ids: JSON.parse(row.gig_ids)
      }));
      
      resolve(logs);
    });
  });
};

/**
 * Get content log by ID
 * @param {string} id - Content log ID
 * @returns {Promise<Object>} Content log object
 */
const getContentLogById = (id) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM content_logs WHERE id = ?`;
    
    db.get(query, [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (!row) {
        return resolve(null);
      }
      
      // Parse JSON strings
      const log = {
        ...row,
        gig_ids: JSON.parse(row.gig_ids)
      };
      
      resolve(log);
    });
  });
};

/**
 * Get latest content log for a subscriber
 * @param {string} subscriberId - Subscriber ID
 * @returns {Promise<Object>} Latest content log or null
 */
const getLatestContentForSubscriber = (subscriberId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM content_logs 
      WHERE subscriber_id = ? 
      ORDER BY generated_date DESC 
      LIMIT 1
    `;
    
    db.get(query, [subscriberId], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (!row) {
        return resolve(null);
      }
      
      // Parse JSON strings
      const log = {
        ...row,
        gig_ids: JSON.parse(row.gig_ids)
      };
      
      resolve(log);
    });
  });
};

/**
 * Get content logs for a specific date
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of matching content logs
 */
const getContentLogsByDate = (date) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM content_logs 
      WHERE DATE(generated_date) = DATE(?)
      ORDER BY generated_date DESC
    `;
    
    db.all(query, [date], (err, rows) => {
      if (err) {
        return reject(err);
      }
      
      // Parse JSON strings
      const logs = rows.map(row => ({
        ...row,
        gig_ids: JSON.parse(row.gig_ids)
      }));
      
      resolve(logs);
    });
  });
};

/**
 * Create a new content log
 * @param {Object} contentLog - Content log data
 * @returns {Promise<Object>} Created content log
 */
const createContentLog = (contentLog) => {
  return new Promise((resolve, reject) => {
    const id = contentLog.id || uuidv4();
    const now = new Date().toISOString();
    
    // Validate required fields
    if (!contentLog.subscriber_id || !contentLog.content || !contentLog.gig_ids) {
      return reject(new Error('Missing required fields'));
    }
    
    // Create preview from content
    const contentPreview = contentLog.content.substring(0, 100);
    
    // Stringify arrays for storage
    const gigIds = JSON.stringify(contentLog.gig_ids);
    
    const query = `
      INSERT INTO content_logs (
        id, subscriber_id, generated_date, gig_ids, 
        content_preview, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      id,
      contentLog.subscriber_id,
      contentLog.generated_date || now,
      gigIds,
      contentPreview,
      contentLog.content,
      now
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        return reject(err);
      }
      
      getContentLogById(id)
        .then(newLog => resolve(newLog))
        .catch(err => reject(err));
    });
  });
};

/**
 * Delete a content log
 * @param {string} id - Content log ID
 * @returns {Promise<boolean>} Success status
 */
const deleteContentLog = (id) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM content_logs WHERE id = ?`;
    
    db.run(query, [id], function(err) {
      if (err) {
        return reject(err);
      }
      
      // Check if any row was deleted
      if (this.changes === 0) {
        return resolve(false);
      }
      
      resolve(true);
    });
  });
};

/**
 * Delete all content logs for a subscriber
 * @param {string} subscriberId - Subscriber ID
 * @returns {Promise<number>} Number of deleted logs
 */
const deleteContentLogsForSubscriber = (subscriberId) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM content_logs WHERE subscriber_id = ?`;
    
    db.run(query, [subscriberId], function(err) {
      if (err) {
        return reject(err);
      }
      
      resolve(this.changes);
    });
  });
};

module.exports = {
  getAllContentLogs,
  getContentLogById,
  getLatestContentForSubscriber,
  getContentLogsByDate,
  createContentLog,
  deleteContentLog,
  deleteContentLogsForSubscriber
};
