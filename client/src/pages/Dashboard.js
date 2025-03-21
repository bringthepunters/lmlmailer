import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSubscribers, getAllContentLogs, initializeStorage } from '../utils/localStorage';
import { generateContentForSubscriber } from '../utils/contentGenerator';
import testGenerateContent from '../utils/testContentGeneration';

function Dashboard() {
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    activeSubscribers: 0,
    todaySubscribers: 0,
    totalContentLogs: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscribers, setSubscribers] = useState([]);

  useEffect(() => {
    // Initialize localStorage if needed
    initializeStorage();
    
    const fetchDashboardData = () => {
      try {
        setLoading(true);
        
        // Get subscribers from localStorage
        const subscribers = getAllSubscribers();
        setSubscribers(subscribers);
        
        // Get content logs from localStorage (limited to 100 most recent)
        const contentLogs = getAllContentLogs({ limit: 100 });
        
        // Get current day
        const currentDay = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
        
        // Calculate stats
        const activeSubscribers = subscribers.filter(sub => sub.active === 1);
        const todaySubscribers = subscribers.filter(sub =>
          sub.active === 1 && sub.days.includes(currentDay)
        );
        
        setStats({
          totalSubscribers: subscribers.length,
          activeSubscribers: activeSubscribers.length,
          todaySubscribers: todaySubscribers.length,
          totalContentLogs: contentLogs.length
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Function to generate content for all active subscribers (simplified for English only)
  const handleGenerateContent = async () => {
    try {
      setLoading(true);
      
      // Get active subscribers
      const activeSubscribers = subscribers.filter(sub => sub.active === 1);
      
      if (activeSubscribers.length === 0) {
        alert('No active subscribers found. Please add a subscriber first.');
        setLoading(false);
        return;
      }
      
      // Get today's date
      const date = new Date().toISOString().split('T')[0];
      
      // Track results
      let successCount = 0;
      let failedCount = 0;
      
      // Generate content for each active subscriber
      for (const subscriber of activeSubscribers) {
        try {
          // Force English only by ensuring the subscriber has 'en' in languages
          const subscriberWithEnglish = {
            ...subscriber,
            languages: ['en']
          };
          
          await generateContentForSubscriber(subscriberWithEnglish, date);
          successCount++;
        } catch (error) {
          console.error(`Error generating content for ${subscriber.name}:`, error);
          failedCount++;
        }
      }
      
      // Refresh data after generation
      setLoading(false);
      
      // Show success message
      alert(`Generated content for ${successCount} subscribers (${failedCount} failed)`);
      
      // Refresh the page to update stats
      window.location.reload();
    } catch (err) {
      console.error('Error generating content:', err);
      setError('Failed to generate content. Please try again later.');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <button 
          className="btn"
          onClick={handleGenerateContent}
        >
          Generate Today's Content
        </button>
      </div>
      
      <div className="stats-container">
        <div className="stat-card">
          <h3>Total Subscribers</h3>
          <div className="stat-value">{stats.totalSubscribers}</div>
          <Link to="/subscribers" className="stat-link">View all subscribers</Link>
        </div>
        
        <div className="stat-card">
          <h3>Active Subscribers</h3>
          <div className="stat-value">{stats.activeSubscribers}</div>
          <div className="stat-detail">
            {stats.activeSubscribers} / {stats.totalSubscribers} subscribers active
          </div>
        </div>
        
        <div className="stat-card">
          <h3>English Content</h3>
          <div className="stat-value">{stats.activeSubscribers}</div>
          <div className="stat-detail">
            subscribers will receive English content
          </div>
        </div>
        
        <div className="stat-card">
          <h3>Content Generated</h3>
          <div className="stat-value">{stats.totalContentLogs}</div>
          <Link to="/content" className="stat-link">View content logs</Link>
        </div>
      </div>
      
      <div className="dashboard-actions">
        <div className="action-card">
          <h3>Quick Actions</h3>
          <div className="action-links">
            <Link to="/subscribers/new" className="action-link">
              Add New Subscriber
            </Link>
            <button
              onClick={handleGenerateContent}
              className="action-link"
            >
              Generate Today's Content
            </button>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const result = await testGenerateContent();
                  setLoading(false);
                  if (result.success) {
                    alert('Test content generation successful! Check Content Logs to view the generated content.');
                    window.location.reload();
                  } else {
                    alert(`Test failed: ${result.error}`);
                  }
                } catch (err) {
                  console.error('Error in test content generation:', err);
                  setLoading(false);
                  alert(`Error: ${err.message}`);
                }
              }}
              className="action-link"
              style={{ backgroundColor: '#e8f5e9', color: '#2e7d32' }}
            >
              Debug: Generate for First Subscriber
            </button>
            <Link to="/content" className="action-link">
              View Content Logs
            </Link>
          </div>
        </div>
        
        <div className="action-card">
          <h3>Help & Documentation</h3>
          <div className="action-links">
            <div className="help-item">
              <h4>Current Status</h4>
              <p>Stage 1 (Admin Interface + Content Generation)</p>
            </div>
            <div className="help-item">
              <h4>LML API</h4>
              <p>Connected to api.lml.live</p>
              <a
                href="https://api.lml.live/gigs/query?location=melbourne&date_from=2024-07-01&date_to=2024-07-19"
                target="_blank"
                rel="noreferrer"
                className="help-link"
              >
                Test API Connection
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background-color: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
        }
        
        .stat-card h3 {
          font-size: 1rem;
          font-weight: 500;
          color: #757575;
          margin-bottom: 0.5rem;
        }
        
        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #333;
          margin-bottom: 0.5rem;
        }
        
        .stat-detail {
          font-size: 0.875rem;
          color: #757575;
          margin-top: auto;
        }
        
        .stat-link {
          margin-top: auto;
          color: #f44336;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .dashboard-actions {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }
        
        .action-card {
          background-color: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .action-card h3 {
          font-size: 1.25rem;
          font-weight: 500;
          color: #333;
          margin-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 0.5rem;
        }
        
        .action-links {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .action-link {
          display: block;
          padding: 0.75rem;
          background-color: #f5f5f5;
          border-radius: 4px;
          text-decoration: none;
          color: #333;
          font-weight: 500;
          transition: background-color 0.2s ease;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 1rem;
        }
        
        .action-link:hover {
          background-color: #e0e0e0;
        }
        
        .help-item {
          margin-bottom: 1rem;
        }
        
        .help-item h4 {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .help-item p {
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }
        
        .help-link {
          display: inline-block;
          color: #f44336;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
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

export default Dashboard;
