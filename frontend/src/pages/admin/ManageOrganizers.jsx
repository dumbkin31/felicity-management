import { useState, useEffect } from "react";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import { PREDEFINED_INTERESTS } from "../../constants/interests";
import "./ManageOrganizers.css";

export default function ManageOrganizers() {
  const [organizers, setOrganizers] = useState([]);
  const [activeTab, setActiveTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    category: "",
    description: "",
    contactNumber: "",
  });
  const [creatingOrganizer, setCreatingOrganizer] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState({ loginEmail: "", password: "" });

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/dashboard");
      if (response.data.ok) {
        setOrganizers(response.data.dashboard.organizers || []);
      } else {
        setError(response.data.error || "Failed to load organizers");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error loading organizers");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganizerChange = (e) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateOrganizer = async (e) => {
    e.preventDefault();
    setError("");

    if (!createForm.name || !createForm.email) {
      alert("Name and email are required");
      return;
    }

    setCreatingOrganizer(true);

    try {
      const response = await api.post("/admin/organizers", {
        name: createForm.name,
        email: createForm.email,
        category: createForm.category,
        description: createForm.description,
        contactNumber: createForm.contactNumber,
      });

      if (response.data.ok) {
        setGeneratedCredentials({
          loginEmail: response.data.loginEmail,
          password: response.data.password,
        });
        setShowCredentialsModal(true);
        setCreateForm({
          name: "",
          email: "",
          category: "",
          description: "",
          contactNumber: "",
        });
        setShowCreateModal(false);
        await fetchOrganizers();
      } else {
        setError(response.data.error || "Failed to create organizer");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error creating organizer");
    } finally {
      setCreatingOrganizer(false);
    }
  };

  const handleArchiveOrganizer = async (organizerId) => {
    if (!window.confirm("Are you sure you want to archive this organizer?")) {
      return;
    }

    try {
      const response = await api.put(`/admin/organizers/${organizerId}/archive`);
      if (response.data.ok) {
        alert("Organizer archived successfully");
        await fetchOrganizers();
      } else {
        setError(response.data.error || "Failed to archive organizer");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error archiving organizer");
    }
  };

  const handleRestoreOrganizer = async (organizerId) => {
    if (!window.confirm("Are you sure you want to restore this organizer?")) {
      return;
    }

    try {
      const response = await api.put(`/admin/organizers/${organizerId}/restore`);
      if (response.data.ok) {
        alert("Organizer restored successfully");
        await fetchOrganizers();
      } else {
        setError(response.data.error || "Failed to restore organizer");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error restoring organizer");
    }
  };

  const handleDeleteOrganizer = async (organizerId) => {
    if (!window.confirm("Are you sure you want to permanently delete this organizer? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await api.delete(`/admin/organizers/${organizerId}`);
      if (response.data.ok) {
        alert("Organizer deleted successfully");
        await fetchOrganizers();
      } else {
        setError(response.data.error || "Failed to delete organizer");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error deleting organizer");
    }
  };

  const activeOrganizers = organizers.filter((org) => !org.isArchived);
  const archivedOrganizers = organizers.filter((org) => org.isArchived);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="manage-organizers-container">
          <div className="loading">Loading organizers...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="manage-organizers-container">
        <div className="organizers-header">
          <div>
            <h1>Manage Organizers</h1>
            <p>Add, edit, and remove club organizers</p>
          </div>
          <button className="create-org-btn" onClick={() => setShowCreateModal(true)}>
            + Create Organizer
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === "active" ? "active" : ""}`}
            onClick={() => setActiveTab("active")}
          >
            Active ({activeOrganizers.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "archived" ? "active" : ""}`}
            onClick={() => setActiveTab("archived")}
          >
            Archive ({archivedOrganizers.length})
          </button>
        </div>

        {activeTab === "active" && (
          activeOrganizers.length === 0 ? (
            <div className="empty-state">
              <p>No active organizers. Create one to get started!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="organizers-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Login Email</th>
                    <th>Contact Email</th>
                    <th>Category</th>
                    <th>Contact</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrganizers.map((org) => (
                    <tr key={org._id}>
                      <td>
                        <div className="org-name">
                          <div className="org-avatar">{org.organizerName?.charAt(0).toUpperCase()}</div>
                          <span>{org.organizerName}</span>
                        </div>
                      </td>
                      <td>{org.loginEmail || org.contactEmail}</td>
                      <td>{org.contactEmail}</td>
                      <td>
                        <span className="category-badge">{org.category || "—"}</span>
                      </td>
                      <td>{org.contactNumber || "—"}</td>
                      <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button
                          className="action-btn archive-btn"
                          onClick={() => handleArchiveOrganizer(org._id)}
                          title="Archive organizer"
                        >
                          📦
                        </button>
                        <button
                          className="action-btn delete-btn-small"
                          onClick={() => handleDeleteOrganizer(org._id)}
                          title="Delete organizer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === "archived" && (
          archivedOrganizers.length === 0 ? (
            <div className="empty-state">
              <p>No archived organizers</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="organizers-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Login Email</th>
                    <th>Contact Email</th>
                    <th>Category</th>
                    <th>Contact</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedOrganizers.map((org) => (
                    <tr key={org._id} className="archived-row">
                      <td>
                        <div className="org-name">
                          <div className="org-avatar">{org.organizerName?.charAt(0).toUpperCase()}</div>
                          <span>{org.organizerName}</span>
                        </div>
                      </td>
                      <td>{org.loginEmail || org.contactEmail}</td>
                      <td>{org.contactEmail}</td>
                      <td>
                        <span className="category-badge">{org.category || "—"}</span>
                      </td>
                      <td>{org.contactNumber || "—"}</td>
                      <td>{new Date(org.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button
                          className="action-btn restore-btn"
                          onClick={() => handleRestoreOrganizer(org._id)}
                          title="Restore organizer"
                        >
                          ↩️
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteOrganizer(org._id)}
                          title="Delete organizer"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Create Organizer Modal */}
        {showCreateModal && (
          <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Organizer</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowCreateModal(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateOrganizer} className="create-form">
                <div className="form-group">
                  <label>Organization Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={createForm.name}
                    onChange={handleCreateOrganizerChange}
                    placeholder="e.g., Tech Club"
                    required
                  />
                  <small className="form-help">
                    Login email will be auto-generated as: {createForm.name.toLowerCase().replace(/\s+/g, ".")}@felicity.iiit
                  </small>
                </div>

                <div className="form-group">
                  <label>Contact Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={createForm.email}
                    onChange={handleCreateOrganizerChange}
                    placeholder="e.g., contact@club.com"
                    required
                  />
                  <small className="form-help">Contact email for the organization</small>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={createForm.category}
                    onChange={handleCreateOrganizerChange}
                  >
                    <option value="">Select a category</option>
                    {PREDEFINED_INTERESTS.map((interest) => (
                      <option key={interest} value={interest}>
                        {interest}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={createForm.description}
                    onChange={handleCreateOrganizerChange}
                    placeholder="Brief description of the organization"
                    rows="3"
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="tel"
                    name="contactNumber"
                    value={createForm.contactNumber}
                    onChange={handleCreateOrganizerChange}
                    placeholder="e.g., +91-XXXXXXXXXX"
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={creatingOrganizer}
                  >
                    {creatingOrganizer ? "Creating..." : "Create Organizer"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Credentials Modal */}
        {showCredentialsModal && (
          <div className="modal-overlay" onClick={() => setShowCredentialsModal(false)}>
            <div className="modal-content credentials-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header success-header">
                <h2>✅ Organizer Created Successfully</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowCredentialsModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="credentials-content">
                <p className="credentials-info">
                  Please share these login credentials with the organizer manually.
                  <strong> Save them now - they won't be shown again!</strong>
                </p>

                <div className="credential-box">
                  <label>Login Email</label>
                  <div className="credential-value">
                    <span>{generatedCredentials.loginEmail}</span>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCredentials.loginEmail);
                        alert("Login email copied!");
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="credential-box">
                  <label>Password</label>
                  <div className="credential-value">
                    <span className="password-text">{generatedCredentials.password}</span>
                    <button
                      className="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedCredentials.password);
                        alert("Password copied!");
                      }}
                    >
                      📋 Copy
                    </button>
                  </div>
                </div>

                <div className="credentials-actions">
                  <button
                    className="copy-all-btn"
                    onClick={() => {
                      const text = `Login Email: ${generatedCredentials.loginEmail}\nPassword: ${generatedCredentials.password}`;
                      navigator.clipboard.writeText(text);
                      alert("Credentials copied to clipboard!");
                    }}
                  >
                    📋 Copy Both
                  </button>
                  <button
                    className="done-btn"
                    onClick={() => setShowCredentialsModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
