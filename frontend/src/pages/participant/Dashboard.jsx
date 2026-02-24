import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../hooks/useToast";
import { useFileUpload } from "../../hooks/useFileUpload";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import Toast from "../../components/Toast";
import "./Dashboard.css";

export default function ParticipantDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("normal");
  const [uploadingPayment, setUploadingPayment] = useState({});
  const [paymentProofs, setPaymentProofs] = useState({});
  const { success, error: errorToast, toasts, removeToast } = useToast();
  const { fileToBase64 } = useFileUpload();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await api.get("/participants/dashboard");
      setDashboard(response.data.dashboard);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPaymentProof = async (registrationId, file) => {
    if (!file) {
      errorToast("Please select a file");
      return;
    }

    try {
      setUploadingPayment(prev => ({ ...prev, [registrationId]: true }));

      const base64String = await fileToBase64(file);
      const response = await api.post(
        `/participants/registrations/${registrationId}/payment-proof`,
        { paymentProof: base64String }
      );

      if (response.data.ok) {
        success("Payment proof uploaded successfully! Waiting for organizer approval...");
        setPaymentProofs(prev => ({ ...prev, [registrationId]: null }));
        fetchDashboard();
      }
    } catch (err) {
      errorToast(err.response?.data?.error || "Failed to upload payment proof");
    } finally {
      setUploadingPayment(prev => ({ ...prev, [registrationId]: false }));
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="dashboard-container">
          <div className="error">{error}</div>
        </div>
      </>
    );
  }

  const { pendingPayments, upcoming, history } = dashboard;

  return (
    <>
      <Navbar />
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="dashboard-container">
        <h1>My Events Dashboard</h1>

        {/* Pending Payments Section */}
        {pendingPayments && pendingPayments.length > 0 && (
          <section className="dashboard-section pending-payments-section">
            <h2>⏳ Pending Payment Approvals ({pendingPayments.length})</h2>
            <div className="pending-payments-grid">
              {pendingPayments.map((event) => (
                <div key={event._id} className="payment-card">
                  <div className="payment-header">
                    <h3>{event.eventName}</h3>
                    <span className="status-badge pending">{event.status}</span>
                  </div>
                  <div className="payment-details">
                    <p><strong>Organizer:</strong> {event.organizerName}</p>
                    <p><strong>Event Type:</strong> {event.eventType === "merch" ? "Merchandise" : "Normal"}</p>
                    {event.quantity && <p><strong>Quantity:</strong> {event.quantity}</p>}
                    <p><strong>Payment Status:</strong> {event.paymentStatus === "pending" ? "Awaiting Proof Upload" : event.paymentStatus}</p>
                  </div>

                  {!event.paymentProof && event.paymentStatus === "pending" && (
                    <div className="payment-proof-upload" style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
                      <p style={{ margin: '0 0 10px 0' }}>📸 Upload payment proof to proceed:</p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setPaymentProofs(prev => ({ ...prev, [event._id]: e.target.files?.[0] || null }))}
                          disabled={uploadingPayment[event._id]}
                          style={{ flex: 1 }}
                        />
                        <button
                          onClick={() => handleUploadPaymentProof(event._id, paymentProofs[event._id])}
                          disabled={uploadingPayment[event._id] || !paymentProofs[event._id]}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: uploadingPayment[event._id] ? 'not-allowed' : 'pointer',
                            opacity: uploadingPayment[event._id] || !paymentProofs[event._id] ? 0.6 : 1,
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {uploadingPayment[event._id] ? "Uploading..." : "Upload"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Events Section */}
        <section className="dashboard-section">
          <h2>Upcoming Events</h2>
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <p>No upcoming events. <Link to="/events">Browse events</Link> to register!</p>
            </div>
          ) : (
            <div className="events-grid">
              {upcoming.map((event) => (
                <Link to={`/events/${event.eventId}`} key={event.ticketId} className="event-card">
                  <div className="event-badge">{event.eventType}</div>
                  <h3>{event.eventName}</h3>
                  <p className="event-meta">
                    <strong>Start:</strong> {new Date(event.startAt).toLocaleString()}
                  </p>
                  <p className="event-meta">
                    <strong>Organizer:</strong> {event.organizerName || "Unknown Organizer"}
                  </p>
                  <p className="event-meta">
                    <strong>End:</strong> {new Date(event.endAt).toLocaleString()}
                  </p>
                  <p className="event-meta">
                    <strong>Status:</strong> <span className="status-confirmed">{event.status}</span>
                  </p>
                  <p className="event-meta">
                    <strong>Ticket ID:</strong> {event.ticketId}
                  </p>
                  {event.qrCode && (
                    <div className="qr-preview">
                      <img src={event.qrCode} alt="QR Code" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Participation History Section */}
        <section className="dashboard-section">
          <h2>Participation History</h2>
          
          <div className="tabs">
            <button
              className={activeTab === "normal" ? "tab active" : "tab"}
              onClick={() => setActiveTab("normal")}
            >
              Normal Events ({history.normal.length})
            </button>
            <button
              className={activeTab === "merchandise" ? "tab active" : "tab"}
              onClick={() => setActiveTab("merchandise")}
            >
              Merchandise ({history.merchandise.length})
            </button>
            <button
              className={activeTab === "completed" ? "tab active" : "tab"}
              onClick={() => setActiveTab("completed")}
            >
              Completed ({history.completed.length})
            </button>
            <button
              className={activeTab === "cancelled" ? "tab active" : "tab"}
              onClick={() => setActiveTab("cancelled")}
            >
              Cancelled/Rejected ({history.cancelled.length})
            </button>
          </div>

          <div className="history-content">
            {history[activeTab].length === 0 ? (
              <div className="empty-state">
                <p>No {activeTab} events</p>
              </div>
            ) : (
              <div className="history-list">
                {history[activeTab].map((event) => (
                  <Link
                    to={`/events/${event.eventId}`}
                    key={event.ticketId}
                    className="history-item"
                  >
                    <div className="history-details">
                      <h4>{event.eventName}</h4>
                      <p><strong>Organizer:</strong> {event.organizerName || "Unknown Organizer"}</p>
                      <p><strong>Ticket:</strong> {event.ticketId}</p>
                      <p><strong>Status:</strong> <span className={`status-${event.status}`}>{event.status}</span></p>
                      {event.quantity && <p><strong>Quantity:</strong> {event.quantity}</p>}
                      <p className="event-date">{new Date(event.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
