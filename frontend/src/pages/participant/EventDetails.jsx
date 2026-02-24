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
  const [registrationId, setRegistrationId] = useState(null);
  const [existingRegistration, setExistingRegistration] = useState(null);
  const [canRegister, setCanRegister] = useState(true);
  const [blockingReasons, setBlockingReasons] = useState(null);

  // For merchandise
  const [variantQuantities, setVariantQuantities] = useState({});

  // For custom form fields
  const [formData, setFormData] = useState({});

  // For payment
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

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

      if (event.type === "merch") {
        // Check if at least one variant has quantity selected
        const totalQty = Object.values(variantQuantities).reduce((sum, q) => sum + q, 0);
        if (totalQty === 0) {
          setError("Please select quantity for at least one variant");
          setRegistering(false);
          return;
        }

        // Check purchase limit per participant
        const purchaseLimit = event.merchandise?.purchaseLimitPerParticipant || 1;
        if (totalQty > purchaseLimit) {
          setError(`Maximum ${purchaseLimit} item(s) per participant. You selected ${totalQty}`);
          setRegistering(false);
          return;
        }

        // Build variant purchases array
        const purchases = event.merchandise.variants
          .map((variant, idx) => ({
            variantIndex: idx,
            size: variant.size,
            color: variant.color,
            sku: variant.sku,
            price: variant.price,
            quantity: variantQuantities[idx] || 0
          }))
          .filter(p => p.quantity > 0);

        const response = await api.post(`/events/${id}/purchase`, { purchases });
        setTicketData(response.data.registration);
        setRegistrationId(response.data.registration._id);
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
        setRegistrationId(response.data.registration._id);
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

  const handleVariantQuantityChange = (variantIndex, qty) => {
    setVariantQuantities(prev => ({
      ...prev,
      [variantIndex]: Math.max(0, parseInt(qty) || 0)
    }));
  };

  const handleUploadPaymentProof = async (registrationId, file) => {
    if (!file) {
      setPaymentError("Please select a payment proof file");
      return;
    }

    try {
      setUploadingProof(true);
      setPaymentError("");
      setPaymentSuccess("");
      
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result;
          const response = await api.post(
            `/participants/registrations/${registrationId}/payment-proof`,
            { paymentProof: base64String }
          );

          if (response.data.ok) {
            setPaymentSuccess("Payment proof uploaded successfully! Waiting for organizer approval...");
            setPaymentProof(null);
          }
        } catch (err) {
          setPaymentError(err.response?.data?.error || "Failed to upload payment proof");
        } finally {
          setUploadingProof(false);
        }
      };
      reader.onerror = () => {
        setPaymentError("Failed to read file");
        setUploadingProof(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setPaymentError("Error processing file");
      setUploadingProof(false);
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
    const requiresPayment = event.registrationFee > 0 || event.type === "merch";

    return (
      <>
        <Navbar />
        <div className="event-details-container">
          <div className="success-screen">
            <h1>✅ Registration Successful!</h1>
            <div className="ticket-info">
              <h2>{event.name}</h2>
              {ticketData.ticketId && (
                <p><strong>Ticket ID:</strong> {ticketData.ticketId}</p>
              )}
              <p><strong>Status:</strong> {ticketData.status}</p>

              {requiresPayment && ticketData.status === "pending_payment" && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '5px' }}>
                  <h3>⏳ Payment Required</h3>
                  <p>Please upload your payment proof to complete the registration.</p>
                  
                  {paymentError && <div style={{ color: '#d32f2f', marginBottom: '10px', fontWeight: 'bold' }}>❌ {paymentError}</div>}
                  {paymentSuccess && <div style={{ color: '#4caf50', marginBottom: '10px', fontWeight: 'bold' }}>✅ {paymentSuccess}</div>}
                  
                  <div style={{ marginTop: '15px' }}>
                    <label htmlFor="payment-proof" style={{ display: 'block', marginBottom: '10px' }}>
                      <strong>Upload Payment Screenshot:</strong>
                    </label>
                    <input
                      id="payment-proof"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                      disabled={uploadingProof}
                      style={{ marginBottom: '10px' }}
                    />
                    <button
                      onClick={() => handleUploadPaymentProof(ticketData._id, paymentProof)}
                      disabled={uploadingProof || !paymentProof}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: uploadingProof || !paymentProof ? 'not-allowed' : 'pointer',
                        opacity: uploadingProof || !paymentProof ? 0.6 : 1,
                        fontWeight: 'bold'
                      }}
                    >
                      {uploadingProof ? "Uploading..." : "Submit Payment Proof"}
                    </button>
                  </div>

                  <p style={{ marginTop: '15px', fontSize: '0.9em', color: '#666' }}>
                    Your organizer will review your payment and approve/reject it. You'll receive an email notification.
                  </p>
                </div>
              )}

              {ticketData.qrCode && ticketData.status !== "pending_payment" && (
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
                <span>{event.eligibility === "iiit" ? "IIIT-H Only" : event.eligibility === "non-iiit" ? "Non-IIIT Only" : "Open to All"}</span>
              </div>
              {event.type === "merch" && (
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
              {event.type === "normal" && event.registrationFee && (
                <div className="detail-item">
                  <strong>Registration Fee:</strong>
                  <span className="price">₹{event.registrationFee}</span>
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
                  {blockingReasons.eventCompleted && (
                    <div className="warning-message">
                      ⚠️ Event has been completed
                    </div>
                  )}
                  {blockingReasons.notPublished && !blockingReasons.eventCompleted && (
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

              {event.type === "merch" && event.merchandise?.variants?.length > 0 && (
                <div className="variants-selector">
                  <h3>Select Variants</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Size</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>Color</th>
                        <th style={{ textAlign: 'left', padding: '10px' }}>SKU</th>
                        <th style={{ textAlign: 'right', padding: '10px' }}>Price</th>
                        <th style={{ textAlign: 'right', padding: '10px' }}>Stock</th>
                        <th style={{ textAlign: 'center', padding: '10px' }}>Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {event.merchandise.variants.map((variant, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{variant.size}</td>
                          <td style={{ padding: '10px' }}>{variant.color}</td>
                          <td style={{ padding: '10px' }}>{variant.sku}</td>
                          <td style={{ textAlign: 'right', padding: '10px' }}>₹{variant.price}</td>
                          <td style={{ textAlign: 'right', padding: '10px' }}>{variant.stockQty}</td>
                          <td style={{ textAlign: 'center', padding: '10px' }}>
                            <input
                              type="number"
                              min="0"
                              max={variant.stockQty}
                              value={variantQuantities[idx] || 0}
                              onChange={(e) => handleVariantQuantityChange(idx, e.target.value)}
                              disabled={registering}
                              style={{ width: '60px', padding: '5px' }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
                    {(() => {
                      const totalQty = Object.values(variantQuantities).reduce((sum, q) => sum + q, 0);
                      const purchaseLimit = event.merchandise?.purchaseLimitPerParticipant || 1;
                      const isExceeded = totalQty > purchaseLimit;
                      
                      return (
                        <>
                          <p style={{ margin: '0' }}>
                            <strong>Total Items: </strong>
                            {totalQty}
                            {purchaseLimit && (
                              <span style={{ marginLeft: '10px', color: isExceeded ? '#d32f2f' : '#666' }}>
                                / {purchaseLimit} (limit)
                              </span>
                            )}
                          </p>
                          {isExceeded && (
                            <p style={{ margin: '5px 0 0 0', color: '#d32f2f', fontSize: '0.9em' }}>
                              ⚠️ Exceeds purchase limit
                            </p>
                          )}
                          <p style={{ margin: '5px 0 0 0' }}>
                            <strong>Estimated Total: </strong>
                            ₹{event.merchandise.variants.reduce((sum, variant, idx) => 
                              sum + (variant.price * (variantQuantities[idx] || 0)), 0
                            )}
                          </p>
                        </>
                      );
                    })()}
                  </div>
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
                  : event.type === "merch"
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
