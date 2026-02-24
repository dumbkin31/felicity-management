import { useState, useEffect } from "react";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import { useClipboard } from "../../hooks/useClipboard";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import Toast from "../../components/Toast";
import "./ManagePasswordResets.css";

const ManagePasswordResets = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const { confirm } = useConfirm();
  const { success, error: errorToast, toasts, removeToast } = useToast();
  const { copyToClipboard } = useClipboard();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get("/admin/password-reset/requests");

      if (response.data.ok) {
        setRequests(response.data.requests);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    if (!confirm("Are you sure you want to approve this password reset request?")) {
      return;
    }

    try {
      const response = await api.put(
        `/admin/password-reset/approve/${requestId}`,
        {}
      );

      if (response.data.ok) {
        setGeneratedPassword({
          email: response.data.email,
          password: response.data.newPassword,
        });
        fetchRequests();
      }
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to approve request");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      errorToast("Please provide a reason for rejection");
      return;
    }

    try {
      const response = await api.put(
        `/admin/password-reset/reject/${selectedRequest._id}`,
        { reason: rejectionReason }
      );

      if (response.data.ok) {
        success("Request rejected successfully");
        setSelectedRequest(null);
        setRejectionReason("");
        fetchRequests();
      }
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to reject request");
    }
  };

  const handleCopy = async (text) => {
    const copied = await copyToClipboard(text);
    if (copied) {
      success("Copied to clipboard!");
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

  if (loading) return <div className="loading">Loading password reset requests...</div>;

  return (
    <>
      <Navbar />
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="manage-password-resets">
      <h2>Manage Password Reset Requests</h2>

      {error && <div className="error-message">{error}</div>}

      {requests.length === 0 ? (
        <div className="no-requests">No password reset requests</div>
      ) : (
        <div className="requests-grid">
          {requests.map((request) => (
            <div key={request._id} className="request-card">
              <div className="card-header">
                <div>
                  <h3>{request.email}</h3>
                  <p className="request-date">
                    Requested: {new Date(request.requestedAt).toLocaleString()}
                  </p>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <div className="card-body">
                <div className="reason-section">
                  <strong>Reason:</strong>
                  <p>{request.reason}</p>
                </div>

                {request.status === "pending" && (
                  <div className="action-buttons">
                    <button
                      onClick={() => handleApprove(request._id)}
                      className="btn-approve"
                    >
                      Approve & Generate Password
                    </button>
                    <button
                      onClick={() => setSelectedRequest(request)}
                      className="btn-reject"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {request.status === "approved" && request.approvedAt && (
                  <div className="approval-info">
                    <strong>Approved:</strong> {new Date(request.approvedAt).toLocaleString()}
                    <br />
                    <small>Password has been generated. Please share it with the organizer.</small>
                  </div>
                )}

                {request.status === "rejected" && (
                  <div className="rejection-info">
                    <strong>Rejected:</strong> {new Date(request.rejectedAt).toLocaleString()}
                    <br />
                    <strong>Reason:</strong> {request.rejectionReason}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Password Reset Request</h3>
            <p>Email: <strong>{selectedRequest.email}</strong></p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows="4"
            />
            <div className="modal-buttons">
              <button onClick={handleReject} className="btn-confirm">
                Confirm Rejection
              </button>
              <button onClick={() => setSelectedRequest(null)} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Password Modal */}
      {generatedPassword && (
        <div className="modal-overlay" onClick={() => setGeneratedPassword(null)}>
          <div className="modal-content password-modal" onClick={(e) => e.stopPropagation()}>
            <h3>✅ Password Reset Approved</h3>
            
            <div className="generated-credentials">
              <div className="credential-item">
                <strong>Email:</strong>
                <div className="credential-value">
                  <span>{generatedPassword.email}</span>
                  <button onClick={() => handleCopy(generatedPassword.email)}>
                    Copy
                  </button>
                </div>
              </div>

              <div className="credential-item">
                <strong>New Password:</strong>
                <div className="credential-value">
                  <span>{generatedPassword.password}</span>
                  <button onClick={() => handleCopy(generatedPassword.password)}>
                    Copy
                  </button>
                </div>
              </div>

              <div className="copy-both">
                <button
                  onClick={() =>
                    handleCopy(
                      `Email: ${generatedPassword.email}\nPassword: ${generatedPassword.password}`
                    )
                  }
                  className="copy-all-btn"
                >
                  Copy Both
                </button>
              </div>
            </div>

            <div className="warning-box">
              <strong>⚠️ Important:</strong> Please share these credentials with the organizer.
              This is the only time you'll see the password.
            </div>

            <button onClick={() => setGeneratedPassword(null)} className="close-btn">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default ManagePasswordResets;
