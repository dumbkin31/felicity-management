import { useState, useEffect } from "react";
import { useMessage } from "../../hooks/useMessage";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./Profile.css";

export default function OrganizerProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error, successMsg, errorMsg } = useMessage();

  // Form fields
  const [organizerName, setOrganizerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [discordWebhook, setDiscordWebhook] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/organizer/profile");
      const data = response.data.organizer;
      setProfile(data);

      // Set form values
      setOrganizerName(data.organizerName || "");
      setContactEmail(data.contactEmail || "");
      setContactNumber(data.contactNumber || "");
      setDescription(data.description || "");
      setCategory(data.category || "");
      setDiscordWebhook(data.discordWebhook || "");
    } catch (err) {
      error(err.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updates = {
        organizerName: organizerName.trim(),
        contactEmail: contactEmail.trim(),
        contactNumber: contactNumber.trim(),
        description: description.trim(),
        category: category.trim(),
        discordWebhook: discordWebhook.trim(),
      };

      await api.put("/organizer/profile", updates);
      success("Profile updated successfully!");
      setEditing(false);

      // Refresh profile
      await fetchProfile();
    } catch (err) {
      error(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="org-profile-container">
          <div className="loading">Loading profile...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="org-profile-container">
        <h1>Club Profile</h1>

        {errorMsg && <div className="error">{errorMsg}</div>}
        {successMsg && <div className="success">{successMsg}</div>}

        <section className="profile-section">
          <div className="section-header">
            <h2>Club Information</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="edit-btn">
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-group">
                <label>Club Name</label>
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., Sports, Cultural, Tech"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="5"
                  placeholder="Tell participants about your club..."
                />
              </div>

              <div className="form-group">
                <label>Discord Webhook URL</label>
                <input
                  type="url"
                  value={discordWebhook}
                  onChange={(e) => setDiscordWebhook(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                />
                <small style={{ color: "#666", marginTop: "5px" }}>
                  Leave empty to disable Discord notifications. Paste your Discord webhook URL to auto-post new events.
                </small>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving} className="save-btn">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setError("");
                    // Reset form
                    setOrganizerName(profile.organizerName || "");
                    setContactEmail(profile.contactEmail || "");
                    setContactNumber(profile.contactNumber || "");
                    setDescription(profile.description || "");
                    setCategory(profile.category || "");
                    setDiscordWebhook(profile.discordWebhook || "");
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-display">
              <div className="info-grid">
                <div className="info-item">
                  <strong>Club Name:</strong>
                  <span>{profile.organizerName}</span>
                </div>
                <div className="info-item">
                  <strong>Login Email:</strong>
                  <span>{profile.loginEmail || profile.contactEmail}</span>
                </div>
                <div className="info-item">
                  <strong>Contact Email:</strong>
                  <span>{profile.contactEmail}</span>
                </div>
                <div className="info-item">
                  <strong>Phone:</strong>
                  <span>{profile.contactNumber || "Not provided"}</span>
                </div>
                <div className="info-item">
                  <strong>Category:</strong>
                  <span>{profile.category || "Not specified"}</span>
                </div>
                <div className="info-item full-width">
                  <strong>Description:</strong>
                  <p>{profile.description || "No description"}</p>
                </div>
                <div className="info-item full-width">
                  <strong>Discord Webhook:</strong>
                  <p>{profile.discordWebhook ? "✓ Configured" : "Not configured"}</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
