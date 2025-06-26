import React, { useState, useEffect } from "react";
import { Users, Scan, Loader2, ExternalLink, Network, ArrowLeft } from "lucide-react";
import "./App.css";

export default function App() {
  const [currentView, setCurrentView] = useState("home");
  const [isScanning, setIsScanning] = useState(false);
  const [connections, setConnections] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const listener = (message) => {
      if (message.action === "apolloResults") {
        const formattedConnections = (message.people || []).map((person, index) => ({
          id: index + 1,
          name: person.name || "No Name",
          role: person.title || "No Title",
          company: person.organization?.name || "Unknown Company",
          linkedinUrl: person.linkedin_url || "#",
          photoUrl: person.photo_url || person.profile_photo_url || "",
        }));
        setConnections(formattedConnections);
        setIsScanning(false);
        setCurrentView("connections");
      } else if (message.action === "apolloError") {
        setError(message.error);
        setIsScanning(false);
        setCurrentView("home");
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const handleScan = () => {
    setIsScanning(true);
    setCurrentView("scanning");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "scanJobPosting" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error:", chrome.runtime.lastError.message);
            setIsScanning(false);
            setCurrentView("home");
            return;
          }

          setTimeout(() => {
            setIsScanning(false);
            setCurrentView("connections");
          }, 1000);
        }
      );
    });
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
            <Network className="sparkles-icon" />
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
              {connection.photoUrl ? (
                <img src={connection.photoUrl} alt={connection.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <span>{connection.avatar}</span>
              )}
            </div>
            <div className="connection-info">
              <h3 className="connection-name">{connection.name}</h3>
              <p className="connection-role">{connection.role}</p>
              <p className="connection-company">{connection.company}</p>
            </div>
            <div className="connection-actions">
              <a
                href={connection.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="linkedin-button hover-scale"
              >
                <ExternalLink className="external-icon" />
                View LinkedIn
              </a>
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
