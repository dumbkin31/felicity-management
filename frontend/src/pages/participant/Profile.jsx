import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import useFollowOrganizer from "../../hooks/useFollowOrganizer";
import { PREDEFINED_INTERESTS } from "../../constants/interests";
import "./Profile.css";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingInterests, setEditingInterests] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [collegeOrOrgName, setCollegeOrOrgName] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);

  useEffect(() => {
    fetchProfile();
    fetchOrganizers();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/participants/me");
      const data = response.data.participant;
      setProfile(data);
      
      // Set form values
      setFirstName(data.firstName || "");
      setLastName(data.lastName || "");
      setContactNumber(data.contactNumber || "");
      setCollegeOrOrgName(data.collegeOrOrgName || "");
      setSelectedInterests(data.interests || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizers = async () => {
    try {
      const response = await api.get("/organizers");
      setOrganizers(response.data.organizers || []);
    } catch (err) {
      console.error("Failed to fetch organizers:", err);
    }
  };

  const refreshProfile = async () => {
    const response = await api.get("/participants/me");
    setProfile(response.data.participant);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updates = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactNumber: contactNumber.trim(),
        collegeOrOrgName: collegeOrOrgName.trim(),
        interests: selectedInterests,
      };

      await api.put("/participants/me", updates);
      setSuccess("Profile updated successfully!");
      setEditing(false);
      setEditingInterests(false);
      
      // Refresh profile
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const { follow, unfollow } = useFollowOrganizer({
    onProfileUpdated: refreshProfile,
    onSuccess: (message) => {
      setSuccess(message);
      setTimeout(() => setSuccess(""), 2000);
    },
    onError: (message) => setError(message),
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    try {
      await api.put("/participants/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordSuccess("Password changed successfully!");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setChangingPassword(false);
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (err) {
      setPasswordError(err.response?.data?.error || "Failed to change password");
    }
  };

  const isFollowing = (organizerId) => {
    if (!profile?.followedOrganizerIds) return false;
    return profile.followedOrganizerIds.some(id => id.toString() === organizerId.toString());
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="profile-container">
          <div className="loading">Loading profile...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="profile-container">
        <h1>My Profile</h1>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Profile Info Section */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Personal Information</h2>
            {!editing && (
              <button onClick={() => setEditing(true)} className="edit-btn">
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input type="email" value={profile.email} disabled />
              </div>

              <div className="form-group">
                <label>Participant Type</label>
                <input type="text" value={profile.participantType === "iiit" ? "IIIT-H Student" : "Non-IIIT Participant"} disabled />
              </div>

              <div className="form-group">
                <label>Contact Number</label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>College/Organization</label>
                <input
                  type="text"
                  value={collegeOrOrgName}
                  onChange={(e) => setCollegeOrOrgName(e.target.value)}
                />
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
                    setFirstName(profile.firstName || "");
                    setLastName(profile.lastName || "");
                    setContactNumber(profile.contactNumber || "");
                    setCollegeOrOrgName(profile.collegeOrOrgName || "");
                    setSelectedInterests(profile.interests || []);
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
                  <strong>Name:</strong>
                  <span>{profile.firstName} {profile.lastName}</span>
                </div>
                <div className="info-item">
                  <strong>Email:</strong>
                  <span>{profile.email}</span>
                </div>
                <div className="info-item">
                  <strong>Type:</strong>
                  <span>{profile.participantType === "iiit" ? "IIIT-H Student" : "Non-IIIT Participant"}</span>
                </div>
                <div className="info-item">
                  <strong>Contact:</strong>
                  <span>{profile.contactNumber || "Not provided"}</span>
                </div>
                <div className="info-item">
                  <strong>College/Org:</strong>
                  <span>{profile.collegeOrOrgName || "Not provided"}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Interests Section */}
        <section className="profile-section">
          <div className="section-header">
            <h2>My Interests</h2>
            {!editingInterests && (
              <button onClick={() => setEditingInterests(true)} className="edit-btn">
                Edit Interests
              </button>
            )}
          </div>

          {editingInterests ? (
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-group">
                <label>Select Your Interests</label>
                <div className="interests-selector">
                  {PREDEFINED_INTERESTS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      className={`interest-option ${
                        selectedInterests.includes(interest) ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedInterests((prev) =>
                          prev.includes(interest)
                            ? prev.filter((i) => i !== interest)
                            : [...prev, interest]
                        );
                      }}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving} className="save-btn">
                  {saving ? "Saving..." : "Save Interests"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingInterests(false);
                    setError("");
                    setSelectedInterests(profile.interests || []);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="interests-tags">
              {(profile.interests || []).length > 0 ? (
                profile.interests.map((interest, idx) => (
                  <span key={idx} className="interest-tag">{interest}</span>
                ))
              ) : (
                <span>No interests added</span>
              )}
            </div>
          )}
        </section>

        {/* Security Settings Section */}
        <section className="profile-section">
          <div className="section-header">
            <h2>Security Settings</h2>
            {!changingPassword && (
              <button onClick={() => setChangingPassword(true)} className="edit-btn">
                Change Password
              </button>
            )}
          </div>

          {passwordError && <div className="error">{passwordError}</div>}
          {passwordSuccess && <div className="success">{passwordSuccess}</div>}

          {changingPassword ? (
            <form onSubmit={handlePasswordChange} className="profile-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn">
                  Change Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangingPassword(false);
                    setPasswordError("");
                    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="security-info">
              <p>Click "Change Password" to update your password. You will need to provide your current password for verification.</p>
            </div>
          )}
        </section>

        {/* Followed Organizers Section */}
        <section className="profile-section">
          <h2>Followed Clubs & Organizers</h2>
          
          {organizers.length === 0 ? (
            <div className="empty-state">No organizers available</div>
          ) : (
            <div className="organizers-grid">
              {organizers.map((org) => (
                <div key={org._id} className="organizer-card">
                  <h3>{org.organizerName}</h3>
                  <p className="org-email">{org.email}</p>
                  <p className="org-description">{org.description || "No description"}</p>
                  <button
                    onClick={() => isFollowing(org._id) ? unfollow(org._id) : follow(org._id)}
                    className={isFollowing(org._id) ? "unfollow-btn" : "follow-btn"}
                  >
                    {isFollowing(org._id) ? "Unfollow" : "Follow"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
