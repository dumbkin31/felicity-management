import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./EventDetails.css";

export default function EventRegistrations() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [attendedFilter, setAttendedFilter] = useState("all");

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/organizer/events/${eventId}/details`);
      if (response.data.ok) {
        setEventData(response.data.event);
        setParticipants(response.data.participants || []);
        setAnalytics(response.data.analytics);
      } else {
        setError(response.data.error || "Failed to load event registrations");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error loading event registrations");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (participantEmail, currentAttended) => {
    try {
      // Note: This assumes there's an endpoint to update attendance
      // If not implemented yet, this can be added to backend
      alert("Attendance update will be implemented in next phase");
    } catch (err) {
      setError(err.response?.data?.error || "Error updating attendance");
    }
  };

  const handleExportCSV = () => {
    const headers = ["Ticket ID", "Name", "Email", "Registration Date", "Status", "Attended"];
    const rows = filteredParticipants.map((p) => [
      p.ticketId,
      p.participantName,
      p.participantEmail,
      new Date(p.registrationDate).toLocaleString(),
      p.status,
      p.attended ? "Yes" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventData?.name?.replace(/\s+/g, "_")}_registrations.csv`;
    a.click();
  };

  // Filtered participants
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.participantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.participantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ticketId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesAttended = attendedFilter === "all" || (attendedFilter === "yes" ? p.attended : !p.attended);

    return matchesSearch && matchesStatus && matchesAttended;
  });

  if (loading) {
    return (
      <div className="registrations-container">
        <div className="loading">Loading event registrations...</div>
      </div>
    );
  }

  return (
    <div className="registrations-container">
      {/* Header */}
      <div className="registrations-header">
        <button className="back-btn" onClick={() => navigate("/organizer/dashboard")}>
          ← Back
        </button>
        <div>
          <h1>{eventData?.name}</h1>
          <p>{eventData?.type === "normal" ? "Registration Event" : "Merchandise Event"}</p>
        </div>
        <button 
          className="edit-btn" 
          onClick={() => navigate(`/organizer/events/${eventId}/edit`)}
          title="Edit Event"
        >
          ✎ Edit
        </button>
        <button 
          className="edit-btn" 
          onClick={() => navigate(`/organizer/events/${eventId}/payments`)}
          title="View Payment Approvals"
        >
          💳 Payment Approvals
        </button>
        <button 
          className="edit-btn" 
          onClick={() => navigate(`/organizer/events/${eventId}/attendance`)}
          title="Mark Attendance"
        >
          ✅ Mark Attendance
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Analytics Cards */}
      <section className="analytics-section">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{analytics?.totalRegistrations || 0}</div>
            <div className="stat-label">Total Registrations</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{analytics?.confirmedRegistrations || 0}</div>
            <div className="stat-label">Confirmed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{analytics?.attendance || 0}</div>
            <div className="stat-label">Attended</div>
          </div>
        </div>

        {eventData?.type === "normal" && (
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">₹{analytics?.revenue || 0}</div>
              <div className="stat-label">Revenue</div>
            </div>
          </div>
        )}
      </section>

      {/* Event Info */}
      <section className="event-info-section">
        <h2>Event Information</h2>
        <div className="event-info-grid">
          <div className="info-item">
            <label>Event Type:</label>
            <span>{eventData?.type === "normal" ? "Normal Event" : "Merchandise"}</span>
          </div>
          <div className="info-item">
            <label>Eligibility:</label>
            <span>{eventData?.eligibility || "All"}</span>
          </div>
          <div className="info-item">
            <label>Status:</label>
            <span className={`status-badge status-${eventData?.status}`}>{eventData?.status}</span>
          </div>
          <div className="info-item">
            <label>Registration Deadline:</label>
            <span>{new Date(eventData?.registrationDeadline).toLocaleString()}</span>
          </div>
          <div className="info-item">
            <label>Event Start:</label>
            <span>{new Date(eventData?.startAt).toLocaleString()}</span>
          </div>
          <div className="info-item">
            <label>Event End:</label>
            <span>{new Date(eventData?.endAt).toLocaleString()}</span>
          </div>
          <div className="info-item">
            <label>Registration Limit:</label>
            <span>{eventData?.registrationLimit}</span>
          </div>
          {eventData?.type === "normal" && (
            <div className="info-item">
              <label>Registration Fee:</label>
              <span>₹{eventData?.registrationFee || 0}</span>
            </div>
          )}
        </div>
      </section>

      {/* Filters & Export */}
      <section className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search by name, email, or ticket ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="filter-group">
          <select value={attendedFilter} onChange={(e) => setAttendedFilter(e.target.value)} className="filter-select">
            <option value="all">All Attendance</option>
            <option value="yes">Attended</option>
            <option value="no">Not Attended</option>
          </select>
        </div>

        <button className="export-btn" onClick={handleExportCSV}>
          📥 Export CSV
        </button>
      </section>

      {/* Participants Table */}
      <section className="participants-section">
        <h2>Registrations ({filteredParticipants.length})</h2>

        {filteredParticipants.length === 0 ? (
          <div className="empty-state">
            <p>No registrations match the current filters.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="participants-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Attended</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredParticipants.map((participant, idx) => (
                  <tr key={idx}>
                    <td>
                      <code className="ticket-id">{participant.ticketId}</code>
                    </td>
                    <td>{participant.participantName}</td>
                    <td>{participant.participantEmail}</td>
                    <td>{new Date(participant.registrationDate).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-badge status-${participant.status}`}>
                        {participant.status}
                      </span>
                    </td>
                    <td>
                      <span className={`attendance-badge ${participant.attended ? "attended" : "not-attended"}`}>
                        {participant.attended ? "✓ Yes" : "✗ No"}
                      </span>
                    </td>
                    <td>
                      {eventData?.type === "merch" && participant.variant && (
                        <div className="details-popup-trigger" title={`${participant.variant.size} - ${participant.variant.color}`}>
                          📦
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
