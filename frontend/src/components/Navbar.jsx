import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to={user.role === "participant" ? "/dashboard" : user.role === "organizer" ? "/organizer/dashboard" : "/admin/dashboard"} style={styles.logo}>
          Felicity Events
        </Link>

        <div style={styles.links}>
          {user.role === "participant" && (
            <>
              <Link to="/dashboard" style={styles.link}>Dashboard</Link>
              <Link to="/events" style={styles.link}>Browse Events</Link>
              <Link to="/organizers" style={styles.link}>Clubs</Link>
              <Link to="/profile" style={styles.link}>Profile</Link>
            </>
          )}

          {user.role === "organizer" && (
            <>
              <Link to="/organizer/dashboard" style={styles.link}>Dashboard</Link>
              <Link to="/organizer/events/create" style={styles.link}>Create Event</Link>
              <Link to="/organizer/profile" style={styles.link}>Profile</Link>
            </>
          )}

          {user.role === "admin" && (
            <>
              <Link to="/admin/dashboard" style={styles.link}>Dashboard</Link>
            </>
          )}

          <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "1rem 0",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  },
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    color: "white",
    fontSize: "24px",
    fontWeight: "bold",
    textDecoration: "none",
  },
  links: {
    display: "flex",
    gap: "24px",
    alignItems: "center",
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontSize: "16px",
    fontWeight: "500",
    transition: "opacity 0.2s",
  },
  logoutBtn: {
    background: "rgba(255,255,255,0.2)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.4)",
    padding: "8px 16px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "background 0.2s",
  },
};
