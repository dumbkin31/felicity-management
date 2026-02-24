import { useState } from "react";
import api from "../api/axios";
import "./FeedbackForm.css";

const FeedbackForm = ({ eventId, onSubmitSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        `/feedback/${eventId}`,
        { rating, comment }
      );

      if (response.data.ok) {
        alert("Thank you for your feedback!");
        setRating(0);
        setComment("");
        if (onSubmitSuccess) onSubmitSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-form">
      <h3>Share Your Feedback</h3>
      <p className="subtitle">Your feedback is anonymous and helps us improve future events</p>

      <form onSubmit={handleSubmit}>
        <div className="rating-section">
          <label>How would you rate this event?</label>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star ${(hoverRating || rating) >= star ? "active" : ""}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
              >
                ★
              </button>
            ))}
          </div>
          {rating > 0 && (
            <div className="rating-text">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Very Good"}
              {rating === 5 && "Excellent"}
            </div>
          )}
        </div>

        <div className="comment-section">
          <label>Additional Comments (Optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about the event..."
            rows="5"
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={submitting || rating === 0} className="submit-btn">
          {submitting ? "Submitting..." : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
};

export default FeedbackForm;
