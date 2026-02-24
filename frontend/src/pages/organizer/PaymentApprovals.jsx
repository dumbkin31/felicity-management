import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFetchData } from "../../hooks/useFetchData";
import { useModal } from "../../hooks/useModal";
import { useConfirm } from "../../hooks/useConfirm";
import { useToast } from "../../hooks/useToast";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import Toast from "../../components/Toast";
import "./PaymentApprovals.css";

const PaymentApprovals = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const rejectionModal = useModal();
  const { confirm } = useConfirm();
  const { success, error: errorToast, toasts, removeToast } = useToast();

  const { data: payments = [], loading, error, retry } = useFetchData(
    async () => {
      const response = await api.get(`/organizer/payments/pending/${eventId}`);
      return response.data.ok ? response.data.payments : [];
    },
    [eventId]
  );

  const handleApprove = async (registrationId) => {
    if (!confirm("Are you sure you want to approve this payment?")) return;

    try {
      const response = await api.put(
        `/organizer/payments/approve/${registrationId}`,
        {}
      );

      if (response.data.ok) {
        success("Payment approved successfully!");
        retry();
      }
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to approve payment");
    }
  };

  const handleReject = async (registrationId) => {
    if (!rejectionReason.trim()) {
      errorToast("Please provide a reason for rejection");
      return;
    }

    try {
      const response = await api.put(
        `/organizer/payments/reject/${registrationId}`,
        { reason: rejectionReason }
      );

      if (response.data.ok) {
        success("Payment rejected");
        setRejectionReason("");
        rejectionModal.close();
        retry();
      }
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to reject payment");
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

  if (loading) return <div className="loading">Loading payment approvals...</div>;

  return (
    <>
      <Navbar />
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="payment-approvals">
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
        <button 
          onClick={() => navigate(`/organizer/events/${eventId}`)}
          className="back-btn"
          title="Back to Event Details"
        >
          ← Back
        </button>
        <h2 style={{ margin: 0 }}>Payment Approvals</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {payments.length === 0 ? (
        <div className="no-payments">No pending payment approvals</div>
      ) : (
        <div className="payments-grid">
          {payments.map((payment) => (
            <div key={payment._id} className="payment-card">
              <div className="payment-header">
                <div>
                  <h3>{payment.participantName}</h3>
                  <p className="ticket-id">Ticket: {payment.ticketId}</p>
                </div>
                {getStatusBadge(payment.paymentStatus)}
              </div>

              <div className="payment-details">
                <p><strong>Email:</strong> {payment.participantEmail}</p>
                <p><strong>Order Date:</strong> {new Date(payment.registeredAt).toLocaleDateString()}</p>
                {payment.paymentProofUploadedAt && (
                  <p><strong>Proof Uploaded:</strong> {new Date(payment.paymentProofUploadedAt).toLocaleString()}</p>
                )}
                {payment.merchDetails && (
                  <div className="merch-details">
                    <strong>Items Ordered:</strong>
                    <ul>
                      {payment.merchDetails.items.map((item, idx) => (
                        <li key={idx}>
                          {item.variant} - Quantity: {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {payment.paymentProof && (
                <div className="proof-section">
                  <strong>Payment Proof:</strong>
                  <img
                    src={payment.paymentProof}
                    alt="Payment proof"
                    className="payment-proof-img"
                    onClick={() => window.open(payment.paymentProof, "_blank")}
                  />
                </div>
              )}

              {payment.paymentStatus === "pending" && (
                <div className="action-buttons">
                  <button
                    onClick={() => handleApprove(payment._id)}
                    className="btn-approve"
                  >
                    Approve & Generate QR
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPaymentId(payment._id);
                      rejectionModal.open();
                      setRejectionReason("");
                    }}
                    className="btn-reject"
                  >
                    Reject
                  </button>
                </div>
              )}

              {payment.paymentStatus === "approved" && payment.approvedAt && (
                <div className="approval-info">
                  Approved on {new Date(payment.approvedAt).toLocaleString()}
                </div>
              )}

              {payment.paymentStatus === "rejected" && (
                <div className="rejection-info">
                  <strong>Rejected:</strong> {payment.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectionModal.isOpen && (
        <div className="modal-overlay" onClick={rejectionModal.close}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Reject Payment</h3>
            <p>Provide a reason for rejecting this payment:</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows="4"
            />
            <div className="modal-buttons">
              <button onClick={() => handleReject(selectedPaymentId)} className="btn-confirm">
                Confirm Rejection
              </button>
              <button onClick={rejectionModal.close} className="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default PaymentApprovals;
