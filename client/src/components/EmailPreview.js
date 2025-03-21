import React, { useState, useEffect } from 'react';
import { generateQRCode } from '../utils/contentGenerator';

// Regular expressions to extract information from content text
const GIG_REGEX = /▶ (\d+)\. (.+)[\s\S]*?🏢 (.+) \| ([\d.]+ km away)[\s\S]*?📍 (.+)[\s\S]*?🕒 (.+) \| 💲 (.+)[\s\S]*?(?:🎵 (.+)[\s\S]*?)?🗺️ (.+)[\s\S]*?QR: (.+)/g;
const DATE_REGEX = /=== MELBOURNE GIG GUIDE - (.+) ===/;
const DESCRIPTION_REGEX = /=== MELBOURNE GIG GUIDE - .+? ===\s+\n\s*(.+?)(?=\s*\n\s*---)/s;

/**
 * Email Preview Component
 * 
 * Renders a styled email preview with real QR codes from the content text.
 * 
 * @param {Object} props
 * @param {string} props.content - The raw content text from the content log
 * @param {string} props.subscriber - Subscriber info (optional)
 */
const EmailPreview = ({ content, subscriber = { name: 'Test User', email: 'test@example.com' } }) => {
  const [previewData, setPreviewData] = useState({
    date: '',
    description: '',
    gigs: []
  });

  useEffect(() => {
    if (content) {
      parseContentText(content);
    }
  }, [content]);

  /**
   * Parse the raw content text to extract information
   */
  const parseContentText = (text) => {
    // Extract date
    const dateMatch = text.match(DATE_REGEX);
    const date = dateMatch ? dateMatch[1] : new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Extract description
    const descriptionMatch = text.match(DESCRIPTION_REGEX);
    const description = descriptionMatch ? descriptionMatch[1].trim() : '';

    // Extract gig information
    const gigs = [];
    let match;
    
    // Reset lastIndex to start search from beginning
    GIG_REGEX.lastIndex = 0;
    
    while ((match = GIG_REGEX.exec(text)) !== null) {
      const [
        , // Full match
        number,
        name,
        venue,
        distance,
        address,
        time,
        price,
        genres = '',
        mapUrl,
        qrUrl
      ] = match;

      gigs.push({
        number,
        name,
        venue,
        distance,
        address,
        time,
        price,
        genres: genres.split(',').map(g => g.trim()).filter(g => g),
        mapUrl,
        // Generate a new QR code with our function to ensure it works
        qrCodeUrl: generateQRCode(mapUrl)
      });
    }

    setPreviewData({
      date,
      description,
      gigs
    });
  };

  if (!content) {
    return <div className="email-preview-empty">No content to preview</div>;
  }

  return (
    <div className="email-preview">
      <h2>MELBOURNE GIG GUIDE</h2>
      <div className="date">{previewData.date}</div>
      
      <div className="description">{previewData.description}</div>
      
      <ul className="gig-list">
        {previewData.gigs.map((gig, index) => (
          <li key={index} className="gig-item">
            <div className="gig-header">
              <div className="gig-title">{gig.number}. {gig.name}</div>
            </div>
            
            <div className="gig-venue">
              {gig.venue} <span style={{ opacity: 0.7, fontWeight: 400, marginLeft: '5px' }}>{gig.distance}</span>
            </div>
            
            <div className="gig-address">{gig.address}</div>
            
            <div className="gig-details">
              <div className="gig-time">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg> 
                {gig.time}
              </div>
              
              <div className="gig-price">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg> 
                {gig.price}
              </div>
            </div>
            
            {gig.genres.length > 0 && (
              <div className="gig-genres">
                {gig.genres.map((genre, i) => (
                  <span key={i} className="genre-tag">{genre}</span>
                ))}
              </div>
            )}
            
            <div className="gig-map">
              <a href={gig.mapUrl} className="map-link" target="_blank" rel="noopener noreferrer">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg> 
                View on Map
              </a>
              
              <div className="qr-container">
                <img 
                  src={gig.qrCodeUrl} 
                  alt="QR Code for venue location" 
                  className="qr-code"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      
      <div className="guide-footer">
        <div className="footer-title">HOW TO USE</div>
        <ul className="footer-list">
          <li>View on mobile to scan QR codes directly from screen</li>
          <li>QR codes link to venue locations on Google Maps</li>
          <li>Share this guide with friends!</li>
        </ul>
        
        <div className="footer-credit">
          This information was sent to {subscriber.name} at {subscriber.email}. 
          Melbourne Gig Guide - Supporting local music and venues.
        </div>
      </div>

      <style jsx>{`
        .email-preview {
          background-color: white;
          padding: 30px;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
          margin-top: 20px;
          font-family: 'Poppins', sans-serif;
          max-height: 600px;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        
        .email-preview h2 {
          color: #f44336;
          font-size: 24px;
          margin-bottom: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        
        .email-preview .date {
          color: #666;
          font-size: 16px;
          margin-bottom: 20px;
          font-weight: 300;
        }
        
        .email-preview .description {
          margin-bottom: 25px;
          font-size: 16px;
          line-height: 1.6;
        }
        
        .email-preview .gig-list {
          list-style: none;
          padding: 0;
        }
        
        .email-preview .gig-item {
          background-color: #f9f9f9;
          border-radius: 10px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        
        .email-preview .gig-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          align-items: center;
        }
        
        .email-preview .gig-title {
          font-weight: 600;
          font-size: 18px;
          color: #333;
        }
        
        .email-preview .gig-venue {
          font-weight: 500;
          color: #555;
          margin-bottom: 5px;
        }
        
        .email-preview .gig-address {
          color: #666;
          margin-bottom: 5px;
          font-size: 14px;
        }
        
        .email-preview .gig-details {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
        }
        
        .email-preview .gig-time,
        .email-preview .gig-price {
          display: flex;
          align-items: center;
          color: #555;
          font-size: 14px;
        }
        
        .email-preview .gig-time svg,
        .email-preview .gig-price svg {
          margin-right: 5px;
        }
        
        .email-preview .gig-genres {
          margin: 10px 0;
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        
        .email-preview .genre-tag {
          background-color: #e3f2fd;
          color: #1976d2;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .email-preview .gig-map {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }
        
        .email-preview .qr-container {
          width: 100px;
          height: 100px;
          overflow: hidden;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          background: white;
        }
        
        .email-preview .qr-code {
          width: 100%;
          height: 100%;
        }
        
        .email-preview .map-link {
          color: #1976d2;
          text-decoration: none;
          font-size: 14px;
          display: flex;
          align-items: center;
        }
        
        .email-preview .map-link svg {
          margin-right: 5px;
        }
        
        .email-preview .guide-footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          color: #777;
          font-size: 14px;
        }
        
        .email-preview .footer-title {
          font-weight: 600;
          margin-bottom: 10px;
          color: #555;
        }
        
        .email-preview .footer-list {
          margin-left: 20px;
          margin-bottom: 20px;
        }
        
        .email-preview .footer-credit {
          font-size: 12px;
          color: #999;
          text-align: center;
          margin-top: 20px;
        }
        
        .email-preview-empty {
          padding: 20px;
          text-align: center;
          color: #999;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default EmailPreview;