import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar";
import FeedbackForm from "../../components/FeedbackForm";

export default function ParticipantEventFeedback() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="event-details-container">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <FeedbackForm eventId={id} />
      </div>
    </>
  );
}
