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
  const [error, setError] = useState("");
  const [event, setEvent] = useState(null);

  const [participants, setParticipants] = useState([]);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eligibility, setEligibility] = useState("all");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [registrationLimit, setRegistrationLimit] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [registrationFee, setRegistrationFee] = useState("0");
  const [registrationClosed, setRegistrationClosed] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await api.get(`/organizer/events/${eventId}/details`);
        if (response.data.ok) {
          const eventData = response.data.event;
          setEvent(eventData);
          setParticipants(response.data.participants || []);
          setName(eventData.name);
          setDescription(eventData.description);
          setEligibility(eventData.eligibility || "all");
          setRegistrationDeadline(formatDateTimeLocal(eventData.registrationDeadline));
          setStartAt(formatDateTimeLocal(eventData.startAt));
          setEndAt(formatDateTimeLocal(eventData.endAt));
          setRegistrationLimit(eventData.registrationLimit);
          setSelectedTags(eventData.tags || []);
          setRegistrationFee(eventData.registrationFee || "0");
          setRegistrationClosed(eventData.registrationClosed || false);
          setNewStatus(eventData.status);
          setFormFields(eventData.formSchema?.fields || []);
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
  }, [eventId]);

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const isEditDisabled = () => {
    return event?.status !== "draft";
  };

  const isPublishedEdit = () => {
    return event?.status === "published";
  };

  const isStatusChangeOnly = () => {
    return ["ongoing", "completed", "closed"].includes(event?.status);
  };

  const isFormLocked = () => {
    // Form is locked if there are registrations and it's still in draft
    return event?.status === "draft" && participants.length > 0;
  };

  const addFormField = () => {
    if (!newFieldName) {
      alert("Field name is required");
      return;
    }
    setFormFields([
      ...formFields,
      { label: newFieldName, type: newFieldType, required: false },
    ]);
    setNewFieldName("");
    setNewFieldType("text");
  };

  const removeFormField = (index) => {
    setFormFields(formFields.filter((_, i) => i !== index));
  };

  const moveFormField = (index, direction) => {
    const newFields = [...formFields];
    if (direction === "up" && index > 0) {
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else if (direction === "down" && index < newFields.length - 1) {
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }
    setFormFields(newFields);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const payload = {};

      if (isStatusChangeOnly()) {
        // Only status changes allowed
        if (newStatus !== event.status) {
          payload.status = newStatus;
        }
      } else if (isPublishedEdit()) {
        // Published: only description, deadline, limit
        if (description !== event.description) payload.description = description;
        if (registrationDeadline) payload.registrationDeadline = registrationDeadline;
        if (registrationLimit) payload.registrationLimit = Number(registrationLimit);
        payload.registrationClosed = registrationClosed;
      } else if (event?.status === "draft") {
        // Draft: all fields
        payload.name = name;
        payload.description = description;
        payload.eligibility = eligibility;
        payload.registrationDeadline = registrationDeadline;
        payload.startAt = startAt;
        payload.endAt = endAt;
        payload.registrationLimit = Number(registrationLimit);
        payload.tags = selectedTags;
        payload.registrationFee = Number(registrationFee);
        payload.formSchema = { fields: formFields };
      }

      if (Object.keys(payload).length === 0) {
        alert("No changes made");
        return;
      }

      setSaving(true);
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
          <p>Status: <span className={`status-badge status-${event?.status}`}>{event?.status}</span></p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {isFormLocked() && (
        <div className="info-box" style={{backgroundColor: '#ffeaa7', borderColor: '#fdcb6e', color: '#d63031'}}>
          <p>🔒 Form cannot be edited after registrations have been received. You have {participants.length} registration(s).</p>
        </div>
      )}

      {isStatusChangeOnly() && (
        <div className="info-box">
          <p>This event is {event?.status}. You can only change its status.</p>
        </div>
      )}

      {isPublishedEdit() && (
        <div className="info-box">
          <p>This event is published. You can only update description, extend deadline, and increase registration limit.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="event-form">
        {/* Status Change Section */}
        {isStatusChangeOnly() && (
          <section className="form-section">
            <h2>Change Status</h2>
            <div className="form-group">
              <label>Event Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </section>
        )}

        {/* Basic Information */}
        {!isStatusChangeOnly() && (
          <>
            <section className="form-section">
              <h2>Basic Information</h2>

              <div className="form-group">
                <label>Event Name {!isPublishedEdit() ? "*" : ""}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Tech Hackathon 2024"
                  disabled={isPublishedEdit()}
                  required={!isPublishedEdit()}
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed event description"
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Eligibility {!isPublishedEdit() ? "*" : ""}</label>
                  <select 
                    value={eligibility} 
                    onChange={(e) => setEligibility(e.target.value)}
                    disabled={isPublishedEdit()}
                  >
                    <option value="all">All</option>
                    <option value="iiit">IIIT Students Only</option>
                    <option value="non-iiit">Non-IIIT Only</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Registration Limit *</label>
                  <input
                    type="number"
                    value={registrationLimit}
                    onChange={(e) => setRegistrationLimit(e.target.value)}
                    min="1"
                    placeholder="Max participants"
                    disabled={isPublishedEdit()}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tags {!isPublishedEdit() ? "*" : ""}</label>
                <div className="tags-selector">
                  {PREDEFINED_INTERESTS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-option ${selectedTags.includes(tag) ? "selected" : ""}`}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        );
                      }}
                      disabled={isPublishedEdit()}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Dates */}
            <section className="form-section">
              <h2>Dates & Deadlines</h2>

              <div className="form-row">
                <div className="form-group">
                  <label>Registration Deadline *</label>
                  <input
                    type="datetime-local"
                    value={registrationDeadline}
                    onChange={(e) => setRegistrationDeadline(e.target.value)}
                    disabled={isPublishedEdit()}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Event Start Date {!isPublishedEdit() ? "*" : ""}</label>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    disabled={isPublishedEdit()}
                    required={!isPublishedEdit()}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Event End Date {!isPublishedEdit() ? "*" : ""}</label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    disabled={isPublishedEdit()}
                    required={!isPublishedEdit()}
                  />
                </div>
              </div>

              {event?.status === "published" && (
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={registrationClosed}
                      onChange={(e) => setRegistrationClosed(e.target.checked)}
                    />
                    Close Registrations
                  </label>
                </div>
              )}
            </section>

            {/* Registration Details */}
            {event?.type === "normal" && (
              <section className="form-section">
                <h2>Registration Details</h2>

                <div className="form-group">
                  <label>Registration Fee (₹)</label>
                  <input
                    type="number"
                    value={registrationFee}
                    onChange={(e) => setRegistrationFee(e.target.value)}
                    min="0"
                    step="10"
                    placeholder="0 for free"
                    disabled={isPublishedEdit()}
                  />
                </div>

                {/* Custom Registration Form */}
                {!isPublishedEdit() && (
                  <div className="form-subsection">
                    <h3>Custom Registration Form</h3>
                    {isFormLocked() && <p style={{color: '#d63031', fontWeight: '500'}}>🔒 Form fields are locked after registrations</p>}

                    <div className="form-group">
                      <label>Add Form Field</label>
                      <div className="field-input-group">
                        <input
                          type="text"
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          placeholder="Field name (e.g., College ID)"
                          disabled={isFormLocked()}
                        />
                        <select 
                          value={newFieldType} 
                          onChange={(e) => setNewFieldType(e.target.value)}
                          disabled={isFormLocked()}
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="dropdown">Dropdown</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        <button 
                          type="button" 
                          onClick={addFormField} 
                          className="add-btn"
                          disabled={isFormLocked()}
                        >
                          Add Field
                        </button>
                      </div>
                    </div>

                    {formFields.length > 0 && (
                      <div className="fields-list">
                        <h4>Form Fields ({formFields.length})</h4>
                        {formFields.map((field, index) => (
                          <div key={index} className="field-item">
                            <div className="field-info">
                              <span className="field-label">{field.label}</span>
                              <span className="field-type">{field.type}</span>
                            </div>
                            <div className="field-actions">
                              <button
                                type="button"
                                onClick={() => moveFormField(index, "up")}
                                disabled={index === 0 || isFormLocked()}
                                title="Move up"
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                onClick={() => moveFormField(index, "down")}
                                disabled={index === formFields.length - 1 || isFormLocked()}
                                title="Move down"
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFormField(index)}
                                className="remove-btn"
                                disabled={isFormLocked()}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Submit Button */}
        <section className="form-section">
          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </section>
      </form>
    </div>
  );
}
