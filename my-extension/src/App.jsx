import React, { useState, useEffect } from "react"
import { Users, Scan, Loader2 } from "lucide-react"
import "./App.css"

export default function App() {
  const [currentView, setCurrentView] = useState("home")
  const [isScanning, setIsScanning] = useState(false)
  const [connections, setConnections] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    const listener = (message) => {
      if (message.action === "apolloResults") {
        const formattedConnections = (message.people || []).map((person, index) => ({
          id: index + 1,
          name: person.name || "No Name",
          role: person.title || "No Title",
          company: person.organization?.name || "Unknown Company",
          linkedinUrl: person.linkedin_url || "#"
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
    <div className="container">
      <header className="header">
        <div className="header-left">
          <div className="logo-circle yellow-bg">
            <Users className="icon-black" />
          </div>
          <h1 className="title">WatReach</h1>
        </div>
      </header>

      <main className="main-content">
        <h2>Find your next dream job 🚀 </h2>
        <p className="description">
          Scan job postings to find connections that can help with your application
        </p>
        <button className="btn-yellow" onClick={handleScan}>
          Scan Job Posting
        </button>
        {error && <div className="error-message">{error}</div>}
      </main>

      <footer className="footer">
        Scan job postings and find connections
      </footer>
    </div>
  )

  const renderScanningView = () => (
    <div className="scanning-view">
      <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
      <h2>Scanning Job Posting</h2>
      <p>Finding relevant connections</p>
    </div>
  )
  
  const renderConnectionsView = () => (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <div className="logo-circle yellow-bg">
            <Users className="icon-black" />
          </div>
          <h1 className="title">WatReach</h1>
        </div>
        <button
          className="btn-yellow-small" onClick={() => setCurrentView("home")}
        >
          New Scan
        </button>
      </header>

      <p className="connections-count">
        Found {connections.length} potential connections
      </p>

      <div className="connections-list">
        {connections.map((connection) => (
          <div key={connection.id} className="connection-card">
            <div className="connection-info">
              <h3 className="connection-name">{connection.name}</h3>
              <p className="connection-role">{connection.role}</p>
              <p className="connection-company">{connection.company}</p>
            </div>
            <a
              href={connection.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-btn"
            >
              View LinkedIn
            </a>      
          </div>
        ))}
      </div>

      <footer className="footer">
        Scan job postings and find connections
      </footer>
    </div>
  )

  return (
    <div className="app-container">
      {currentView === "home" && renderHomeView()}
      {currentView === "scanning" && renderScanningView()}
      {currentView === "connections" && renderConnectionsView()}
    </div>
  )
}
