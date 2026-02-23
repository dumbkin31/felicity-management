import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Onboarding from "./pages/auth/Onboarding";

// Participant pages
import ParticipantDashboard from "./pages/participant/Dashboard";
import BrowseEvents from "./pages/participant/BrowseEvents";
import EventDetails from "./pages/participant/EventDetails";
import ParticipantProfile from "./pages/participant/Profile";
import OrganizersList from "./pages/participant/OrganizersList";
import OrganizerDetail from "./pages/participant/OrganizerDetail";

// Organizer pages
import OrganizerDashboard from "./pages/organizer/Dashboard";
import OrganizerProfile from "./pages/organizer/Profile";
import CreateEvent from "./pages/organizer/CreateEvent";
import EditEvent from "./pages/organizer/EditEvent";
import OrganizerEventDetails from "./pages/organizer/EventDetails";
import OngoingEvents from "./pages/organizer/OngoingEvents";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import ManageOrganizers from "./pages/admin/ManageOrganizers";

// Other
import Unauthorized from "./pages/Unauthorized";

// Root redirect component that checks auth status
function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to appropriate dashboard based on role
  if (user.role === "participant") {
    return <Navigate to="/dashboard" replace />;
  } else if (user.role === "organizer") {
    return <Navigate to="/organizer/dashboard" replace />;
  } else if (user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Participant routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={["participant"]}>
                <ParticipantDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute roles={["participant"]}>
                <BrowseEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events/:id"
            element={
              <ProtectedRoute roles={["participant"]}>
                <EventDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizers"
            element={
              <ProtectedRoute roles={["participant"]}>
                <OrganizersList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizers/:id"
            element={
              <ProtectedRoute roles={["participant"]}>
                <OrganizerDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute roles={["participant"]}>
                <ParticipantProfile />
              </ProtectedRoute>
            }
          />

          {/* Organizer routes */}
          <Route
            path="/organizer/dashboard"
            element={
              <ProtectedRoute roles={["organizer"]}>
                <OrganizerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/profile"
            element={
              <ProtectedRoute roles={["organizer"]}>
                <OrganizerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/create"
            element={
              <ProtectedRoute roles={["organizer"]}>
                <CreateEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:id/edit"
            element={
              <ProtectedRoute roles={["organizer"]}>
                <EditEvent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:id"
            element={
              <ProtectedRoute roles={["organizer"]}>
                <OrganizerEventDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/ongoing-events"
            element={
              <ProtectedRoute roles={["organizer"]}>
                <OngoingEvents />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organizers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ManageOrganizers />
              </ProtectedRoute>
            }
          />

          {/* Default route - redirects based on auth status and role */}
          <Route path="/" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
