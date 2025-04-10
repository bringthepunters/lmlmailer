import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getSubscriberById,
  createSubscriber,
  updateSubscriber
} from '../utils/localStorage';

// Supported languages
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', description: 'As the primary language spoken in Melbourne, English is essential for the majority of users.' },
  { code: 'ja', name: 'Japanese', description: 'Support for Japanese speakers.' },
  { code: 'zh-CN', name: 'Simplified Chinese (Mandarin)', description: 'Given the significant number of Mandarin-speaking visitors, incorporating Simplified Chinese characters will enhance accessibility.' },
  { code: 'zh-TW', name: 'Traditional Chinese (Cantonese)', description: 'With a notable Cantonese-speaking population, supporting Traditional Chinese characters is advisable.' },
  { code: 'ar', name: 'Arabic', description: 'Arabic is among the top languages spoken in Australia, making it beneficial to include.' },
  { code: 'vi', name: 'Vietnamese', description: 'Given the substantial Vietnamese-speaking community, supporting this language is recommended.' },
  { code: 'es', name: 'Spanish', description: 'Spanish ranks among the top languages spoken in Australia, making it beneficial to include.' },
  { code: 'de', name: 'German', description: 'Support for German-speaking visitors.' },
  { code: 'hi', name: 'Hindi', description: 'With a growing number of Hindi speakers, incorporating this language will cater to a broader audience.' },
  { code: 'ko', name: 'Korean', description: 'Supporting Korean will accommodate visitors from Korea, enhancing their user experience.' }
];

function SubscriberForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    latitude: -37.8136, // Default: Melbourne CBD
    longitude: 144.9631,
    languages: ['en'], // Default: English
    active: true
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  
  useEffect(() => {
    // If in edit mode, fetch the subscriber data
    if (isEditMode) {
      fetchSubscriber();
    }
  }, [id]);
  
  const fetchSubscriber = () => {
    try {
      const subscriber = getSubscriberById(id);
      
      if (!subscriber) {
        throw new Error('Subscriber not found');
      }
      
      // Format the data for the form
      setFormData({
        name: subscriber.name,
        email: subscriber.email,
        latitude: subscriber.latitude,
        longitude: subscriber.longitude,
        languages: subscriber.languages,
        active: subscriber.active === 1
      });
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching subscriber:', err);
      setError('Failed to load subscriber data. Please try again later.');
      setLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  const handleLanguageChange = (e) => {
    const { value, checked } = e.target;
    
    // Don't allow unchecking English
    if (value === 'en' && !checked) {
      return;
    }
    
    if (checked) {
      // Add language if checked
      setFormData({
        ...formData,
        languages: [...formData.languages, value]
      });
    } else {
      // Remove language if unchecked, but ensure at least one remains
      if (formData.languages.length > 1) {
        setFormData({
          ...formData,
          languages: formData.languages.filter(lang => lang !== value)
        });
      }
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    try {
      const payload = {
        ...formData,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        // Ensure days is set to a default
        days: ['monday'],
        // Convert boolean active to 1/0 for consistency with server implementation
        active: formData.active ? 1 : 0
      };
      
      if (isEditMode) {
        // Update existing subscriber
        updateSubscriber(id, payload);
      } else {
        // Create new subscriber
        createSubscriber(payload);
      }
      
      // Redirect to subscribers list
      navigate('/subscribers');
    } catch (err) {
      console.error('Error submitting subscriber form:', err);
      
      // Set error message
      setSubmitError('Failed to save subscriber. Please try again.');
    }
  };
  
  if (loading) {
    return <div className="loading">Loading subscriber data...</div>;
  }
  
  if (error) {
    return (
      <div>
        <div className="error-message">{error}</div>
        <Link to="/subscribers" className="btn btn-secondary">Back to Subscribers</Link>
      </div>
    );
  }
  
  return (
    <div className="subscriber-form">
      <div className="page-header">
        <h2 className="page-title">
          {isEditMode ? 'Edit Subscriber' : 'Add New Subscriber'}
        </h2>
      </div>
      
      {submitError && (
        <div className="error-message">{submitError}</div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <h3 className="section-title">Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="name" className="form-label">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Status</label>
            <div className="form-check">
              <input
                type="checkbox"
                id="active"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
              <label htmlFor="active">Active (will receive emails)</label>
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <h3 className="section-title">Location</h3>
          <p className="section-description">
            Enter the latitude and longitude to determine nearby venues. 
            <a 
              href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="map-link"
            >
              View on map
            </a>
          </p>
          
          <div className="form-row">
            <div className="form-group form-group-half">
              <label htmlFor="latitude" className="form-label">Latitude</label>
              <input
                type="number"
                id="latitude"
                name="latitude"
                className="form-control"
                value={formData.latitude}
                onChange={handleChange}
                step="0.000001"
                required
              />
            </div>
            
            <div className="form-group form-group-half">
              <label htmlFor="longitude" className="form-label">Longitude</label>
              <input
                type="number"
                id="longitude"
                name="longitude"
                className="form-control"
                value={formData.longitude}
                onChange={handleChange}
                step="0.000001"
                required
              />
            </div>
          </div>
        </div>
        
        <div className="form-section">
          <h3 className="section-title">Languages</h3>
          <p className="section-description">
            Select languages for the email content. At least one language is required.
          </p>
          
          <div className="language-list">
            {SUPPORTED_LANGUAGES.map(language => (
              <div className="language-item" key={language.code}>
                <div className="language-checkbox">
                  <input
                    type="checkbox"
                    id={`lang-${language.code}`}
                    value={language.code}
                    checked={formData.languages.includes(language.code)}
                    onChange={handleLanguageChange}
                    disabled={language.code === 'en'} // Always disable English to keep it selected
                  />
                  <label htmlFor={`lang-${language.code}`}>{language.name}</label>
                </div>
                {language.description && (
                  <div className="language-description">{language.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn">
            {isEditMode ? 'Update Subscriber' : 'Create Subscriber'}
          </button>
          <Link to="/subscribers" className="btn btn-secondary">Cancel</Link>
        </div>
      </form>
      
      <style jsx>{`
        .form-section {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
        }
        
        .section-title {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
          color: #333;
        }
        
        .section-description {
          margin-bottom: 1rem;
          color: #666;
          font-size: 0.875rem;
        }
        
        .form-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .form-group-half {
          flex: 1;
        }
        
        .language-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        
        .language-item {
          border: 1px solid #eaeaea;
          border-radius: 8px;
          padding: 1rem;
          background-color: #f9f9f9;
          transition: all 0.2s ease;
        }
        
        .language-item:hover {
          border-color: #d0d0d0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .language-checkbox {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .language-checkbox input {
          margin-right: 0.5rem;
        }
        
        .language-checkbox label {
          font-weight: 600;
          font-size: 1rem;
          color: #333;
        }
        
        .language-description {
          font-size: 0.85rem;
          color: #666;
          margin-top: 0.25rem;
          margin-left: 1.5rem;
          line-height: 1.4;
        }
        
        .map-link {
          margin-left: 0.5rem;
          color: #f44336;
          text-decoration: none;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
          color: #757575;
        }
      `}</style>
    </div>
  );
}

export default SubscriberForm;
