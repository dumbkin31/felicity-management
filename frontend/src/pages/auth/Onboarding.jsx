import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { PREDEFINED_INTERESTS } from "../../constants/interests";
import "./Onboarding.css";

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("interests"); // "interests" | "clubs"

  // Get registration data from location state
  const registrationData = location.state?.registrationData;

  useEffect(() => {
    // Redirect to register if no registration data
    if (!registrationData) {
      navigate("/register");
    }
  }, [registrationData, navigate]);

  const [selectedInterests, setSelectedInterests] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);

  // Fetch organizers when step changes to clubs
  useEffect(() => {
    if (step === "clubs") {
      fetchOrganizers();
    }
  }, [step]);

  const fetchOrganizers = async () => {
    try {
      const response = await api.get("/organizers");
      setOrganizers(response.data.organizers || []);
    } catch (err) {
      console.error("Failed to fetch organizers:", err);
    }
  };

  const toggleInterest = (interest) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleClub = (clubId) => {
    setSelectedClubs((prev) =>
      prev.includes(clubId)
        ? prev.filter((id) => id !== clubId)
        : [...prev, clubId]
    );
  };

  const handleNextStep = () => {
    if (selectedInterests.length === 0) {
      setError("Please select at least one interest or skip");
      return;
    }
    setError("");
    setStep("clubs");
  };

  const handleSkip = () => {
    setError("");
    setSelectedInterests([]);
    if (step === "interests") {
      setStep("clubs");
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    setError("");

    try {
      // User is already registered from Register page, just update profile with interests and followed clubs
      await api.put("/participants/me", {
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        interests: selectedInterests,
        followedOrganizerIds: selectedClubs,
      });

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  if (!registrationData) {
    return null;
  }

  return (
    <div className="onboarding-container">
      <div className="onboarding-card">
        {step === "interests" ? (
          <>
            <div className="onboarding-header">
              <h1>What are your interests?</h1>
              <p>Select one or more to personalize your experience</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="interests-grid">
              {PREDEFINED_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  className={`interest-btn ${
                    selectedInterests.includes(interest) ? "selected" : ""
                  }`}
                  onClick={() => toggleInterest(interest)}
                >
                  <span className="checkmark">✓</span>
                  {interest}
                </button>
              ))}
            </div>

            <div className="onboarding-actions">
              <button
                className="btn-secondary"
                onClick={handleSkip}
                disabled={loading}
              >
                Skip
              </button>
              <button
                className="btn-primary"
                onClick={handleNextStep}
                disabled={loading || selectedInterests.length === 0}
              >
                Next: Follow Clubs
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="onboarding-header">
              <h1>Follow clubs and organizations</h1>
              <p>Get updates about events from clubs you're interested in</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="clubs-grid">
              {organizers.length === 0 ? (
                <p className="no-clubs">No organizations available yet</p>
              ) : (
                organizers.map((org) => (
                  <button
                    key={org._id}
                    className={`club-btn ${
                      selectedClubs.includes(org._id) ? "selected" : ""
                    }`}
                    onClick={() => toggleClub(org._id)}
                  >
                    <div className="club-avatar">
                      {org.organizerName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="club-info">
                      <h3>{org.organizerName}</h3>
                      <p>{org.category || "Organization"}</p>
                    </div>
                    <span className="checkmark">✓</span>
                  </button>
                ))
              )}
            </div>

            <div className="onboarding-actions">
              <button
                className="btn-secondary"
                onClick={() => setStep("interests")}
                disabled={loading}
              >
                ← Back
              </button>
              <button
                className="btn-secondary"
                onClick={handleSkip}
                disabled={loading}
              >
                Skip & Finish
              </button>
              <button
                className="btn-primary"
                onClick={completeOnboarding}
                disabled={loading}
              >
                {loading ? "Setting up..." : "Let's Go!"}
              </button>
            </div>
          </>
        )}

        {/* Progress indicator */}
        <div className="progress-indicator">
          <div className={`progress-step ${step === "interests" ? "active" : ""}`}>
            1. Interests
          </div>
          <div className="progress-line"></div>
          <div className={`progress-step ${step === "clubs" ? "active" : ""}`}>
            2. Clubs
          </div>
        </div>
      </div>
    </div>
  );
}
