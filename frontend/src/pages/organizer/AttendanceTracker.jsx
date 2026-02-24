import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import api from "../../api/axios";
import Navbar from "../../components/Navbar";
import "./AttendanceTracker.css";

const AttendanceTracker = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({ total: 0, attended: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scanSuccess, setScanSuccess] = useState("");
  const [manualTicketId, setManualTicketId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchAttendance();
  }, [eventId]);

  useEffect(() => {
    let scanner;
    
    if (scannerActive) {
      scanner = new Html5QrcodeScanner("qr-reader", {
        qrbox: 250,
        fps: 10,
      });

      scanner.render(onScanSuccess, onScanError);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [scannerActive]);

  const fetchAttendance = async () => {
    try {
      const response = await api.get(
        `/organizer/attendance/${eventId}`
      );

      if (response.data.ok) {
        setAttendanceData(response.data.attendance);
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  const parseTicketData = (decodedText) => {
    try {
      if (typeof decodedText === "string") {
        return JSON.parse(decodedText);
      }
      return decodedText;
    } catch (err) {
      return null;
    }
  };

  const onScanSuccess = async (decodedText) => {
    setScanError("");
    setScanSuccess("");

    const ticketData = parseTicketData(decodedText);

    if (!ticketData || !ticketData.ticketId || !ticketData.participantId) {
      setScanError("Invalid QR code format");
      return;
    }

    if (ticketData.eventId && ticketData.eventId !== eventId) {
      setScanError("This QR code belongs to a different event");
      return;
    }

    await markAttendance(ticketData);
  };

  const onScanError = (error) => {
    // Ignore scan errors while scanning
  };

  const markAttendance = async (ticketData, manual = false) => {
    try {
      const response = await api.post(
        `/organizer/attendance/mark`,
        {
          ticketData,
          eventId,
          markedManually: manual,
        }
      );

      if (response.data.ok) {
        setScanSuccess(`Attendance marked for ${ticketData.ticketId}`);
        fetchAttendance();
        setTimeout(() => setScanSuccess(""), 3000);
      }
    } catch (err) {
      setScanError(err.response?.data?.error || "Failed to mark attendance");
      setTimeout(() => setScanError(""), 3000);
    }
  };

  const handleManualAttendance = async () => {
    if (!manualTicketId.trim()) {
      setScanError("Please enter a ticket ID");
      return;
    }

    try {
      const response = await api.post(
        `/organizer/attendance/manual`,
        {
          ticketId: manualTicketId.trim(),
          eventId,
        }
      );

      if (response.data.ok) {
        setScanSuccess("Attendance marked manually");
        setManualTicketId("");
        fetchAttendance();
        setTimeout(() => setScanSuccess(""), 3000);
      }
    } catch (err) {
      setScanError(err.response?.data?.error || "Failed to mark attendance");
      setTimeout(() => setScanError(""), 3000);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(
        `/organizer/attendance/export/${eventId}`,
        { responseType: "blob" }
      );

      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${eventId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setScanError(err.response?.data?.error || "Failed to export CSV");
      setTimeout(() => setScanError(""), 3000);
    }
  };

  const filteredData = attendanceData.filter((record) =>
    record.participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.ticketId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="loading">Loading attendance data...</div>;

  return (
    <>
      <Navbar />
      <div className="attendance-tracker">
      <div className="header-section" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <h2>Attendance Tracker</h2>
        <button onClick={handleExport} className="export-btn">
          Export CSV
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Registrations</div>
        </div>
        <div className="stat-card stat-attended">
          <div className="stat-number">{stats.attended}</div>
          <div className="stat-label">Attended</div>
        </div>
        <div className="stat-card stat-pending">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="scanner-section">
        <h3>Scan QR Code</h3>
        <button
          onClick={() => setScannerActive(!scannerActive)}
          className="toggle-scanner-btn"
        >
          {scannerActive ? "Stop Scanner" : "Start Scanner"}
        </button>

        {scannerActive && (
          <div id="qr-reader" className="qr-reader"></div>
        )}

        {scanError && <div className="error-message">{scanError}</div>}
        {scanSuccess && <div className="success-message">{scanSuccess}</div>}

        <div className="manual-entry">
          <h4>Manual Entry</h4>
          <div className="manual-entry-form">
            <input
              type="text"
              placeholder="Enter Ticket ID"
              value={manualTicketId}
              onChange={(e) => setManualTicketId(e.target.value)}
              className="ticket-input"
            />
            <button onClick={handleManualAttendance} className="mark-btn">
              Mark Attendance
            </button>
          </div>
        </div>
      </div>

      <div className="attendance-list-section">
        <h3>Attendance List</h3>
        <input
          type="text"
          placeholder="Search by name or ticket ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <div className="attendance-table">
          <div className="table-header">
            <div>Ticket ID</div>
            <div>Participant Name</div>
            <div>Status</div>
            <div>Marked At</div>
            <div>Manual</div>
          </div>
          {filteredData.map((record) => (
            <div key={record.ticketId} className="table-row">
              <div>{record.ticketId}</div>
              <div>{record.participantName}</div>
              <div>
                {record.attended ? (
                  <span className="status-badge attended">Attended</span>
                ) : (
                  <span className="status-badge pending">Pending</span>
                )}
              </div>
              <div>
                {record.markedAt
                  ? new Date(record.markedAt).toLocaleString()
                  : "-"}
              </div>
              <div>{record.markedManually ? "Yes" : "No"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
};

export default AttendanceTracker;
