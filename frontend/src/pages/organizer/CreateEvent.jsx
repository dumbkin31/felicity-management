import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { PREDEFINED_INTERESTS } from "../../constants/interests";
import "./CreateEvent.css";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [eventType, setEventType] = useState("normal");
  const [status, setStatus] = useState("draft");

  // Common fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eligibility, setEligibility] = useState("all");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [registrationLimit, setRegistrationLimit] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);

  // Normal event fields
  const [registrationFee, setRegistrationFee] = useState("0");
  const [formFields, setFormFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  // Merchandise fields
  const [variants, setVariants] = useState([]);
  const [stockQty, setStockQty] = useState("0");
  const [purchaseLimit, setPurchaseLimit] = useState("1");
  const [newVariant, setNewVariant] = useState({
    size: "",
    color: "",
    sku: "",
    price: "",
    stockQty: "",
  });

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

  const addVariant = () => {
    if (!newVariant.size || !newVariant.color || !newVariant.sku || !newVariant.price || !newVariant.stockQty) {
      alert("All variant fields are required");
      return;
    }
    setVariants([
      ...variants,
      {
        size: newVariant.size,
        color: newVariant.color,
        sku: newVariant.sku,
        price: Number(newVariant.price),
        stockQty: Number(newVariant.stockQty),
      },
    ]);
    setNewVariant({ size: "", color: "", sku: "", price: "", stockQty: "" });
  };

  const removeVariant = (index) => {
    setVariants(variants.filter((_, i) => i !== index));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name || !description || !registrationDeadline || !startAt || !endAt || !registrationLimit) {
      setError("All basic fields are required");
      return;
    }

    if (eventType === "normal" && formFields.length === 0) {
      alert("Note: You haven't added any custom form fields. Registration will only collect email/name.");
    }

    if (eventType === "merch" && variants.length === 0) {
      setError("At least one merchandise variant is required");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name,
        description,
        type: eventType,
        eligibility,
        registrationDeadline,
        startAt,
        endAt,
        registrationLimit: Number(registrationLimit),
        tags: selectedTags,
        status,
      };

      if (eventType === "normal") {
        payload.registrationFee = Number(registrationFee);
        payload.formSchema = { fields: formFields };
      } else {
        payload.merchandise = {
          variants,
          stockQty: Number(stockQty),
          purchaseLimitPerParticipant: Number(purchaseLimit),
        };
      }

      const response = await api.post("/events", payload);
      if (response.data.ok) {
        alert("Event created successfully!");
        navigate("/organizer/dashboard");
      } else {
        setError(response.data.error || "Failed to create event");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error creating event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-container">
      <div className="create-event-header">
        <button className="back-btn" onClick={() => navigate("/organizer/dashboard")}>
          ← Back
        </button>
        <div>
          <h1>Create New Event</h1>
          <p>Build and configure your event</p>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="event-form">
        {/* Event Type Selection */}
        <section className="form-section">
          <h2>Event Type</h2>
          <div className="type-selector">
            <label className={`type-option ${eventType === "normal" ? "active" : ""}`}>
              <input
                type="radio"
                value="normal"
                checked={eventType === "normal"}
                onChange={(e) => setEventType(e.target.value)}
              />
              <span className="type-title">Normal Event</span>
              <span className="type-desc">Registration-based event with custom forms</span>
            </label>
            <label className={`type-option ${eventType === "merch" ? "active" : ""}`}>
              <input
                type="radio"
                value="merch"
                checked={eventType === "merch"}
                onChange={(e) => setEventType(e.target.value)}
              />
              <span className="type-title">Merchandise Event</span>
              <span className="type-desc">Sell merchandise with variants</span>
            </label>
          </div>
        </section>

        {/* Basic Information */}
        <section className="form-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label>Event Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Tech Hackathon 2024"
              required
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
              <label>Eligibility</label>
              <select value={eligibility} onChange={(e) => setEligibility(e.target.value)}>
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
                required
              />
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

        {/* Normal Event Specific */}
        {eventType === "normal" && (
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
              />
            </div>

            <div className="form-subsection">
              <h3>Custom Registration Form</h3>
              <p className="help-text">Add additional fields to collect participant information</p>

              <div className="form-row">
                <div className="form-group">
                  <label>Field Name</label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g., Phone Number, College"
                  />
                </div>

                <div className="form-group">
                  <label>Field Type</label>
                  <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)}>
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="number">Number</option>
                    <option value="textarea">Long Text</option>
                    <option value="select">Dropdown</option>
                  </select>
                </div>

                <button type="button" onClick={addFormField} className="add-btn">
                  Add Field
                </button>
              </div>

              {formFields.length > 0 && (
                <div className="fields-list">
                  <h4>Form Fields ({formFields.length})</h4>
                  <ul>
                    {formFields.map((field, idx) => (
                      <li key={idx} className="field-item">
                        <span>
                          {field.label} <em>({field.type})</em>
                        </span>
                        <div className="field-actions">
                          <button
                            type="button"
                            onClick={() => moveFormField(idx, "up")}
                            disabled={idx === 0}
                            title="Move up"
                            className="action-btn"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFormField(idx, "down")}
                            disabled={idx === formFields.length - 1}
                            title="Move down"
                            className="action-btn"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFormField(idx)}
                            className="remove-btn"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Merchandise Event Specific */}
        {eventType === "merch" && (
          <section className="form-section">
            <h2>Merchandise Details</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Total Stock Quantity</label>
                <input
                  type="number"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  min="0"
                  placeholder="Total items available"
                />
              </div>

              <div className="form-group">
                <label>Purchase Limit Per Participant</label>
                <input
                  type="number"
                  value={purchaseLimit}
                  onChange={(e) => setPurchaseLimit(e.target.value)}
                  min="1"
                  placeholder="Max items per person"
                />
              </div>
            </div>

            <div className="form-subsection">
              <h3>Merchandise Variants</h3>
              <p className="help-text">Add different sizes, colors, or options available</p>

              <div className="variant-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Size</label>
                    <input
                      type="text"
                      value={newVariant.size}
                      onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                      placeholder="e.g., S, M, L, XL"
                    />
                  </div>

                  <div className="form-group">
                    <label>Color</label>
                    <input
                      type="text"
                      value={newVariant.color}
                      onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                      placeholder="e.g., Black, Blue"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>SKU</label>
                    <input
                      type="text"
                      value={newVariant.sku}
                      onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                      placeholder="e.g., TSHIRT-BLK-M"
                    />
                  </div>

                  <div className="form-group">
                    <label>Price (₹)</label>
                    <input
                      type="number"
                      value={newVariant.price}
                      onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                      min="0"
                      step="10"
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock Qty</label>
                    <input
                      type="number"
                      value={newVariant.stockQty}
                      onChange={(e) => setNewVariant({ ...newVariant, stockQty: e.target.value })}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button type="button" onClick={addVariant} className="add-btn">
                  Add Variant
                </button>
              </div>

              {variants.length > 0 && (
                <div className="variants-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Color</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, idx) => (
                        <tr key={idx}>
                          <td>{v.size}</td>
                          <td>{v.color}</td>
                          <td>{v.sku}</td>
                          <td>₹{v.price}</td>
                          <td>{v.stockQty}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="remove-btn"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Status Selection */}
        <section className="form-section">
          <h2>Publish Status</h2>
          <div className="status-selector">
            <label>
              <input
                type="radio"
                value="draft"
                checked={status === "draft"}
                onChange={(e) => setStatus(e.target.value)}
              />
              <span>Save as Draft</span>
              <span className="status-desc">Hidden from participants; can edit later</span>
            </label>
            <label>
              <input
                type="radio"
                value="published"
                checked={status === "published"}
                onChange={(e) => setStatus(e.target.value)}
              />
              <span>Publish Now</span>
              <span className="status-desc">Visible to participants immediately</span>
            </label>
          </div>
        </section>

        {/* Submit */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate("/organizer/dashboard")}
            className="cancel-btn"
          >
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Creating..." : "Create Event"}
          </button>
        </div>
      </form>
    </div>
  );
}
