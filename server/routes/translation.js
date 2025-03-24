/**
 * Translation API Proxy
 * 
 * This file provides a secure proxy for LLM translation services.
 * It keeps the API keys on the server side, preventing them from 
 * being exposed in client-side code.
 */

const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// Get API key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/**
 * Validate request contents
 */
const validateRequest = (req, res, next) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text must be provided and must be a string' });
  }

  if (!sourceLang || !targetLang) {
    return res.status(400).json({ error: 'Source and target languages must be specified' });
  }

  next();
};

/**
 * Translate text using OpenAI API
 * POST /api/translate
 */
router.post('/', validateRequest, async (req, res) => {
  const { text, sourceLang, targetLang, context = {} } = req.body;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'API key is not configured on the server' });
  }

  try {
    // Prepare the prompt for the OpenAI API
    const systemPrompt = `You are a professional translator with expertise in music, live events, and venue descriptions. 
    Translate the following text from ${sourceLang} to ${targetLang}.
    Maintain all formatting, including special characters like emojis and link URLs.
    Preserve original names of venues and artists.
    Do not modify any URLs or numeric values.
    If the context is ${context.domain || 'general'}, pay special attention to domain-specific terminology.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.3, // Lower temperature for more consistent translations
      })
    });

    const result = await response.json();

    if (result.error) {
      console.error('OpenAI API error:', result.error);
      return res.status(500).json({ error: 'Translation service error' });
    }

    // Return the translated text
    return res.json({
      translatedText: result.choices[0].message.content,
      sourceLang,
      targetLang
    });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get usage statistics 
 * GET /api/translate/stats
 */
router.get('/stats', async (req, res) => {
  // This would be implemented to track API usage
  res.json({
    callsToday: 0,
    callsThisMonth: 0,
    estimatedCosts: 0,
    status: 'operational'
  });
});

module.exports = router;