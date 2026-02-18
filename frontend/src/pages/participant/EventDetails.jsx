import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./EventDetails.css";

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [ticketData, setTicketData] = useState(null);

  // For merchandise
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data.event);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (registering) return;

    try {
      setRegistering(true);
      setError("");

      if (event.type === "merchandise") {
        const response = await api.post(`/events/${id}/purchase`, { quantity });
        setTicketData(response.data.registration);
      } else {
        const response = await api.post(`/events/${id}/register`);
        setTicketData(response.data.registration);
      }

      setRegistrationSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="event-details-container">
          <div className="loading">Loading event...</div>
        </div>
      </>
    );
  }

  if (error && !event) {
    return (
      <>
        <Navbar />
        <div className="event-details-container">
          <div className="error">{error}</div>
          <button onClick={() => navigate("/events")} className="back-btn">
            Back to Events
          </button>
        </div>
      </>
    );
  }

  if (registrationSuccess) {
    return (
      <>
        <Navbar />
        <div className="event-details-container">
          <div className="success-screen">
            <h1>✅ Registration Successful!</h1>
            <div className="ticket-info">
              <h2>{event.name}</h2>
              <p><strong>Ticket ID:</strong> {ticketData.ticketId}</p>
              <p><strong>Status:</strong> {ticketData.status}</p>
              {ticketData.qrCode && (
                <div className="qr-code">
                  <h3>Your QR Code:</h3>
                  <img src={ticketData.qrCode} alt="QR Code" />
                  <p className="qr-hint">Show this at the event entrance</p>
                </div>
              )}
              {ticketData.quantity && (
                <p><strong>Quantity:</strong> {ticketData.quantity}</p>
              )}
            </div>
            <div className="success-actions">
              <button onClick={() => navigate("/dashboard")} className="primary-btn">
                Go to Dashboard
              </button>
              <button onClick={() => navigate("/events")} className="secondary-btn">
                Browse More Events
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="event-details-container">
        <button onClick={() => navigate("/events")} className="back-btn">
          ← Back to Events
        </button>

        <div className="event-header">
          <div className="event-badge">{event.type}</div>
          <h1>{event.name}</h1>
          <p className="organizer-name">by {event.organizerId?.name || "Unknown Organizer"}</p>
        </div>

        <div className="event-body">
          <section className="event-section">
            <h2>Description</h2>
            <p>{event.description}</p>
          </section>

          <section className="event-section">
            <h2>Event Details</h2>
            <div className="details-grid">
              <div className="detail-item">
                <strong>Start Date:</strong>
                <span>{new Date(event.startAt).toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <strong>End Date:</strong>
                <span>{new Date(event.endAt).toLocaleString()}</span>
              </div>
              <div className="detail-item">
                <strong>Eligibility:</strong>
                <span>{event.eligibility === "iiith-only" ? "IIIT-H Only" : "Open to All"}</span>
              </div>
              {event.type === "merchandise" && (
                <>
                  <div className="detail-item">
                    <strong>Price:</strong>
                    <span className="price">₹{event.price}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Stock Available:</strong>
                    <span>{event.stock}</span>
                  </div>
                </>
              )}
              {event.type === "normal" && event.maxParticipants && (
                <div className="detail-item">
                  <strong>Max Participants:</strong>
                  <span>{event.maxParticipants}</span>
                </div>
              )}
            </div>
          </section>

          {event.customFields && event.customFields.length > 0 && (
            <section className="event-section">
              <h2>Additional Information</h2>
              <div className="custom-fields">
                {event.customFields.map((field, index) => (
                  <div key={index} className="custom-field">
                    <strong>{field.label}:</strong>
                    <span>{field.value || "N/A"}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="event-section registration-section">
            <h2>Register for this Event</h2>
            {error && <div className="error">{error}</div>}

            {event.type === "merchandise" && (
              <div className="quantity-selector">
                <label htmlFor="quantity">Quantity:</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={event.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  disabled={registering}
                />
                <p className="total-price">Total: ₹{event.price * quantity}</p>
              </div>
            )}

            <button
              onClick={handleRegister}
              disabled={registering || (event.type === "merchandise" && event.stock === 0)}
              className="register-btn"
            >
              {registering
                ? "Processing..."
                : event.type === "merchandise"
                ? event.stock === 0
                  ? "Out of Stock"
                  : "Purchase Now"
                : "Register Now"}
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
