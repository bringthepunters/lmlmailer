/**
 * Test Content Generation
 * 
 * This file provides a simple way to test content generation
 * for a single subscriber without going through the UI.
 */

import { generateContentForSubscriber, getMockGigs, generateContent } from './contentGenerator';
import { getAllSubscribers, getAllContentLogs } from './localStorage';

/**
 * Generate content for the first active subscriber or create a test subscriber if none exists
 * @returns {Promise<Object>} Result of content generation
 */
export const testGenerateContent = async () => {
  try {
    console.log('Starting test content generation...');
    
    // Get all subscribers
    let subscribers = getAllSubscribers();
    console.log(`Found ${subscribers.length} total subscribers`);
    
    let subscriber;
    let isNewSubscriber = false;
    
    // If no subscribers exist, create a test subscriber
    if (subscribers.length === 0) {
      console.log('No subscribers found. Creating a test subscriber...');
      
      // Create a test subscriber (Melbourne CBD location)
      const testSubscriber = {
        name: 'Test User',
        email: 'test@example.com',
        latitude: -37.8136,
        longitude: 144.9631,
        languages: ['en'],
        days: ['monday', 'friday'],
        active: 1
      };
      
      // Import directly from localStorage to avoid circular dependency
      const { createSubscriber } = require('./localStorage');
      subscriber = createSubscriber(testSubscriber);
      isNewSubscriber = true;
      
      console.log('Created test subscriber:', subscriber.name);
    } else {
      // Get the first active subscriber
      const activeSubscribers = subscribers.filter(s => s.active === 1);
      console.log(`Found ${activeSubscribers.length} active subscribers`);
      
      if (activeSubscribers.length === 0) {
        console.log('No active subscribers found. Activating the first subscriber...');
        
        // Activate the first subscriber
        const { updateSubscriber } = require('./localStorage');
        subscriber = subscribers[0];
        subscriber = updateSubscriber(subscriber.id, { ...subscriber, active: 1 });
        
        console.log(`Activated subscriber: ${subscriber.name}`);
      } else {
        subscriber = activeSubscribers[0];
      }
    }
    
    console.log(`Using subscriber: ${subscriber.name} (${subscriber.email})`);
    console.log(`Location: ${subscriber.latitude}, ${subscriber.longitude}`);
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Generate content
    console.log(`Generating content for date: ${today}`);
    
    // Generate mock gigs directly for testing
    const mockGigs = getMockGigs(today);
    console.log(`Generated ${mockGigs.length} mock gigs for testing`);
    
    // First, try the direct content generation approach
    const directContent = generateContent(mockGigs, subscriber);
    console.log('Direct content generation successful!');
    console.log('Content preview (direct):');
    console.log(directContent.substring(0, 200) + '...');
    
    // Then, use the full subscriber content generation flow
    const result = await generateContentForSubscriber(subscriber, today);
    console.log('Full content generation successful!');
    console.log('Content ID:', result.id);
    
    // Get the content log
    const contentLogs = getAllContentLogs();
    const latestLog = contentLogs.find(log => log.id === result.id);
    
    if (latestLog) {
      console.log('Content preview (from log):');
      console.log(latestLog.content.substring(0, 200) + '...');
      
      // Check if QR codes are included
      if (latestLog.content.includes('QR Code:')) {
        console.log('✅ QR codes are included in the content');
      } else {
        console.log('❌ QR codes are missing from the content');
      }
    }
    
    return {
      success: true,
      contentId: result.id,
      isNewSubscriber,
      subscriberId: subscriber.id,
      subscriberName: subscriber.name
    };
  } catch (error) {
    console.error('Error in test content generation:', error);
    return { success: false, error: error.message };
  }
};

// Export a function to run the test from the browser console
window.testGenerateContent = testGenerateContent;

export default testGenerateContent;