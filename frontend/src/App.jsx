import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Auth pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

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
import OrganizerEventDetails from "./pages/organizer/EventDetails";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";

// Other
import Unauthorized from "./pages/Unauthorized";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
            path="/organizer/events/:id"
            element={
              <ProtectedRoute roles={["organizer"]}>
                <OrganizerEventDetails />
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

          {/* Default redirect based on role */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
