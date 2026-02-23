import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./PasswordResetRequest.css";

const PasswordResetRequest = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [requests, setRequests] = useState([]);
  const [showStatus, setShowStatus] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !reason) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        "/password-reset/request",
        { email, reason }
      );

      if (response.data.ok) {
        setSuccess(response.data.message);
        setEmail("");
        setReason("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit request");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await api.get(
        "/organizer/password-reset/status"
      );

      if (response.data.ok) {
        setRequests(response.data.requests);
        setShowStatus(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch status");
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { class: "badge-pending", text: "Pending" },
      approved: { class: "badge-approved", text: "Approved" },
      rejected: { class: "badge-rejected", text: "Rejected" },
    };
    const badge = badges[status] || badges.pending;
    return <span className={`status-badge ${badge.class}`}>{badge.text}</span>;
  };

  return (
    <div className="password-reset-request">
      <div className="container">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <h2>Request Password Reset</h2>

        {!showStatus ? (
          <>
            <div className="info-box">
              <p>
                If you've forgotten your password or need to reset it, submit a request below.
                An admin will review and approve your request.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="reset-form">
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason for Reset</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you need a password reset..."
                  rows="4"
                  required
                />
              </div>

              {error && <div className="error-message">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <div className="form-buttons">
                <button type="submit" disabled={loading} className="submit-btn">
                  {loading ? "Submitting..." : "Submit Request"}
                </button>
                <button type="button" onClick={fetchStatus} className="status-btn">
                  Check My Requests
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="status-section">
            <button onClick={() => setShowStatus(false)} className="back-btn">
              ← Back to Request Form
            </button>

            <h3>My Password Reset Requests</h3>

            {requests.length === 0 ? (
              <div className="no-requests">No password reset requests found</div>
            ) : (
              <div className="requests-list">
                {requests.map((request) => (
                  <div key={request._id} className="request-card">
                    <div className="request-header">
                      <span className="request-date">
                        {new Date(request.requestedAt).toLocaleString()}
                      </span>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="request-details">
                      <p><strong>Reason:</strong> {request.reason}</p>

                      {request.status === "approved" && (
                        <div className="approval-info">
                          Approved on {new Date(request.approvedAt).toLocaleString()}
                          <br />
                          <strong>A new password has been generated. Please check with the admin.</strong>
                        </div>
                      )}

                      {request.status === "rejected" && request.rejectionReason && (
                        <div className="rejection-info">
                          <strong>Rejection Reason:</strong> {request.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordResetRequest;
