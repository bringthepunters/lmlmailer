import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

// Pages
import Dashboard from './pages/Dashboard';
import SubscriberList from './pages/SubscriberList';
import SubscriberForm from './pages/SubscriberForm';
import ContentLogs from './pages/ContentLogs';

// LML Logo and branding
import './App.css';

function App() {
  const location = useLocation();
  
  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <img src="/Copy of LML_1_RGB.png" alt="LML Logo" className="logo" />
          <h1>Melbourne Gig Guide Mailer</h1>
        </div>
        <nav className="main-nav">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/subscribers" className={location.pathname.includes('/subscribers') ? 'active' : ''}>
            Subscribers
          </Link>
          <Link to="/content" className={location.pathname.includes('/content') ? 'active' : ''}>
            Content Logs
          </Link>
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subscribers" element={<SubscriberList />} />
          <Route path="/subscribers/new" element={<SubscriberForm />} />
          <Route path="/subscribers/edit/:id" element={<SubscriberForm />} />
          <Route path="/content" element={<ContentLogs />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Melbourne Gig Guide Mailer | Stage 1 (Admin Interface)</p>
      </footer>
    </div>
  );
}

export default App;
