import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllSubscribers, getAllContentLogs, initializeStorage, createSubscriber } from '../utils/localStorage';
import { generateContentForSubscriber } from '../utils/contentGenerator';
import testGenerateContent from '../utils/testContentGeneration';
import EmailPreview from '../components/EmailPreview';

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
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [previewSubscriber, setPreviewSubscriber] = useState(null);

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
            <Link to="/subscribers/new" className="action-link action-add">
              <span className="action-icon">➕</span> Add New Subscriber
            </Link>
            <button
              onClick={handleGenerateContent}
              className="action-link action-generate"
            >
              <span className="action-icon">📧</span> Generate Today's Content
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
              className="action-link action-test"
            >
              <span className="action-icon">🔍</span> Generate for First Subscriber
            </button>
            <button
              onClick={() => {
                try {
                  // Create a test subscriber
                  const testSubscriber = {
                    name: 'Test Subscriber',
                    email: 'test@example.com',
                    latitude: -37.8136, // Melbourne CBD
                    longitude: 144.9631,
                    languages: ['en'],
                    days: ['monday'],
                    active: 1
                  };
                  
                  createSubscriber(testSubscriber);
                  alert('Test subscriber created successfully!');
                  window.location.reload();
                } catch (err) {
                  console.error('Error creating test subscriber:', err);
                  alert(`Error: ${err.message}`);
                }
              }}
              className="action-link action-add-test"
            >
              <span className="action-icon">👤</span> Add Test Subscriber
            </button>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  
                  // Get or create a test subscriber
                  let testSubscriber;
                  const allSubscribers = getAllSubscribers();
                  
                  if (allSubscribers.length > 0) {
                    testSubscriber = allSubscribers[0];
                  } else {
                    testSubscriber = {
                      id: 'preview-subscriber',
                      name: 'Test Subscriber',
                      email: 'test@example.com',
                      latitude: -37.8136, // Melbourne CBD
                      longitude: 144.9631,
                      languages: ['en'],
                      days: ['monday'],
                      active: 1
                    };
                  }
                  
                  // Generate content for preview without saving
                  const date = new Date().toISOString().split('T')[0];
                  
                  // Access the generateContentForSubscriber function to get content
                  const contentLog = await generateContentForSubscriber(testSubscriber, date);
                  
                  // Set the preview states
                  setPreviewContent(contentLog.content);
                  setPreviewSubscriber(testSubscriber);
                  setShowPreview(true);
                  
                  setLoading(false);
                } catch (err) {
                  console.error('Error generating preview:', err);
                  setLoading(false);
                  alert(`Error: ${err.message}`);
                }
              }}
              className="action-link action-preview"
            >
              <span className="action-icon">👁️</span> Preview Email with QR Codes
            </button>
            <Link to="/content" className="action-link action-view">
              <span className="action-icon">📋</span> View Content Logs
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
      
      {/* Email Preview Modal */}
      {showPreview && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Email Preview with QR Codes</h3>
              <button
                className="modal-close"
                onClick={() => setShowPreview(false)}
              >×</button>
            </div>
            <div className="modal-body">
              <EmailPreview
                content={previewContent}
                subscriber={previewSubscriber}
              />
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .stats-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background-color: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          border-top: 4px solid #f44336;
        }
        
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
        }
        
        .stat-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #555;
          margin-bottom: 0.5rem;
        }
        
        .stat-value {
          font-size: 2.75rem;
          font-weight: 700;
          color: #222;
          margin-bottom: 0.5rem;
        }
        
        .stat-detail {
          font-size: 0.875rem;
          color: #666;
          margin-top: auto;
        }
        
        .stat-link {
          margin-top: auto;
          color: #f44336;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          display: inline-block;
          padding: 0.5rem 0;
          border-top: 1px solid #f0f0f0;
          width: 100%;
          transition: color 0.2s ease;
        }
        
        .stat-link:hover {
          color: #d32f2f;
        }
        
        .dashboard-actions {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }
        
        .action-card {
          background-color: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        
        .action-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #222;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid #eaeaea;
          padding-bottom: 0.75rem;
        }
        
        .action-links {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .action-link {
          display: flex;
          align-items: center;
          padding: 0.9rem 1rem;
          border-radius: 8px;
          text-decoration: none;
          color: #333;
          font-weight: 500;
          transition: all 0.2s ease;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 1rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .action-icon {
          margin-right: 10px;
          font-size: 1.2rem;
        }
        
        .action-add {
          background-color: #e3f2fd;
          color: #0d47a1;
        }
        
        .action-add:hover {
          background-color: #bbdefb;
        }
        
        .action-generate {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .action-generate:hover {
          background-color: #c8e6c9;
        }
        
        .action-test {
          background-color: #fff3e0;
          color: #e65100;
        }
        
        .action-test:hover {
          background-color: #ffe0b2;
        }
        
        .action-add-test {
          background-color: #f3e5f5;
          color: #6a1b9a;
        }
        
        .action-add-test:hover {
          background-color: #e1bee7;
        }
        
        .action-preview {
          background-color: #e0f7fa;
          color: #006064;
        }
        
        .action-preview:hover {
          background-color: #b2ebf2;
        }
        
        .action-view {
          background-color: #e8eaf6;
          color: #283593;
        }
        
        .action-view:hover {
          background-color: #c5cae9;
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
        
        /* Modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-container {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .modal-header {
          padding: 16px 20px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          color: #333;
          font-weight: 600;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          transition: color 0.2s;
        }
        
        .modal-close:hover {
          color: #f44336;
        }
        
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
          max-height: 70vh;
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
