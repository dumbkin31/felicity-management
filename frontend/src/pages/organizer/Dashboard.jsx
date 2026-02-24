import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StatCard } from "../../components/StatCard";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./Dashboard.css";

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    publishedEvents: 0,
    draftEvents: 0,
    totalRegistrations: 0,
    completedEvents: 0,
    totalRevenue: 0,
    totalAttendance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // "all", "published", "draft", "completed"

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, eventsRes] = await Promise.all([
        api.get("/organizer/profile"),
        api.get("/organizer/dashboard"),
      ]);

      setOrganizer(profileRes.data.organizer);
      const dashboardData = eventsRes.data.dashboard;
      const allEvents = dashboardData.eventsCarousel || [];
      setEvents(allEvents);

      // Use analytics from dashboard
      setStats({
        totalEvents: dashboardData.analytics.totalEvents || 0,
        publishedEvents: allEvents.filter((e) => e.status === "published").length,
        draftEvents: allEvents.filter((e) => e.status === "draft").length,
        completedEvents: dashboardData.analytics.completedEvents || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    try {
      await api.delete(`/organizer/events/${eventId}`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete event");
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filterStatus === "all") return true;
    return event.status === filterStatus;
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="org-dashboard-container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="org-dashboard-container">
        <div className="dashboard-header">
          <h1>Club Dashboard</h1>
          <Link to="/organizer/events/create" className="create-event-btn">
            + Create Event
          </Link>
        </div>

        {error && <div className="error">{error}</div>}

        {/* Stats Cards */}
        <div className="stats-grid">
          <StatCard value={stats.totalEvents} label="Total Events" />
          <StatCard value={stats.publishedEvents} label="Published" />
          <StatCard value={stats.draftEvents} label="Drafts" />
          <StatCard value={stats.completedEvents} label="Completed" />
        </div>

        {/* Analytics Cards for Completed Events */}
        {/* REMOVED: Overall Analytics section - now showing event-wise analytics only */}

        {/* Events Section */}
        <section className="events-section">
          <div className="section-header">
            <h2>Your Events</h2>
            <div className="filter-buttons">
              <button
                className={filterStatus === "all" ? "filter-btn active" : "filter-btn"}
                onClick={() => setFilterStatus("all")}
              >
                All ({events.length})
              </button>
              <button
                className={filterStatus === "published" ? "filter-btn active" : "filter-btn"}
                onClick={() => setFilterStatus("published")}
              >
                Published ({stats.publishedEvents})
              </button>
              <button
                className={filterStatus === "draft" ? "filter-btn active" : "filter-btn"}
                onClick={() => setFilterStatus("draft")}
              >
                Drafts ({stats.draftEvents})
              </button>
              <button
                className={filterStatus === "completed" ? "filter-btn active" : "filter-btn"}
                onClick={() => setFilterStatus("completed")}
              >
                Completed ({stats.completedEvents})
              </button>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="empty-state">
              <p>
                {filterStatus === "all"
                  ? "No events yet. Create your first event!"
                  : filterStatus === "completed"
                    ? "No completed events yet"
                    : `No ${filterStatus} events`}
              </p>
              {filterStatus === "all" && (
                <Link to="/organizer/events/create" className="create-link">
                  Create Event
                </Link>
              )}
            </div>
          ) : (
            <div className="events-table">
              <div className="table-header">
                <div className="col-name">Event Name</div>
                <div className="col-type">Type</div>
                <div className="col-status">Status</div>
                <div className="col-start">Start Date</div>
                <div className="col-regs">Registrations</div>
                <div className="col-actions">Actions</div>
              </div>
              {filteredEvents.map((event) => (
                <div key={event._id} className="table-row">
                  <div className="col-name">
                    <h4>{event.name}</h4>
                  </div>
                  <div className="col-type">
                    <span className="type-badge">{event.type}</span>
                  </div>
                  <div className="col-status">
                    <span className={`status-badge status-${event.status}`}>
                      {event.status}
                    </span>
                  </div>
                  <div className="col-start">
                    {new Date(event.startAt).toLocaleDateString()}
                  </div>
                  <div className="col-regs">{event.totalRegistrations || 0}</div>
                  <div className="col-actions">
                    <Link
                      to={`/organizer/events/${event._id}/edit`}
                      className="action-btn edit-btn"
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/organizer/events/${event._id}`}
                      className="action-btn view-btn"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDeleteEvent(event._id)}
                      className="action-btn delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Event-wise Analytics for Completed Events */}
        {stats.completedEvents > 0 && (
          <section className="event-wise-analytics-section">
            <h2>📈 Completed Events Analytics</h2>
            <div className="event-analytics-grid">
              {events
                .filter((event) => event.status === "completed")
                .map((event) => (
                  <div key={event._id} className="event-analytics-card">
                    <h3>{event.name}</h3>
                    <div className="event-analytics-details">
                      <div className="analytics-item">
                        <span className="label">Registrations:</span>
                        <span className="value">{event.confirmedRegistrations || 0}</span>
                      </div>
                      <div className="analytics-item">
                        <span className="label">Attendance:</span>
                        <span className="value">{event.totalAttendance || 0}</span>
                      </div>
                      <div className="analytics-item">
                        <span className="label">Revenue:</span>
                        <span className="value">₹{(event.totalRevenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="analytics-item">
                        <span className="label">Attendance Rate:</span>
                        <span className="value">
                          {event.totalRegistrations > 0
                            ? `${Math.round((event.totalAttendance / event.totalRegistrations) * 100)}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                    <Link
                      to={`/organizer/events/${event._id}`}
                      className="view-details-link"
                    >
                      View Details →
                    </Link>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
