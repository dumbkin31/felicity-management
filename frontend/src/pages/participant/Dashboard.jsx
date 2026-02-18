import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./Dashboard.css";

export default function ParticipantDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("normal");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/participants/dashboard");
      setDashboard(response.data.dashboard);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container">
          <div className="error">{error}</div>
        </div>
      </>
    );
  }

  const { upcoming, history } = dashboard;

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <h1>My Events Dashboard</h1>

        {/* Upcoming Events Section */}
        <section className="dashboard-section">
          <h2>Upcoming Events</h2>
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming events. <Link to="/events">Browse events</Link> to register!</p>
            </div>
          ) : (
            <div className="events-grid">
              {upcoming.map((event) => (
                <div key={event.ticketId} className="event-card">
                  <div className="event-badge">{event.eventType}</div>
                  <h3>{event.eventName}</h3>
                  <p className="event-meta">
                    <strong>Date:</strong> {new Date(event.startAt).toLocaleDateString()}
                  </p>
                  <p className="event-meta">
                    <strong>Status:</strong> <span className="status-confirmed">{event.status}</span>
                  </p>
                  <p className="event-meta">
                    <strong>Ticket ID:</strong> {event.ticketId}
                  </p>
                  {event.qrCode && (
                    <div className="qr-preview">
                      <img src={event.qrCode} alt="QR Code" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Participation History Section */}
        <section className="dashboard-section">
          <h2>Participation History</h2>
          
          <div className="tabs">
            <button
              className={activeTab === "normal" ? "tab active" : "tab"}
              onClick={() => setActiveTab("normal")}
            >
              Normal Events ({history.normal.length})
            </button>
            <button
              className={activeTab === "merchandise" ? "tab active" : "tab"}
              onClick={() => setActiveTab("merchandise")}
            >
              Merchandise ({history.merchandise.length})
            </button>
            <button
              className={activeTab === "completed" ? "tab active" : "tab"}
              onClick={() => setActiveTab("completed")}
            >
              Completed ({history.completed.length})
            </button>
            <button
              className={activeTab === "cancelled" ? "tab active" : "tab"}
              onClick={() => setActiveTab("cancelled")}
            >
              Cancelled/Rejected ({history.cancelled.length})
            </button>
          </div>

          <div className="history-content">
            {history[activeTab].length === 0 ? (
              <div className="empty-state">
                <p>No {activeTab} events</p>
              </div>
            ) : (
              <div className="history-list">
                {history[activeTab].map((event) => (
                  <div key={event.ticketId} className="history-item">
                    <div className="history-details">
                      <h4>{event.eventName}</h4>
                      <p className="event-type-badge">{event.eventType}</p>
                      <p><strong>Ticket:</strong> {event.ticketId}</p>
                      <p><strong>Status:</strong> <span className={`status-${event.status}`}>{event.status}</span></p>
                      {event.quantity && <p><strong>Quantity:</strong> {event.quantity}</p>}
                      <p className="event-date">{new Date(event.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
