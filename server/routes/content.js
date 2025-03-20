/**
 * Content routes
 * 
 * API endpoints for managing content logs and 
 * generating content for subscribers.
 */

const express = require('express');
const router = express.Router();
const contentModel = require('../models/content');
const subscriberModel = require('../models/subscriber');
const contentGenerator = require('../services/contentGenerator');

/**
 * @route   GET /api/content/logs
 * @desc    Get all content logs
 * @access  Public
 */
router.get('/logs', async (req, res) => {
  try {
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : null,
      subscriberId: req.query.subscriberId || null
    };
    
    const logs = await contentModel.getAllContentLogs(options);
    res.json(logs);
  } catch (err) {
    console.error('Error fetching content logs:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/content/logs/:id
 * @desc    Get content log by ID
 * @access  Public
 */
router.get('/logs/:id', async (req, res) => {
  try {
    const log = await contentModel.getContentLogById(req.params.id);
    
    if (!log) {
      return res.status(404).json({ message: 'Content log not found' });
    }
    
    res.json(log);
  } catch (err) {
    console.error(`Error fetching content log ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/content/subscriber/:subscriberId/latest
 * @desc    Get latest content for a subscriber
 * @access  Public
 */
router.get('/subscriber/:subscriberId/latest', async (req, res) => {
  try {
    // Verify subscriber exists
    const subscriber = await subscriberModel.getSubscriberById(req.params.subscriberId);
    
    if (!subscriber) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    const log = await contentModel.getLatestContentForSubscriber(req.params.subscriberId);
    
    if (!log) {
      return res.status(404).json({ message: 'No content found for this subscriber' });
    }
    
    res.json(log);
  } catch (err) {
    console.error(`Error fetching latest content for subscriber ${req.params.subscriberId}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/content/date/:date
 * @desc    Get content logs for a specific date
 * @access  Public
 */
router.get('/date/:date', async (req, res) => {
  try {
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(req.params.date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    const logs = await contentModel.getContentLogsByDate(req.params.date);
    res.json(logs);
  } catch (err) {
    console.error(`Error fetching content logs for date ${req.params.date}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   POST /api/content/generate/:subscriberId
 * @desc    Generate content for a subscriber
 * @access  Public
 */
router.post('/generate/:subscriberId', async (req, res) => {
  try {
    // Verify subscriber exists
    const subscriber = await subscriberModel.getSubscriberById(req.params.subscriberId);
    
    if (!subscriber) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    // Check if subscriber is active
    if (subscriber.active !== 1) {
      return res.status(400).json({ message: 'Cannot generate content for inactive subscriber' });
    }
    
    // Get today's date or use provided date
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Generate content
    const content = await contentGenerator.generateContentForSubscriber(subscriber, date);
    
    res.json(content);
  } catch (err) {
    console.error(`Error generating content for subscriber ${req.params.subscriberId}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   POST /api/content/generate/all
 * @desc    Generate content for all active subscribers
 * @access  Public
 */
router.post('/generate/all', async (req, res) => {
  try {
    // Get all active subscribers
    const subscribers = await subscriberModel.getAllSubscribers();
    const activeSubscribers = subscribers.filter(s => s.active === 1);
    
    // Get today's date or use provided date
    const date = req.query.date || new Date().toISOString().split('T')[0];
    
    // Get current day of week
    const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    
    // Filter subscribers who should receive content today
    const todaySubscribers = activeSubscribers.filter(s => s.days.includes(currentDay));
    
    if (todaySubscribers.length === 0) {
      return res.json({ message: 'No subscribers scheduled for today', generated: 0 });
    }
    
    // Track results
    const results = {
      success: 0,
      failed: 0,
      details: []
    };
    
    // Generate content for each subscriber
    for (const subscriber of todaySubscribers) {
      try {
        const content = await contentGenerator.generateContentForSubscriber(subscriber, date);
        results.success++;
        results.details.push({
          subscriberId: subscriber.id,
          name: subscriber.name,
          success: true,
          contentId: content.id
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          subscriberId: subscriber.id,
          name: subscriber.name,
          success: false,
          error: error.message
        });
      }
    }
    
    res.json({
      message: `Generated content for ${results.success} subscribers (${results.failed} failed)`,
      results
    });
  } catch (err) {
    console.error('Error generating content for all subscribers:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   DELETE /api/content/logs/:id
 * @desc    Delete a content log
 * @access  Public
 */
router.delete('/logs/:id', async (req, res) => {
  try {
    const success = await contentModel.deleteContentLog(req.params.id);
    
    if (!success) {
      return res.status(404).json({ message: 'Content log not found' });
    }
    
    res.json({ message: 'Content log deleted successfully' });
  } catch (err) {
    console.error(`Error deleting content log ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
