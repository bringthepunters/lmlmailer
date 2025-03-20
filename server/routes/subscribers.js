/**
 * Subscriber routes
 * 
 * API endpoints for managing subscribers including
 * creating, reading, updating, and deleting subscribers.
 */

const express = require('express');
const router = express.Router();
const subscriberModel = require('../models/subscriber');
const contentModel = require('../models/content');

/**
 * @route   GET /api/subscribers
 * @desc    Get all subscribers
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const subscribers = await subscriberModel.getAllSubscribers();
    res.json(subscribers);
  } catch (err) {
    console.error('Error fetching subscribers:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/subscribers/:id
 * @desc    Get subscriber by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const subscriber = await subscriberModel.getSubscriberById(req.params.id);
    
    if (!subscriber) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    res.json(subscriber);
  } catch (err) {
    console.error(`Error fetching subscriber ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   GET /api/subscribers/day/:day
 * @desc    Get subscribers by day
 * @access  Public
 */
router.get('/day/:day', async (req, res) => {
  try {
    const day = req.params.day.toLowerCase();
    const activeOnly = req.query.activeOnly !== 'false'; // Default to true
    
    // Validate day param
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    if (!validDays.includes(day)) {
      return res.status(400).json({ message: 'Invalid day parameter' });
    }
    
    const subscribers = await subscriberModel.getSubscribersByDay(day, activeOnly);
    res.json(subscribers);
  } catch (err) {
    console.error(`Error fetching subscribers for day ${req.params.day}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   POST /api/subscribers
 * @desc    Create a new subscriber
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const newSubscriber = await subscriberModel.createSubscriber(req.body);
    res.status(201).json(newSubscriber);
  } catch (err) {
    console.error('Error creating subscriber:', err);
    
    if (err.message === 'Missing required fields') {
      return res.status(400).json({ message: err.message });
    }
    
    // Handle SQLite constraint errors (e.g., duplicate email)
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   PUT /api/subscribers/:id
 * @desc    Update a subscriber
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const updatedSubscriber = await subscriberModel.updateSubscriber(req.params.id, req.body);
    res.json(updatedSubscriber);
  } catch (err) {
    console.error(`Error updating subscriber ${req.params.id}:`, err);
    
    if (err.message === 'Subscriber not found') {
      return res.status(404).json({ message: err.message });
    }
    
    // Handle SQLite constraint errors (e.g., duplicate email)
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Email already exists' });
    }
    
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   DELETE /api/subscribers/:id
 * @desc    Delete a subscriber
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    // Also delete associated content logs
    await contentModel.deleteContentLogsForSubscriber(req.params.id);
    
    // Then delete the subscriber
    const success = await subscriberModel.deleteSubscriber(req.params.id);
    
    if (!success) {
      return res.status(404).json({ message: 'Subscriber not found' });
    }
    
    res.json({ message: 'Subscriber deleted successfully' });
  } catch (err) {
    console.error(`Error deleting subscriber ${req.params.id}:`, err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * @route   PATCH /api/subscribers/:id/active
 * @desc    Toggle subscriber active status
 * @access  Public
 */
router.patch('/:id/active', async (req, res) => {
  try {
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'Active status must be a boolean' });
    }
    
    const updatedSubscriber = await subscriberModel.toggleSubscriberActive(req.params.id, active);
    res.json(updatedSubscriber);
  } catch (err) {
    console.error(`Error toggling active status for subscriber ${req.params.id}:`, err);
    
    if (err.message === 'Subscriber not found') {
      return res.status(404).json({ message: err.message });
    }
    
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
