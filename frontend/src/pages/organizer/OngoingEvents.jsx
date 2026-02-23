import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./OngoingEvents.css";

export default function OngoingEvents() {
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchOngoingEvents();
    // Refresh every minute to keep status current
    const interval = setInterval(fetchOngoingEvents, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchOngoingEvents = async () => {
    try {
      const response = await api.get("/organizer/dashboard");
      const dashboardData = response.data.dashboard;
      const allEvents = dashboardData.eventsCarousel || [];

      // Filter for ongoing events
      const now = new Date();
      const ongoing = allEvents.filter((event) => {
        if (event.status !== "published") return false;
        const startAt = new Date(event.startAt);
        const endAt = new Date(event.endAt);
        return startAt <= now && now <= endAt;
      });

      setOngoingEvents(ongoing);
      if (ongoing.length === 0) {
        setError("No ongoing events at the moment");
      } else {
        setError("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load ongoing events");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="ongoing-container">
          <div className="loading">Loading ongoing events...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="ongoing-container">
        <div className="page-header">
          <h1>Ongoing Events</h1>
          <p>Events that are currently happening</p>
        </div>

        {error && ongoingEvents.length === 0 && (
          <div className="no-events">
            <div className="empty-icon">🎯</div>
            <p>{error}</p>
            <Link to="/organizer/dashboard" className="back-link">
              ← Back to Dashboard
            </Link>
          </div>
        )}

        {ongoingEvents.length > 0 && (
          <>
            <div className="events-count">
              <span className="live-badge">🔴 LIVE</span>
              <span className="count">{ongoingEvents.length} event{ongoingEvents.length !== 1 ? 's' : ''} happening now</span>
            </div>

            <div className="events-grid">
              {ongoingEvents.map((event) => {
                const now = new Date();
                const endAt = new Date(event.endAt);
                const timeRemaining = Math.floor((endAt - now) / 60000); // minutes

                return (
                  <div key={event._id} className="event-card">
                    <div className="card-header">
                      <div className="event-title">{event.name}</div>
                      <div className="time-remaining">
                        {timeRemaining > 0 ? (
                          <>
                            {timeRemaining > 60
                              ? `${Math.floor(timeRemaining / 60)}h ${timeRemaining % 60}m left`
                              : `${timeRemaining}m left`}
                          </>
                        ) : (
                          'Ending soon'
                        )}
                      </div>
                    </div>

                    <div className="card-body">
                      <div className="event-detail">
                        <span className="detail-label">Type:</span>
                        <span className="detail-value">{event.type}</span>
                      </div>

                      <div className="event-detail">
                        <span className="detail-label">Start:</span>
                        <span className="detail-value">
                          {new Date(event.startAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="event-detail">
                        <span className="detail-label">End:</span>
                        <span className="detail-value">
                          {new Date(event.endAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="event-detail">
                        <span className="detail-label">Registrations:</span>
                        <span className="detail-value registrations">
                          {event.registrationCount || 0}
                        </span>
                      </div>
                    </div>

                    <div className="card-actions">
                      <Link
                        to={`/organizer/events/${event._id}/registrations`}
                        className="action-btn primary-btn"
                      >
                        View Registrations
                      </Link>
                      <Link
                        to={`/organizer/events/${event._id}`}
                        className="action-btn secondary-btn"
                      >
                        Edit Event
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}
