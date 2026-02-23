import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { PREDEFINED_INTERESTS } from "../../constants/interests";
import "./CreateEvent.css";

export default function EditEvent() {
  const navigate = useNavigate();
  const { id: eventId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [event, setEvent] = useState(null);

  // Form state
  const [eventType, setEventType] = useState("normal");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eligibility, setEligibility] = useState("all");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [registrationLimit, setRegistrationLimit] = useState("");
  const [originalLimit, setOriginalLimit] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  // Normal event fields
  const [registrationFee, setRegistrationFee] = useState("0");
  const [formFields, setFormFields] = useState([]);

  // Merchandise fields
  const [variants, setVariants] = useState([]);
  const [stockQty, setStockQty] = useState("0");
  const [purchaseLimit, setPurchaseLimit] = useState("1");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get(`/organizer/events/${eventId}/details`);
        if (response.data.ok) {
          const eventData = response.data.event;
          
          // Check if event can be edited
          if (["ongoing", "completed", "closed"].includes(eventData.status)) {
            alert(`Cannot edit ${eventData.status} events. Only draft and published events can be edited.`);
            navigate(`/organizer/events/${eventId}`);
            return;
          }
          
          setEvent(eventData);
          setEventType(eventData.type || "normal");
          setName(eventData.name);
          setDescription(eventData.description);
          setEligibility(eventData.eligibility || "all");
          setRegistrationDeadline(formatDateTimeLocal(eventData.registrationDeadline));
          setStartAt(formatDateTimeLocal(eventData.startAt));
          setEndAt(formatDateTimeLocal(eventData.endAt));
          setRegistrationLimit(eventData.registrationLimit);
          setOriginalLimit(eventData.registrationLimit);
          setSelectedTags(eventData.tags || []);
          
          if (eventData.type === "normal") {
            setRegistrationFee(eventData.registrationFee || "0");
            setFormFields(eventData.formSchema?.fields || []);
          } else {
            setVariants(eventData.merchandise?.variants || []);
            setStockQty(eventData.merchandise?.stockQty || "0");
            setPurchaseLimit(eventData.merchandise?.purchaseLimitPerParticipant || "1");
          }
        } else {
          setError("Failed to load event");
        }
      } catch (err) {
        setError(err.response?.data?.error || "Error loading event");
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId, navigate]);

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Convert to local time for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Calculate total stock from variants
  const calculateTotalStock = (variantsList) => {
    return variantsList.reduce((sum, v) => sum + Number(v.stockQty || 0), 0);
  };

  // Handle variant stock quantity change
  const handleVariantStockChange = (index, newStockQty) => {
    const updatedVariants = [...variants];
    updatedVariants[index] = { ...updatedVariants[index], stockQty: Number(newStockQty) };
    setVariants(updatedVariants);
    // Auto-update total stock
    setStockQty(calculateTotalStock(updatedVariants).toString());
  };

  // Handle form field changes
  const handleAddFormField = () => {
    setFormFields([...formFields, { label: "", type: "text", required: false }]);
  };

  const handleRemoveFormField = (index) => {
    setFormFields(formFields.filter((_, idx) => idx !== index));
  };

  const handleFormFieldChange = (index, field, value) => {
    const updatedFields = [...formFields];
    updatedFields[index] = { ...updatedFields[index], [field]: value };
    setFormFields(updatedFields);
  };

  // Handle tag changes
  const handleAddTag = () => {
    setSelectedTags([...selectedTags, ""]);
  };

  const handleRemoveTag = (index) => {
    setSelectedTags(selectedTags.filter((_, idx) => idx !== index));
  };

  const handleTagChange = (index, value) => {
    const updatedTags = [...selectedTags];
    updatedTags[index] = value;
    setSelectedTags(updatedTags);
  };

  const handlePublish = async () => {
    if (!window.confirm("Are you sure you want to publish this event? Once published, you cannot change it back to draft.")) {
      return;
    }

    setError("");
    setPublishing(true);

    const payload = {
      registrationDeadline: new Date(registrationDeadline).toISOString(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      registrationLimit: Number(registrationLimit),
      tags: selectedTags,
      status: "published"
    };

    if (eventType === "merch") {
      payload.merchandise = {
        ...event.merchandise,
        stockQty: Number(stockQty),
        variants: variants,
      };
    }

    try {
      const response = await api.put(`/events/${eventId}`, payload);
      
      if (response.data.ok) {
        alert("Event published successfully!");
        navigate(`/organizer/events/${eventId}`);
      } else {
        setError(response.data.error || "Failed to publish event");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error publishing event");
    } finally {
      setPublishing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate registration limit can only increase for published events
    if (event?.status === "published" && Number(registrationLimit) < Number(originalLimit)) {
      setError(`Registration limit cannot be decreased below ${originalLimit}`);
      return;
    }

    const payload = {
      registrationDeadline: new Date(registrationDeadline).toISOString(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      registrationLimit: Number(registrationLimit),
      tags: selectedTags,
    };

    // For draft events, allow editing more fields
    if (event?.status === "draft") {
      payload.name = name;
      payload.description = description;
      payload.eligibility = eligibility;
      
      if (eventType === "normal") {
        payload.registrationFee = Number(registrationFee);
        payload.formSchema = { fields: formFields };
      }
    }

    // For merchandise, include stock quantity and updated variants
    if (eventType === "merch") {
      payload.merchandise = {
        ...event.merchandise,
        stockQty: Number(stockQty),
        variants: variants,
      };
    }

    setSaving(true);

    try {
      const response = await api.put(`/events/${eventId}`, payload);
      
      if (response.data.ok) {
        alert("Event updated successfully!");
        navigate(`/organizer/events/${eventId}`);
      } else {
        setError(response.data.error || "Failed to update event");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error updating event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading event...</div>;

  return (
    <div className="create-event-container">
      <div className="create-event-header">
        <button className="back-btn" onClick={() => navigate(`/organizer/events/${eventId}`)}>
          ← Back
        </button>
        <div>
          <h1>Edit Event</h1>
          <p>Update event details (limited fields editable after publishing)</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {event?.status === "published" && (
        <div className="info-box" style={{backgroundColor: '#e3f2fd', borderColor: '#2196f3'}}>
          <p>ℹ️ <strong>Published events have limited editability.</strong> You can only update: Registration Limit (increase only), Tags, Dates & Deadlines{eventType === "merch" ? ", and Stock Quantity" : ""}.</p>
        </div>
      )}

      {event?.status === "draft" && (
        <div className="info-box" style={{backgroundColor: '#fff3cd', borderColor: '#ffc107'}}>
          <p>📝 <strong>This event is still a draft.</strong> You can edit all fields. Click "Publish Event" to make it public.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="event-form">
        {/* Event Type Display (Read-only) */}
        <section className="form-section">
          <h2>Event Type</h2>
          <div className="type-selector">
            <div className={`type-option active`} style={{opacity: 0.7, cursor: 'default'}}>
              <span className="type-title">{eventType === "normal" ? "Normal Event" : "Merchandise Event"}</span>
              <span className="type-desc">{eventType === "normal" ? "Registration-based event" : "Merchandise sales"}</span>
            </div>
          </div>
          <small className="form-help">Event type cannot be changed</small>
        </section>

        {/* Basic Information */}
        <section className="form-section">
          <h2>Basic Information {event?.status === "published" && "(Read-only)"}</h2>

          <div className="form-group">
            <label>Event Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={event?.status === "published"}
              style={event?.status === "published" ? {backgroundColor: '#f5f5f5', cursor: 'not-allowed'} : {}}
            />
            {event?.status === "published" && <small className="form-help">Cannot be changed after publishing</small>}
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={event?.status === "published"}
              rows="4"
              style={event?.status === "published" ? {backgroundColor: '#f5f5f5', cursor: 'not-allowed'} : {}}
            />
            {event?.status === "published" && <small className="form-help">Cannot be changed after publishing</small>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Eligibility</label>
              <select 
                value={eligibility}
                onChange={(e) => setEligibility(e.target.value)}
                disabled={event?.status === "published"}
                style={event?.status === "published" ? {backgroundColor: '#f5f5f5', cursor: 'not-allowed'} : {}}
              >
                <option value="all">All</option>
                <option value="iiit">IIIT Students Only</option>
                <option value="non-iiit">Non-IIIT Only</option>
              </select>
              {event?.status === "published" && <small className="form-help">Cannot be changed after publishing</small>}
            </div>

            <div className="form-group">
              <label>Registration Limit *</label>
              <input
                type="number"
                value={registrationLimit}
                onChange={(e) => setRegistrationLimit(e.target.value)}
                min={originalLimit}
                placeholder="Max participants"
                required
              />
              <small className="form-help">Can only be increased (minimum: {originalLimit})</small>
            </div>
          </div>

          <div className="form-group">
            <label>Event Tags</label>
            {selectedTags.map((tag, idx) => (
              <div key={idx} style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
                <select
                  value={tag}
                  onChange={(e) => handleTagChange(idx, e.target.value)}
                  style={{flex: 1}}
                >
                  <option value="">Select a tag</option>
                  {PREDEFINED_INTERESTS.map((interest) => (
                    <option key={interest} value={interest}>
                      {interest}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(idx)}
                  className="cancel-btn"
                  style={{padding: '8px 16px'}}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleAddTag}
              className="submit-btn"
              style={{backgroundColor: '#2196f3', marginTop: '10px'}}
            >
              + Add Tag
            </button>
          </div>
        </section>

        {/* Dates & Deadlines (Editable) */}
        <section className="form-section">
          <h2>Dates & Deadlines *</h2>

          <div className="form-row">
            <div className="form-group">
              <label>Registration Deadline *</label>
              <input
                type="datetime-local"
                value={registrationDeadline}
                onChange={(e) => setRegistrationDeadline(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Event Start Date *</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Event End Date *</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        {/* Normal Event Details */}
        {eventType === "normal" && (
          <section className="form-section">
            <h2>Registration Details {event?.status === "published" && "(Read-only)"}</h2>

            <div className="form-group">
              <label>Registration Fee (₹)</label>
              <input
                type="number"
                value={registrationFee}
                onChange={(e) => setRegistrationFee(e.target.value)}
                disabled={event?.status === "published"}
                style={event?.status === "published" ? {backgroundColor: '#f5f5f5', cursor: 'not-allowed'} : {}}
              />
              {event?.status === "published" && <small className="form-help">Cannot be changed after publishing</small>}
            </div>

            <div className="form-subsection">
              <h3>Custom Registration Form Fields</h3>
              {event?.status === "draft" ? (
                <>
                  {formFields.map((field, idx) => (
                    <div key={idx} className="form-field-builder" style={{marginBottom: '15px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px'}}>
                      <div className="form-row">
                        <div className="form-group" style={{flex: 2}}>
                          <label>Field Label</label>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleFormFieldChange(idx, 'label', e.target.value)}
                            placeholder="e.g., Phone Number"
                          />
                        </div>
                        <div className="form-group" style={{flex: 1}}>
                          <label>Field Type</label>
                          <select
                            value={field.type}
                            onChange={(e) => handleFormFieldChange(idx, 'type', e.target.value)}
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="number">Number</option>
                            <option value="tel">Phone</option>
                            <option value="date">Date</option>
                            <option value="textarea">Long Text</option>
                          </select>
                        </div>
                        <div className="form-group" style={{flex: 1, display: 'flex', alignItems: 'flex-end'}}>
                          <label style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                            <input
                              type="checkbox"
                              checked={field.required || false}
                              onChange={(e) => handleFormFieldChange(idx, 'required', e.target.checked)}
                            />
                            Required
                          </label>
                        </div>
                        <div style={{display: 'flex', alignItems: 'flex-end'}}>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormField(idx)}
                            className="cancel-btn"
                            style={{padding: '8px 12px', fontSize: '14px'}}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddFormField}
                    className="submit-btn"
                    style={{marginTop: '10px', backgroundColor: '#2196f3'}}
                  >
                    + Add Form Field
                  </button>
                </>
              ) : (
                <>
                  {formFields.length > 0 ? (
                    <ul className="fields-list">
                      {formFields.map((field, idx) => (
                        <li key={idx} className="field-item">
                          <span>
                            {field.label} <em>({field.type})</em>
                            {field.required && <strong> *</strong>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{color: '#666'}}>No custom form fields</p>
                  )}
                  <small className="form-help">Form fields cannot be modified after publishing</small>
                </>
              )}
            </div>
          </section>
        )}

        {/* Merchandise Details */}
        {eventType === "merch" && (
          <section className="form-section">
            <h2>Merchandise Details</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Total Stock Quantity (Calculated)</label>
                <input
                  type="number"
                  value={stockQty}
                  disabled
                  style={{backgroundColor: '#f5f5f5', cursor: 'not-allowed'}}
                />
                <small className="form-help">Auto-calculated from variant stock quantities below</small>
              </div>

              <div className="form-group">
                <label>Purchase Limit Per Participant</label>
                <input
                  type="number"
                  value={purchaseLimit}
                  disabled
                  style={{backgroundColor: '#f5f5f5', cursor: 'not-allowed'}}
                />
                <small className="form-help">Cannot be changed after publishing</small>
              </div>
            </div>

            {variants.length > 0 && (
              <div className="form-subsection">
                <h3>Merchandise Variants</h3>
                <div className="variants-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Color</th>
                        <th>SKU</th>
                        <th>Price (₹)</th>
                        <th>Stock Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, idx) => (
                        <tr key={idx}>
                          <td>{v.size}</td>
                          <td>{v.color}</td>
                          <td>{v.sku}</td>
                          <td>₹{v.price}</td>
                          <td>
                            <input
                              type="number"
                              value={v.stockQty}
                              onChange={(e) => handleVariantStockChange(idx, e.target.value)}
                              min="0"
                              style={{width: '80px', padding: '5px'}}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <small className="form-help">Update stock quantities for each variant. Total is calculated automatically.</small>
              </div>
            )}
          </section>
        )}

        {/* Submit */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate(`/organizer/events/${eventId}`)}
            className="cancel-btn"
          >
            Cancel
          </button>
          {event?.status === "draft" && (
            <button 
              type="button" 
              onClick={handlePublish} 
              className="submit-btn"
              style={{backgroundColor: '#4caf50', marginRight: '10px'}}
              disabled={publishing || saving}
            >
              {publishing ? "Publishing..." : "📢 Publish Event"}
            </button>
          )}
          <button type="submit" className="submit-btn" disabled={saving || publishing}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
