import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFetchData } from "../../hooks/useFetchData";
import { useCSVExport } from "../../hooks/useCSVExport";
import { StatCard } from "../../components/StatCard";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./EventFeedback.css";

const EventFeedback = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");

  const { data: feedbackData, loading, error } = useFetchData(
    async () => {
      const response = await api.get(`/organizer/feedback/${eventId}`);
      return response.data.ok ? {
        feedback: response.data.feedback,
        stats: response.data.stats,
      } : null;
    },
    [eventId]
  );

  const { exportCSV } = useCSVExport();

  const feedback = feedbackData?.feedback || [];
  const stats = feedbackData?.stats || null;

  const handleExport = () => {
    exportCSV(`/organizer/feedback/${eventId}/export`, `feedback-${eventId}.csv`);
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
            <StatCard value={`${stats.averageRating} ★`} label="Average Rating" highlight />
            <StatCard value={stats.total} label="Total Responses" />
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
