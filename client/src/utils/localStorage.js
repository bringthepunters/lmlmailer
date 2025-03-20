/**
 * Local Storage Utilities
 * 
 * This module provides functions for storing and retrieving data from localStorage,
 * replacing the server-side database functionality for the serverless implementation.
 */

// Storage keys
const STORAGE_KEYS = {
  SUBSCRIBERS: 'lml_subscribers',
  CONTENT_LOGS: 'lml_content_logs'
};

// Generate a UUID (for IDs)
export const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Initialize local storage with default data if empty
 */
export const initializeStorage = () => {
  // Check if subscribers exist, if not initialize with empty array
  if (!localStorage.getItem(STORAGE_KEYS.SUBSCRIBERS)) {
    localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify([]));
  }
  
  // Check if content logs exist, if not initialize with empty array
  if (!localStorage.getItem(STORAGE_KEYS.CONTENT_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.CONTENT_LOGS, JSON.stringify([]));
  }
};

/**
 * Subscriber CRUD operations
 */

// Get all subscribers
export const getAllSubscribers = () => {
  try {
    const subscribers = localStorage.getItem(STORAGE_KEYS.SUBSCRIBERS);
    return subscribers ? JSON.parse(subscribers) : [];
  } catch (error) {
    console.error('Error getting subscribers from localStorage:', error);
    return [];
  }
};

// Get subscriber by ID
export const getSubscriberById = (id) => {
  try {
    const subscribers = getAllSubscribers();
    return subscribers.find(subscriber => subscriber.id === id) || null;
  } catch (error) {
    console.error(`Error getting subscriber ${id} from localStorage:`, error);
    return null;
  }
};

// Create a new subscriber
export const createSubscriber = (subscriberData) => {
  try {
    const subscribers = getAllSubscribers();
    
    // Generate ID if not provided
    const newSubscriber = {
      ...subscriberData,
      id: subscriberData.id || generateId(),
      created_at: new Date().toISOString()
    };
    
    // Add to array
    subscribers.push(newSubscriber);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify(subscribers));
    
    return newSubscriber;
  } catch (error) {
    console.error('Error creating subscriber in localStorage:', error);
    throw error;
  }
};

// Update a subscriber
export const updateSubscriber = (id, subscriberData) => {
  try {
    const subscribers = getAllSubscribers();
    const index = subscribers.findIndex(subscriber => subscriber.id === id);
    
    if (index === -1) {
      throw new Error(`Subscriber with ID ${id} not found`);
    }
    
    // Update subscriber
    subscribers[index] = {
      ...subscribers[index],
      ...subscriberData,
      updated_at: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify(subscribers));
    
    return subscribers[index];
  } catch (error) {
    console.error(`Error updating subscriber ${id} in localStorage:`, error);
    throw error;
  }
};

// Delete a subscriber
export const deleteSubscriber = (id) => {
  try {
    const subscribers = getAllSubscribers();
    const filteredSubscribers = subscribers.filter(subscriber => subscriber.id !== id);
    
    // Check if any subscriber was removed
    if (filteredSubscribers.length === subscribers.length) {
      throw new Error(`Subscriber with ID ${id} not found`);
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.SUBSCRIBERS, JSON.stringify(filteredSubscribers));
    
    return true;
  } catch (error) {
    console.error(`Error deleting subscriber ${id} from localStorage:`, error);
    throw error;
  }
};

/**
 * Content Log CRUD operations
 */

// Get all content logs
export const getAllContentLogs = (options = {}) => {
  try {
    const logs = localStorage.getItem(STORAGE_KEYS.CONTENT_LOGS);
    let contentLogs = logs ? JSON.parse(logs) : [];
    
    // Filter by subscriber ID if provided
    if (options.subscriberId) {
      contentLogs = contentLogs.filter(log => log.subscriber_id === options.subscriberId);
    }
    
    // Sort by date (newest first)
    contentLogs.sort((a, b) => new Date(b.generated_date) - new Date(a.generated_date));
    
    // Limit results if specified
    if (options.limit && typeof options.limit === 'number') {
      contentLogs = contentLogs.slice(0, options.limit);
    }
    
    return contentLogs;
  } catch (error) {
    console.error('Error getting content logs from localStorage:', error);
    return [];
  }
};

// Get content log by ID
export const getContentLogById = (id) => {
  try {
    const logs = getAllContentLogs();
    return logs.find(log => log.id === id) || null;
  } catch (error) {
    console.error(`Error getting content log ${id} from localStorage:`, error);
    return null;
  }
};

// Get latest content log for a subscriber
export const getLatestContentForSubscriber = (subscriberId) => {
  try {
    const logs = getAllContentLogs({ subscriberId });
    return logs.length > 0 ? logs[0] : null;
  } catch (error) {
    console.error(`Error getting latest content for subscriber ${subscriberId} from localStorage:`, error);
    return null;
  }
};

// Get content logs by date
export const getContentLogsByDate = (date) => {
  try {
    const logs = getAllContentLogs();
    return logs.filter(log => log.generated_date.startsWith(date));
  } catch (error) {
    console.error(`Error getting content logs for date ${date} from localStorage:`, error);
    return [];
  }
};

// Create a new content log
export const createContentLog = (contentLogData) => {
  try {
    const logs = getAllContentLogs();
    
    // Generate ID if not provided
    const newLog = {
      ...contentLogData,
      id: contentLogData.id || generateId(),
      created_at: new Date().toISOString()
    };
    
    // Add to array
    logs.push(newLog);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CONTENT_LOGS, JSON.stringify(logs));
    
    return newLog;
  } catch (error) {
    console.error('Error creating content log in localStorage:', error);
    throw error;
  }
};

// Delete a content log
export const deleteContentLog = (id) => {
  try {
    const logs = getAllContentLogs();
    const filteredLogs = logs.filter(log => log.id !== id);
    
    // Check if any log was removed
    if (filteredLogs.length === logs.length) {
      throw new Error(`Content log with ID ${id} not found`);
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CONTENT_LOGS, JSON.stringify(filteredLogs));
    
    return true;
  } catch (error) {
    console.error(`Error deleting content log ${id} from localStorage:`, error);
    throw error;
  }
};