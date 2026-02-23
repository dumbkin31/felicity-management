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
  const [existingRegistration, setExistingRegistration] = useState(null);
  const [canRegister, setCanRegister] = useState(true);
  const [blockingReasons, setBlockingReasons] = useState(null);

  // For merchandise
  const [quantity, setQuantity] = useState(1);

  // For custom form fields
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchEventDetails();
    checkExistingRegistration();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      const response = await api.get(`/events/${id}`);
      setEvent(response.data.event);
      setCanRegister(response.data.canRegister ?? true);
      setBlockingReasons(response.data.reasons || null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const checkExistingRegistration = async () => {
    try {
      const response = await api.get("/participants/dashboard");
      const dashboard = response.data.dashboard;
      const allRegistrations = [
        ...(dashboard?.upcoming || []),
        ...(dashboard?.history?.normal || []),
        ...(dashboard?.history?.merchandise || []),
        ...(dashboard?.history?.completed || []),
        ...(dashboard?.history?.cancelled || []),
      ];
      const registration = allRegistrations.find((reg) => reg.eventId === id);
      if (registration) {
        setExistingRegistration(registration);
      }
    } catch (err) {
      console.error("Failed to check registration:", err);
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
        // Validate required fields
        const requiredFields = event.formSchema?.fields?.filter(f => f.required) || [];
        for (const field of requiredFields) {
          if (!formData[field.label]) {
            setError(`${field.label} is required`);
            setRegistering(false);
            return;
          }
        }

        const response = await api.post(`/events/${id}/register`, { formData });
        setTicketData(response.data.registration);
      }

      setRegistrationSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleFormFieldChange = (fieldLabel, value) => {
    setFormData(prev => ({ ...prev, [fieldLabel]: value }));
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
                    <span className="price">₹{event.merchandise?.price || event.price || 0}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Stock Available:</strong>
                    <span>{event.merchandise?.stockQty ?? event.stock ?? 0}</span>
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

          {existingRegistration ? (
            <section className="event-section registration-section">
              <h2>Your Registration</h2>
              <div className="registration-details">
                <div className="detail-item">
                  <strong>Ticket ID:</strong>
                  <span>{existingRegistration.ticketId}</span>
                </div>
                <div className="detail-item">
                  <strong>Status:</strong>
                  <span className="status-badge">{existingRegistration.status}</span>
                </div>
                {existingRegistration.teamName && (
                  <div className="detail-item">
                    <strong>Team Name:</strong>
                    <span>{existingRegistration.teamName}</span>
                  </div>
                )}
                {existingRegistration.quantity && (
                  <div className="detail-item">
                    <strong>Quantity:</strong>
                    <span>{existingRegistration.quantity}</span>
                  </div>
                )}
                {existingRegistration.qrCode && (
                  <div className="qr-code">
                    <h3>Your QR Code:</h3>
                    <img src={existingRegistration.qrCode} alt="QR Code" />
                    <p className="qr-hint">Show this at the event entrance</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="event-section registration-section">
              <h2>Register for this Event</h2>
              {error && <div className="error">{error}</div>}

              {!canRegister && blockingReasons && (
                <div className="blocking-warnings">
                  {blockingReasons.deadlinePassed && (
                    <div className="warning-message">
                      ⚠️ Registration deadline has passed
                    </div>
                  )}
                  {blockingReasons.limitReached && (
                    <div className="warning-message">
                      ⚠️ Registration limit reached
                    </div>
                  )}
                  {blockingReasons.stockExhausted && (
                    <div className="warning-message">
                      ⚠️ Stock exhausted
                    </div>
                  )}
                  {blockingReasons.notPublished && (
                    <div className="warning-message">
                      ⚠️ Event not published yet
                    </div>
                  )}
                </div>
              )}

              {event.type === "normal" && event.formSchema?.fields?.length > 0 && (
                <div className="custom-form">
                  <h3>Registration Form</h3>
                  {event.formSchema.fields.map((field, index) => (
                    <div key={index} className="form-group">
                      <label htmlFor={`field-${index}`}>
                        {field.label}
                        {field.required && <span className="required">*</span>}
                      </label>
                      {field.type === "textarea" ? (
                        <textarea
                          id={`field-${index}`}
                          value={formData[field.label] || ""}
                          onChange={(e) => handleFormFieldChange(field.label, e.target.value)}
                          required={field.required}
                          disabled={registering}
                          rows="4"
                        />
                      ) : field.type === "checkbox" ? (
                        <input
                          id={`field-${index}`}
                          type="checkbox"
                          checked={formData[field.label] || false}
                          onChange={(e) => handleFormFieldChange(field.label, e.target.checked)}
                          disabled={registering}
                        />
                      ) : (
                        <input
                          id={`field-${index}`}
                          type={field.type || "text"}
                          value={formData[field.label] || ""}
                          onChange={(e) => handleFormFieldChange(field.label, e.target.value)}
                          required={field.required}
                          disabled={registering}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {event.type === "merchandise" && (
                <div className="quantity-selector">
                  <label htmlFor="quantity">Quantity:</label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    max={event.merchandise?.stockQty ?? event.stock ?? 1}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    disabled={registering}
                  />
                  <p className="total-price">Total: ₹{(event.merchandise?.price || event.price || 0) * quantity}</p>
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={registering || !canRegister}
                className="register-btn"
              >
                {registering
                  ? "Processing..."
                  : !canRegister
                  ? "Registration Closed"
                  : event.type === "merchandise"
                  ? "Purchase Now"
                  : "Register Now"}
              </button>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
