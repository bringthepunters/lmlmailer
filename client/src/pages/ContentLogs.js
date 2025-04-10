import React, { useState, useEffect } from 'react';
import { getAllContentLogs, getAllSubscribers, deleteContentLog } from '../utils/localStorage';
import EmailPreview from '../components/EmailPreview';

function ContentLogs() {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [subscribers, setSubscribers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    try {
      setLoading(true);
      
      // Get content logs from localStorage (limited to 100 for performance)
      const contentLogs = getAllContentLogs({ limit: 100 });
      
      // Get all subscribers from localStorage
      const allSubscribers = getAllSubscribers();
      
      // Create a map of subscriber IDs to subscriber objects
      const subscribersMap = {};
      allSubscribers.forEach(subscriber => {
        subscribersMap[subscriber.id] = subscriber;
      });
      
      setLogs(contentLogs);
      setSubscribers(subscribersMap);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching content logs:', err);
      setError('Failed to load content logs. Please try again later.');
      setLoading(false);
    }
  };

  const handleViewContent = (log) => {
    setSelectedLog(log);
  };

  const handleDeleteLog = (logId) => {
    if (!window.confirm('Are you sure you want to delete this content log? This cannot be undone.')) {
      return;
    }
    
    try {
      // Delete from localStorage
      deleteContentLog(logId);
      
      // Remove from local state
      setLogs(logs.filter(log => log.id !== logId));
      
      // If the deleted log was selected, clear the selection
      if (selectedLog && selectedLog.id === logId) {
        setSelectedLog(null);
      }
    } catch (err) {
      console.error('Error deleting content log:', err);
      setError('Failed to delete content log. Please try again later.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading content logs...</div>;
  }

  if (error) {
    return (
      <div>
        <div className="error-message">{error}</div>
        <button onClick={fetchData} className="btn">Try Again</button>
      </div>
    );
  }

  return (
    <div className="content-logs">
      <div className="page-header">
        <h2 className="page-title">Content Logs</h2>
      </div>
      
      <div className="content-container">
        <div className="logs-list">
          <h3 className="panel-title">Generated Content History</h3>
          
          {logs.length === 0 ? (
            <div className="empty-state">
              <p>No content has been generated yet.</p>
            </div>
          ) : (
            <div className="logs-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Subscriber</th>
                    <th>Gigs</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr 
                      key={log.id} 
                      className={selectedLog && selectedLog.id === log.id ? 'selected' : ''}
                      onClick={() => handleViewContent(log)}
                    >
                      <td>{formatDate(log.generated_date)}</td>
                      <td>
                        {subscribers[log.subscriber_id] 
                          ? subscribers[log.subscriber_id].name 
                          : 'Unknown Subscriber'}
                      </td>
                      <td>{log.gig_ids.length} gigs</td>
                      <td className="actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewContent(log);
                          }}
                          className="action-btn"
                          title="View Content"
                        >
                          👁️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
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
        </div>
        
        <div className="content-preview">
          <h3 className="panel-title">
            {selectedLog
              ? `Content Preview - ${formatDate(selectedLog.generated_date)}`
              : 'Content Preview'}
          </h3>
          
          {selectedLog ? (
            <div className="content-panel">
              <div className="subscriber-info">
                {subscribers[selectedLog.subscriber_id] && (
                  <>
                    <strong>Subscriber:</strong> {subscribers[selectedLog.subscriber_id].name}<br />
                    <strong>Email:</strong> {subscribers[selectedLog.subscriber_id].email}<br />
                    <strong>Languages:</strong> {
                      subscribers[selectedLog.subscriber_id].languages.map(lang => {
                        const languageNames = {
                          'en': 'English',
                          'zh-CN': 'Simplified Chinese',
                          'zh-TW': 'Traditional Chinese',
                          'ar': 'Arabic',
                          'vi': 'Vietnamese',
                          'es': 'Spanish',
                          'hi': 'Hindi',
                          'ko': 'Korean',
                          'ja': 'Japanese'
                        };
                        return languageNames[lang] || lang;
                      }).join(', ')
                    }
                  </>
                )}
              </div>
              
              <div className="content-actions">
                <button
                  className="action-button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedLog.content);
                    alert('Content copied to clipboard!');
                  }}
                >
                  📋 Copy to Clipboard
                </button>
                <a
                  className="action-button"
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(selectedLog.content)}`}
                  download={`melbourne-gig-guide-${selectedLog.generated_date}.txt`}
                >
                  💾 Download as Text File
                </a>
              </div>
              
              <div className="view-tabs">
                <button
                  className={`tab-button ${!showEmailPreview ? 'active' : ''}`}
                  onClick={() => setShowEmailPreview(false)}
                >
                  Text View
                </button>
                <button
                  className={`tab-button ${showEmailPreview ? 'active' : ''}`}
                  onClick={() => setShowEmailPreview(true)}
                >
                  Email Preview
                </button>
              </div>
              
              {showEmailPreview ? (
                <div className="email-preview-container">
                  <EmailPreview
                    content={selectedLog.content}
                    subscriber={subscribers[selectedLog.subscriber_id]}
                  />
                </div>
              ) : (
                <div className="content-text">
                  <pre>{selectedLog.content}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <p>Select a content log to preview</p>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .content-container {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 1.5rem;
        }
        
        .logs-list, .content-preview {
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        
        .panel-title {
          font-size: 1.1rem;
          padding: 1rem;
          background-color: #f5f5f5;
          border-bottom: 1px solid #eaeaea;
          margin: 0;
        }
        
        .logs-table-container {
          overflow-x: auto;
          max-height: 600px;
          overflow-y: auto;
        }
        
        .data-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .data-table th,
        .data-table td {
          padding: 0.75rem 1rem;
          text-align: left;
          border-bottom: 1px solid #eaeaea;
        }
        
        .data-table th {
          background-color: #f5f5f5;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        
        .data-table tr {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        
        .data-table tr:hover {
          background-color: #f9f9f9;
        }
        
        .data-table tr.selected {
          background-color: #e3f2fd;
        }
        
        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.2rem;
          padding: 0.25rem;
          margin: 0 0.25rem;
        }
        
        .content-panel {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        .subscriber-info {
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eaeaea;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        
        .content-actions {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .action-button {
          display: inline-flex;
          align-items: center;
          padding: 8px 16px;
          background-color: #f3f4f6;
          color: #333;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .action-button:hover {
          background-color: #e1e4e8;
          box-shadow: 0 2px 5px rgba(0,0,0,0.15);
        }
        
        .content-text {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background-color: #f7f8fa;
          border-radius: 8px;
          max-height: 500px;
          border: 1px solid #e5e7eb;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .content-text pre {
          white-space: pre-wrap;
          word-break: break-word;
          font-family: "Consolas", "Monaco", monospace;
          font-size: 0.9rem;
          line-height: 1.6;
          margin: 0;
          color: #333;
        }
        
        .empty-state {
          padding: 2rem;
          text-align: center;
          color: #757575;
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
        
        .view-tabs {
          display: flex;
          margin-bottom: 15px;
          border-bottom: 1px solid #eee;
        }
        
        .tab-button {
          padding: 8px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 14px;
          font-weight: 500;
          color: #555;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .tab-button.active {
          color: #1976d2;
          border-bottom-color: #1976d2;
        }
        
        .tab-button:hover {
          background-color: #f5f5f5;
        }
        
        .email-preview-container {
          flex: 1;
          overflow-y: auto;
          max-height: 600px;
        }
        
        @media (max-width: 900px) {
          .content-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default ContentLogs;
