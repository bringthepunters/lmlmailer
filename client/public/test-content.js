// Test script to verify content generation
(async function() {
  try {
    console.log('Starting content generation test...');
    
    // Get the testGenerateContent function from the window object
    if (typeof window.testGenerateContent !== 'function') {
      console.error('testGenerateContent function not found on window object');
      return;
    }
    
    // Run the test
    console.log('Running testGenerateContent...');
    const result = await window.testGenerateContent();
    
    console.log('Test completed with result:', result);
    
    if (result.success) {
      console.log('✅ Content generation successful!');
      console.log('Content ID:', result.contentId);
      
      // Check if we created a new subscriber
      if (result.isNewSubscriber) {
        console.log('Created a new test subscriber:', result.subscriberName);
      } else {
        console.log('Used existing subscriber:', result.subscriberName);
      }
      
      // Navigate to content logs to view the generated content
      window.location.href = '/content';
    } else {
      console.error('❌ Content generation failed:', result.error);
    }
  } catch (error) {
    console.error('Error running test:', error);
  }
})();