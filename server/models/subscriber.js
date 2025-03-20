/**
 * Subscriber model
 * 
 * Handles database operations for subscribers including
 * create, read, update, and delete functionality.
 */

const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');

/**
 * Get all subscribers
 * @returns {Promise<Array>} Array of all subscribers
 */
const getAllSubscribers = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM subscribers ORDER BY created_at DESC`;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      
      // Parse JSON strings
      const subscribers = rows.map(row => ({
        ...row,
        languages: JSON.parse(row.languages),
        days: JSON.parse(row.days)
      }));
      
      resolve(subscribers);
    });
  });
};

/**
 * Get subscriber by ID
 * @param {string} id - Subscriber ID
 * @returns {Promise<Object>} Subscriber object
 */
const getSubscriberById = (id) => {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM subscribers WHERE id = ?`;
    
    db.get(query, [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      
      if (!row) {
        return resolve(null);
      }
      
      // Parse JSON strings
      const subscriber = {
        ...row,
        languages: JSON.parse(row.languages),
        days: JSON.parse(row.days)
      };
      
      resolve(subscriber);
    });
  });
};

/**
 * Get subscribers for a specific day
 * @param {string} day - Day of the week (monday, tuesday, etc.)
 * @param {boolean} activeOnly - Only include active subscribers
 * @returns {Promise<Array>} Array of matching subscribers
 */
const getSubscribersByDay = (day, activeOnly = true) => {
  return new Promise((resolve, reject) => {
    // Get all subscribers and filter in-memory
    // This is more flexible than SQL for JSON array filtering
    getAllSubscribers()
      .then(subscribers => {
        const filtered = subscribers.filter(sub => {
          const includesDay = sub.days.includes(day.toLowerCase());
          const isActive = activeOnly ? sub.active === 1 : true;
          return includesDay && isActive;
        });
        resolve(filtered);
      })
      .catch(err => reject(err));
  });
};

/**
 * Create a new subscriber
 * @param {Object} subscriber - Subscriber data
 * @returns {Promise<Object>} Created subscriber
 */
const createSubscriber = (subscriber) => {
  return new Promise((resolve, reject) => {
    const id = subscriber.id || uuidv4();
    const now = new Date().toISOString();
    
    // Validate required fields
    if (!subscriber.name || !subscriber.email || 
        !subscriber.latitude || !subscriber.longitude || 
        !subscriber.languages || !subscriber.days) {
      return reject(new Error('Missing required fields'));
    }
    
    // Stringify arrays for storage
    const languages = JSON.stringify(subscriber.languages);
    const days = JSON.stringify(subscriber.days);
    
    const query = `
      INSERT INTO subscribers (
        id, name, email, latitude, longitude, 
        languages, days, active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      id, 
      subscriber.name, 
      subscriber.email, 
      subscriber.latitude, 
      subscriber.longitude, 
      languages, 
      days, 
      subscriber.active || 1, 
      now, 
      now
    ];
    
    db.run(query, params, function(err) {
      if (err) {
        return reject(err);
      }
      
      getSubscriberById(id)
        .then(newSubscriber => resolve(newSubscriber))
        .catch(err => reject(err));
    });
  });
};

/**
 * Update an existing subscriber
 * @param {string} id - Subscriber ID
 * @param {Object} updates - Updated subscriber data
 * @returns {Promise<Object>} Updated subscriber
 */
const updateSubscriber = (id, updates) => {
  return new Promise((resolve, reject) => {
    // First check if subscriber exists
    getSubscriberById(id)
      .then(subscriber => {
        if (!subscriber) {
          return reject(new Error('Subscriber not found'));
        }
        
        const now = new Date().toISOString();
        
        // Prepare update fields
        let updateFields = [];
        let updateValues = [];
        
        // Only update provided fields
        if (updates.name) {
          updateFields.push('name = ?');
          updateValues.push(updates.name);
        }
        
        if (updates.email) {
          updateFields.push('email = ?');
          updateValues.push(updates.email);
        }
        
        if (updates.latitude) {
          updateFields.push('latitude = ?');
          updateValues.push(updates.latitude);
        }
        
        if (updates.longitude) {
          updateFields.push('longitude = ?');
          updateValues.push(updates.longitude);
        }
        
        if (updates.languages) {
          updateFields.push('languages = ?');
          updateValues.push(JSON.stringify(updates.languages));
        }
        
        if (updates.days) {
          updateFields.push('days = ?');
          updateValues.push(JSON.stringify(updates.days));
        }
        
        if (typeof updates.active !== 'undefined') {
          updateFields.push('active = ?');
          updateValues.push(updates.active ? 1 : 0);
        }
        
        // Always update the updated_at timestamp
        updateFields.push('updated_at = ?');
        updateValues.push(now);
        
        // Add id to values for WHERE clause
        updateValues.push(id);
        
        const query = `
          UPDATE subscribers 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `;
        
        db.run(query, updateValues, function(err) {
          if (err) {
            return reject(err);
          }
          
          getSubscriberById(id)
            .then(updatedSubscriber => resolve(updatedSubscriber))
            .catch(err => reject(err));
        });
      })
      .catch(err => reject(err));
  });
};

/**
 * Delete a subscriber
 * @param {string} id - Subscriber ID
 * @returns {Promise<boolean>} Success status
 */
const deleteSubscriber = (id) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM subscribers WHERE id = ?`;
    
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
 * Toggle subscriber active status
 * @param {string} id - Subscriber ID
 * @param {boolean} active - New active status
 * @returns {Promise<Object>} Updated subscriber
 */
const toggleSubscriberActive = (id, active) => {
  return updateSubscriber(id, { active: active ? 1 : 0 });
};

module.exports = {
  getAllSubscribers,
  getSubscriberById,
  getSubscribersByDay,
  createSubscriber,
  updateSubscriber,
  deleteSubscriber,
  toggleSubscriberActive
};
