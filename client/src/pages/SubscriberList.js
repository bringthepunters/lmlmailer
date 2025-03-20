import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getAllSubscribers,
  updateSubscriber,
  deleteSubscriber
} from '../utils/localStorage';
import { generateContentForSubscriber } from '../utils/contentGenerator';

function SubscriberList() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = () => {
    try {
      setLoading(true);
      const allSubscribers = getAllSubscribers();
      setSubscribers(allSubscribers);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching subscribers:', err);
      setError('Failed to load subscribers. Please try again later.');
      setLoading(false);
    }
  };

  const handleToggleActive = (subscriber) => {
    try {
      const newActiveStatus = subscriber.active === 1 ? 0 : 1;
      
      // Update in localStorage
      updateSubscriber(subscriber.id, {
        ...subscriber,
        active: newActiveStatus
      });
      
      // Update the local state
      setSubscribers(subscribers.map(sub =>
        sub.id === subscriber.id
          ? { ...sub, active: newActiveStatus }
          : sub
      ));
    } catch (err) {
      console.error('Error toggling subscriber active status:', err);
      setError('Failed to update subscriber status. Please try again later.');
    }
  };

  const handleDeleteSubscriber = (subscriberId) => {
    if (!window.confirm('Are you sure you want to delete this subscriber? This cannot be undone.')) {
      return;
    }
    
    try {
      // Delete from localStorage
      deleteSubscriber(subscriberId);
      
      // Remove from local state
      setSubscribers(subscribers.filter(sub => sub.id !== subscriberId));
    } catch (err) {
      console.error('Error deleting subscriber:', err);
      setError('Failed to delete subscriber. Please try again later.');
    }
  };

  const handleGenerateContent = async (subscriberId) => {
    try {
      setLoading(true);
      
      // Find the subscriber
      const subscriber = subscribers.find(sub => sub.id === subscriberId);
      if (!subscriber) {
        throw new Error('Subscriber not found');
      }
      
      // Generate content for this subscriber
      const today = new Date().toISOString().split('T')[0];
      await generateContentForSubscriber(subscriber, today);
      
      setLoading(false);
      alert('Content generated successfully');
    } catch (err) {
      console.error('Error generating content:', err);
      setError('Failed to generate content. Please try again later.');
      setLoading(false);
    }
  };

  const formatLanguages = (languages) => {
    const languageNames = {
      'en': 'English',
      'zh-CN': 'Chinese (S)',
      'zh-TW': 'Chinese (T)',
      'ar': 'Arabic',
      'vi': 'Vietnamese',
      'es': 'Spanish',
      'hi': 'Hindi',
      'ko': 'Korean',
      'ja': 'Japanese'
    };
    
    return languages.map(lang => languageNames[lang] || lang).join(', ');
  };

  const formatDays = (days) => {
    const capitalizedDays = days.map(day => 
      day.charAt(0).toUpperCase() + day.slice(1)
    );
    
    return capitalizedDays.join(', ');
  };

  if (loading) {
    return <div className="loading">Loading subscribers...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error-message">{error}</div>
        <button onClick={fetchSubscribers} className="btn">Try Again</button>
      </div>
    );
  }

  return (
    <div className="subscriber-list">
      <div className="page-header">
        <h2 className="page-title">Subscribers</h2>
        <Link to="/subscribers/new" className="btn">Add New Subscriber</Link>
      </div>
      
      {subscribers.length === 0 ? (
        <div className="empty-state">
          <p>No subscribers found. Click "Add New Subscriber" to create one.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Languages</th>
                <th>Schedule</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map(subscriber => (
                <tr key={subscriber.id}>
                  <td>{subscriber.name}</td>
                  <td>{subscriber.email}</td>
                  <td>{formatLanguages(subscriber.languages)}</td>
                  <td>{formatDays(subscriber.days)}</td>
                  <td>
                    <a 
                      href={`https://maps.google.com/?q=${subscriber.latitude},${subscriber.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      title="View on map"
                    >
                      {subscriber.latitude.toFixed(4)}, {subscriber.longitude.toFixed(4)}
                    </a>
                  </td>
                  <td>
                    <span className={`status ${subscriber.active === 1 ? 'status-active' : 'status-inactive'}`}>
                      {subscriber.active === 1 ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    <button 
                      onClick={() => handleToggleActive(subscriber)}
                      className="action-btn"
                      title={subscriber.active === 1 ? 'Deactivate' : 'Activate'}
                    >
                      {subscriber.active === 1 ? '🔴' : '🟢'}
                    </button>
                    <button
                      onClick={() => handleGenerateContent(subscriber.id)}
                      className="action-btn"
                      title="Generate Content"
                      disabled={subscriber.active !== 1}
                    >
                      ✉️
                    </button>
                    <Link 
                      to={`/subscribers/edit/${subscriber.id}`}
                      className="action-btn"
                      title="Edit"
                    >
                      ✏️
                    </Link>
                    <button
                      onClick={() => handleDeleteSubscriber(subscriber.id)}
                      className="action-btn"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <style jsx>{`
        .empty-state {
          text-align: center;
          padding: 2rem;
          background-color: #f5f5f5;
          border-radius: 8px;
          margin: 2rem 0;
        }
        
        .table-responsive {
          overflow-x: auto;
        }
        
        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0.25rem;
          margin: 0 0.25rem;
        }
        
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .loading {
          text-align: center;
          padding: 2rem;
          color: #757575;
        }
        
        .error-message {
          background-color: #ffebee;
          color: #c62828;
          padding: 1rem;
          border-radius: 4px;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}

export default SubscriberList;
