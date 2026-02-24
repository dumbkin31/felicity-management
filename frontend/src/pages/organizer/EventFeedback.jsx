import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./EventFeedback.css";

const EventFeedback = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchFeedback();
  }, [eventId]);

  const fetchFeedback = async () => {
    try {
      const response = await api.get(
        `/organizer/feedback/${eventId}`
      );

      if (response.data.ok) {
        setFeedback(response.data.feedback);
        setStats(response.data.stats);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(
        `/organizer/feedback/${eventId}/export`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-${eventId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to export feedback");
    }
  };

  const filteredFeedback = filter === "all"
    ? feedback
    : feedback.filter((fb) => fb.rating === parseInt(filter));

  if (loading) return <div className="loading">Loading feedback...</div>;

  return (
    <>
      <Navbar />
      <div className="event-feedback">
      <div className="header-section">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <h2>Event Feedback</h2>
        {feedback.length > 0 && (
          <button onClick={handleExport} className="export-btn">
            Export CSV
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {stats && stats.total > 0 ? (
        <>
          <div className="stats-section">
            <div className="stat-card highlight">
              <div className="stat-value">{stats.averageRating} ★</div>
              <div className="stat-label">Average Rating</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Responses</div>
            </div>
          </div>

          <div className="distribution-card">
            <h3>Rating Distribution</h3>
            <div className="distribution-bars">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating];
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={rating} className="distribution-row">
                    <div className="rating-label">{rating} ★</div>
                    <div className="bar-container">
                      <div
                        className="bar"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="count-label">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="feedback-list-section">
            <div className="list-header">
              <h3>All Feedback ({filteredFeedback.length})</h3>
              <div className="filter-section">
                <label>Filter:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>
            </div>

            <div className="feedback-cards">
              {filteredFeedback.map((fb) => (
                <div key={fb._id} className="feedback-card">
                  <div className="feedback-header">
                    <div className="stars-display">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={i < fb.rating ? "star filled" : "star"}>
                          ★
                        </span>
                      ))}
                    </div>
                    <div className="feedback-date">
                      {new Date(fb.submittedAt).toLocaleDateString()}
                    </div>
                  </div>
                  {fb.comment && (
                    <div className="feedback-comment">{fb.comment}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="no-feedback">
          <p>No feedback has been submitted for this event yet.</p>
        </div>
      )}
      </div>
    </>
  );
};

export default EventFeedback;
