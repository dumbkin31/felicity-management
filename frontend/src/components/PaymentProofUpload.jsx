import { useState } from "react";
import axios from "axios";
import "./PaymentProofUpload.css";

const PaymentProofUpload = ({ registrationId, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setError("");

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;

        const token = localStorage.getItem("token");
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/payments/upload-proof/${registrationId}`,
          { paymentProof: base64String },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.ok) {
          setSuccess("Payment proof uploaded successfully! Awaiting organizer approval.");
          setSelectedFile(null);
          setPreviewUrl(null);
          if (onUploadSuccess) onUploadSuccess();
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="payment-proof-upload">
      <h3>Upload Payment Proof</h3>
      <p className="info-text">
        Please upload a screenshot or photo of your payment transaction for this merchandise order.
      </p>

      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="file-input"
        />

        {previewUrl && (
          <div className="preview-container">
            <h4>Preview:</h4>
            <img src={previewUrl} alt="Payment proof preview" className="proof-preview" />
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="upload-btn"
        >
          {uploading ? "Uploading..." : "Upload Payment Proof"}
        </button>
      </div>
    </div>
  );
};

export default PaymentProofUpload;
