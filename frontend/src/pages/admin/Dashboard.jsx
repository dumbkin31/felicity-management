import { useState, useEffect } from "react";
import { StatCard } from "../../components/StatCard";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./Dashboard.css";

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/dashboard");
      if (response.data.ok) {
        setDashboardData(response.data.dashboard);
      } else {
        setError(response.data.error || "Failed to load dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error loading dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="admin-container">
          <div className="loading">Loading dashboard...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p>System overview and analytics</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* Analytics Stats */}
        <section className="stats-section">
          <StatCard value={dashboardData?.totalOrganizers || 0} label="Total Organizers" />
          <StatCard value={dashboardData?.totalParticipants || 0} label="Total Participants" />
          <StatCard value={dashboardData?.totalEvents || 0} label="Total Events" />
          <StatCard value={dashboardData?.totalRegistrations || 0} label="Total Registrations" />
        </section>
      </div>
    </>
  );
}
