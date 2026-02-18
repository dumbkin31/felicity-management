import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./Profile.css";

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [collegeOrOrgName, setCollegeOrOrgName] = useState("");
  const [interests, setInterests] = useState("");

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
      setInterests((data.interests || []).join(", "));
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizers = async () => {
    try {
      const response = await api.get("/organizers-public");
      setOrganizers(response.data.organizers || []);
    } catch (err) {
      console.error("Failed to fetch organizers:", err);
    }
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
        interests: interests.split(",").map(s => s.trim()).filter(Boolean),
      };

      await api.put("/participants/me", updates);
      setSuccess("Profile updated successfully!");
      setEditing(false);
      
      // Refresh profile
      await fetchProfile();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleFollow = async (organizerId) => {
    try {
      await api.post(`/participants/follow/${organizerId}`);
      await fetchProfile();
      setSuccess("Followed successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to follow");
    }
  };

  const handleUnfollow = async (organizerId) => {
    try {
      await api.post(`/participants/unfollow/${organizerId}`);
      await fetchProfile();
      setSuccess("Unfollowed successfully!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to unfollow");
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

              <div className="form-group">
                <label>Interests (comma separated)</label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="coding, music, sports"
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
                    setInterests((profile.interests || []).join(", "));
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
                  <strong>Contact:</strong>
                  <span>{profile.contactNumber || "Not provided"}</span>
                </div>
                <div className="info-item">
                  <strong>College/Org:</strong>
                  <span>{profile.collegeOrOrgName || "Not provided"}</span>
                </div>
                <div className="info-item full-width">
                  <strong>Interests:</strong>
                  <div className="interests-tags">
                    {(profile.interests || []).length > 0 ? (
                      profile.interests.map((interest, idx) => (
                        <span key={idx} className="interest-tag">{interest}</span>
                      ))
                    ) : (
                      <span>No interests added</span>
                    )}
                  </div>
                </div>
              </div>
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
                  <h3>{org.name}</h3>
                  <p className="org-email">{org.email}</p>
                  <p className="org-description">{org.description || "No description"}</p>
                  <button
                    onClick={() => isFollowing(org._id) ? handleUnfollow(org._id) : handleFollow(org._id)}
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
