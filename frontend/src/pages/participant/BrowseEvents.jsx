import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./BrowseEvents.css";

export default function BrowseEvents() {
  const [trending, setTrending] = useState([]);
  const [events, setEvents] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [eligibility, setEligibility] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [followedOnly, setFollowedOnly] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [search, type, eligibility, startDate, endDate, followedOnly]);

  const fetchInitialData = async () => {
    try {
      const [trendingRes, organizersRes] = await Promise.all([
        api.get("/events/trending"),
        api.get("/organizers")
      ]);
      setTrending(trendingRes.data.trending || []);
      setOrganizers(organizersRes.data.organizers || []);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (type) params.append("type", type);
      if (eligibility) params.append("eligibility", eligibility);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (followedOnly) params.append("followedOnly", "true");

      const response = await api.get(`/events?${params.toString()}`);
      setEvents(response.data.events || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch events");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setType("");
    setEligibility("");
    setStartDate("");
    setEndDate("");
    setFollowedOnly(false);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="browse-container">
          <div className="loading">Loading events...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="browse-container">
        <h1>Browse Events</h1>

        {/* Filters Section */}
        <section className="filters-section">
          <h2>Search & Filters</h2>
          <div className="filters-grid">
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-input"
            />

            <select value={type} onChange={(e) => setType(e.target.value)} className="filter-select">
              <option value="">All Types</option>
              <option value="normal">Normal</option>
              <option value="merchandise">Merchandise</option>
            </select>

            <select value={eligibility} onChange={(e) => setEligibility(e.target.value)} className="filter-select">
              <option value="">All Eligibility</option>
              <option value="iiith-only">IIIT-H Only</option>
              <option value="all">All</option>
            </select>

            <div className="filter-group">
              <label className="filter-label">Start Date</label>
              <input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <div className="filter-group">
              <label className="filter-label">End Date</label>
              <input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="filter-input"
              />
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={followedOnly}
                onChange={(e) => setFollowedOnly(e.target.checked)}
              />
              Followed Clubs Only
            </label>

            <button onClick={resetFilters} className="reset-btn">Reset Filters</button>
          </div>
        </section>

        {/* Trending Section */}
        {trending.length > 0 && (
          <section className="trending-section">
            <h2>🔥 Trending Events</h2>
            <div className="trending-grid">
              {trending.map((event) => (
                <Link to={`/events/${event._id}`} key={event._id} className="trending-card">
                  <div className="trending-badge">#{trending.indexOf(event) + 1} Trending</div>
                  <h3>{event.name}</h3>
                  <p className="organizer">by {event.organizerId?.name || "Unknown"}</p>
                  <p className="event-type">{event.type}</p>
                  <p className="registrations">{event.registrationCount || 0} registrations</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Events Grid */}
        <section className="events-section">
          <h2>All Events ({events.length})</h2>
          {error && <div className="error">{error}</div>}
          {events.length === 0 ? (
            <div className="empty-state">No events found. Try adjusting your filters.</div>
          ) : (
            <div className="events-grid">
              {events.map((event) => (
                <Link to={`/events/${event._id}`} key={event._id} className="event-card">
                  <div className="event-type-badge">{event.type}</div>
                  <h3>{event.name}</h3>
                  <p className="organizer">by {event.organizerId?.name || "Unknown"}</p>
                  <p className="description">{event.description?.substring(0, 100)}...</p>
                  <div className="event-footer">
                    <p className="date">{new Date(event.startAt).toLocaleDateString()}</p>
                    {event.type === "merchandise" && event.price && (
                      <p className="price">₹{event.price}</p>
                    )}
                  </div>
                  {event.eligibility === "iiith-only" && (
                    <div className="eligibility-tag">IIIT-H Only</div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
