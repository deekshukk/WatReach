
import React, { useState } from "react";
import { Users, Scan, Network, ArrowLeft, ExternalLink } from "lucide-react";
import './App.css';

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [isScanning, setIsScanning] = useState(false);
  const [connections] = useState([
    {
      id: 1,
      name: "Alex Chen",
      role: "Senior Software Engineer",
      company: "Meta",
      avatar: "AC",
      matchScore: 95,
    },
    {
      id: 2,
      name: "Sarah Wong",
      role: "Product Manager",
      company: "Google",
      avatar: "SW",
      matchScore: 88,
    },
    {
      id: 3,
      name: "Michael Liu",
      role: "Engineering Manager",
      company: "Amazon",
      avatar: "ML",
      matchScore: 92,
    },
    {
      id: 4,
      name: "Jessica Park",
      role: "Full Stack Developer",
      company: "Netflix",
      avatar: "JP",
      matchScore: 85,
    },
  ]);

  const handleScan = () => {
    setIsScanning(true);
    setCurrentView("scanning");

    // Simulate API call
    setTimeout(() => {
      setIsScanning(false);
      setCurrentView("connections");
    }, 2500);
  };

  const renderHomeView = () => (
    <div className="watreach-container animate-fade-in">
      <div className="watreach-header">
        <div className="watreach-logo">
          <div className="logo-icon">
            <Network className="sparkles-icon" />
          </div>
          <h1 className="watreach-title">WatReach</h1>
        </div>
      </div>

      <div className="watreach-main">
        <div className="hero-section">
          <h2 className="hero-title">Find your next dream job 🚀</h2>
          <p className="hero-description">
            Scan job postings to discover connections that can help accelerate your application
          </p>
        </div>

        <div className="scan-section">
          <button className="scan-button hover-scale" onClick={handleScan}>
            <Scan className="scan-icon" />
            <span>Scan Job Posting</span>
            <div className="button-shine"></div>
          </button>
        </div>
      </div>

      <div className="watreach-footer">
        <p>Connect smarter, not harder</p>
      </div>
    </div>
  );

  const renderScanningView = () => (
    <div className="scanning-container animate-fade-in">
      <div className="scanning-content">
        <div className="scanning-loader">
          <div className="pulse-rings">
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring"></div>
          </div>
          <div className="loader-icon">
            <Scan className="scan-icon-loading" />
          </div>
        </div>
        
        <h2 className="scanning-title">Scanning Job Posting</h2>
        <p className="scanning-subtitle">Finding relevant connections...</p>
        
        <div className="scanning-progress">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderConnectionsView = () => (
    <div className="watreach-container animate-fade-in">
      <div className="watreach-header">
        <div className="watreach-logo">
          <div className="logo-icon">
            <Users className="users-icon" />
          </div>
          <h1 className="watreach-title">WatReach</h1>
        </div>
        <button
          className="new-scan-button hover-scale"
          onClick={() => setCurrentView("home")}
        >
          <ArrowLeft className="arrow-icon" />
          New Scan
        </button>
      </div>

      <div className="connections-header">
        <h2 className="connections-title">
          Found {connections.length} potential connections
        </h2>
        <p className="connections-subtitle">Sorted by relevance match</p>
      </div>

      <div className="connections-list">
        {connections.map((connection, index) => (
          <div
            key={connection.id}
            className="connection-card hover-lift"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="connection-avatar">
              <span>{connection.avatar}</span>
            </div>
            
            <div className="connection-info">
              <h3 className="connection-name">{connection.name}</h3>
              <p className="connection-role">{connection.role}</p>
              <p className="connection-company">{connection.company}</p>
            </div>

            <div className="connection-actions">
              <div className="match-score">
                <span className="match-percentage">{connection.matchScore}%</span>
                <span className="match-label">match</span>
              </div>
              <button className="linkedin-button hover-scale">
                <ExternalLink className="external-icon" />
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="watreach-footer">
        <p>Connect smarter, not harder</p>
      </div>
    </div>
  );

  return (
    <div className="watreach-app">
      {currentView === "home" && renderHomeView()}
      {currentView === "scanning" && renderScanningView()}
      {currentView === "connections" && renderConnectionsView()}
    </div>
  );
}

