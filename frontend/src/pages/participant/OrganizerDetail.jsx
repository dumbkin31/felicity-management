import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./OrganizerDetail.css";

export default function OrganizerDetail() {
  const { id } = useParams();
  const [organizer, setOrganizer] = useState(null);
  const [events, setEvents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [eventFilter, setEventFilter] = useState("all"); // "all", "upcoming", "past"

  useEffect(() => {
    fetchData();
  }, [id, eventFilter]);

  const fetchData = async () => {
    try {
      const [organizerRes, eventsRes, profileRes] = await Promise.all([
        api.get(`/organizers/${id}`),
        api.get(`/organizers/${id}/events${eventFilter !== "all" ? `?filter=${eventFilter}` : ""}`),
        api.get("/participants/me"),
      ]);
      setOrganizer(organizerRes.data.organizer);
      setEvents(eventsRes.data.events || []);
      setProfile(profileRes.data.participant);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load organizer details");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      await api.post(`/participants/follow/${id}`);
      const profileRes = await api.get("/participants/me");
      setProfile(profileRes.data.participant);
      setSuccess("Followed successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to follow");
    }
  };

  const handleUnfollow = async () => {
    try {
      await api.post(`/participants/unfollow/${id}`);
      const profileRes = await api.get("/participants/me");
      setProfile(profileRes.data.participant);
      setSuccess("Unfollowed successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to unfollow");
    }
  };

  const isFollowing = () => {
    if (!profile?.followedOrganizerIds) return false;
    return profile.followedOrganizerIds.some((oid) => oid.toString() === id);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="organizer-detail-container">
          <div className="loading">Loading organizer details...</div>
        </div>
      </>
    );
  }

  if (error && !organizer) {
    return (
      <>
        <Navbar />
        <div className="organizer-detail-container">
          <div className="error">{error}</div>
          <Link to="/organizers" className="back-link">
            ← Back to Organizers
          </Link>
        </div>
      </>
    );
  }

  const displayName = organizer.name || organizer.organizerName;

  return (
    <>
      <Navbar />
      <div className="organizer-detail-container">
        <Link to="/organizers" className="back-link">
          ← Back to Organizers
        </Link>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Organizer Header */}
        <div className="organizer-header">
          <div className="header-content">
            <div className="header-left">
              <h1>{displayName}</h1>
              {organizer.category && (
                <span className="category-badge">{organizer.category}</span>
              )}
              <p className="contact-info">
                📧 {organizer.email || organizer.contactEmail}
              </p>
              {organizer.contactNumber && (
                <p className="contact-info">📞 {organizer.contactNumber}</p>
              )}
            </div>
            <div className="header-right">
              <button
                onClick={isFollowing() ? handleUnfollow : handleFollow}
                className={isFollowing() ? "unfollow-btn-large" : "follow-btn-large"}
              >
                {isFollowing() ? "✓ Following" : "+ Follow"}
              </button>
            </div>
          </div>

          {organizer.description && (
            <div className="description-box">
              <h3>About</h3>
              <p>{organizer.description}</p>
            </div>
          )}
        </div>

        {/* Events Section */}
        <div className="events-section">
          <div className="section-header">
            <h2>Events by {displayName}</h2>
            <div className="filter-tabs">
              <button
                className={eventFilter === "all" ? "tab active" : "tab"}
                onClick={() => setEventFilter("all")}
              >
                All Events
              </button>
              <button
                className={eventFilter === "upcoming" ? "tab active" : "tab"}
                onClick={() => setEventFilter("upcoming")}
              >
                Upcoming
              </button>
              <button
                className={eventFilter === "past" ? "tab active" : "tab"}
                onClick={() => setEventFilter("past")}
              >
                Past
              </button>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="empty-state">
              No {eventFilter === "all" ? "" : eventFilter} events found
            </div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <Link
                  to={`/events/${event._id}`}
                  key={event._id}
                  className="event-card"
                >
                  <div className="event-type-badge">{event.type}</div>
                  <h3>{event.name}</h3>
                  <p className="event-description">
                    {event.description?.substring(0, 100)}...
                  </p>
                  <div className="event-meta">
                    <p className="event-date">
                      📅 {new Date(event.startAt).toLocaleDateString()}
                    </p>
                    {event.type === "merchandise" && event.price && (
                      <p className="event-price">₹{event.price}</p>
                    )}
                  </div>
                  {event.eligibility === "iiith-only" && (
                    <div className="eligibility-tag">IIIT-H Only</div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
