import React, { useState } from "react"
import { Users, Scan, Loader2 } from "lucide-react"
import "./App.css"

export default function App() {
  const [currentView, setCurrentView] = useState("home")
  const [, setIsScanning] = useState(false)
  const [connections] = useState([
    {
      id: 1,
      name: "Alex Chen",
      role: "Role",
      company: "Company",
    },
    {
      id: 2,
      name: "Sarah Wong",
      role: "Role",
      company: "Company",
    },
    {
      id: 3,
      name: "Michael Liu",
      role: "Role",
      company: "Company",
    },
    {
      id: 4,
      name: "Jessica Park",
      role: "Role",
      company: "Company",
    },
  ])

  const handleScan = () => {
    setIsScanning(true)
    setCurrentView("scanning")

    setTimeout(() => {
      setIsScanning(false)
      setCurrentView("connections")
    }, 1500)
  }

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
          <Scan className="btn-icon" />
          Scan Job Posting
        </button>
      </main>

      <footer className="footer">
        Scan job postings and find connections
      </footer>
    </div>
  )

  const renderScanningView = () => (
    <div className="scanning-view">
      <Loader2 className="loader-spin yellow-icon" />
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
          <Scan />
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
        </div>
        <a
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
