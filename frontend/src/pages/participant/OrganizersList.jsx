import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMessage } from "../../hooks/useMessage";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import useFollowOrganizer from "../../hooks/useFollowOrganizer";
import "./OrganizersList.css";

export default function OrganizersList() {
  const [organizers, setOrganizers] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { success, error, successMsg, errorMsg } = useMessage();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [organizersRes, profileRes] = await Promise.all([
        api.get("/organizers"),
        api.get("/participants/me"),
      ]);
      setOrganizers(organizersRes.data.organizers || []);
      setProfile(profileRes.data.participant);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load organizers");
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    const profileRes = await api.get("/participants/me");
    setProfile(profileRes.data.participant);
  };

  const { follow, unfollow } = useFollowOrganizer({
    onProfileUpdated: refreshProfile,
    onSuccess: success,
    onError: error,
  });

  const isFollowing = (organizerId) => {
    if (!profile?.followedOrganizerIds) return false;
    return profile.followedOrganizerIds.some(
      (id) => id.toString() === organizerId.toString()
    );
  };

  const filteredOrganizers = organizers.filter((org) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      org.name?.toLowerCase().includes(searchLower) ||
      org.organizerName?.toLowerCase().includes(searchLower) ||
      org.description?.toLowerCase().includes(searchLower) ||
      org.category?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="organizers-list-container">
          <div className="loading">Loading organizers...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="organizers-list-container">
        <div className="page-header">
          <h1>Clubs & Organizers</h1>
          <p className="subtitle">Discover and follow clubs to stay updated on their events</p>
        </div>

        {errorMsg && <div className="error">{errorMsg}</div>}
        {successMsg && <div className="success">{successMsg}</div>}

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            placeholder="Search clubs by name, category, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-value">{filteredOrganizers.length}</span>
            <span className="stat-label">Total Clubs</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {profile?.followedOrganizerIds?.length || 0}
            </span>
            <span className="stat-label">Following</span>
          </div>
        </div>

        {/* Organizers Grid */}
        {filteredOrganizers.length === 0 ? (
          <div className="empty-state">
            {search ? "No clubs match your search" : "No clubs available"}
          </div>
        ) : (
          <div className="organizers-grid">
            {filteredOrganizers.map((org) => {
              const displayName = org.name || org.organizerName;
              return (
                <div key={org._id} className="organizer-card">
                  <div className="card-header">
                    <h3>{displayName}</h3>
                    {org.category && (
                      <span className="category-badge">{org.category}</span>
                    )}
                  </div>

                  <p className="org-email">
                    {org.email || org.contactEmail}
                  </p>

                  <p className="org-description">
                    {org.description || "No description available"}
                  </p>

                  <div className="card-actions">
                    <Link
                      to={`/organizers/${org._id}`}
                      className="view-details-btn"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() =>
                        isFollowing(org._id)
                          ? unfollow(org._id)
                          : follow(org._id)
                      }
                      className={
                        isFollowing(org._id) ? "unfollow-btn" : "follow-btn"
                      }
                    >
                      {isFollowing(org._id) ? "✓ Following" : "+ Follow"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
